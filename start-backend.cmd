@echo off
setlocal enabledelayedexpansion

REM Resolve repo root
cd /d "%~dp0"

echo.
echo === CATRE Ipitinga - Inicializando backend ===

REM Ensure root dependencies (workspaces) are installed
if not exist "node_modules" (
  echo Instalando dependencias principais...
  call npm install || goto :error
)

REM Ensure backend dependencies are installed
if not exist "backend\node_modules" (
  echo Instalando dependencias do backend...
  pushd backend
  call npm install || goto :error
  popd
)

echo Iniciando servidor backend em http://localhost:3001 ...
echo (Pressione CTRL+C para finalizar)
echo.

REM Use script otimisado para Windows quando disponivel
pushd backend
if exist package.json (
  call npm run dev:win || goto :error
) else (
  echo Nao foi possivel encontrar o backend no diretorio esperado.
  goto :error
)
popd

goto :eof

:error
echo.
echo Ocorreu um erro ao iniciar o backend. Verifique as mensagens acima.
exit /b 1
