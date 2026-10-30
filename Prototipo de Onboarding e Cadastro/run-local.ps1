$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$python = Join-Path $root ".venv\Scripts\python.exe"
$requirements = Join-Path $root "backend\requirements.txt"

if (-not (Test-Path $python)) {
    python -m venv (Join-Path $root ".venv")
    if ($LASTEXITCODE -ne 0) {
        throw "Não foi possível criar o ambiente virtual Python."
    }
}

& $python -m pip install -r $requirements
if ($LASTEXITCODE -ne 0) {
    throw "Não foi possível instalar as dependências do backend."
}

if (-not (Test-Path (Join-Path $root "node_modules"))) {
    npm install --no-package-lock
    if ($LASTEXITCODE -ne 0) {
        throw "Não foi possível instalar as dependências do frontend."
    }
}

$backend = Start-Process -FilePath $python `
    -ArgumentList @("-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000") `
    -WorkingDirectory $root `
    -PassThru

try {
    Write-Host "Backend: http://127.0.0.1:8000/docs"
    Write-Host "Frontend: http://127.0.0.1:5173"
    npm run dev -- --host 127.0.0.1 --port 5173
    if ($LASTEXITCODE -ne 0) {
        throw "O servidor do frontend encerrou com erro."
    }
}
finally {
    if (-not $backend.HasExited) {
        Stop-Process -Id $backend.Id
    }
}
