'use client';

import type { ComponentType, SVGProps } from 'react';

interface SideNavItem {
  id: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

interface SideNavSection {
  title: string;
  items: SideNavItem[];
}

interface SideNavProps {
  sections: SideNavSection[];
  activeItem: string;
  onSelect: (id: string) => void;
  isCollapsed?: boolean;
}

export function SideNav({ sections, activeItem, onSelect, isCollapsed = false }: SideNavProps) {
  return (
    <nav
      className={`text-foreground transition-[padding] duration-200 ease-in-out ${
        isCollapsed ? 'space-y-6 px-2 py-4' : 'space-y-10 px-4 py-6'
      }`}
      aria-label="Setup navigation"
    >
      {sections.map(section => (
        <div key={section.title}>
          {!isCollapsed && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              {section.title}
            </p>
          )}
          <div className="space-y-1">
            {section.items.map(item => {
              const isActive = item.id === activeItem;
              const baseClasses = 'flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors';
              const layoutClasses = isCollapsed ? 'justify-center' : 'gap-3';
              const stateClasses = isActive
                ? ' bg-gray-100 text-foreground font-semibold dark:bg-white/10'
                : ' text-muted hover:bg-gray-100 hover:text-foreground dark:hover:bg-white/5';
              const iconClasses = isActive ? 'h-5 w-5 text-foreground' : 'h-5 w-5 text-muted';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`${baseClasses} ${layoutClasses}${stateClasses}`}
                  aria-label={isCollapsed ? item.label : undefined}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon className={iconClasses} />
                  {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
