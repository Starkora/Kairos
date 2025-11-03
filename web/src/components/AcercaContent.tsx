import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaChartLine, 
  FaFileUpload, 
  FaWallet, 
  FaCalendarAlt, 
  FaBullseye, 
  FaTags, 
  FaBell, 
  FaUserCircle,
  FaLaptop,
  FaMobileAlt,
  FaDesktop,
  FaChevronDown,
  FaChevronUp,
  FaCheckCircle,
  FaRocket,
  FaShieldAlt,
  FaGlobe
} from 'react-icons/fa';
import { Badge } from './shared/Badge';
import { FormButton } from './shared/FormComponents';

export default function AcercaContent({ variant = 'public' }) {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const features = [
    { icon: FaChartLine, title: 'Dashboard', description: 'Vista general y accesos rápidos', color: 'primary' },
    { icon: FaFileUpload, title: 'Registro', description: 'Movimientos individual/masivo con Excel', color: 'success' },
    { icon: FaWallet, title: 'Cuentas', description: 'Administra y edita tus cuentas', color: 'info' },
    { icon: FaCalendarAlt, title: 'Calendario', description: 'Consulta/exporta por fecha o rango', color: 'warning' },
    { icon: FaBullseye, title: 'Deudas y Metas', description: 'Seguimiento de deudas y metas de ahorro', color: 'danger' },
    { icon: FaTags, title: 'Categorías', description: 'Categorías de movimientos y de cuenta', color: 'primary' },
    { icon: FaBell, title: 'Notificaciones', description: 'Recordatorios por email/SMS configurables', color: 'info' },
    { icon: FaUserCircle, title: 'Mi Cuenta', description: 'Edición de datos personales con verificación', color: 'success' }
  ];

  const platforms = [
    { icon: FaGlobe, label: 'Web', color: 'primary' },
    { icon: FaMobileAlt, label: 'Mobile', color: 'success' },
    { icon: FaDesktop, label: 'Desktop', color: 'info' }
  ];

  const faqs = [
    {
      question: '¿Cómo importo movimientos desde Excel?',
      answer: 'Descarga la plantilla desde Registro, completa hasta 100 filas y súbela. Se validan nombres/IDs y propiedad.'
    },
    {
      question: '¿Cómo funciona la verificación por código?',
      answer: 'Para cambios sensibles se envía un OTP temporal con reintentos y enfriamiento.'
    },
    {
      question: '¿Puedo exportar mis datos?',
      answer: 'Sí, en Calendario puedes exportar por fecha/rango con fechas exactas sin desfases.'
    }
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '32px auto', padding: '0 16px' }}>
      {/* Header Section */}
      <div style={{ 
        background: 'var(--card-bg, #fff)', 
        borderRadius: 12, 
        boxShadow: '0 2px 8px var(--card-shadow, rgba(0,0,0,0.1))', 
        padding: 40,
        textAlign: 'center',
        marginBottom: 24
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: 12,
          marginBottom: 16
        }}>
          {React.createElement(FaRocket as any, { 
            style: { fontSize: 48, color: 'var(--primary-color, #6c4fa1)' } 
          })}
        </div>
        <h1 style={{ 
          marginTop: 0, 
          marginBottom: 12,
          color: 'var(--text-primary, #222)',
          fontSize: 32,
          fontWeight: 700
        }}>
          {variant === 'public' ? '¿Qué es Kairos?' : 'Acerca de Kairos'}
        </h1>
        <p style={{ 
          margin: '0 0 24px 0', 
          color: 'var(--text-secondary, #666)',
          fontSize: 16,
          lineHeight: 1.6,
          maxWidth: 700,
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          Kairos es una aplicación de finanzas personales que te ayuda a organizar tus cuentas, registrar tus movimientos,
          planificar metas y deudas y recibir recordatorios. Funciona en web, móvil y escritorio.
        </p>

        {/* Platform Badges */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {platforms.map((platform) => (
            <div key={platform.label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: 'var(--background, #f5f5f5)',
              borderRadius: 20,
              border: '1px solid var(--border-color, #e0e0e0)'
            }}>
              {React.createElement(platform.icon as any, { 
                style: { fontSize: 20, color: `var(--${platform.color}-color, #6c4fa1)` } 
              })}
              <span style={{ 
                fontSize: 14, 
                fontWeight: 600,
                color: 'var(--text-primary, #222)'
              }}>
                {platform.label}
              </span>
            </div>
          ))}
        </div>

        {variant === 'internal' && (
          <div style={{ marginTop: 24 }}>
            <FormButton
              type="button"
              onClick={() => navigate('/')}
              style={{ minWidth: 200 }}
            >
              {React.createElement(FaRocket as any, { style: { marginRight: 8 } })}
              Ir al Dashboard
            </FormButton>
          </div>
        )}
      </div>

      {/* Features Grid */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ 
          marginBottom: 20,
          color: 'var(--text-primary, #222)',
          fontSize: 24,
          fontWeight: 600,
          textAlign: 'center'
        }}>
          Funcionalidades
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: 20 
        }}>
          {features.map((feature, index) => (
            <div key={index} style={{
              background: 'var(--card-bg, #fff)',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 2px 8px var(--card-shadow, rgba(0,0,0,0.1))',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'default',
              border: '1px solid var(--border-color, #e0e0e0)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                marginBottom: 12
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `var(--icon-bg-${feature.color}, rgba(108, 79, 161, 0.1))`
                }}>
                  {React.createElement(feature.icon as any, { 
                    style: { 
                      fontSize: 24, 
                      color: `var(--icon-color-${feature.color}, var(--${feature.color}-color, #6c4fa1))` 
                    } 
                  })}
                </div>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--text-primary, #222)'
                }}>
                  {feature.title}
                </h3>
              </div>
              <p style={{ 
                margin: 0, 
                color: 'var(--text-secondary, #666)',
                fontSize: 14,
                lineHeight: 1.5
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div style={{
        background: 'var(--card-bg, #fff)',
        borderRadius: 12,
        boxShadow: '0 2px 8px var(--card-shadow, rgba(0,0,0,0.1))',
        padding: 32,
        marginBottom: 24
      }}>
        <h2 style={{ 
          marginTop: 0,
          marginBottom: 24,
          color: 'var(--text-primary, #222)',
          fontSize: 24,
          fontWeight: 600,
          textAlign: 'center'
        }}>
          ¿Por qué elegir Kairos?
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: 24 
        }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
            {React.createElement(FaCheckCircle as any, { 
              style: { 
                fontSize: 24, 
                color: 'var(--success-color, #4caf50)',
                marginTop: 4,
                flexShrink: 0
              } 
            })}
            <div>
              <h4 style={{ 
                margin: '0 0 8px 0',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-primary, #222)'
              }}>
                Multiplataforma
              </h4>
              <p style={{ 
                margin: 0,
                fontSize: 14,
                color: 'var(--text-secondary, #666)',
                lineHeight: 1.5
              }}>
                Accede desde cualquier dispositivo: web, móvil o escritorio
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
            {React.createElement(FaShieldAlt as any, { 
              style: { 
                fontSize: 24, 
                color: 'var(--success-color, #4caf50)',
                marginTop: 4,
                flexShrink: 0
              } 
            })}
            <div>
              <h4 style={{ 
                margin: '0 0 8px 0',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-primary, #222)'
              }}>
                Seguridad
              </h4>
              <p style={{ 
                margin: 0,
                fontSize: 14,
                color: 'var(--text-secondary, #666)',
                lineHeight: 1.5
              }}>
                Verificación por código para cambios sensibles
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
            {React.createElement(FaFileUpload as any, { 
              style: { 
                fontSize: 24, 
                color: 'var(--success-color, #4caf50)',
                marginTop: 4,
                flexShrink: 0
              } 
            })}
            <div>
              <h4 style={{ 
                margin: '0 0 8px 0',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-primary, #222)'
              }}>
                Importación Excel
              </h4>
              <p style={{ 
                margin: 0,
                fontSize: 14,
                color: 'var(--text-secondary, #666)',
                lineHeight: 1.5
              }}>
                Importa hasta 100 movimientos de forma masiva
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      {variant === 'internal' && (
        <div style={{
          background: 'var(--card-bg, #fff)',
          borderRadius: 12,
          boxShadow: '0 2px 8px var(--card-shadow, rgba(0,0,0,0.1))',
          padding: 32,
          marginBottom: 24
        }}>
          <h2 style={{ 
            marginTop: 0,
            marginBottom: 24,
            color: 'var(--text-primary, #222)',
            fontSize: 24,
            fontWeight: 600
          }}>
            Preguntas frecuentes
          </h2>
          {faqs.map((faq, index) => (
            <div key={index} style={{
              marginBottom: 16,
              border: '1px solid var(--border-color, #e0e0e0)',
              borderRadius: 8,
              overflow: 'hidden'
            }}>
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  background: openFaq === index ? 'var(--background, #f5f5f5)' : 'var(--card-bg, #fff)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--text-primary, #222)',
                  textAlign: 'left',
                  transition: 'background 0.2s'
                }}
              >
                <span>{faq.question}</span>
                {React.createElement((openFaq === index ? FaChevronUp : FaChevronDown) as any, { 
                  style: { 
                    fontSize: 16, 
                    color: 'var(--primary-color, #6c4fa1)',
                    flexShrink: 0
                  } 
                })}
              </button>
              {openFaq === index && (
                <div style={{
                  padding: '16px 20px',
                  background: 'var(--background, #f5f5f5)',
                  color: 'var(--text-secondary, #666)',
                  fontSize: 14,
                  lineHeight: 1.6,
                  borderTop: '1px solid var(--border-color, #e0e0e0)'
                }}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        background: 'var(--card-bg, #fff)',
        borderRadius: 12,
        boxShadow: '0 2px 8px var(--card-shadow, rgba(0,0,0,0.1))',
        padding: 24,
        textAlign: 'center'
      }}>
        <p style={{ 
          margin: 0,
          color: 'var(--text-secondary, #666)',
          fontSize: 14
        }}>
          {variant === 'public' 
            ? 'Esta página es pública y no requiere iniciar sesión.' 
            : '¿Tienes sugerencias? Escríbenos desde Notificaciones o soporte.'}
        </p>
      </div>
    </div>
  );
}
