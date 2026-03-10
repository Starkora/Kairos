# Instrucciones de Migración - Kairos

## Resumen de Cambios

### 1. Inversión del orden UI (Registro de Movimientos)
- **Cambio**: Ahora el formulario de registro de movimientos aparece primero, seguido de las plantillas rápidas
- **Archivo afectado**: `web/src/pages/Transacciones/Registro.tsx`
- **Impacto**: Mejora la UX priorizando el registro de movimientos

### 2. Campo `incluir_en_calculos` en Cuentas
- **Cambio**: Se agregó un campo booleano `incluir_en_calculos` a la tabla `cuentas`
- **Propósito**: Permite marcar qué cuentas deben considerarse en los cálculos de ingresos, egresos y ahorro
- **Valor por defecto**: `TRUE` (todas las cuentas existentes se marcan automáticamente)

### 3. Lógica de Ahorro
- **Cambio**: El ahorro solo se considera como tal si proviene de una cuenta con `incluir_en_calculos = TRUE`
- **Impacto**: Solo los ahorros desde cuentas principales (ej: cuenta sueldo) se contabilizan en estadísticas

### 4. Exclusión de Transferencias
- **Cambio**: Las transferencias internas ya no se consideran como ingresos/egresos en cálculos
- **Lógica**: Se excluyen movimientos con categoría "Transferencia Interna"
- **Impacto**: Los cálculos de ingresos y egresos reales son más precisos

### 5. Filtrado por Cuentas Marcadas
- **Cambio**: Todos los cálculos de insights solo consideran movimientos de cuentas con `incluir_en_calculos = TRUE`
- **Archivos afectados**: `backend/src/controllers/insights.controller.js`

---

## Pasos de Migración

### 1. Aplicar Migración de Base de Datos

Ejecuta el siguiente script SQL en tu base de datos:

```sql
-- Archivo: backend/database/migrations/add_incluir_en_calculos_to_cuentas.sql

ALTER TABLE cuentas ADD COLUMN incluir_en_calculos BOOLEAN DEFAULT TRUE;

UPDATE cuentas SET incluir_en_calculos = TRUE WHERE incluir_en_calculos IS NULL;
```

**Verificación:**
```sql
SELECT id, nombre, incluir_en_calculos FROM cuentas;
```

Todas las cuentas deberían tener `incluir_en_calculos = 1` por defecto.

### 2. Configurar Cuentas

Después de la migración:

1. Accede a la sección **Cuentas** en la aplicación web
2. Para cada cuenta, edita y desmarca "Incluir en cálculos" para aquellas que **NO** deban considerarse en estadísticas
3. Deja marcada solo tu **cuenta sueldo** o cuentas principales donde recibes ingresos reales

**Ejemplo de configuración:**
-  **Cuenta Sueldo BBVA** - Incluir en cálculos: SÍ
-  **Cuenta Ahorro Separada** - Incluir en cálculos: NO
-  **Tarjeta de Crédito** - Incluir en cálculos: NO

### 3. Reiniciar Servicios

```bash
# Backend
cd backend
npm restart

# Frontend
cd web
npm start
```

---

## Cambios Técnicos Detallados

### Backend

#### Archivos Modificados:

1. **`backend/src/models/cuenta.js`**
   - Método `create`: Ahora acepta `incluir_en_calculos`
   - Método `update`: Ahora acepta `incluir_en_calculos`

2. **`backend/src/controllers/finanzas/cuenta.controller.js`**
   - `create`: Pasa `incluir_en_calculos` al modelo
   - `update`: Pasa `incluir_en_calculos` al modelo

3. **`backend/src/controllers/insights.controller.js`**
   - Queries de ingresos, egresos y ahorro incluyen:
     ```sql
     INNER JOIN cuentas c ON m.cuenta_id = c.id
     WHERE ... AND c.incluir_en_calculos = 1
     AND (cat.nombre IS NULL OR cat.nombre != 'Transferencia Interna')
     ```

### Frontend

#### Archivos Modificados:

1. **`web/src/pages/Transacciones/Registro.tsx`**
   - Invertido el orden: Formulario primero, plantillas después

2. **`web/src/pages/Finanzas/Cuentas.tsx`**
   - Estado `form` incluye `incluirEnCalculos: true`
   - Estado `editData` incluye `incluirEnCalculos`
   - Checkbox agregado en formulario de creación
   - Checkbox agregado en modal de edición
   - Envía `incluir_en_calculos` al backend

---

## Verificación Post-Migración

### 1. Verificar Cuentas
- Todas las cuentas deben tener el campo `incluir_en_calculos`
- Puedes ver y editar este campo desde la UI

### 2. Verificar Cálculos
- Ve a **Dashboard** y revisa los totales de ingresos/egresos/ahorro
- Deben excluir transferencias internas
- Solo deben considerar cuentas marcadas

### 3. Verificar Transferencias
- Crea una transferencia entre cuentas
- Verifica que NO aparezca como ingreso/egreso en estadísticas
- Verifica que el saldo de ambas cuentas se actualice correctamente

### 4. Verificar Ahorro
- Crea un movimiento de tipo "Ahorro" desde tu cuenta sueldo
- Verifica que aparezca en el total de ahorros
- Crea un ahorro desde una cuenta NO marcada
- Verifica que NO aparezca en estadísticas

---

## Solución de Problemas

### Error: Campo `incluir_en_calculos` no existe
**Solución**: Ejecuta el script de migración SQL

### Los totales no cambian después de la migración
**Solución**: Refresca la caché del navegador (Ctrl+F5)

### Las transferencias siguen apareciendo como ingresos
**Solución**: Verifica que la categoría "Transferencia Interna" existe y se asigna correctamente

---

## Soporte

Para más información, consulta el código en:
- Backend: `backend/src/controllers/insights.controller.js`
- Frontend: `web/src/pages/Finanzas/Cuentas.tsx`
- Migración: `backend/database/migrations/add_incluir_en_calculos_to_cuentas.sql`
