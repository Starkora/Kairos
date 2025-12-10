import { useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { logout, isLoggedIn } from '../utils/auth';

interface UseInactivityTimeoutOptions {
  timeoutMinutes?: number;
  onTimeout?: () => void;
}

/**
 * Hook que detecta inactividad del usuario y cierra sesión automáticamente
 * @param timeoutMinutes - Tiempo de inactividad en minutos (por defecto 15)
 * @param onTimeout - Callback opcional que se ejecuta antes del logout
 */
export function useInactivityTimeout({ 
  timeoutMinutes = 15,
  onTimeout 
}: UseInactivityTimeoutOptions = {}) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    // Solo activar si el usuario está logueado
    if (!isLoggedIn()) {
      return;
    }

    // Limpiar timers existentes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Configurar warning 1 minuto antes del logout (solo si el timeout es mayor a 1 minuto)
    if (timeoutMinutes > 1) {
      const warningTime = (timeoutMinutes - 1) * 60 * 1000;
      warningTimeoutRef.current = setTimeout(() => {
        if (!isLoggedIn()) return;
        
        Swal.fire({
          title: '⚠️ Sesión por expirar',
          text: `Tu sesión expirará en 1 minuto por inactividad. ¿Deseas continuar?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Continuar',
          cancelButtonText: 'Cerrar sesión',
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
        }).then((result) => {
          if (result.isConfirmed) {
            // Usuario quiere continuar, resetear timer
            resetTimer();
          } else {
            // Usuario quiere cerrar sesión
            handleLogout();
          }
        });
      }, warningTime);
    }

    // Configurar logout automático
    const logoutTime = timeoutMinutes * 60 * 1000;
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, logoutTime);
  };

  const handleLogout = () => {
    // Solo cerrar sesión si el usuario está logueado
    if (!isLoggedIn()) {
      return;
    }

    // Limpiar timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Ejecutar callback si existe
    if (onTimeout) {
      onTimeout();
    }

    // Mostrar alerta de sesión expirada
    Swal.fire({
      title: 'Sesión expirada',
      text: 'Tu sesión ha expirado por inactividad. Serás redirigido al login.',
      icon: 'info',
      confirmButtonText: 'OK',
      confirmButtonColor: '#3085d6',
      allowOutsideClick: false,
    }).then(() => {
      logout();
    });
  };

  useEffect(() => {
    // Solo activar listeners si el usuario está logueado
    if (!isLoggedIn()) {
      return;
    }

    // Eventos que resetean el timer de inactividad
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Resetear timer en cada evento
    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    // Iniciar timer al montar
    resetTimer();

    // Cleanup al desmontar
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [timeoutMinutes]); // Re-crear listeners si cambia el timeout

  return null;
}
