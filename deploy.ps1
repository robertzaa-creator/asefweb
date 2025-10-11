# =========================================
# ASEFWEB - Script de Deploy Automático (versión final)
# -----------------------------------------
# Flujo completo:
#   1️⃣ Inserta <base> dinámico (por compatibilidad local)
#   2️⃣ Corrige HTML general
#   3️⃣ Limpia duplicados (favicon/meta/base)
#   4️⃣ Repara rutas CSS/JS/pages (asef_paths_hardfix)
#   5️⃣ Valida rutas
#   6️⃣ Build con Vite
#   7️⃣ Commit + Push a GitHub Pages
# =========================================

Write-Host "🚀 Iniciando deploy automático ASEF..." -ForegroundColor Cyan

# ------------------------------------------------------------
# 1️⃣ Inserta base dinámico en HTMLs
# ------------------------------------------------------------
Write-Host "`n🧩 Insertando base dinámico en HTMLs..." -ForegroundColor Yellow
python fix_base_paths.py
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Error en fix_base_paths.py"; exit 1 }

# ------------------------------------------------------------
# 2️⃣ Corrige estructura HTML general
# ------------------------------------------------------------
Write-Host "`n🧹 Corrigiendo HTML de todas las páginas..." -ForegroundColor Yellow
python asef_fix_html_all.py
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Error en asef_fix_html_all.py"; exit 1 }

# ------------------------------------------------------------
# 3️⃣ Limpieza avanzada (favicon/meta/base redundantes)
# ------------------------------------------------------------
Write-Host "`n🧹 Reparando rutas y limpiando duplicados (favicon/meta/base)..." -ForegroundColor Yellow
python asef_fix_assets.py
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Error en asef_fix_assets.py"; exit 1 }

# ------------------------------------------------------------
# 4️⃣ Hard-Fix de rutas CSS/JS/pages para GitHub Pages y Localhost
# ------------------------------------------------------------
Write-Host "`n🎨 Corrigiendo rutas de CSS/JS/pages..." -ForegroundColor Yellow
python asef_paths_hardfix.py
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Error en asef_paths_hardfix.py"; exit 1 }

# ------------------------------------------------------------
# 5️⃣ Validación de rutas y enlaces HTML
# ------------------------------------------------------------
Write-Host "`n🔍 Validando rutas HTML/CSS..." -ForegroundColor Yellow
python asef_validate_paths.py --fix
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Error en asef_validate_paths.py"; exit 1 }

# ------------------------------------------------------------
# 6️⃣ Build con Vite
# ------------------------------------------------------------
Write-Host "`n🏗 Ejecutando build con Vite..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Error durante el build de Vite. Abortando."; exit 1 }

# ------------------------------------------------------------
# 7️⃣ Commit y Push a GitHub
# ------------------------------------------------------------
Write-Host "`n📂 Preparando commit..." -ForegroundColor Yellow
git add -A

$fecha = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$mensaje = "deploy automático ASEF (base + rutas + build) - $fecha"

git commit -m $mensaje
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deploy completado con éxito." -ForegroundColor Green
    Write-Host "🌐 Tu sitio está disponible en:" -ForegroundColor Cyan
    Write-Host "   https://robertzaa-creator.github.io/asefweb/" -ForegroundColor White
} else {
    Write-Host "`n⚠️  El push no se completó correctamente. Revisá el mensaje anterior." -ForegroundColor Red
}

Write-Host "`nFin del proceso." -ForegroundColor Cyan
