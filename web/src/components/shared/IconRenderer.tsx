import React from 'react';
import { 
  FaWallet, FaUniversity, FaCreditCard, FaPiggyBank, FaMoneyBillWave, 
  FaCoins, FaShoppingCart, FaUtensils, FaCar, FaHome, FaGraduationCap,
  FaHeartbeat, FaFilm, FaPlane, FaGift, FaBolt, FaPhone, FaTshirt,
  FaGamepad, FaBook, FaPaw, FaTools, FaHandHoldingUsd, FaChartLine,
  FaExchangeAlt, FaMoneyCheck, FaFileInvoiceDollar
} from 'react-icons/fa';

interface IconRendererProps {
  tipo: string;
  size?: number;
  color?: string;
  defaultIcon?: string;
}

/**
 * Componente reutilizable para renderizar iconos según el tipo
 * Se puede usar en Registro, Cuentas, Calendario, etc.
 */
export const IconRenderer: React.FC<IconRendererProps> = ({ 
  tipo, 
  size = 24, 
  color = 'currentColor',
  defaultIcon = '💰'
}) => {
  const iconStyle = { fontSize: size, color };

  const iconMap: Record<string, React.ReactElement> = {
    // Tipos de cuenta
    'efectivo': React.createElement(FaWallet as any, { style: iconStyle }),
    'banco': React.createElement(FaUniversity as any, { style: iconStyle }),
    'tarjeta': React.createElement(FaCreditCard as any, { style: iconStyle }),
    'ahorro': React.createElement(FaPiggyBank as any, { style: iconStyle }),
    'inversion': React.createElement(FaChartLine as any, { style: iconStyle }),
    'billetera': React.createElement(FaMoneyCheck as any, { style: iconStyle }),
    
    // Categorías de gastos/ingresos
    'comida': React.createElement(FaUtensils as any, { style: iconStyle }),
    'transporte': React.createElement(FaCar as any, { style: iconStyle }),
    'vivienda': React.createElement(FaHome as any, { style: iconStyle }),
    'educacion': React.createElement(FaGraduationCap as any, { style: iconStyle }),
    'salud': React.createElement(FaHeartbeat as any, { style: iconStyle }),
    'entretenimiento': React.createElement(FaFilm as any, { style: iconStyle }),
    'viajes': React.createElement(FaPlane as any, { style: iconStyle }),
    'regalos': React.createElement(FaGift as any, { style: iconStyle }),
    'servicios': React.createElement(FaBolt as any, { style: iconStyle }),
    'telefono': React.createElement(FaPhone as any, { style: iconStyle }),
    'ropa': React.createElement(FaTshirt as any, { style: iconStyle }),
    'juegos': React.createElement(FaGamepad as any, { style: iconStyle }),
    'libros': React.createElement(FaBook as any, { style: iconStyle }),
    'mascotas': React.createElement(FaPaw as any, { style: iconStyle }),
    'mantenimiento': React.createElement(FaTools as any, { style: iconStyle }),
    'compras': React.createElement(FaShoppingCart as any, { style: iconStyle }),
    'ingresos': React.createElement(FaHandHoldingUsd as any, { style: iconStyle }),
    'transferencia': React.createElement(FaExchangeAlt as any, { style: iconStyle }),
    'factura': React.createElement(FaFileInvoiceDollar as any, { style: iconStyle }),
    'monedas': React.createElement(FaCoins as any, { style: iconStyle }),
    'efectivo_icon': React.createElement(FaMoneyBillWave as any, { style: iconStyle }),
  };

  const tipoLower = tipo.toLowerCase();
  
  if (iconMap[tipoLower]) {
    return iconMap[tipoLower];
  }

  // Fallback a emoji por defecto
  return <span style={{ fontSize: size }}>{defaultIcon}</span>;
};

/**
 * Función helper para obtener color según el tipo de movimiento
 */
export const getColorPorTipo = (tipo: string): string => {
  const tipoLower = tipo.toLowerCase();
  switch (tipoLower) {
    case 'ingreso':
      return '#4caf50';
    case 'egreso':
      return '#f44336';
    case 'ahorro':
      return '#2196f3';
    case 'transferencia':
      return '#ff9800';
    default:
      return '#757575';
  }
};

/**
 * Función helper para obtener gradiente según el tipo
 */
export const getGradientPorTipo = (tipo: string): string => {
  const tipoLower = tipo.toLowerCase();
  switch (tipoLower) {
    case 'ingreso':
    case 'ahorro':
      return 'linear-gradient(90deg, #1de9b6 0%, #43a047 100%)';
    case 'egreso':
      return 'linear-gradient(90deg, #ff7043 0%, #c62828 100%)';
    case 'transferencia':
      return '#1976d2';
    default:
      return 'linear-gradient(90deg, #bdbdbd 0%, #757575 100%)';
  }
};
