import { ReactNode, useCallback, useState, FocusEvent } from 'react';
import Link from 'next/link';
import { SideNav } from '@/components/interview/SideNav';

interface SetupLayoutProps {
  studyTitle: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
  navSections: Array<{
    title: string;
    items: Array<{ id: string; label: string; icon: any }>;
  }>;
  activeNavId: string;
  onSelectNav: (id: string) => void;
  rightColumn?: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
}

export function SetupLayout({
  studyTitle,
  breadcrumbs,
  navSections,
  activeNavId,
  onSelectNav,
  rightColumn,
  headerAction,
  children,
}: SetupLayoutProps) {
  const hasRightColumn = Boolean(rightColumn);
  const gridColumnClasses = hasRightColumn
    ? 'grid-cols-[auto_1fr_400px]'
    : 'grid-cols-[auto_minmax(0,1fr)]';

  const [isNavExpanded, setIsNavExpanded] = useState(false);

  const handleNavMouseEnter = useCallback(() => {
    setIsNavExpanded(true);
  }, []);

  const handleNavMouseLeave = useCallback(() => {
    setIsNavExpanded(false);
  }, []);

  const handleNavFocus = useCallback(() => {
    setIsNavExpanded(true);
  }, []);

  const handleNavBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsNavExpanded(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <p className="text-lg font-semibold text-gray-900">{studyTitle}</p>
          </div>
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            {breadcrumbs.map((crumb, index) => (
              <div key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                {index > 0 && <span className="text-gray-300">›</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-gray-800">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-gray-800">{crumb.label}</span>
                )}
              </div>
            ))}
          </nav>
          <div>{headerAction}</div>
        </div>
      </header>

      <div className="pl-8 pr-1.5 py-6">
        <div className={`grid min-h-[calc(100vh-128px)] gap-6 ${gridColumnClasses}`}>
          <div
            className="relative h-full"
            onMouseEnter={handleNavMouseEnter}
            onMouseLeave={handleNavMouseLeave}
            onFocusCapture={handleNavFocus}
            onBlurCapture={handleNavBlur}
          >
            <aside
              className="h-full overflow-hidden transition-[width] duration-300 ease-in-out"
              style={{ width: isNavExpanded ? '280px' : '56px' }}
            >
              <SideNav
                sections={navSections}
                activeItem={activeNavId}
                onSelect={onSelectNav}
                isCollapsed={!isNavExpanded}
              />
            </aside>
          </div>

          <main className="h-full overflow-y-auto">
            <div className="space-y-6">{children}</div>
          </main>

          {hasRightColumn && (
            <aside className="fixed top-24 right-6 z-10">
              <div className="h-[calc(100vh-120px)] w-96 overflow-hidden rounded-lg shadow-sm border border-gray-200">
                {rightColumn}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
