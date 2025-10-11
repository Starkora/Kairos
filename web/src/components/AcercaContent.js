import React from 'react';

export default function AcercaContent({ variant = 'public' }) {
  return (
  <div style={{ maxWidth: 900, margin: '32px auto', background: 'var(--color-card)', borderRadius: 12, boxShadow: '0 2px 8px var(--card-shadow)', padding: 32 }}>
      <h1 style={{ marginTop: 0, color: 'var(--color-text)' }}>{variant === 'public' ? '¿Qué es Kairos?' : 'Acerca de Kairos'}</h1>
      <p style={{ marginTop: 0, color: 'var(--color-input-text)' }}>
        Kairos es una aplicación de finanzas personales que te ayuda a organizar tus cuentas, registrar tus movimientos,
        planificar metas y deudas y recibir recordatorios. Funciona en web, móvil y escritorio.
      </p>

      <hr style={{ border: 0, height: 1, background: 'var(--color-input-border)', margin: '24px 0' }} />

      <h2 style={{ marginBottom: 8, color: 'var(--color-text)' }}>Resumen de pantallas</h2>
      <ul style={{ lineHeight: 1.6, color: 'var(--color-input-text)', paddingLeft: 20 }}>
        <li><b>Dashboard</b>: vista general y accesos rápidos.</li>
        <li><b>Registro</b>: movimientos (ingresos/egresos) individual/masivo con Excel.</li>
        <li><b>Cuentas</b>: administra cuentas; editar nombre/tipo, eliminar.</li>
        <li><b>Calendario</b>: consulta/exporta por fecha o rango.</li>
        <li><b>Deudas y Metas</b>: seguimiento de deudas y metas de ahorro.</li>
        <li><b>Categorías</b>: categorías de movimientos y de cuenta.</li>
        <li><b>Notificaciones</b>: recordatorios por email/SMS configurables.</li>
        <li><b>Mi Cuenta</b>: edición de datos personales con verificación.</li>
      </ul>

      {variant === 'internal' && (
        <>
          <h2 style={{ marginTop: 24, marginBottom: 8, color: 'var(--color-text)' }}>Preguntas frecuentes</h2>
          <details style={{ marginBottom: 8 }}>
            <summary><b>¿Cómo importo movimientos desde Excel?</b></summary>
            <div style={{ paddingLeft: 12, color: '#444' }}>
              Descarga la plantilla desde Registro, completa hasta 100 filas y súbela. Se validan nombres/IDs y propiedad.
            </div>
          </details>
          <details style={{ marginBottom: 8 }}>
            <summary><b>¿Cómo funciona la verificación por código?</b></summary>
            <div style={{ paddingLeft: 12, color: '#444' }}>
              Para cambios sensibles se envía un OTP temporal con reintentos y enfriamiento.
            </div>
          </details>
          <details>
            <summary><b>¿Puedo exportar mis datos?</b></summary>
            <div style={{ paddingLeft: 12, color: '#444' }}>
              Sí, en Calendario puedes exportar por fecha/rango con fechas exactas sin desfases.
            </div>
          </details>
        </>
      )}

      <hr style={{ border: 0, height: 1, background: 'var(--color-input-border)', margin: '24px 0' }} />
      <p style={{ color: 'var(--color-input-text)' }}>
        {variant === 'public' ? 'Esta página es pública y no requiere iniciar sesión.' : '¿Tienes sugerencias? Escríbenos desde Notificaciones o soporte.'}
      </p>
    </div>
  );
}
