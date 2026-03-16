import React from 'react';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({
  children,
  className,
  shadow = 'md',
  bordered = false,
  padding = 'md',
}) => {
  const { darkMode } = useTheme();

  const shadowStyles = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-medium',
    lg: 'shadow-lg',
  };

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8',
  };

  return (
    <div
      className={twMerge(
        darkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-neutral-200',
        'rounded-xl transition-colors duration-200',
        shadowStyles[shadow],
        paddingStyles[padding],
        bordered && 'border',
        className
      )}
    >
      {children}
    </div>
  );
};

export default Card; 