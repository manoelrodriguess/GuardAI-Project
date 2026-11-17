# GuardAI

Aplicação React/Vite com API Python/FastAPI e SQLite para cadastro de idosos e responsáveis, Círculo de Segurança e simulações de chamadas.

## Executar no Windows

Requisitos: Python 3.10+ e Node.js 20.19+ ou 22.12+.

Abra dois terminais PowerShell na pasta interna `Prototipo de Onboarding e Cadastro`.

**Backend — primeira instalação:**

powershell

cd backend

python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt


Depois, dentro de `backend`, inicie a API:

powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000


**Frontend — segundo terminal:**

powershell

cd frontend

npm install
npm run dev


Nas próximas execuções, não é necessário reinstalar as dependências nem recriar `.venv`.

- Site: http://127.0.0.1:5173
- Documentação da API: http://127.0.0.1:8000/docs
- Para encerrar: `Ctrl+C` nos dois terminais.

## Testar o sistema

1. Cadastre um idoso e um responsável com telefones diferentes. Entre com telefone e senha.
2. Em **Menu → Círculo de Segurança**, adicione a outra pessoa pelo telefone. Entre na outra conta e aceite o convite.
3. Para usar as duas contas simultaneamente, abra uma janela normal e outra anônima.
4. O idoso autoriza o monitoramento no cadastro ou nas configurações. No painel, use **Iniciar demonstração**; o responsável pode acompanhar a chamada e registrar seu parecer.
5. Consulte o **Histórico** para conferir os resultados salvos. As chamadas e os dados do catálogo são demonstrativos.

## Editar, excluir e exportar

- **Minha conta:** Configurações → Editar perfil ou Excluir minha conta.
- **Pessoas vinculadas:** na conta do responsável, Configurações → Dados do meu círculo → botão de lápis. Permite editar os dados ou excluir o vínculo, preservando a conta da pessoa.
- **CSV:** nessa mesma tela, clique em Exportar CSV. O navegador baixa `guardai-perfis.csv`, com separador `;`, para abrir no Excel ou LibreOffice.

Os dados permanecem em `backend/data/guardai.db`. Editar o CSV não altera o banco. Alterações de telefone passam a valer no login.

## Cadastros antigos sem senha

Dentro de `backend`, liste os cadastros e ative o ID desejado, substituindo `1`:

powershell
.\.venv\Scripts\python.exe activate_profile.py --list
.\.venv\Scripts\python.exe activate_profile.py --profile-id 1


O terminal solicitará uma senha para entrar no site.
