import React from 'react';
import { FaCheckCircle, FaWhatsapp, FaCalendarAlt, FaCreditCard } from 'react-icons/fa';

interface WelcomeModalProps {
  show: boolean;
  onClose: () => void;
  userName?: string;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ show, onClose, userName }) => {
  if (!show) return null;

  const whatsappNumber = '51904065007'; // Número de soporte
  const whatsappMessage = encodeURIComponent(
    'Hola! Me registré en Kairos y me gustaría obtener más información sobre la suscripción mensual.'
  );

  return (
    <div 
      className="modal fade show" 
      style={{ 
        display: 'block', 
        backgroundColor: 'rgba(0, 0, 0, 0.5)' 
      }}
      onClick={onClose}
    >
      <div 
        className="modal-dialog modal-dialog-centered modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content border-0 shadow-lg">
          {/* Header */}
          <div className="modal-header bg-success text-white border-0">
            <div className="d-flex align-items-center gap-2">
              {/* @ts-ignore */}
              <FaCheckCircle size={32} />
              <h4 className="modal-title mb-0">
                ¡Bienvenido{userName ? `, ${userName}` : ''}!
              </h4>
            </div>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose}
            />
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            <div className="text-center mb-4">
              <h5 className="text-success fw-bold mb-3">
                Tu cuenta ha sido activada exitosamente
              </h5>
              <p className="text-muted">
                Comienza a gestionar tus finanzas personales de manera inteligente
              </p>
            </div>

            {/* Trial Info */}
            <div className="alert alert-info border-0 shadow-sm mb-4">
              <div className="d-flex align-items-start gap-3">
                {/* @ts-ignore */}
                <FaCalendarAlt size={24} className="text-info mt-1" />
                <div>
                  <h6 className="fw-bold mb-2">Periodo de Prueba Gratuito</h6>
                  <p className="mb-0 small">
                    Tienes acceso <strong>gratuito durante 30 días</strong> a todas las funcionalidades de Kairos:
                  </p>
                  <ul className="small mb-0 mt-2">
                    <li>Gestión de cuentas y movimientos</li>
                    <li>Presupuestos y metas de ahorro</li>
                    <li>Reportes y análisis detallados</li>
                    <li>Sincronización multiplataforma</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Pricing Info */}
            <div className="alert alert-warning border-0 shadow-sm mb-4">
              <div className="d-flex align-items-start gap-3">
                {/* @ts-ignore */}
                <FaCreditCard size={24} className="text-warning mt-1" />
                <div>
                  <h6 className="fw-bold mb-2">¿Te resulta útil?</h6>
                  <p className="mb-2 small">
                    Al finalizar el periodo de prueba, puedes continuar usando Kairos 
                    con una <strong>suscripción mensual accesible</strong>.
                  </p>
                  <p className="mb-0 small text-muted">
                    <em>No se requiere tarjeta de crédito para el periodo de prueba.</em>
                  </p>
                </div>
              </div>
            </div>

            {/* WhatsApp Contact */}
            <div className="card border-success shadow-sm">
              <div className="card-body text-center p-4">
                {/* @ts-ignore */}
                <FaWhatsapp size={48} className="text-success mb-3" />
                <h6 className="fw-bold mb-2">¿Tienes preguntas o quieres contratar?</h6>
                <p className="small text-muted mb-3">
                  Contáctanos por WhatsApp para más información sobre planes y precios
                </p>
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-success btn-lg d-inline-flex align-items-center gap-2"
                >
                  {/* @ts-ignore */}
                  <FaWhatsapp size={20} />
                  Contactar por WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer border-0 bg-light">
            <button 
              type="button" 
              className="btn btn-primary px-4"
              onClick={onClose}
            >
              Comenzar a usar Kairos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
