# GuardAI — desenvolvimento local

Protótipo React/Vite com uma API local em Python (FastAPI) e banco SQLite. Os dados de cadastro ficam em `backend/data/guardai.db` e permanecem entre reinicializações.

## Requisitos

- Python 3.10 ou superior
- Node.js e npm

## Iniciar no Windows

Na raiz do projeto, execute no PowerShell:

```powershell
.\run-local.ps1
```

O script cria o ambiente virtual `.venv`, instala as dependências Python e inicia os dois serviços. Acesse o frontend em <http://127.0.0.1:5173>. A documentação interativa da API fica em <http://127.0.0.1:8000/docs>. Encerre ambos com `Ctrl+C`.

Se a porta 5173 ou 8000 estiver ocupada, feche o serviço que já a utiliza antes de iniciar o protótipo.

## Iniciar manualmente

Terminal 1 — backend:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal 2 — frontend:

```powershell
npm install --no-package-lock
npm run dev -- --host 127.0.0.1 --port 5173
```

O Vite encaminha `/api` para o backend local. Também é possível testar a API diretamente pela interface Swagger em `/docs`.

## API disponível

- `GET /api/health` — estado da API e do SQLite.
- `GET /api/profiles` e `POST /api/profiles` — listar e cadastrar perfis.
- `GET /api/analyses` e `POST /api/analyses` — consultar análises de demonstração e enviar texto para avaliação.

A avaliação atual usa regras locais (`engine: mock-rules`), não uma IA. O texto enviado para análise não é persistido; apenas o nível de risco e os indicadores são salvos no histórico. Este backend é para desenvolvimento local e ainda não implementa autenticação ou controles de produção.

## Preparação para IA

O endpoint de análises é um ponto inicial para substituir o avaliador demonstrativo por um serviço de IA. Credenciais devem ser configuradas apenas no backend (por variáveis de ambiente); não as coloque no frontend nem no repositório.
