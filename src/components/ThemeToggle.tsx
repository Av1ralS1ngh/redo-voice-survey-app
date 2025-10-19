"use client";

import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={toggleTheme}
        className={`relative w-16 h-8 rounded-full flex items-center transition-all duration-500 ease-in-out overflow-hidden ${
          theme === 'light'
            ? 'bg-gradient-to-r from-gray-200 to-gray-300'
            : 'bg-gradient-to-r from-gray-700 to-gray-800'
        }`}
        style={{
          boxShadow: theme === 'light'
            ? 'inset 0 2px 4px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.1)'
            : 'inset 0 2px 4px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.3)'
        }}
      >
        {/* Liquid effect overlay */}
        <div className={`absolute inset-0 rounded-full transition-all duration-500 ease-in-out ${
          theme === 'light'
            ? 'bg-gradient-to-r from-blue-100/20 to-transparent'
            : 'bg-gradient-to-l from-blue-900/20 to-transparent'
        }`} />

        {/* Sun icon - visible in light mode */}
        <div className={`absolute left-2 text-sm transition-all duration-300 ${
          theme === 'light' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}>
          ☀️
        </div>

        {/* Movable switch handle */}
        <div className={`absolute w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center transition-all duration-500 ease-in-out shadow-lg ${
          theme === 'light' ? 'left-1' : 'right-1'
        }`}
        style={{
          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4), inset 0 1px 2px rgba(255,255,255,0.2)'
        }}>
          {/* Icon inside the handle */}
          <span className="text-white text-xs transition-all duration-300">
            {theme === 'light' ? '☀️' : '🌙'}
          </span>
        </div>

        {/* Moon icon - visible in dark mode */}
        <div className={`absolute right-2 text-sm transition-all duration-300 ${
          theme === 'dark' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}>
          🌙
        </div>
      </button>
    </div>
  );
};

export default ThemeToggle;
