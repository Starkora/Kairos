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
    'efectivo': <FaWallet style={iconStyle} />,
    'banco': <FaUniversity style={iconStyle} />,
    'tarjeta': <FaCreditCard style={iconStyle} />,
    'ahorro': <FaPiggyBank style={iconStyle} />,
    'inversion': <FaChartLine style={iconStyle} />,
    'billetera': <FaMoneyCheck style={iconStyle} />,
    
    // Categorías de gastos/ingresos
    'comida': <FaUtensils style={iconStyle} />,
    'transporte': <FaCar style={iconStyle} />,
    'vivienda': <FaHome style={iconStyle} />,
    'educacion': <FaGraduationCap style={iconStyle} />,
    'salud': <FaHeartbeat style={iconStyle} />,
    'entretenimiento': <FaFilm style={iconStyle} />,
    'viajes': <FaPlane style={iconStyle} />,
    'regalos': <FaGift style={iconStyle} />,
    'servicios': <FaBolt style={iconStyle} />,
    'telefono': <FaPhone style={iconStyle} />,
    'ropa': <FaTshirt style={iconStyle} />,
    'juegos': <FaGamepad style={iconStyle} />,
    'libros': <FaBook style={iconStyle} />,
    'mascotas': <FaPaw style={iconStyle} />,
    'mantenimiento': <FaTools style={iconStyle} />,
    'compras': <FaShoppingCart style={iconStyle} />,
    'ingresos': <FaHandHoldingUsd style={iconStyle} />,
    'transferencia': <FaExchangeAlt style={iconStyle} />,
    'factura': <FaFileInvoiceDollar style={iconStyle} />,
    'monedas': <FaCoins style={iconStyle} />,
    'efectivo_icon': <FaMoneyBillWave style={iconStyle} />,
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
