from __future__ import annotations

import csv
import hashlib
import hmac
import io
import json
import os
import re
import secrets
import sqlite3
import time
from contextlib import asynccontextmanager
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Annotated, Literal

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

DEFAULT_DATABASE_PATH = Path(__file__).parent / "data" / "guardai.db"
DATABASE_PATH = Path(os.environ.get("GUARDAI_DATABASE_PATH", DEFAULT_DATABASE_PATH))
COOKIE = "guardai_session"


class DatabaseConnection(sqlite3.Connection):
    def __exit__(self, *args):
        try:
            return super().__exit__(*args)
        finally:
            self.close()


def connect_database() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, factory=DatabaseConnection)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database() -> None:
    with connect_database() as connection:
        connection.executescript("""
            CREATE TABLE IF NOT EXISTS profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
                phone TEXT NOT NULL, account_type TEXT NOT NULL CHECK(account_type IN ('senior','caregiver')),
                consent_given INTEGER NOT NULL DEFAULT 0, relationship TEXT, created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
                risk_level TEXT NOT NULL, indicators TEXT NOT NULL, engine TEXT NOT NULL, created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS accounts (
                profile_id INTEGER PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
                phone_key TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY, profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                expires_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                senior_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                caregiver_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                relationship TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active')),
                requested_by INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                UNIQUE(senior_id, caregiver_id)
            );
        """)
        # Migra o banco existente sem apagar cadastros ou históricos.
        if "relationship" not in {r["name"] for r in connection.execute("PRAGMA table_info(profiles)")}:
            connection.execute("ALTER TABLE profiles ADD COLUMN relationship TEXT")
        profile_columns = {r["name"] for r in connection.execute("PRAGMA table_info(profiles)")}
        for name in ("email", "birth_date"):
            if name not in profile_columns:
                connection.execute(f"ALTER TABLE profiles ADD COLUMN {name} TEXT")
        columns = {r["name"] for r in connection.execute("PRAGMA table_info(analyses)")}
        for name, definition in {
            "title": "TEXT NOT NULL DEFAULT 'Análise de texto'",
            "source": "TEXT NOT NULL DEFAULT ''", "transcript": "TEXT NOT NULL DEFAULT '[]'",
            "verdict": "TEXT NOT NULL DEFAULT 'open'", "call_status": "TEXT NOT NULL DEFAULT 'ended'",
        }.items():
            if name not in columns:
                connection.execute(f"ALTER TABLE analyses ADD COLUMN {name} {definition}")


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="GuardAI API", version="0.2.0", lifespan=lifespan)


def phone_key(value: str) -> str:
    return re.sub(r"\D", "", value)


def password_hash(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 600_000).hex()
    return f"{salt}${digest}"


def password_matches(password: str, stored: str) -> bool:
    salt, digest = stored.split("$", 1)
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 600_000).hex()
    return hmac.compare_digest(candidate, digest)


def profile_response(row) -> dict:
    return {"id": row["id"], "name": row["name"], "phone": row["phone"],
            "account_type": row["account_type"], "consent_given": bool(row["consent_given"]),
            "relationship": row["relationship"], "created_at": row["created_at"],
            "email": row["email"], "birth_date": row["birth_date"]}


class ProfileInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=8, max_length=30)
    account_type: Literal["senior", "caregiver"]
    consent_given: bool = False
    relationship: str | None = Field(default=None, max_length=60)
    email: str | None = Field(default=None, max_length=254)
    birth_date: str | None = Field(default=None, max_length=10)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value):
        if value and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("Informe um e-mail válido.")
        return value or None

    @field_validator("birth_date")
    @classmethod
    def valid_birth_date(cls, value):
        if value and (not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value) or date.fromisoformat(value) > date.today()):
            raise ValueError("Informe uma data de nascimento válida, anterior ou igual a hoje.")
        return value or None

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, value):
        if not re.fullmatch(r"[+\d() .-]+", value) or not 8 <= len(phone_key(value)) <= 15:
            raise ValueError("Informe um telefone válido com 8 a 15 dígitos.")
        return value

    @model_validator(mode="after")
    def valid_consent(self):
        if self.account_type == "caregiver" and self.consent_given:
            raise ValueError("Somente a pessoa protegida pode autorizar seu monitoramento.")
        return self


class Registration(BaseModel):
    profile: ProfileInput
    password: str = Field(min_length=8, max_length=128)


class Login(BaseModel):
    phone: str = Field(max_length=30)
    password: str = Field(min_length=1, max_length=128)


def current_user(guardai_session: Annotated[str | None, Cookie()] = None) -> dict:
    if guardai_session:
        token_hash = hashlib.sha256(guardai_session.encode()).hexdigest()
        with connect_database() as connection:
            row = connection.execute("SELECT p.* FROM sessions s JOIN profiles p ON p.id=s.profile_id WHERE s.token_hash=? AND s.expires_at>?", (token_hash, time.time())).fetchone()
        if row:
            return profile_response(row)
    raise HTTPException(status_code=401, detail="Entre com seu telefone e senha para continuar.")


User = Annotated[dict, Depends(current_user)]


def new_session(response: Response, profile_id: int):
    token = secrets.token_urlsafe(32)
    with connect_database() as connection:
        connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (time.time(),))
        connection.execute("INSERT INTO sessions VALUES (?,?,?)", (hashlib.sha256(token.encode()).hexdigest(), profile_id, time.time() + 7 * 86400))
    response.set_cookie(COOKIE, token, httponly=True, samesite="lax", max_age=7 * 86400, path="/api")


def allowed_ids(user: dict) -> list[int]:
    with connect_database() as connection:
        rows = connection.execute("SELECT senior_id, caregiver_id FROM links WHERE status='active' AND (senior_id=? OR caregiver_id=?)", (user["id"], user["id"])).fetchall()
    return list({user["id"], *(r["caregiver_id"] if r["senior_id"] == user["id"] else r["senior_id"] for r in rows)})


def require_caregiver(user):
    if user["account_type"] != "caregiver":
        raise HTTPException(status_code=403, detail="Esta função está disponível somente ao responsável.")


@app.get("/api/health")
def health():
    with connect_database() as connection:
        connection.execute("SELECT 1")
    return {"status": "ok", "database": "sqlite"}


@app.post("/api/auth/register", status_code=201)
def register(data: Registration, response: Response):
    try:
        with connect_database() as connection:
            cursor = connection.execute("INSERT INTO profiles (name,phone,account_type,consent_given,relationship,created_at,email,birth_date) VALUES (?,?,?,?,?,?,?,?)", (data.profile.name, data.profile.phone, data.profile.account_type, int(data.profile.consent_given), None, datetime.now(timezone.utc).isoformat(), data.profile.email, data.profile.birth_date))
            profile_id = cursor.lastrowid
            connection.execute("INSERT INTO accounts VALUES (?,?,?)", (profile_id, phone_key(data.profile.phone), password_hash(data.password)))
            row = connection.execute("SELECT * FROM profiles WHERE id=?", (profile_id,)).fetchone()
    except sqlite3.IntegrityError as error:
        raise HTTPException(status_code=409, detail="Já existe uma conta com este telefone. Use Entrar.") from error
    new_session(response, profile_id)
    return profile_response(row)


@app.post("/api/auth/login")
def login(data: Login, response: Response):
    with connect_database() as connection:
        row = connection.execute("SELECT a.password_hash, p.* FROM accounts a JOIN profiles p ON p.id=a.profile_id WHERE a.phone_key=?", (phone_key(data.phone),)).fetchone()
    # Hash de custo equivalente também para telefone inexistente.
    stored = row["password_hash"] if row else "0" * 32 + "$" + "0" * 64
    valid = password_matches(data.password, stored)
    if not row or not valid:
        raise HTTPException(status_code=401, detail="Telefone ou senha incorretos.")
    new_session(response, row["id"])
    return profile_response(row)


@app.get("/api/auth/me")
def me(user: User):
    return user


@app.post("/api/auth/logout", status_code=204)
def logout(response: Response, guardai_session: Annotated[str | None, Cookie()] = None):
    if guardai_session:
        with connect_database() as connection:
            connection.execute("DELETE FROM sessions WHERE token_hash=?", (hashlib.sha256(guardai_session.encode()).hexdigest(),))
    response.delete_cookie(COOKIE, path="/api")


@app.get("/api/profiles")
def list_profiles(user: User):
    ids = allowed_ids(user)
    with connect_database() as connection:
        rows = connection.execute(f"SELECT * FROM profiles WHERE id IN ({','.join('?' for _ in ids)}) ORDER BY id DESC", ids).fetchall()
    return [profile_response(row) for row in rows]


@app.get("/api/profiles/export.csv")
def export_profiles(user: User):
    require_caregiver(user)
    output = io.StringIO(newline="")
    writer = csv.writer(output, delimiter=";")
    writer.writerow(["ID", "Nome", "Telefone", "Tipo de perfil", "Consentimento", "Relação no círculo", "Criado em (UTC)"])
    relations = {link["member"]["id"]: link["relationship"] for link in list_links(user) if link["status"] == "active"}
    for profile in list_profiles(user):
        values = [profile["id"], profile["name"], profile["phone"], "Pessoa protegida" if profile["account_type"] == "senior" else "Responsável", "Sim" if profile["consent_given"] else "Não", relations.get(profile["id"], "Minha conta"), profile["created_at"]]
        writer.writerow(["'" + v if isinstance(v, str) and v.lstrip().startswith(("=", "+", "-", "@")) else v for v in values])
    return Response(content=output.getvalue().encode("utf-8-sig"), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": 'attachment; filename="guardai-perfis.csv"'})


@app.get("/api/profiles/{profile_id}")
def get_profile(profile_id: int, user: User):
    if profile_id not in allowed_ids(user):
        raise HTTPException(status_code=404, detail="Perfil não encontrado no seu círculo.")
    with connect_database() as connection:
        row = connection.execute("SELECT * FROM profiles WHERE id=?", (profile_id,)).fetchone()
    return profile_response(row)


@app.put("/api/profiles/{profile_id}")
def update_profile(profile_id: int, data: ProfileInput, user: User):
    if profile_id != user["id"] or data.account_type != user["account_type"]:
        raise HTTPException(status_code=403, detail="Você pode editar somente sua conta e não pode alterar seu tipo de perfil.")
    try:
        with connect_database() as connection:
            connection.execute("UPDATE accounts SET phone_key=? WHERE profile_id=?", (phone_key(data.phone), profile_id))
            connection.execute("UPDATE profiles SET name=?, phone=?, consent_given=?, email=?, birth_date=? WHERE id=?", (data.name, data.phone, int(data.consent_given), data.email, data.birth_date, profile_id))
    except sqlite3.IntegrityError as error:
        raise HTTPException(status_code=409, detail="Já existe uma conta com este telefone.") from error
    return get_profile(profile_id, user)


@app.delete("/api/profiles/{profile_id}", status_code=204)
def delete_profile(profile_id: int, user: User, response: Response):
    if profile_id != user["id"]:
        raise HTTPException(status_code=403, detail="Você pode excluir somente sua própria conta. Para remover alguém do círculo, desfaça o vínculo.")
    with connect_database() as connection:
        connection.execute("UPDATE analyses SET profile_id=NULL WHERE profile_id=?", (profile_id,))
        connection.execute("DELETE FROM profiles WHERE id=?", (profile_id,))
    response.delete_cookie(COOKIE, path="/api")


class LinkInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    phone: str = Field(min_length=8, max_length=30)
    relationship: str = Field(min_length=2, max_length=60)


@app.get("/api/links")
def list_links(user: User):
    with connect_database() as connection:
        rows = connection.execute("SELECT * FROM links WHERE senior_id=? OR caregiver_id=? ORDER BY id DESC", (user["id"], user["id"])).fetchall()
        result = []
        for row in rows:
            member_id = row["caregiver_id"] if user["id"] == row["senior_id"] else row["senior_id"]
            member = connection.execute("SELECT * FROM profiles WHERE id=?", (member_id,)).fetchone()
            result.append({"id": row["id"], "member": profile_response(member), "relationship": row["relationship"], "status": row["status"], "requested_by": row["requested_by"]})
    return result


@app.post("/api/links", status_code=201)
def invite(data: LinkInput, user: User):
    with connect_database() as connection:
        member = connection.execute("SELECT p.* FROM accounts a JOIN profiles p ON p.id=a.profile_id WHERE a.phone_key=?", (phone_key(data.phone),)).fetchone()
        if not member or member["account_type"] == user["account_type"]:
            raise HTTPException(status_code=422, detail="Informe o telefone de uma conta cadastrada do outro tipo: idoso e responsável.")
        senior_id = user["id"] if user["account_type"] == "senior" else member["id"]
        caregiver_id = user["id"] if user["account_type"] == "caregiver" else member["id"]
        try:
            connection.execute("INSERT INTO links (senior_id,caregiver_id,relationship,requested_by) VALUES (?,?,?,?)", (senior_id, caregiver_id, data.relationship, user["id"]))
        except sqlite3.IntegrityError as error:
            raise HTTPException(status_code=409, detail="Já existe um vínculo ou convite entre estas contas.") from error
    return list_links(user)


def own_link(connection, link_id, user):
    row = connection.execute("SELECT * FROM links WHERE id=? AND (senior_id=? OR caregiver_id=?)", (link_id, user["id"], user["id"])).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Vínculo não encontrado.")
    return row


@app.post("/api/links/{link_id}/accept")
def accept_link(link_id: int, user: User):
    with connect_database() as connection:
        row = own_link(connection, link_id, user)
        if row["requested_by"] == user["id"]:
            raise HTTPException(status_code=403, detail="A outra pessoa precisa aceitar seu convite.")
        connection.execute("UPDATE links SET status='active' WHERE id=?", (link_id,))
    return list_links(user)


class CircleMemberEdit(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    profile: ProfileInput
    relationship: str = Field(min_length=2, max_length=60)


@app.put("/api/links/{link_id}/member")
def edit_circle_member(link_id: int, data: CircleMemberEdit, user: User):
    require_caregiver(user)
    try:
        with connect_database() as connection:
            connection.execute("BEGIN IMMEDIATE")
            link = own_link(connection, link_id, user)
            if link["status"] != "active":
                raise HTTPException(status_code=403, detail="O convite precisa ser aceito antes de editar os dados.")
            member = connection.execute("SELECT * FROM profiles WHERE id=?", (link["senior_id"],)).fetchone()
            if data.profile.account_type != member["account_type"] or data.profile.consent_given != bool(member["consent_given"]):
                raise HTTPException(status_code=403, detail="O tipo de conta e a autorização de monitoramento são controlados pela pessoa protegida. Atualize o círculo antes de tentar novamente.")
            connection.execute("UPDATE accounts SET phone_key=? WHERE profile_id=?", (phone_key(data.profile.phone), member["id"]))
            connection.execute("UPDATE profiles SET name=?,phone=?,email=?,birth_date=? WHERE id=?", (data.profile.name, data.profile.phone, data.profile.email, data.profile.birth_date, member["id"]))
            connection.execute("UPDATE links SET relationship=? WHERE id=?", (data.relationship, link_id))
            saved = connection.execute("SELECT * FROM profiles WHERE id=?", (member["id"],)).fetchone()
            result = {"id": link_id, "member": profile_response(saved), "relationship": data.relationship, "status": link["status"], "requested_by": link["requested_by"]}
    except sqlite3.IntegrityError as error:
        raise HTTPException(status_code=409, detail="Já existe uma conta com este telefone.") from error
    return result


@app.delete("/api/links/{link_id}", status_code=204)
def unlink(link_id: int, user: User):
    with connect_database() as connection:
        own_link(connection, link_id, user)
        connection.execute("DELETE FROM links WHERE id=?", (link_id,))
    return Response(status_code=204)


def analysis_response(row):
    return {"id": row["id"], "profile_id": row["profile_id"], "profile_name": row["profile_name"], "risk_level": row["risk_level"], "indicators": row["indicators"].split("|") if row["indicators"] else [], "engine": row["engine"], "created_at": row["created_at"], "title": row["title"], "source": row["source"], "transcript": json.loads(row["transcript"]), "verdict": row["verdict"], "call_status": row["call_status"]}


def accessible_analysis(connection, analysis_id, user):
    row = connection.execute("SELECT a.*, p.name AS profile_name FROM analyses a JOIN profiles p ON p.id=a.profile_id WHERE a.id=?", (analysis_id,)).fetchone()
    if not row or row["profile_id"] not in allowed_ids(user):
        raise HTTPException(status_code=404, detail="Análise não encontrada no seu círculo.")
    return row


@app.get("/api/analyses")
def list_analyses(user: User):
    ids = allowed_ids(user)
    with connect_database() as connection:
        rows = connection.execute(f"SELECT a.*, p.name AS profile_name FROM analyses a JOIN profiles p ON p.id=a.profile_id WHERE a.profile_id IN ({','.join('?' for _ in ids)}) ORDER BY a.id DESC", ids).fetchall()
    return [analysis_response(row) for row in rows]


class SimulationInput(BaseModel):
    profile_id: int
    scenario: Literal["suspicious", "safe"] = "suspicious"


@app.post("/api/simulations", status_code=201)
def simulate(data: SimulationInput, user: User):
    senior = get_profile(data.profile_id, user)
    if senior["account_type"] != "senior":
        raise HTTPException(status_code=422, detail="Escolha uma pessoa protegida do seu círculo.")
    if not senior["consent_given"]:
        raise HTTPException(status_code=422, detail="A pessoa protegida precisa autorizar o monitoramento nas próprias configurações.")
    with connect_database() as connection:
        connection.execute("BEGIN IMMEDIATE")
        if connection.execute("SELECT id FROM analyses WHERE profile_id=? AND call_status='live'", (senior["id"],)).fetchone():
            raise HTTPException(status_code=409, detail="Já existe uma simulação em andamento para esta pessoa. Abra a chamada atual.")
        contact = connection.execute("SELECT p.name FROM links l JOIN profiles p ON p.id=l.caregiver_id WHERE l.senior_id=? AND l.status='active' ORDER BY l.id LIMIT 1", (senior["id"],)).fetchone()
        safe = data.scenario == "safe"
        source = contact["name"] if safe and contact else "Contato conhecido" if safe else "Número não identificado"
        lines = [f"Olá, {senior['name']}. Tudo bem?", "Liguei para combinar uma visita.", "Nos falamos mais tarde."] if safe else [f"Olá, {senior['name']}. Troquei de número e preciso de ajuda.", "Preciso de um Pix agora, é urgente.", "Não avise ninguém. Mantenha isso em segredo."]
        cursor = connection.execute("INSERT INTO analyses (profile_id,risk_level,indicators,engine,created_at,title,source,transcript,call_status) VALUES (?,?,?,?,?,?,?,?,?)", (senior["id"], "low" if safe else "high", "" if safe else "Pedido de dinheiro|Urgência|Segredo", "simulation-rules", datetime.now(timezone.utc).isoformat(), "Conversa segura" if safe else "Possível falso familiar", source, json.dumps(lines, ensure_ascii=False), "live"))
        result = analysis_response(accessible_analysis(connection, cursor.lastrowid, user))
    return result


@app.post("/api/analyses/{analysis_id}/end")
def end_analysis(analysis_id: int, user: User):
    with connect_database() as connection:
        accessible_analysis(connection, analysis_id, user)
        connection.execute("UPDATE analyses SET call_status='ended' WHERE id=?", (analysis_id,))
        result = analysis_response(accessible_analysis(connection, analysis_id, user))
    return result


class ReviewInput(BaseModel):
    verdict: Literal["scam", "not_scam"]


@app.put("/api/analyses/{analysis_id}/review")
def review_analysis(analysis_id: int, data: ReviewInput, user: User):
    require_caregiver(user)
    with connect_database() as connection:
        row = accessible_analysis(connection, analysis_id, user)
        if row["call_status"] != "ended":
            raise HTTPException(status_code=409, detail="Encerre a simulação antes de registrar o parecer.")
        connection.execute("UPDATE analyses SET verdict=? WHERE id=?", (data.verdict, analysis_id))
        result = analysis_response(accessible_analysis(connection, analysis_id, user))
    return result
