"""Servidor exclusivo dos testes de navegador, com banco descartável."""
import os
import tempfile
from pathlib import Path
import uvicorn

if __name__ == "__main__":
    with tempfile.TemporaryDirectory(prefix="guardai-e2e-") as directory:
        os.environ["GUARDAI_DATABASE_PATH"] = str(Path(directory) / "e2e.db")
        uvicorn.run("main:app", host="127.0.0.1", port=int(os.environ.get("GUARDAI_TEST_PORT", "8011")))
