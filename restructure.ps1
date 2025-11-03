# Script de reestructuración para Kairos - Frontend y Backend
Write-Host "🚀 Iniciando reestructuración de Kairos..." -ForegroundColor Green

$ErrorActionPreference = "Stop"

# ============================================
# BACKEND RESTRUCTURING
# ============================================
Write-Host "`n📦 BACKEND: Moviendo archivos..." -ForegroundColor Cyan

$backendRoot = "c:\Users\nabes\source\repos\Kairos\backend"

# 1. Mover archivos de configuración
Write-Host "  → Moviendo archivos de configuración..." -ForegroundColor Yellow
Move-Item "$backendRoot\db.js" "$backendRoot\config\database.js" -Force -ErrorAction SilentlyContinue
Move-Item "$backendRoot\sequelize.js" "$backendRoot\config\sequelize.js" -Force -ErrorAction SilentlyContinue

# 2. Mover controllers a src/controllers/
Write-Host "  → Reorganizando controllers..." -ForegroundColor Yellow

# Auth controllers
Move-Item "$backendRoot\controllers\googleAuthController.js" "$backendRoot\src\controllers\auth\googleAuth.controller.js" -Force -ErrorAction SilentlyContinue
Move-Item "$backendRoot\controllers\usuariosController.js" "$backendRoot\src\controllers\auth\usuarios.controller.js" -Force -ErrorAction SilentlyContinue
Move-Item "$backendRoot\controllers\usuarioController.js" "$backendRoot\src\controllers\auth\usuario.controller.js" -Force -ErrorAction SilentlyContinue

# Finanzas controllers
Move-Item "$backendRoot\controllers\transaccionController.js" "$backendRoot\src\controllers\finanzas\transaccion.controller.js" -Force -ErrorAction SilentlyContinue
Move-Item "$backendRoot\controllers\cuentaController.js" "$backendRoot\src\controllers\finanzas\cuenta.controller.js" -Force -ErrorAction SilentlyContinue
Move-Item "$backendRoot\controllers\presupuestoController.js" "$backendRoot\src\controllers\finanzas\presupuesto.controller.js" -Force -ErrorAction SilentlyContinue
Move-Item "$backendRoot\controllers\deudaController.js" "$backendRoot\src\controllers\finanzas\deuda.controller.js" -Force -ErrorAction SilentlyContinue
Move-Item "$backendRoot\controllers\metaController.js" "$backendRoot\src\controllers\finanzas\meta.controller.js" -Force -ErrorAction SilentlyContinue

# Configuración controllers
Move-Item "$backendRoot\controllers\categoriaController.js" "$backendRoot\src\controllers\configuracion\categoria.controller.js" -Force -ErrorAction SilentlyContinue
Move-Item "$backendRoot\controllers\categoriaCuentaController.js" "$backendRoot\src\controllers\configuracion\categoriaCuenta.controller.js" -Force -ErrorAction SilentlyContinue
Move-Item "$backendRoot\controllers\notificacionesController.js" "$backendRoot\src\controllers\configuracion\notificaciones.controller.js" -Force -ErrorAction SilentlyContinue
Move-Item "$backendRoot\controllers\preferenciasController.js" "$backendRoot\src\controllers\configuracion\preferencias.controller.js" -Force -ErrorAction SilentlyContinue
Move-Item "$backendRoot\controllers\movimientoRecurrenteController.js" "$backendRoot\src\controllers\configuracion\movimientoRecurrente.controller.js" -Force -ErrorAction SilentlyContinue

# Insights controller
Move-Item "$backendRoot\controllers\insightsController.js" "$backendRoot\src\controllers\insights.controller.js" -Force -ErrorAction SilentlyContinue

# 3. Mover models a src/models/
Write-Host "  → Moviendo models..." -ForegroundColor Yellow
if (Test-Path "$backendRoot\models") {
    Move-Item "$backendRoot\models\*" "$backendRoot\src\models\" -Force -ErrorAction SilentlyContinue
}

# 4. Mover routes a src/routes/
Write-Host "  → Moviendo routes..." -ForegroundColor Yellow
if (Test-Path "$backendRoot\routes") {
    Move-Item "$backendRoot\routes\*" "$backendRoot\src\routes\" -Force -ErrorAction SilentlyContinue
}

# 5. Reorganizar utils
Write-Host "  → Reorganizando utils..." -ForegroundColor Yellow
Move-Item "$backendRoot\utils\auth.js" "$backendRoot\src\utils\auth\jwt.js" -Force -ErrorAction SilentlyContinue
Move-Item "$backendRoot\utils\mailer.js" "$backendRoot\src\utils\notifications\mailer.js" -Force -ErrorAction SilentlyContinue
Move-Item "$backendRoot\utils\sms.js" "$backendRoot\src\utils\notifications\sms.js" -Force -ErrorAction SilentlyContinue
Move-Item "$backendRoot\utils\captcha.js" "$backendRoot\src\utils\security\captcha.js" -Force -ErrorAction SilentlyContinue
Move-Item "$backendRoot\utils\rateLimiter.js" "$backendRoot\src\utils\security\rateLimiter.js" -Force -ErrorAction SilentlyContinue
Move-Item "$backendRoot\utils\admin.js" "$backendRoot\src\middlewares\admin.middleware.js" -Force -ErrorAction SilentlyContinue

# 6. Mover migrations
Write-Host "  → Moviendo migrations..." -ForegroundColor Yellow
if (Test-Path "$backendRoot\migrations") {
    Move-Item "$backendRoot\migrations\*" "$backendRoot\database\migrations\" -Force -ErrorAction SilentlyContinue
}

# ============================================
# FRONTEND RESTRUCTURING
# ============================================
Write-Host "`n🎨 FRONTEND: Moviendo archivos..." -ForegroundColor Cyan

$frontendRoot = "c:\Users\nabes\source\repos\Kairos\web\src"

# 1. Mover estilos
Write-Host "  → Moviendo estilos..." -ForegroundColor Yellow
Move-Item "$frontendRoot\index.css" "$frontendRoot\styles\index.css" -Force -ErrorAction SilentlyContinue
Move-Item "$frontendRoot\App.css" "$frontendRoot\styles\App.css" -Force -ErrorAction SilentlyContinue

# 2. Mover componentes shared a ui
Write-Host "  → Moviendo componentes shared a ui..." -ForegroundColor Yellow
if (Test-Path "$frontendRoot\components\shared") {
    Get-ChildItem "$frontendRoot\components\shared\*" -File | ForEach-Object {
        Move-Item $_.FullName "$frontendRoot\components\ui\$($_.Name)" -Force -ErrorAction SilentlyContinue
    }
}

# 3. Mover Sidebar a layout
Write-Host "  → Moviendo componentes de layout..." -ForegroundColor Yellow
Move-Item "$frontendRoot\components\Sidebar.tsx" "$frontendRoot\components\layout\Sidebar.tsx" -Force -ErrorAction SilentlyContinue
Move-Item "$frontendRoot\components\Sidebar.css" "$frontendRoot\components\layout\Sidebar.css" -Force -ErrorAction SilentlyContinue

# 4. Mover componentes de auth a features
Write-Host "  → Moviendo componentes de features..." -ForegroundColor Yellow
Move-Item "$frontendRoot\components\GoogleAuthButton.tsx" "$frontendRoot\components\features\auth\GoogleAuthButton.tsx" -Force -ErrorAction SilentlyContinue
Move-Item "$frontendRoot\components\LogoutButton.tsx" "$frontendRoot\components\features\auth\LogoutButton.tsx" -Force -ErrorAction SilentlyContinue
Move-Item "$frontendRoot\components\ApiEndpointBadge.tsx" "$frontendRoot\components\features\admin\ApiEndpointBadge.tsx" -Force -ErrorAction SilentlyContinue

# 5. Reorganizar páginas
Write-Host "  → Reorganizando páginas por feature..." -ForegroundColor Yellow

# Auth pages
Move-Item "$frontendRoot\components\Login.tsx" "$frontendRoot\pages\Auth\Login.tsx" -Force -ErrorAction SilentlyContinue
Move-Item "$frontendRoot\components\RecuperarPassword.tsx" "$frontendRoot\pages\Auth\RecuperarPassword.tsx" -Force -ErrorAction SilentlyContinue
Move-Item "$frontendRoot\pages\RecuperarPasswordPage.tsx" "$frontendRoot\pages\Auth\RecuperarPasswordPage.tsx" -Force -ErrorAction SilentlyContinue

# Dashboard
Move-Item "$frontendRoot\components\Dashboard.tsx" "$frontendRoot\pages\Dashboard\Dashboard.tsx" -Force -ErrorAction SilentlyContinue

# Transacciones
Move-Item "$frontendRoot\components\Registro.tsx" "$frontendRoot\pages\Transacciones\Registro.tsx" -Force -ErrorAction SilentlyContinue
Move-Item "$frontendRoot\components\Calendario.tsx" "$frontendRoot\pages\Transacciones\Calendario.tsx" -Force -ErrorAction SilentlyContinue

# Finanzas
Move-Item "$frontendRoot\components\Cuentas.tsx" "$frontendRoot\pages\Finanzas\Cuentas.tsx" -Force -ErrorAction SilentlyContinue
Move-Item "$frontendRoot\components\DeudasMetas.tsx" "$frontendRoot\pages\Finanzas\DeudasMetas.tsx" -Force -ErrorAction SilentlyContinue
Move-Item "$frontendRoot\pages\Presupuestos.tsx" "$frontendRoot\pages\Finanzas\Presupuestos.tsx" -Force -ErrorAction SilentlyContinue

# Configuración
Move-Item "$frontendRoot\components\Categorias.tsx" "$frontendRoot\pages\Configuracion\Categorias.tsx" -Force -ErrorAction SilentlyContinue
Move-Item "$frontendRoot\components\Categorias.css" "$frontendRoot\pages\Configuracion\Categorias.css" -Force -ErrorAction SilentlyContinue
Move-Item "$frontendRoot\components\CategoriasCuenta.tsx" "$frontendRoot\pages\Configuracion\CategoriasCuenta.tsx" -Force -ErrorAction SilentlyContinue
Move-Item "$frontendRoot\components\Notificaciones.tsx" "$frontendRoot\pages\Configuracion\Notificaciones.tsx" -Force -ErrorAction SilentlyContinue
Move-Item "$frontendRoot\components\MiCuenta.tsx" "$frontendRoot\pages\Configuracion\MiCuenta.tsx" -Force -ErrorAction SilentlyContinue
Move-Item "$frontendRoot\pages\MovimientosRecurrentes.tsx" "$frontendRoot\pages\Configuracion\MovimientosRecurrentes.tsx" -Force -ErrorAction SilentlyContinue

# Asesor
Move-Item "$frontendRoot\pages\Asesor.tsx" "$frontendRoot\pages\Asesor\Asesor.tsx" -Force -ErrorAction SilentlyContinue

# Acerca de
Move-Item "$frontendRoot\components\AcercaContent.tsx" "$frontendRoot\pages\AcercaDe\AcercaContent.tsx" -Force -ErrorAction SilentlyContinue
Move-Item "$frontendRoot\components\AcercaDe.tsx" "$frontendRoot\pages\AcercaDe\AcercaDe.tsx" -Force -ErrorAction SilentlyContinue
Move-Item "$frontendRoot\components\AcercaPublic.tsx" "$frontendRoot\pages\AcercaDe\AcercaPublic.tsx" -Force -ErrorAction SilentlyContinue

# Admin
Move-Item "$frontendRoot\components\AdminUsuariosPendientes.tsx" "$frontendRoot\pages\Admin\UsuariosPendientes.tsx" -Force -ErrorAction SilentlyContinue

Write-Host "`n✅ Reestructuración completada!" -ForegroundColor Green
Write-Host "`n⚠️  IMPORTANTE: Ahora necesitas actualizar los imports en los archivos." -ForegroundColor Yellow
Write-Host "   Ejecuta: npm run start (frontend) y node index.js (backend) para verificar errores." -ForegroundColor Yellow
