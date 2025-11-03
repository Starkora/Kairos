# Script para actualizar imports en controllers y routes del backend
Write-Host "Actualizando imports en backend..." -ForegroundColor Green

$ErrorActionPreference = "Continue"

# ============================================
# ACTUALIZAR CONTROLLERS
# ============================================
$controllersPath = "c:\Users\nabes\source\repos\Kairos\backend\src\controllers"

Get-ChildItem -Path $controllersPath -Recurse -Filter "*.js" | ForEach-Object {
    Write-Host "`nActualizando $($_.Name)..." -ForegroundColor Cyan
    
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    $updated = $false
    
    # Actualizar referencias a modelos (van hacia arriba)
    if ($content -match "require\('\./\.\.") {
        $content = $content -replace "require\('\.\./\.\./models/", "require('../../models/"
        $updated = $true
    }
    
    # Actualizar referencias a utils
    if ($content -match "\.\.\/\.\.\/utils") {
        $content = $content -replace "'\.\./\.\./utils/mailer'", "'../../utils/notifications/mailer'"
        $content = $content -replace "'\.\./\.\./utils/sms'", "'../../utils/notifications/sms'"
        $content = $content -replace "'\.\./\.\./utils/auth'", "'../../utils/auth/jwt'"
        $content = $content -replace "'\.\./\.\./utils/captcha'", "'../../utils/security/captcha'"
        $updated = $true
    }
    
    if ($updated) {
        Set-Content $_.FullName -Value $content -Encoding UTF8
        Write-Host "  Actualizado $($_.Name)" -ForegroundColor Green
    } else {
        Write-Host "  Sin cambios necesarios" -ForegroundColor Gray
    }
}

# ============================================
# ACTUALIZAR ROUTES
# ============================================
$routesPath = "c:\Users\nabes\source\repos\Kairos\backend\src\routes"

Get-ChildItem -Path $routesPath -Filter "*.js" | ForEach-Object {
    Write-Host "`nActualizando route $($_.Name)..." -ForegroundColor Cyan
    
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    $updated = $false
    
    # Actualizar referencias a controllers
    if ($content -match "\.\./controllers/") {
        # Los controllers ahora estan en ../controllers/[categoria]/
        # Determinar la categoria basada en el archivo
        $routeName = $_.BaseName
        
        if ($routeName -match "auth|register|login|password|verify") {
            $content = $content -replace "require\('\.\./controllers/([^']+)'\)", "require('../controllers/auth/`$1')"
            $updated = $true
        }
        elseif ($routeName -match "cuenta|movimiento|presupuesto|deuda|meta") {
            $content = $content -replace "require\('\.\./controllers/([^']+)'\)", "require('../controllers/finanzas/`$1')"
            $updated = $true
        }
        elseif ($routeName -match "categoria|notificacion|perfil") {
            $content = $content -replace "require\('\.\./controllers/([^']+)'\)", "require('../controllers/configuracion/`$1')"
            $updated = $true
        }
        elseif ($routeName -match "admin|usuario|pendiente") {
            $content = $content -replace "require\('\.\./controllers/([^']+)'\)", "require('../controllers/admin/`$1')"
            $updated = $true
        }
    }
    
    # Actualizar referencias a middlewares
    if ($content -match "\.\./utils/admin") {
        $content = $content -replace "require\('\.\./utils/admin'\)", "require('../middlewares/admin.middleware')"
        $updated = $true
    }
    
    if ($updated) {
        Set-Content $_.FullName -Value $content -Encoding UTF8
        Write-Host "  Actualizado $($_.Name)" -ForegroundColor Green
    } else {
        Write-Host "  Sin cambios necesarios" -ForegroundColor Gray
    }
}

Write-Host "`nImports del backend actualizados!" -ForegroundColor Green
