# =========================================
# ASEFWEB - Deploy Automático Integrado
# -----------------------------------------
# Ejecuta todos los fixers y valida rutas antes del build.
# Compatible con localhost y GitHub Pages.
# =========================================

Write-Host "🚀 Iniciando deploy automático ASEF..." -ForegroundColor Cyan

# ------------------------------------------------------------
# 1️⃣ Inserta <base> dinámico (GitHub Pages / Localhost)
# ------------------------------------------------------------
Write-Host "`n🧩 Insertando base dinámico en HTMLs..." -ForegroundColor Yellow
python fix_base_paths.py
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Error en fix_base_paths.py"; exit 1 }

# ------------------------------------------------------------
# 2️⃣ Corrige HTML general (favicon, type=module, limpieza)
# ------------------------------------------------------------
Write-Host "`n🧹 Corrigiendo HTML de todas las páginas..." -ForegroundColor Yellow
python asef_fix_html_all.py
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Error en asef_fix_html_all.py"; exit 1 }

# ------------------------------------------------------------
# 3️⃣ Valida y corrige rutas internas
# ------------------------------------------------------------
Write-Host "`n🔍 Validando rutas HTML/CSS..." -ForegroundColor Yellow
python asef_validate_paths.py --fix
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Error en asef_validate_paths.py"; exit 1 }

# ------------------------------------------------------------
# 4️⃣ Compila el sitio con Vite
# ------------------------------------------------------------
Write-Host "`n🏗 Ejecutando build con Vite..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Error durante el build. Abortando."; exit 1 }

# ------------------------------------------------------------
# 5️⃣ Commit + Push automático
# ------------------------------------------------------------
Write-Host "`n📂 Preparando commit..." -ForegroundColor Yellow
git add -A
$fecha = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$mensaje = "deploy automático ASEF (base + rutas + build) - $fecha"
git commit -m $mensaje

Write-Host "`n⬆️ Subiendo cambios a GitHub..." -ForegroundColor Yellow
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deploy completado con éxito." -ForegroundColor Green
    Write-Host "🌐 Tu sitio está disponible en:" -ForegroundColor Cyan
    Write-Host "   https://robertzaa-creator.github.io/asefweb/" -ForegroundColor White
} else {
    Write-Host "`n⚠️  El push no se completó correctamente. Revisá el mensaje anterior." -ForegroundColor Red
}

Write-Host "`nFin del proceso." -ForegroundColor Cyan
