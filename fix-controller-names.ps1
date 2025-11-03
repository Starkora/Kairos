# Script para corregir nombres de controllers en routes
Write-Host "Corrigiendo nombres de controllers en routes..." -ForegroundColor Green

$fixes = @{
    'usuariosController' = 'usuarios.controller'
    'presupuestoController' = 'presupuesto.controller'
    'preferenciasController' = 'preferencias.controller'
    'movimientoRecurrenteController' = 'movimientoRecurrente.controller'
    'insightsController' = 'insights.controller'
    'metaController' = 'meta.controller'
    'deudaController' = 'deuda.controller'
    'googleAuthController' = 'googleAuth.controller'
    'categoriaCuentaController' = 'categoriaCuenta.controller'
}

$routesPath = "c:\Users\nabes\source\repos\Kairos\backend\src\routes"

Get-ChildItem -Path $routesPath -Filter "*.js" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    $changed = $false
    
    foreach ($old in $fixes.Keys) {
        $new = $fixes[$old]
        if ($content -match $old) {
            $content = $content -replace $old, $new
            Write-Host "  Corregido $old -> $new en $($_.Name)" -ForegroundColor Yellow
            $changed = $true
        }
    }
    
    # Corregir rutas de categorías
    if ($content -match "controllers/preferenciasController") {
        $content = $content -replace "controllers/preferenciasController", "controllers/configuracion/preferencias.controller"
        Write-Host "  Corregida ruta de preferencias en $($_.Name)" -ForegroundColor Yellow
        $changed = $true
    }
    
    if ($content -match "controllers/insightsController") {
        $content = $content -replace "controllers/insightsController", "controllers/admin/insights.controller"
        Write-Host "  Corregida ruta de insights en $($_.Name)" -ForegroundColor Yellow
        $changed = $true
    }
    
    if ($content -match "controllers/admin/usuariosController") {
        $content = $content -replace "controllers/admin/usuariosController", "controllers/auth/usuarios.controller"
        Write-Host "  Corregida ruta de usuarios en $($_.Name)" -ForegroundColor Yellow
        $changed = $true
    }
    
    if ($content -match "controllers/finanzas/movimientoRecurrenteController") {
        $content = $content -replace "controllers/finanzas/movimientoRecurrenteController", "controllers/configuracion/movimientoRecurrente.controller"
        Write-Host "  Corregida ruta de movimientoRecurrente en $($_.Name)" -ForegroundColor Yellow
        $changed = $true
    }
    
    if ($content -match "controllers/finanzas/categoriaCuentaController") {
        $content = $content -replace "controllers/finanzas/categoriaCuentaController", "controllers/configuracion/categoriaCuenta.controller"
        Write-Host "  Corregida ruta de categoriaCuenta en $($_.Name)" -ForegroundColor Yellow
        $changed = $true
    }
    
    if ($changed) {
        Set-Content $_.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "  ACTUALIZADO: $($_.Name)" -ForegroundColor Green
    }
}

Write-Host "`n==================================" -ForegroundColor Green
Write-Host "Nombres de controllers corregidos!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
