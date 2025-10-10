# ============================================================
# ASEF Web - Script de desarrollo
# Limpia caché de Vite y levanta el servidor local en puerto 5174
# ============================================================

Write-Host "🚀 Iniciando entorno de desarrollo ASEF..." -ForegroundColor Cyan

# 1. Detener cualquier proceso Vite activo (opcional)
Write-Host "🧹 Cerrando procesos previos de Vite..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -like "*vite*" } | ForEach-Object {
    try {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    } catch {}
}

# 2. Borrar carpeta de caché .vite
$viteCache = "node_modules/.vite"
if (Test-Path $viteCache) {
    Write-Host "🧹 Eliminando caché de Vite..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $viteCache
} else {
    Write-Host "✅ No hay caché de Vite para eliminar." -ForegroundColor Green
}

# 3. Verificar existencia del vite.config.js
if (!(Test-Path "vite.config.js")) {
    Write-Host "⚠️ No se encontró vite.config.js. ¿Generarlo con el script asef_env.py?" -ForegroundColor Red
    exit
}

# 4. Levantar Vite en modo desarrollo
Write-Host "🌐 Ejecutando Vite..." -ForegroundColor Cyan
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run dev"

Write-Host "`n✅ Entorno ASEF listo en: http://localhost:5174/pages/socios/dashboard.html" -ForegroundColor Green
Write-Host "🖱️ Presioná Ctrl + C en la ventana del servidor para detenerlo."
