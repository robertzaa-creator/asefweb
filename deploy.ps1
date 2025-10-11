# =========================================
# ASEFWEB - Deploy Automático (PowerShell)
# -----------------------------------------
# Corrige HTML, valida rutas y ejecuta build + push.
# Compatible con localhost y GitHub Pages.
# =========================================

Write-Host "🚀 Iniciando deploy automático ASEF..." -ForegroundColor Cyan

# ------------------------------------------------------------
# 1️⃣ Corregir HTML antes de validar
# ------------------------------------------------------------
Write-Host "`n🧹 Corrigiendo HTML de todas las páginas..." -ForegroundColor Yellow
python asef_fix_html_all.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al ejecutar asef_fix_html_all.py. Abortando." -ForegroundColor Red
    exit 1
}

# ------------------------------------------------------------
# 2️⃣ Validar y corregir rutas en HTML/CSS
# ------------------------------------------------------------
Write-Host "`n🔍 Validando rutas en HTML y CSS..." -ForegroundColor Yellow
python asef_validate_paths.py --fix

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error durante la validación de rutas. Abortando." -ForegroundColor Red
    exit 1
}

# ------------------------------------------------------------
# 3️⃣ Compilar el sitio con Vite
# ------------------------------------------------------------
Write-Host "`n🏗 Ejecutando build con Vite..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error durante el build. Abortando." -ForegroundColor Red
    exit 1
}

# ------------------------------------------------------------
# 4️⃣ Preparar commit y push a GitHub Pages
# ------------------------------------------------------------
Write-Host "`n📂 Preparando commit..." -ForegroundColor Yellow
git add -A

$fecha = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$mensaje = "deploy automático ASEF: validación + corrección de rutas ($fecha)"
git commit -m $mensaje

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
