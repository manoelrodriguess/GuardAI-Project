from __future__ import annotations
import os
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


DEFAULT_DATABASE_PATH = Path(__file__).parent / "data" / "guardai.db"
DATABASE_PATH = Path(os.environ.get("GUARDAI_DATABASE_PATH", DEFAULT_DATABASE_PATH))


def connect_database() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    with connect_database() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                account_type TEXT NOT NULL CHECK (account_type IN ('senior', 'caregiver')),
                consent_given INTEGER NOT NULL DEFAULT 0,
                relationship TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        profile_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(profiles)")
        }
        if "relationship" not in profile_columns:
            connection.execute("ALTER TABLE profiles ADD COLUMN relationship TEXT")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
                risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
                indicators TEXT NOT NULL,
                engine TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="GuardAI API",
    description="API local do protótipo GuardAI. A análise disponível é apenas demonstrativa.",
    version="0.1.0",
    lifespan=lifespan,
)


class ProfileCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=8, max_length=30)
    account_type: Literal["senior", "caregiver"]
    consent_given: bool = False
    relationship: str | None = Field(default=None, max_length=60)


class AnalysisCreate(BaseModel):
    text: str = Field(min_length=1, max_length=10_000)
    profile_id: int | None = None


def profile_response(row: sqlite3.Row) -> dict[str, object]:
    return {
        "id": row["id"],
        "name": row["name"],
        "phone": row["phone"],
        "account_type": row["account_type"],
        "consent_given": bool(row["consent_given"]),
        "relationship": row["relationship"],
        "created_at": row["created_at"],
    }


@app.get("/api/health")
def health() -> dict[str, str]:
    try:
        with connect_database() as connection:
            connection.execute("SELECT 1")
    except sqlite3.Error as error:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível.") from error
    return {"status": "ok", "database": "sqlite"}


@app.get("/api/profiles")
def list_profiles() -> list[dict[str, object]]:
    with connect_database() as connection:
        rows = connection.execute(
            "SELECT id, name, phone, account_type, consent_given, relationship, created_at "
            "FROM profiles ORDER BY id DESC"
        ).fetchall()
    return [profile_response(row) for row in rows]


@app.post("/api/profiles", status_code=201)
def create_profile(profile: ProfileCreate) -> dict[str, object]:
    if profile.consent_given and profile.account_type != "senior":
        raise HTTPException(
            status_code=422,
            detail="Somente o perfil idoso pode registrar consentimento de monitoramento.",
        )

    created_at = datetime.now(timezone.utc).isoformat()
    with connect_database() as connection:
        cursor = connection.execute(
            "INSERT INTO profiles "
            "(name, phone, account_type, consent_given, relationship, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                profile.name.strip(),
                profile.phone.strip(),
                profile.account_type,
                int(profile.consent_given),
                profile.relationship.strip() if profile.relationship else None,
                created_at,
            ),
        )
        row = connection.execute(
            "SELECT id, name, phone, account_type, consent_given, relationship, created_at "
            "FROM profiles WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=500, detail="Não foi possível carregar o cadastro criado.")
    return profile_response(row)


@app.get("/api/analyses")
def list_analyses() -> list[dict[str, object]]:
    with connect_database() as connection:
        rows = connection.execute(
            "SELECT id, profile_id, risk_level, indicators, engine, created_at "
            "FROM analyses ORDER BY id DESC"
        ).fetchall()
    return [
        {
            "id": row["id"],
            "profile_id": row["profile_id"],
            "risk_level": row["risk_level"],
            "indicators": row["indicators"].split("|") if row["indicators"] else [],
            "engine": row["engine"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]


@app.post("/api/analyses", status_code=201)
def create_analysis(analysis: AnalysisCreate) -> dict[str, object]:
    if analysis.profile_id is not None:
        with connect_database() as connection:
            profile = connection.execute(
                "SELECT id FROM profiles WHERE id = ?", (analysis.profile_id,)
            ).fetchone()
        if profile is None:
            raise HTTPException(status_code=404, detail="Perfil não encontrado.")

    text = analysis.text.casefold()
    indicator_terms = {
        "urgência": ("urgente", "agora", "imediatamente"),
        "transferência ou pix": ("pix", "transferência", "transferir"),
        "segredo": ("não conta", "segredo", "não fale"),
        "senha ou código": ("senha", "código", "token"),
    }
    indicators = [
        label
        for label, terms in indicator_terms.items()
        if any(term in text for term in terms)
    ]
    risk_level = "high" if len(indicators) >= 2 else "medium" if indicators else "low"
    created_at = datetime.now(timezone.utc).isoformat()
    engine = "mock-rules"

    with connect_database() as connection:
        cursor = connection.execute(
            "INSERT INTO analyses (profile_id, risk_level, indicators, engine, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (
                analysis.profile_id,
                risk_level,
                "|".join(indicators),
                engine,
                created_at,
            ),
        )

    return {
        "id": cursor.lastrowid,
        "profile_id": analysis.profile_id,
        "risk_level": risk_level,
        "indicators": indicators,
        "engine": engine,
        "created_at": created_at,
        "notice": "Resultado demonstrativo por regras; nenhuma IA foi chamada.",
    }
