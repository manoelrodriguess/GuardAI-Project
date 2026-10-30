$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$backendPath = Join-Path $root "backend"
$frontendPath = Join-Path $root "frontend"
$python = Join-Path $backendPath ".venv\Scripts\python.exe"
$requirements = Join-Path $backendPath "requirements.txt"

if (-not (Test-Path $python)) {
    python -m venv (Join-Path $backendPath ".venv")
    if ($LASTEXITCODE -ne 0) {
        throw "Não foi possível criar o ambiente virtual Python."
    }
}

& $python -m pip install -r $requirements
if ($LASTEXITCODE -ne 0) {
    throw "Não foi possível instalar as dependências do backend."
}

if (-not (Test-Path (Join-Path $frontendPath "node_modules"))) {
    Push-Location $frontendPath
    try {
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Não foi possível instalar as dependências do frontend."
        }
    }
    finally {
        Pop-Location
    }
}

$backend = Start-Process -FilePath $python `
    -ArgumentList @("-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000") `
    -WorkingDirectory $backendPath `
    -PassThru

try {
    Write-Host "Backend: http://127.0.0.1:8000/docs"
    Write-Host "Frontend: http://127.0.0.1:5173"
    Push-Location $frontendPath
    try {
        npm run dev
        if ($LASTEXITCODE -ne 0) {
            throw "O servidor do frontend encerrou com erro."
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    if (-not $backend.HasExited) {
        Stop-Process -Id $backend.Id
    }
}
