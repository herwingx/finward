import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
}

/**
 * Brand logo component that uses the custom app icon.
 * The icon is loaded from /icon.png in the public folder.
 */
export const AppLogo: React.FC<AppLogoProps> = ({ size = 40, className = '' }) => (
  <img
    src="/icon.png"
    alt="Finward Logo"
    width={size}
    height={size}
    className={className}
    style={{
      borderRadius: size > 40 ? '12px' : '8px',
      objectFit: 'contain'
    }}
  />
);



