"""Integração HTTP com contas, vínculos, simulações e SQLite temporário."""
import csv
import io
import json
import os
from pathlib import Path
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import unittest
from http.cookiejar import CookieJar
from urllib.error import HTTPError
from urllib.request import Request, build_opener, HTTPCookieProcessor


class CrudTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            self.port = sock.getsockname()[1]
        self.env = {**os.environ, "GUARDAI_DATABASE_PATH": str(Path(self.temp.name) / "test.db")}
        self.anonymous = self.client()
        self.start_server()

    def client(self):
        return build_opener(HTTPCookieProcessor(CookieJar()))

    def start_server(self):
        self.process = subprocess.Popen([sys.executable, "-m", "uvicorn", "main:app", "--port", str(self.port), "--host", "127.0.0.1"], cwd=Path(__file__).parent, env=self.env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(100):
            try:
                if self.request("GET", "/health")[0] == 200:
                    return
            except OSError:
                pass
            if self.process.poll() is not None:
                self.fail("Backend encerrou antes de iniciar.")
            time.sleep(0.1)
        self.fail("Backend não iniciou no prazo esperado.")

    def stop_server(self):
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(self.process.pid), "/T", "/F"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        else:
            self.process.terminate()
        self.process.wait(timeout=10)

    def tearDown(self):
        if self.process.poll() is None:
            self.stop_server()
        self.temp.cleanup()

    def request(self, method, path, data=None, client=None):
        req = Request(f"http://127.0.0.1:{self.port}/api{path}", method=method, data=json.dumps(data).encode() if data is not None else None, headers={"Content-Type": "application/json"})
        try:
            response = (client or self.anonymous).open(req, timeout=10)
        except HTTPError as error:
            response = error
        with response:
            body = response.read()
            return response.status, json.loads(body) if body and "application/json" in response.headers.get("Content-Type", "") else body

    def register(self, client, name, phone, kind="senior", consent=True):
        payload = {"name": name, "phone": phone, "account_type": kind, "consent_given": consent if kind == "senior" else False}
        status, result = self.request("POST", "/auth/register", {"profile": payload, "password": "SenhaTeste123"}, client)
        self.assertEqual(status, 201, result)
        return result

    def linked_pair(self, consent=True):
        senior, care = self.client(), self.client()
        person = self.register(senior, "José; Protegido", "11999990001", consent=consent)
        responsible = self.register(care, "Responsável Real", "11999990002", "caregiver")
        status, links = self.request("POST", "/links", {"phone": person["phone"], "relationship": "Mãe e filho"}, care)
        self.assertEqual(status, 201)
        self.assertEqual(self.request("POST", f'/links/{links[0]["id"]}/accept', client=senior)[0], 200)
        return senior, care, person, responsible, links[0]["id"]

    def test_auth_profile_crud_and_session_persistence(self):
        for path in ["/profiles", "/profiles/export.csv", "/links", "/analyses", "/auth/me"]:
            self.assertEqual(self.request("GET", path)[0], 401)
        client = self.client()
        profile = self.register(client, "  Pessoa Real  ", "(11) 99999-1234")
        self.assertEqual(profile["name"], "Pessoa Real")
        self.assertNotIn("password", json.dumps(profile))
        self.assertEqual(self.request("GET", "/auth/me", client=client)[1], profile)
        self.assertEqual(self.request("GET", "/profiles/export.csv", client=client)[0], 403)
        self.assertEqual(self.request("POST", "/auth/login", {"phone": profile["phone"], "password": "errada"})[0], 401)
        status, _ = self.request("POST", "/auth/register", {"profile": {**profile, "phone": "11999991234"}, "password": "SenhaTeste123"})
        self.assertEqual(status, 409)
        edited = {**profile, "name": "Pessoa Atualizada", "phone": "11999994321", "email": "pessoa@example.com", "birth_date": "1952-04-15"}
        status, updated = self.request("PUT", f'/profiles/{profile["id"]}', edited, client)
        self.assertEqual(status, 200)
        self.assertEqual(updated["created_at"], profile["created_at"])
        self.assertEqual(updated["email"], "pessoa@example.com")
        self.assertEqual(updated["birth_date"], "1952-04-15")
        self.stop_server(); self.start_server()
        self.assertEqual(self.request("GET", "/auth/me", client=client)[1]["name"], "Pessoa Atualizada")
        self.assertEqual(self.request("POST", "/auth/logout", client=client)[0], 204)
        self.assertEqual(self.request("GET", "/auth/me", client=client)[0], 401)
        self.assertEqual(self.request("POST", "/auth/login", {"phone": "11999994321", "password": "SenhaTeste123"}, client)[0], 200)
        self.assertEqual(self.request("DELETE", f'/profiles/{profile["id"]}', client=client)[0], 204)
        self.assertEqual(self.request("GET", "/auth/me", client=client)[0], 401)
        self.assertEqual(self.request("POST", "/auth/login", {"phone": "11999994321", "password": "SenhaTeste123"}, client)[0], 401)

    def test_invites_isolation_csv_and_unlink(self):
        senior, care, outsider = self.client(), self.client(), self.client()
        person = self.register(senior, "=José; Família", "11999990001")
        caregiver = self.register(care, "Cuidador Cadastrado", "+5511999990002", "caregiver")
        stranger = self.register(outsider, "Fora do Círculo", "11999990003", "caregiver")
        self.assertEqual(self.request("GET", f'/profiles/{person["id"]}', client=care)[0], 404)
        status, links = self.request("POST", "/links", {"phone": person["phone"], "relationship": "Família"}, care)
        self.assertEqual(status, 201)
        link_id = links[0]["id"]
        self.assertEqual(self.request("GET", "/profiles", client=care)[1], [caregiver])
        self.assertEqual(self.request("POST", f"/links/{link_id}/accept", client=care)[0], 403)
        self.assertEqual(self.request("POST", f"/links/{link_id}/accept", client=outsider)[0], 404)
        self.assertEqual(self.request("POST", f"/links/{link_id}/accept", client=senior)[0], 200)
        self.assertEqual(len(self.request("GET", "/profiles", client=care)[1]), 2)
        self.assertEqual(self.request("PUT", f'/profiles/{person["id"]}', person, care)[0], 403)
        self.assertEqual(self.request("DELETE", f'/profiles/{person["id"]}', client=care)[0], 403)
        status, exported = self.request("GET", "/profiles/export.csv", client=care)
        self.assertEqual(status, 200)
        self.assertTrue(exported.startswith(b"\xef\xbb\xbf"))
        rows = list(csv.reader(io.StringIO(exported.decode("utf-8-sig")), delimiter=";"))
        self.assertEqual(len(rows), 3)
        self.assertIn("'=José; Família", [row[1] for row in rows])
        self.assertNotIn(stranger["name"], exported.decode("utf-8-sig"))
        self.assertIn("'+5511999990002", [row[2] for row in rows])
        self.assertEqual(self.request("POST", "/links", {"phone": person["phone"], "relationship": "Família"}, care)[0], 409)
        self.assertEqual(self.request("DELETE", f"/links/{link_id}", client=outsider)[0], 404)
        self.assertEqual(self.request("DELETE", f"/links/{link_id}", client=senior)[0], 204)
        self.assertEqual(self.request("GET", f'/profiles/{person["id"]}', client=care)[0], 404)
        self.assertEqual(len(self.request("GET", "/profiles", client=care)[1]), 1)

    def test_caregiver_edits_only_accepted_circle_contacts(self):
        senior, care, person, caregiver, link_id = self.linked_pair()
        outsider = self.client()
        self.register(outsider, "Outro Responsável", "11999990009", "caregiver")
        payload = {"profile": {**person, "name": "Contato Editado", "phone": "11999990004", "email": "contato@example.com", "birth_date": "1950-05-12"}, "relationship": "Mãe e cuidador"}
        path = f"/links/{link_id}/member"
        self.assertEqual(self.request("PUT", path, payload, outsider)[0], 404)
        self.assertEqual(self.request("PUT", path, payload, senior)[0], 403)
        self.assertEqual(self.request("PUT", path, {**payload, "profile": {**payload["profile"], "consent_given": False}}, care)[0], 403)
        self.assertEqual(self.request("PUT", path, {**payload, "relationship": " "}, care)[0], 422)
        status, saved = self.request("PUT", path, payload, care)
        self.assertEqual(status, 200)
        self.assertEqual(saved["member"]["name"], "Contato Editado")
        self.assertTrue(saved["member"]["consent_given"])
        self.assertEqual(self.request("GET", "/auth/me", client=senior)[1]["phone"], "11999990004")
        self.assertEqual(self.request("GET", "/links", client=senior)[1][0]["relationship"], "Mãe e cuidador")
        self.stop_server(); self.start_server()
        self.assertEqual(self.request("GET", "/links", client=care)[1][0]["member"]["email"], "contato@example.com")
        duplicate = {"profile": {**payload["profile"], "phone": caregiver["phone"]}, "relationship": "Não deve salvar"}
        self.assertEqual(self.request("PUT", path, duplicate, care)[0], 409)
        self.assertEqual(self.request("GET", "/links", client=care)[1][0]["relationship"], "Mãe e cuidador")
        fresh = self.client()
        self.assertEqual(self.request("POST", "/auth/login", {"phone": "11999990004", "password": "SenhaTeste123"}, fresh)[0], 200)
        self.assertEqual(self.request("DELETE", f"/links/{link_id}", client=care)[0], 204)
        self.assertEqual(self.request("PUT", path, payload, care)[0], 404)
        self.assertEqual(self.request("GET", "/auth/me", client=senior)[0], 200)

    def test_simulation_real_names_review_consent_and_deletion(self):
        senior, care, person, caregiver, link_id = self.linked_pair(consent=False)
        data = {"profile_id": person["id"], "scenario": "safe"}
        self.assertEqual(self.request("POST", "/simulations", data, care)[0], 422)
        self.assertEqual(self.request("PUT", f'/profiles/{person["id"]}', {**person, "consent_given": True}, care)[0], 403)
        self.assertEqual(self.request("PUT", f'/profiles/{person["id"]}', {**person, "consent_given": True}, senior)[0], 200)
        status, analysis = self.request("POST", "/simulations", data, senior)
        self.assertEqual(status, 201)
        self.assertEqual(analysis["source"], caregiver["name"])
        self.assertIn(person["name"], analysis["transcript"][0])
        self.assertEqual(self.request("POST", "/simulations", data, care)[0], 409)
        self.assertEqual(self.request("GET", "/analyses", client=care)[1][0]["id"], analysis["id"])
        self.assertEqual(self.request("PUT", f'/analyses/{analysis["id"]}/review', {"verdict": "scam"}, care)[0], 409)
        self.assertEqual(self.request("POST", f'/analyses/{analysis["id"]}/end', client=care)[0], 200)
        self.assertEqual(self.request("PUT", f'/analyses/{analysis["id"]}/review', {"verdict": "not_scam"}, senior)[0], 403)
        self.assertEqual(self.request("PUT", f'/analyses/{analysis["id"]}/review', {"verdict": "not_scam"}, care)[0], 200)
        self.stop_server(); self.start_server()
        self.assertEqual(self.request("GET", "/analyses", client=senior)[1][0]["verdict"], "not_scam")
        status, suspicious = self.request("POST", "/simulations", {**data, "scenario": "suspicious"}, care)
        self.assertEqual(status, 201)
        self.assertEqual(suspicious["risk_level"], "high")
        self.assertEqual(self.request("DELETE", f"/links/{link_id}", client=senior)[0], 204)
        self.assertEqual(self.request("GET", "/analyses", client=care)[1], [])
        self.assertEqual(self.request("POST", f'/analyses/{suspicious["id"]}/end', client=care)[0], 404)
        self.assertEqual(self.request("DELETE", f'/profiles/{person["id"]}', client=senior)[0], 204)
        self.assertEqual(self.request("GET", "/links", client=care)[1], [])

    def test_validation_and_legacy_migration(self):
        profile = {"name": "Pessoa Teste", "phone": "11999990000", "account_type": "senior"}
        for patch in [{"name": "   "}, {"phone": "abcdefgh"}, {"account_type": "invalido"}, {"account_type": "caregiver", "consent_given": True}]:
            with self.subTest(patch=patch):
                self.assertEqual(self.request("POST", "/auth/register", {"profile": {**profile, **patch}, "password": "SenhaTeste123"})[0], 422)
        self.assertEqual(self.request("POST", "/auth/register", {"profile": profile, "password": "curta"})[0], 422)
        self.stop_server()
        self.env["GUARDAI_DATABASE_PATH"] = str(Path(self.temp.name) / "legacy.db")
        with sqlite3.connect(self.env["GUARDAI_DATABASE_PATH"]) as connection:
            connection.executescript("CREATE TABLE profiles(id INTEGER PRIMARY KEY, name TEXT,phone TEXT,account_type TEXT,consent_given INTEGER,created_at TEXT); CREATE TABLE analyses(id INTEGER PRIMARY KEY,profile_id INTEGER,risk_level TEXT,indicators TEXT,engine TEXT,created_at TEXT); INSERT INTO profiles VALUES(1,'Cadastro Antigo','11999990099','senior',1,'2026-01-01');")
        connection.close()
        self.start_server()
        with sqlite3.connect(self.env["GUARDAI_DATABASE_PATH"]) as connection:
            self.assertEqual(connection.execute("SELECT name FROM profiles WHERE id=1").fetchone()[0], "Cadastro Antigo")
            self.assertIn("relationship", {row[1] for row in connection.execute("PRAGMA table_info(profiles)")})
            self.assertIn("verdict", {row[1] for row in connection.execute("PRAGMA table_info(analyses)")})
        connection.close()


if __name__ == "__main__":
    unittest.main()
