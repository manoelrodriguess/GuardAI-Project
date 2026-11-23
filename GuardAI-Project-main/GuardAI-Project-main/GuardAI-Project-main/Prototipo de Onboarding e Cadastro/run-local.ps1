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

& $python -c "import importlib.util, sys; sys.exit(0 if all(importlib.util.find_spec(name) for name in ('fastapi', 'uvicorn')) else 1)"
if ($LASTEXITCODE -ne 0) {
    & $python -m pip install -r $requirements
    if ($LASTEXITCODE -ne 0) {
        throw "Não foi possível instalar as dependências do backend."
    }
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
    -WindowStyle Hidden `
    -PassThru

try {
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if ($backend.HasExited) { throw "O backend não iniciou. Confira se a porta 8000 está livre." }
        try {
            $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health" -TimeoutSec 2
            if ($health.status -eq "ok") { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $ready) { throw "O backend não respondeu. Confira as dependências e a porta 8000." }
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
