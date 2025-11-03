import React from 'react';

/**
 * Props para validación
 */
export interface ValidationRule<T = any> {
  test: (value: T, allValues?: any) => boolean;
  message: string;
}

/**
 * Hook para validación de formularios
 */
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, ValidationRule[]>>
) {
  const [values, setValues] = React.useState<T>(initialValues);
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = (name: keyof T, value: any): string | null => {
    const rules = validationRules[name];
    if (!rules) return null;

    for (const rule of rules) {
      if (!rule.test(value, values)) {
        return rule.message;
      }
    }
    return null;
  };

  const handleChange = (name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Validar en tiempo real si el campo ya fue tocado
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error || undefined }));
    }
  };

  const handleBlur = (name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error || undefined }));
  };

  const validateAll = (): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.keys(validationRules).forEach((key) => {
      const error = validateField(key as keyof T, values[key as keyof T]);
      if (error) {
        newErrors[key as keyof T] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    setValues
  };
}

/**
 * Reglas de validación comunes
 */
export const ValidationRules = {
  required: (message = 'Este campo es requerido'): ValidationRule => ({
    test: (value) => {
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      return value !== null && value !== undefined;
    },
    message
  }),

  minLength: (length: number, message?: string): ValidationRule => ({
    test: (value) => String(value).length >= length,
    message: message || `Debe tener al menos ${length} caracteres`
  }),

  maxLength: (length: number, message?: string): ValidationRule => ({
    test: (value) => String(value).length <= length,
    message: message || `No puede exceder ${length} caracteres`
  }),

  pattern: (regex: RegExp, message: string): ValidationRule => ({
    test: (value) => regex.test(String(value)),
    message
  }),

  email: (message = 'Email inválido'): ValidationRule => ({
    test: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)),
    message
  }),

  numeric: (message = 'Debe ser un número'): ValidationRule => ({
    test: (value) => !isNaN(Number(value)),
    message
  }),

  positive: (message = 'Debe ser un número positivo'): ValidationRule => ({
    test: (value) => Number(value) > 0,
    message
  }),

  uniqueIn: <T,>(
    array: T[],
    key: keyof T,
    message = 'Este valor ya existe',
    excludeId?: any
  ): ValidationRule => ({
    test: (value, allValues) => {
      return !array.some(item => {
        // Excluir el item actual cuando estamos editando
        if (excludeId !== undefined && item['id'] === excludeId) {
          return false;
        }
        // Comparar valores (case-insensitive para strings)
        const itemValue = item[key];
        if (typeof itemValue === 'string' && typeof value === 'string') {
          return itemValue.toLowerCase() === value.toLowerCase();
        }
        return itemValue === value;
      });
    },
    message
  }),

  custom: (testFn: (value: any) => boolean, message: string): ValidationRule => ({
    test: testFn,
    message
  })
};

/**
 * Componente para mostrar errores de validación
 */
interface ValidationErrorProps {
  error?: string;
  touched?: boolean;
}

export const ValidationError: React.FC<ValidationErrorProps> = ({ error, touched }) => {
  if (!error || !touched) return null;

  return (
    <div style={{
      color: '#ef4444',
      fontSize: 12,
      marginTop: 4,
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
      {error}
    </div>
  );
};

/**
 * Badge de validación (checkmark cuando es válido)
 */
interface ValidationBadgeProps {
  isValid: boolean;
  touched?: boolean;
}

export const ValidationBadge: React.FC<ValidationBadgeProps> = ({ isValid, touched }) => {
  if (!touched) return null;

  return (
    <div style={{
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      fontSize: 16
    }}>
      {isValid ? (
        <span style={{ color: '#10b981' }}>✓</span>
      ) : (
        <span style={{ color: '#ef4444' }}>✕</span>
      )}
    </div>
  );
};
