# Script para actualizar imports automaticamente despues de la reestructuracion
Write-Host "Actualizando imports en archivos principales..." -ForegroundColor Green

$ErrorActionPreference = "Continue"

# ============================================
# ACTUALIZAR APP.TSX (Frontend)
# ============================================
$appFile = "c:\Users\nabes\source\repos\Kairos\web\src\App.tsx"

if (Test-Path $appFile) {
    Write-Host "`nActualizando App.tsx..." -ForegroundColor Cyan
    
    $content = Get-Content $appFile -Raw -Encoding UTF8
    
    # Actualizar imports de componentes
    $content = $content -replace "from '\./components/Sidebar'", "from './components/layout/Sidebar'"
    $content = $content -replace "from '\./components/Dashboard'", "from './pages/Dashboard'"
    $content = $content -replace "from '\./components/Registro'", "from './pages/Transacciones/Registro'"
    $content = $content -replace "from '\./components/Cuentas'", "from './pages/Finanzas/Cuentas'"
    $content = $content -replace "from '\./components/Calendario'", "from './pages/Transacciones/Calendario'"
    $content = $content -replace "from '\./components/Notificaciones'", "from './pages/Configuracion/Notificaciones'"
    $content = $content -replace "from '\./components/AcercaDe'", "from './pages/AcercaDe/AcercaDe'"
    $content = $content -replace "from '\./components/AcercaPublic'", "from './pages/AcercaDe/AcercaPublic'"
    $content = $content -replace "from '\./components/DeudasMetas'", "from './pages/Finanzas/DeudasMetas'"
    $content = $content -replace "from '\./components/Categorias'", "from './pages/Configuracion/Categorias'"
    $content = $content -replace "from '\./components/CategoriasCuenta'", "from './pages/Configuracion/CategoriasCuenta'"
    $content = $content -replace "from '\./components/Login'", "from './pages/Auth/Login'"
    $content = $content -replace "from '\./components/MiCuenta'", "from './pages/Configuracion/MiCuenta'"
    $content = $content -replace "from '\./components/ApiEndpointBadge'", "from './components/features/admin/ApiEndpointBadge'"
    $content = $content -replace "from '\./components/AdminUsuariosPendientes'", "from './pages/Admin/UsuariosPendientes'"
    $content = $content -replace "from '\./components/LogoutButton'", "from './components/features/auth/LogoutButton'"
    $content = $content -replace "from './pages/RecuperarPasswordPage'", "from './pages/Auth/RecuperarPasswordPage'"
    $content = $content -replace "from './pages/MovimientosRecurrentes'", "from './pages/Configuracion/MovimientosRecurrentes'"
    $content = $content -replace "from './pages/Presupuestos'", "from './pages/Finanzas/Presupuestos'"
    $content = $content -replace "from 'pages/Asesor'", "from './pages/Asesor/Asesor'"
    $content = $content -replace "from '\./App.css'", "from './styles/App.css'"
    
    Set-Content $appFile -Value $content -Encoding UTF8
    Write-Host "  Actualizado App.tsx" -ForegroundColor Green
}

# ============================================
# ACTUALIZAR INDEX.JS (Frontend)
# ============================================
$indexFile = "c:\Users\nabes\source\repos\Kairos\web\src\index.js"

if (Test-Path $indexFile) {
    Write-Host "`nActualizando index.js..." -ForegroundColor Cyan
    
    $content = Get-Content $indexFile -Raw -Encoding UTF8
    $content = $content -replace "from '\./index.css'", "from './styles/index.css'"
    
    Set-Content $indexFile -Value $content -Encoding UTF8
    Write-Host "  Actualizado index.js" -ForegroundColor Green
}

# ============================================
# ACTUALIZAR SIDEBAR (Frontend)
# ============================================
$sidebarFile = "c:\Users\nabes\source\repos\Kairos\web\src\components\layout\Sidebar.tsx"

if (Test-Path $sidebarFile) {
    Write-Host "`nActualizando Sidebar.tsx..." -ForegroundColor Cyan
    
    $content = Get-Content $sidebarFile -Raw -Encoding UTF8
    $content = $content -replace "from '\./Sidebar.css'", "from './Sidebar.css'"
    
    Set-Content $sidebarFile -Value $content -Encoding UTF8
    Write-Host "  Actualizado Sidebar.tsx" -ForegroundColor Green
}

# ============================================
# ACTUALIZAR ACERCA DE
# ============================================
$acercaFiles = @(
    "c:\Users\nabes\source\repos\Kairos\web\src\pages\AcercaDe\AcercaDe.tsx",
    "c:\Users\nabes\source\repos\Kairos\web\src\pages\AcercaDe\AcercaPublic.tsx"
)

foreach ($file in $acercaFiles) {
    if (Test-Path $file) {
        Write-Host "`nActualizando $([System.IO.Path]::GetFileName($file))..." -ForegroundColor Cyan
        
        $content = Get-Content $file -Raw -Encoding UTF8
        $content = $content -replace "from '\./AcercaContent'", "from './AcercaContent'"
        
        Set-Content $file -Value $content -Encoding UTF8
        Write-Host "  Actualizado $([System.IO.Path]::GetFileName($file))" -ForegroundColor Green
    }
}

# ============================================
# ACTUALIZAR IMPORTS DE COMPONENTES UI
# ============================================
$pagesWithUIImports = @(
    "c:\Users\nabes\source\repos\Kairos\web\src\pages\Configuracion\Categorias.tsx",
    "c:\Users\nabes\source\repos\Kairos\web\src\pages\Configuracion\CategoriasCuenta.tsx",
    "c:\Users\nabes\source\repos\Kairos\web\src\pages\Configuracion\Notificaciones.tsx",
    "c:\Users\nabes\source\repos\Kairos\web\src\pages\Configuracion\MiCuenta.tsx",
    "c:\Users\nabes\source\repos\Kairos\web\src\pages\AcercaDe\AcercaContent.tsx"
)

foreach ($file in $pagesWithUIImports) {
    if (Test-Path $file) {
        Write-Host "`nActualizando imports UI en $([System.IO.Path]::GetFileName($file))..." -ForegroundColor Cyan
        
        $content = Get-Content $file -Raw -Encoding UTF8
        $content = $content -replace "from '\./shared", "from '../../components/ui"
        $content = $content -replace "from '\.\./shared", "from '../../components/ui"
        
        Set-Content $file -Value $content -Encoding UTF8
        Write-Host "  Actualizado $([System.IO.Path]::GetFileName($file))" -ForegroundColor Green
    }
}

# ============================================
# ACTUALIZAR BACKEND INDEX.JS
# ============================================
$backendIndex = "c:\Users\nabes\source\repos\Kairos\backend\index.js"

if (Test-Path $backendIndex) {
    Write-Host "`nActualizando backend index.js..." -ForegroundColor Cyan
    
    $content = Get-Content $backendIndex -Raw -Encoding UTF8
    
    # Actualizar referencias a db y sequelize
    $content = $content -replace "require\('\./db'\)", "require('./config/database')"
    $content = $content -replace "require\('\./sequelize'\)", "require('./config/sequelize')"
    
    # Actualizar referencias a routes
    $content = $content -replace "require\('\./routes/", "require('./src/routes/"
    
    # Actualizar referencias a utils
    $content = $content -replace "require\('\./utils/auth'\)", "require('./src/utils/auth/jwt')"
    $content = $content -replace "require\('\./utils/rateLimiter'\)", "require('./src/utils/security/rateLimiter')"
    
    Set-Content $backendIndex -Value $content -Encoding UTF8
    Write-Host "  Actualizado backend index.js" -ForegroundColor Green
}

Write-Host "`nImports principales actualizados!" -ForegroundColor Green
Write-Host "`nNOTA: Algunos imports especificos pueden necesitar ajustes manuales." -ForegroundColor Yellow
Write-Host "Revisa los errores de compilacion y ajusta segun sea necesario." -ForegroundColor Yellow
