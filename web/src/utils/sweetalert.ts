import Swal from 'sweetalert2';

/**
 * Helper para obtener el color primario desde CSS variables
 * Compatible con modo claro y oscuro
 */
const getPrimaryColor = () => {
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  return computedStyle.getPropertyValue('--primary-color').trim() || '#6c4fa1';
};

/**
 * Configuración base de SweetAlert2 con soporte para modo oscuro/claro
 */
export const swalConfig = {
  confirmButtonColor: getPrimaryColor(),
  customClass: {
    popup: 'swal-dark-mode',
    title: 'swal-title',
    htmlContainer: 'swal-text'
  }
};

/**
 * Wrapper para Swal.fire con configuración automática de colores
 */
export const showAlert = (options: any) => {
  return Swal.fire({
    ...options,
    confirmButtonColor: options.confirmButtonColor || getPrimaryColor(),
    customClass: {
      popup: 'swal-dark-mode',
      title: 'swal-title',
      htmlContainer: 'swal-text',
      ...options.customClass
    }
  });
};
