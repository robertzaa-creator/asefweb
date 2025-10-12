# =========================================
# ASEFWEB - Deploy Automático
# Reparación integral + Build + Push
# =========================================

Write-Host "🚀 Iniciando deploy automático ASEF..." -ForegroundColor Cyan

# 0) Reparación integral
Write-Host "`n🧹 Reparando HTML (base dinámico, rutas, favicon, scripts)..." -ForegroundColor Yellow
python .\asef_repair_all.py
if ($LASTEXITCODE -ne 0) {
  Write-Host "`n❌ Error en la reparación. Abortando." -ForegroundColor Red
  exit 1
}

# 1) Build con Vite
Write-Host "`n🏗 Ejecutando build con Vite..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "`n❌ Error durante el build. Abortando." -ForegroundColor Red
  exit 1
}

# 2) Commit & Push
Write-Host "`n📂 Preparando commit..." -ForegroundColor Yellow
git add -A
$fecha = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$mensaje = "deploy automático ASEF (repair-all + build) - $fecha"
git commit -m $mensaje

Write-Host "`n⬆️  Subiendo cambios a GitHub..." -ForegroundColor Yellow
git push

if ($LASTEXITCODE -eq 0) {
  Write-Host "`n✅ Deploy completado con éxito." -ForegroundColor Green
  Write-Host "🌐 Producción (GitHub Pages): https://robertzaa-creator.github.io/asefweb/" -ForegroundColor White
} else {
  Write-Host "`n⚠️  El push no se completó correctamente. Revisá el mensaje anterior." -ForegroundColor Red
}
