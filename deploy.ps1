# =========================================
# ASEFWEB - Script de Deploy Automático (PowerShell)
# -----------------------------------------
# Ejecuta validación de rutas, corrige errores, hace commit y push a GitHub Pages.
# Uso:
#   ./deploy.ps1
# =========================================

Write-Host "🚀 Iniciando deploy automático ASEF..." -ForegroundColor Cyan

# 1. Validar y corregir rutas
Write-Host "`n🔍 Validando rutas en HTML/CSS..." -ForegroundColor Yellow
python asef_validate_paths.py --fix

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Error durante la validación. Abortando." -ForegroundColor Red
    exit 1
}

# 2. Confirmar git status
Write-Host "`n📂 Preparando commit..." -ForegroundColor Yellow
git add -A

# 3. Commit con mensaje automático (usa fecha/hora)
$fecha = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$mensaje = "deploy automático ASEF: validación y corrección de rutas ($fecha)"
git commit -m $mensaje

# 4. Push a GitHub
Write-Host "`n⬆️  Subiendo cambios a GitHub..." -ForegroundColor Yellow
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deploy completado con éxito." -ForegroundColor Green
    Write-Host "🌐 Tu sitio está disponible en:" -ForegroundColor Cyan
    Write-Host "   https://robertzaa-creator.github.io/asefweb/" -ForegroundColor White
} else {
    Write-Host "`n⚠️  El push no se completó correctamente. Revisá el mensaje anterior." -ForegroundColor Red
}

Write-Host "`nFin del proceso." -ForegroundColor Cyan
