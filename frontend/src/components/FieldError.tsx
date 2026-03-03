import React from 'react';
import { Icon } from '@/components/Icon';

interface FieldErrorProps {
  message?: string;
  className?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({ message, className = '' }) => {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={`text-xs font-medium text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1.5 ${className}`}
    >
      <Icon name="error" size={14} />
      {message}
    </p>
  );
};

export default FieldError;
