'use client';

import type { ComponentType, SVGProps } from 'react';

interface IconNavItem {
  id: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

interface IconNavSection {
  title: string;
  items: IconNavItem[];
}

interface IconNavProps {
  sections: IconNavSection[];
  activeItem: string;
  onSelect: (id: string) => void;
}

export function IconNav({ sections, activeItem, onSelect }: IconNavProps) {
  return (
    <nav className="flex h-full flex-col items-center space-y-8 py-6">
      {sections.map(section => (
        <div key={section.title} className="flex flex-col space-y-4">
          {section.items.map(item => {
            const isActive = item.id === activeItem;
            const baseClasses = 'flex h-12 w-12 items-center justify-center rounded-full transition-colors';
            const stateClasses = isActive
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`${baseClasses} ${stateClasses}`}
                title={item.label}
              >
                <item.icon className="h-6 w-6" />
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}