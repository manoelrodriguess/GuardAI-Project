# GuardAI — execução local

Protótipo React/Vite com uma API local em Python (FastAPI) e banco SQLite. Os dados de cadastro ficam em `backend/data/guardai.db` e permanecem entre reinicializações.

## Executar em outra máquina (Windows)

Instale Python 3.10 ou superior e Node.js 20.19 ou superior (ou 22.12 ou superior). Abra dois terminais PowerShell na pasta do projeto.

### Backend

No primeiro terminal, entre na pasta `backend`:

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Frontend

No segundo terminal, também aberto na pasta do projeto, entre em `frontend`:

```powershell
cd frontend
npm install
npm run dev
```

Na primeira execução, os comandos de instalação (`python -m pip install ...` e `npm install`) baixam as dependências. Depois, basta iniciar o backend e o frontend com `python -m uvicorn main:app --reload --port 8000` e `npm run dev`, respectivamente. Deixe os dois terminais abertos enquanto usa o projeto; para encerrar, pressione `Ctrl+C` em cada um.

Como alternativa, execute `.\run-local.ps1` na pasta do projeto para instalar o que falta e iniciar os dois serviços juntos.

### Endereços

Os serviços **não usam a mesma porta**:

| Serviço | Endereço |
| --- | --- |
| Frontend | <http://127.0.0.1:5173> |
| Backend (documentação da API) | <http://127.0.0.1:8000/docs> |

O frontend encaminha automaticamente as chamadas `/api` para o backend na porta `8000`. Se uma das portas estiver ocupada, encerre o processo que a utiliza antes de iniciar o projeto.

Os endereços `127.0.0.1` permitem acesso apenas pela própria máquina em que os serviços estão rodando. Para executar em outro computador, inicie o projeto nesse computador e abra os endereços acima nele. Acessar o frontend a partir de um segundo dispositivo na rede exige configuração adicional e não está habilitado por padrão.

## API disponível

- `GET /api/health` — estado da API e do SQLite.
- `GET /api/profiles` e `POST /api/profiles` — listar e cadastrar perfis.
- `GET /api/analyses` e `POST /api/analyses` — consultar análises de demonstração e enviar texto para avaliação.

A avaliação atual usa regras locais (`engine: mock-rules`), não uma IA. O texto enviado para análise não é persistido; apenas o nível de risco e os indicadores são salvos no histórico. Este backend é para desenvolvimento local e ainda não implementa autenticação ou controles de produção.

## Preparação para IA

O endpoint de análises é um ponto inicial para substituir o avaliador demonstrativo por um serviço de IA. Credenciais devem ser configuradas apenas no backend (por variáveis de ambiente); não as coloque no frontend nem no repositório.
