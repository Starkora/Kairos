# Sistema de Soft Delete (Eliminación Lógica)

## 📋 Descripción

El sistema de **soft delete** protege tus datos implementando eliminación lógica en lugar de eliminación física. Los registros se marcan como "eliminados" pero permanecen en la base de datos, permitiendo:

✅ **Recuperación** de datos eliminados accidentalmente  
✅ **Auditoría** completa del historial  
✅ **Backup** automático de información  
✅ **Control** total sobre los datos

---

## 🗄️ Tablas Modificadas

### 1. **movimientos**
- **Campo**: `estado` ENUM('activo', 'eliminado', 'archivado')
- **Default**: 'activo'
- **Auditoría**: `eliminado_en`, `eliminado_por`

### 2. **cuentas**
- **Campo**: `estado` ENUM('activo', 'eliminado', 'archivado')
- **Default**: 'activo'
- **Auditoría**: `eliminado_en`, `eliminado_por`

### 3. **categorias**
- **Campo**: `estado` ENUM('activo', 'eliminado')
- **Default**: 'activo'

### 4. **movimientos_recurrentes**
- **Campo**: `estado` ENUM('activo', 'eliminado', 'pausado')
- **Default**: 'activo'

---

## 🚀 Aplicar Migración

```bash
# Conectar a MySQL
mysql -u usuario -p nombre_bd

# Ejecutar migración
source backend/database/migrations/add_estado_to_tables.sql

# Verificar cambios
DESCRIBE movimientos;
DESCRIBE cuentas;
```

---

## 🔧 Endpoints Nuevos

### Movimientos

#### Obtener movimientos eliminados (Papelera)
```http
GET /api/transacciones/papelera/list?plataforma=web
Authorization: Bearer {token}
```

**Respuesta**:
```json
[
  {
    "id": 123,
    "tipo": "egreso",
    "monto": 150.00,
    "descripcion": "Compras",
    "fecha": "2026-03-01",
    "eliminado_en": "2026-03-10T14:30:00Z",
    "cuenta": "BBVA",
    "categoria": "Alimentación"
  }
]
```

#### Restaurar movimiento
```http
POST /api/transacciones/papelera/{id}/restore
Authorization: Bearer {token}
```

**Respuesta**:
```json
{
  "message": "Movimiento restaurado exitosamente"
}
```

#### Eliminar permanentemente
```http
DELETE /api/transacciones/papelera/{id}/permanent
Authorization: Bearer {token}
```

**Respuesta**:
```json
{
  "message": "Movimiento eliminado permanentemente"
}
```

---

### Cuentas

#### Obtener cuentas eliminadas
```http
GET /api/cuentas/papelera/list?plataforma=web
Authorization: Bearer {token}
```

#### Restaurar cuenta
```http
POST /api/cuentas/papelera/{id}/restore
Authorization: Bearer {token}
```

---

## 💡 Comportamiento

### Eliminación Normal (Soft Delete)
```javascript
// Antes (eliminación física)
DELETE FROM movimientos WHERE id = 123;  ❌ DATOS PERDIDOS

// Ahora (eliminación lógica)
UPDATE movimientos 
SET estado = 'eliminado', eliminado_en = NOW() 
WHERE id = 123;  ✅ DATOS RECUPERABLES
```

### Consultas Automáticas
Todos los queries SELECT ahora filtran automáticamente por `estado = 'activo'`:

```javascript
// Modelo: transaccion.js
SELECT * FROM movimientos 
WHERE usuario_id = ? 
AND plataforma = ? 
AND estado = 'activo'  // ← Filtro automático
```

### Eliminación en Cascada
Al eliminar una cuenta con movimientos:

```javascript
// Con cascade=true
DELETE /api/cuentas/123?cascade=true

// Lo que sucede:
// 1. Marca todos los movimientos como eliminados
// 2. Marca la cuenta como eliminada
// 3. Respuesta: "Cuenta y movimientos marcados como eliminados"
```

---

## 🎯 Estados Disponibles

### Movimientos y Cuentas
- **`activo`**: Registro normal, visible en la aplicación
- **`eliminado`**: Soft delete, visible solo en papelera
- **`archivado`**: Datos históricos (opcional para futura implementación)

### Movimientos Recurrentes
- **`activo`**: Se generan automáticamente
- **`eliminado`**: Soft delete
- **`pausado`**: Temporalmente desactivados

---

## 🔒 Seguridad

1. **Solo soft delete por defecto**: La eliminación física solo está disponible desde la papelera
2. **Validación de usuario**: Solo puedes restaurar/eliminar tus propios registros
3. **Auditoría**: Registra quién y cuándo eliminó cada registro

---

## 📊 Vistas Creadas

### `movimientos_activos`
Acceso directo a movimientos activos sin filtrar manualmente:
```sql
SELECT * FROM movimientos_activos WHERE usuario_id = 1;
```

### `cuentas_activas`
```sql
SELECT * FROM cuentas_activas WHERE usuario_id = 1;
```

---

## 🚨 Notas Importantes

1. **Índices creados**: Los filtros por `estado` están optimizados con índices
2. **Compatibilidad**: El código antiguo seguirá funcionando, solo verá registros activos
3. **Reversión**: Si necesitas volver atrás, ejecuta:
   ```sql
   ALTER TABLE movimientos DROP COLUMN estado;
   ALTER TABLE cuentas DROP COLUMN estado;
   ```

---

## 📝 Ejemplo de Uso en Frontend

```typescript
// Obtener papelera
const papelera = await fetch('/api/transacciones/papelera/list', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Restaurar movimiento
await fetch(`/api/transacciones/papelera/${id}/restore`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

// Eliminar permanentemente (requiere confirmación)
if (confirm('¿Eliminar permanentemente? Esta acción no se puede deshacer')) {
  await fetch(`/api/transacciones/papelera/${id}/permanent`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

---

## 🎉 Beneficios

✅ **Nunca más perderás datos** por eliminar accidentalmente  
✅ **Historial completo** para auditorías  
✅ **Recuperación rápida** desde la papelera  
✅ **Control total** sobre cuándo eliminar permanentemente  
✅ **Mejor experiencia** para el usuario final  

---

**Fecha de implementación**: 10 de marzo de 2026  
**Versión**: 1.0.0  
**Autor**: Sistema Kairos  
