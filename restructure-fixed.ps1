# Script de reestructuracion para Kairos - Frontend y Backend
Write-Host "Iniciando reestructuracion de Kairos..." -ForegroundColor Green

$ErrorActionPreference = "Continue"

# BACKEND RESTRUCTURING
Write-Host "`nBACKEND: Moviendo archivos..." -ForegroundColor Cyan

$backendRoot = "c:\Users\nabes\source\repos\Kairos\backend"

# 1. Mover archivos de configuracion
Write-Host "  Moviendo archivos de configuracion..." -ForegroundColor Yellow
if (Test-Path "$backendRoot\db.js") {
    Move-Item "$backendRoot\db.js" "$backendRoot\config\database.js" -Force
}
if (Test-Path "$backendRoot\sequelize.js") {
    Move-Item "$backendRoot\sequelize.js" "$backendRoot\config\sequelize.js" -Force
}

# 2. Crear directorio src/models si no existe
if (!(Test-Path "$backendRoot\src\models")) {
    New-Item -ItemType Directory -Path "$backendRoot\src\models" -Force | Out-Null
}

# 3. Crear directorio src/routes si no existe
if (!(Test-Path "$backendRoot\src\routes")) {
    New-Item -ItemType Directory -Path "$backendRoot\src\routes" -Force | Out-Null
}

# 4. Mover controllers a src/controllers/
Write-Host "  Reorganizando controllers..." -ForegroundColor Yellow

# Auth controllers
if (Test-Path "$backendRoot\controllers\googleAuthController.js") {
    Move-Item "$backendRoot\controllers\googleAuthController.js" "$backendRoot\src\controllers\auth\googleAuth.controller.js" -Force
}
if (Test-Path "$backendRoot\controllers\usuariosController.js") {
    Move-Item "$backendRoot\controllers\usuariosController.js" "$backendRoot\src\controllers\auth\usuarios.controller.js" -Force
}
if (Test-Path "$backendRoot\controllers\usuarioController.js") {
    Move-Item "$backendRoot\controllers\usuarioController.js" "$backendRoot\src\controllers\auth\usuario.controller.js" -Force
}

# Finanzas controllers
if (Test-Path "$backendRoot\controllers\transaccionController.js") {
    Move-Item "$backendRoot\controllers\transaccionController.js" "$backendRoot\src\controllers\finanzas\transaccion.controller.js" -Force
}
if (Test-Path "$backendRoot\controllers\cuentaController.js") {
    Move-Item "$backendRoot\controllers\cuentaController.js" "$backendRoot\src\controllers\finanzas\cuenta.controller.js" -Force
}
if (Test-Path "$backendRoot\controllers\presupuestoController.js") {
    Move-Item "$backendRoot\controllers\presupuestoController.js" "$backendRoot\src\controllers\finanzas\presupuesto.controller.js" -Force
}
if (Test-Path "$backendRoot\controllers\deudaController.js") {
    Move-Item "$backendRoot\controllers\deudaController.js" "$backendRoot\src\controllers\finanzas\deuda.controller.js" -Force
}
if (Test-Path "$backendRoot\controllers\metaController.js") {
    Move-Item "$backendRoot\controllers\metaController.js" "$backendRoot\src\controllers\finanzas\meta.controller.js" -Force
}

# Configuracion controllers
if (Test-Path "$backendRoot\controllers\categoriaController.js") {
    Move-Item "$backendRoot\controllers\categoriaController.js" "$backendRoot\src\controllers\configuracion\categoria.controller.js" -Force
}
if (Test-Path "$backendRoot\controllers\categoriaCuentaController.js") {
    Move-Item "$backendRoot\controllers\categoriaCuentaController.js" "$backendRoot\src\controllers\configuracion\categoriaCuenta.controller.js" -Force
}
if (Test-Path "$backendRoot\controllers\notificacionesController.js") {
    Move-Item "$backendRoot\controllers\notificacionesController.js" "$backendRoot\src\controllers\configuracion\notificaciones.controller.js" -Force
}
if (Test-Path "$backendRoot\controllers\preferenciasController.js") {
    Move-Item "$backendRoot\controllers\preferenciasController.js" "$backendRoot\src\controllers\configuracion\preferencias.controller.js" -Force
}
if (Test-Path "$backendRoot\controllers\movimientoRecurrenteController.js") {
    Move-Item "$backendRoot\controllers\movimientoRecurrenteController.js" "$backendRoot\src\controllers\configuracion\movimientoRecurrente.controller.js" -Force
}

# Insights controller
if (Test-Path "$backendRoot\controllers\insightsController.js") {
    Move-Item "$backendRoot\controllers\insightsController.js" "$backendRoot\src\controllers\insights.controller.js" -Force
}

# 5. Mover models a src/models/
Write-Host "  Moviendo models..." -ForegroundColor Yellow
if (Test-Path "$backendRoot\models\*.js") {
    Get-ChildItem "$backendRoot\models\*.js" | ForEach-Object {
        Move-Item $_.FullName "$backendRoot\src\models\$($_.Name)" -Force
    }
}

# 6. Mover routes a src/routes/
Write-Host "  Moviendo routes..." -ForegroundColor Yellow
if (Test-Path "$backendRoot\routes\*.js") {
    Get-ChildItem "$backendRoot\routes\*.js" | ForEach-Object {
        Move-Item $_.FullName "$backendRoot\src\routes\$($_.Name)" -Force
    }
}

# 7. Reorganizar utils
Write-Host "  Reorganizando utils..." -ForegroundColor Yellow
if (Test-Path "$backendRoot\utils\auth.js") {
    Move-Item "$backendRoot\utils\auth.js" "$backendRoot\src\utils\auth\jwt.js" -Force
}
if (Test-Path "$backendRoot\utils\mailer.js") {
    Move-Item "$backendRoot\utils\mailer.js" "$backendRoot\src\utils\notifications\mailer.js" -Force
}
if (Test-Path "$backendRoot\utils\sms.js") {
    Move-Item "$backendRoot\utils\sms.js" "$backendRoot\src\utils\notifications\sms.js" -Force
}
if (Test-Path "$backendRoot\utils\captcha.js") {
    Move-Item "$backendRoot\utils\captcha.js" "$backendRoot\src\utils\security\captcha.js" -Force
}
if (Test-Path "$backendRoot\utils\rateLimiter.js") {
    Move-Item "$backendRoot\utils\rateLimiter.js" "$backendRoot\src\utils\security\rateLimiter.js" -Force
}
if (Test-Path "$backendRoot\utils\admin.js") {
    Move-Item "$backendRoot\utils\admin.js" "$backendRoot\src\middlewares\admin.middleware.js" -Force
}

# 8. Mover migrations
Write-Host "  Moviendo migrations..." -ForegroundColor Yellow
if (Test-Path "$backendRoot\migrations\*.sql") {
    Get-ChildItem "$backendRoot\migrations\*.sql" | ForEach-Object {
        Move-Item $_.FullName "$backendRoot\database\migrations\$($_.Name)" -Force
    }
}

# FRONTEND RESTRUCTURING
Write-Host "`nFRONTEND: Moviendo archivos..." -ForegroundColor Cyan

$frontendRoot = "c:\Users\nabes\source\repos\Kairos\web\src"

# 1. Mover estilos
Write-Host "  Moviendo estilos..." -ForegroundColor Yellow
if (Test-Path "$frontendRoot\index.css") {
    Move-Item "$frontendRoot\index.css" "$frontendRoot\styles\index.css" -Force
}
if (Test-Path "$frontendRoot\App.css") {
    Move-Item "$frontendRoot\App.css" "$frontendRoot\styles\App.css" -Force
}

# 2. Mover componentes shared a ui
Write-Host "  Moviendo componentes shared a ui..." -ForegroundColor Yellow
if (Test-Path "$frontendRoot\components\shared\*.tsx") {
    Get-ChildItem "$frontendRoot\components\shared\*.tsx" | ForEach-Object {
        Move-Item $_.FullName "$frontendRoot\components\ui\$($_.Name)" -Force
    }
}
if (Test-Path "$frontendRoot\components\shared\*.ts") {
    Get-ChildItem "$frontendRoot\components\shared\*.ts" | ForEach-Object {
        Move-Item $_.FullName "$frontendRoot\components\ui\$($_.Name)" -Force
    }
}
if (Test-Path "$frontendRoot\components\shared\*.md") {
    Get-ChildItem "$frontendRoot\components\shared\*.md" | ForEach-Object {
        Move-Item $_.FullName "$frontendRoot\components\ui\$($_.Name)" -Force
    }
}

# 3. Mover Sidebar a layout
Write-Host "  Moviendo componentes de layout..." -ForegroundColor Yellow
if (Test-Path "$frontendRoot\components\Sidebar.tsx") {
    Move-Item "$frontendRoot\components\Sidebar.tsx" "$frontendRoot\components\layout\Sidebar.tsx" -Force
}
if (Test-Path "$frontendRoot\components\Sidebar.css") {
    Move-Item "$frontendRoot\components\Sidebar.css" "$frontendRoot\components\layout\Sidebar.css" -Force
}

# 4. Mover componentes de auth a features
Write-Host "  Moviendo componentes de features..." -ForegroundColor Yellow
if (Test-Path "$frontendRoot\components\GoogleAuthButton.tsx") {
    Move-Item "$frontendRoot\components\GoogleAuthButton.tsx" "$frontendRoot\components\features\auth\GoogleAuthButton.tsx" -Force
}
if (Test-Path "$frontendRoot\components\LogoutButton.tsx") {
    Move-Item "$frontendRoot\components\LogoutButton.tsx" "$frontendRoot\components\features\auth\LogoutButton.tsx" -Force
}
if (Test-Path "$frontendRoot\components\ApiEndpointBadge.tsx") {
    Move-Item "$frontendRoot\components\ApiEndpointBadge.tsx" "$frontendRoot\components\features\admin\ApiEndpointBadge.tsx" -Force
}

# 5. Reorganizar paginas
Write-Host "  Reorganizando paginas por feature..." -ForegroundColor Yellow

# Auth pages
if (Test-Path "$frontendRoot\components\Login.tsx") {
    Move-Item "$frontendRoot\components\Login.tsx" "$frontendRoot\pages\Auth\Login.tsx" -Force
}
if (Test-Path "$frontendRoot\components\RecuperarPassword.tsx") {
    Move-Item "$frontendRoot\components\RecuperarPassword.tsx" "$frontendRoot\pages\Auth\RecuperarPassword.tsx" -Force
}
if (Test-Path "$frontendRoot\pages\RecuperarPasswordPage.tsx") {
    Move-Item "$frontendRoot\pages\RecuperarPasswordPage.tsx" "$frontendRoot\pages\Auth\RecuperarPasswordPage.tsx" -Force
}

# Dashboard
if (Test-Path "$frontendRoot\components\Dashboard.tsx") {
    Move-Item "$frontendRoot\components\Dashboard.tsx" "$frontendRoot\pages\Dashboard\Dashboard.tsx" -Force
}

# Transacciones
if (Test-Path "$frontendRoot\components\Registro.tsx") {
    Move-Item "$frontendRoot\components\Registro.tsx" "$frontendRoot\pages\Transacciones\Registro.tsx" -Force
}
if (Test-Path "$frontendRoot\components\Calendario.tsx") {
    Move-Item "$frontendRoot\components\Calendario.tsx" "$frontendRoot\pages\Transacciones\Calendario.tsx" -Force
}

# Finanzas
if (Test-Path "$frontendRoot\components\Cuentas.tsx") {
    Move-Item "$frontendRoot\components\Cuentas.tsx" "$frontendRoot\pages\Finanzas\Cuentas.tsx" -Force
}
if (Test-Path "$frontendRoot\components\DeudasMetas.tsx") {
    Move-Item "$frontendRoot\components\DeudasMetas.tsx" "$frontendRoot\pages\Finanzas\DeudasMetas.tsx" -Force
}
if (Test-Path "$frontendRoot\pages\Presupuestos.tsx") {
    Move-Item "$frontendRoot\pages\Presupuestos.tsx" "$frontendRoot\pages\Finanzas\Presupuestos.tsx" -Force
}

# Configuracion
if (Test-Path "$frontendRoot\components\Categorias.tsx") {
    Move-Item "$frontendRoot\components\Categorias.tsx" "$frontendRoot\pages\Configuracion\Categorias.tsx" -Force
}
if (Test-Path "$frontendRoot\components\Categorias.css") {
    Move-Item "$frontendRoot\components\Categorias.css" "$frontendRoot\pages\Configuracion\Categorias.css" -Force
}
if (Test-Path "$frontendRoot\components\CategoriasCuenta.tsx") {
    Move-Item "$frontendRoot\components\CategoriasCuenta.tsx" "$frontendRoot\pages\Configuracion\CategoriasCuenta.tsx" -Force
}
if (Test-Path "$frontendRoot\components\Notificaciones.tsx") {
    Move-Item "$frontendRoot\components\Notificaciones.tsx" "$frontendRoot\pages\Configuracion\Notificaciones.tsx" -Force
}
if (Test-Path "$frontendRoot\components\MiCuenta.tsx") {
    Move-Item "$frontendRoot\components\MiCuenta.tsx" "$frontendRoot\pages\Configuracion\MiCuenta.tsx" -Force
}
if (Test-Path "$frontendRoot\pages\MovimientosRecurrentes.tsx") {
    Move-Item "$frontendRoot\pages\MovimientosRecurrentes.tsx" "$frontendRoot\pages\Configuracion\MovimientosRecurrentes.tsx" -Force
}

# Asesor
if (!(Test-Path "$frontendRoot\pages\Asesor")) {
    New-Item -ItemType Directory -Path "$frontendRoot\pages\Asesor" -Force | Out-Null
}
if (Test-Path "$frontendRoot\pages\Asesor.tsx") {
    Move-Item "$frontendRoot\pages\Asesor.tsx" "$frontendRoot\pages\Asesor\Asesor.tsx" -Force
}

# Acerca de
if (Test-Path "$frontendRoot\components\AcercaContent.tsx") {
    Move-Item "$frontendRoot\components\AcercaContent.tsx" "$frontendRoot\pages\AcercaDe\AcercaContent.tsx" -Force
}
if (Test-Path "$frontendRoot\components\AcercaDe.tsx") {
    Move-Item "$frontendRoot\components\AcercaDe.tsx" "$frontendRoot\pages\AcercaDe\AcercaDe.tsx" -Force
}
if (Test-Path "$frontendRoot\components\AcercaPublic.tsx") {
    Move-Item "$frontendRoot\components\AcercaPublic.tsx" "$frontendRoot\pages\AcercaDe\AcercaPublic.tsx" -Force
}

# Admin
if (Test-Path "$frontendRoot\components\AdminUsuariosPendientes.tsx") {
    Move-Item "$frontendRoot\components\AdminUsuariosPendientes.tsx" "$frontendRoot\pages\Admin\UsuariosPendientes.tsx" -Force
}

Write-Host "`nReestructuracion completada!" -ForegroundColor Green
Write-Host "`nIMPORTANTE: Ahora necesitas actualizar los imports en los archivos." -ForegroundColor Yellow
Write-Host "Ejecuta: npm run start (frontend) y node index.js (backend) para verificar errores." -ForegroundColor Yellow
