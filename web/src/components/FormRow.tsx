import React, { ReactNode } from 'react';

interface FormRowProps {
  label: string;
  children: ReactNode;
}

export const FormRow: React.FC<FormRowProps> = ({ label, children }) => {
  return (
    <div className="flex items-center mb-4">
      <label className="w-40 font-semibold text-left">{label}</label>
      <div className="flex-1 ml-4 text-right">{children}</div>
    </div>
  );
};
