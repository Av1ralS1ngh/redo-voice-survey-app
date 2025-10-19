
import Link from 'next/link';

type ProjectTab = 'Design' | 'Sources' | 'Responses' | 'Report' | 'Analysis' | 'Sharing';

type ProjectNavProps = {
  projectName: string;
  projectSlug?: string | null;
  activeTab: ProjectTab;
};

const tabRoutes: Record<ProjectTab, (basePath: string) => string> = {
  Design: (basePath) => basePath,
  Sources: (basePath) => `${basePath}?view=sources`,
  Responses: (basePath) => `${basePath}?view=responses`,
  Report: (basePath) => `${basePath}?view=report`,
  Analysis: (basePath) => `${basePath}?view=analysis`,
  Sharing: (basePath) => `${basePath}?view=sharing`,
};

const ProjectNav = ({ projectName, projectSlug, activeTab }: ProjectNavProps) => {
  const sanitizedSlug = projectSlug ? encodeURIComponent(projectSlug) : '';
  const basePath = sanitizedSlug ? `/projects/${sanitizedSlug}` : '/projects';
  const tabs: ProjectTab[] = ['Design', 'Sources', 'Responses', 'Report', 'Analysis', 'Sharing'];
  const activeBreadcrumbHref = tabRoutes[activeTab](basePath);

  // Don't show project name in breadcrumb at all
  const breadcrumbs = [
    { label: 'Projects', href: '/projects' },
    { label: activeTab, href: activeBreadcrumbHref },
  ];

  return (
    <div
      className="shadow-sm border-b"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--card-border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3">
          <nav className="flex items-center gap-2 text-xs sm:text-sm" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <div key={crumb.label} className="flex items-center gap-2">
                  {isLast ? (
                    <span
                      className="truncate font-medium"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs sm:text-sm transition-colors"
                      style={{
                        backgroundColor: 'var(--background)',
                        color: 'var(--muted-foreground)',
                        border: `1px solid var(--card-border)`
                      }}
                    >
                      {crumb.label}
                    </Link>
                  )}
                  {!isLast && (
                    <span style={{ color: 'var(--muted-foreground)' }}>
                      /
                    </span>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
        <div
          className="border-t"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <nav className="-mb-px flex flex-wrap gap-x-8" aria-label="Project sections">
            {tabs.map((tab) => {
              // Use query param routes to avoid creating nested route folders for now
              const tabPath = `${basePath}${basePath.includes('?') ? '&' : '?'}view=${encodeURIComponent(
                tab.toLowerCase()
              )}`;
              const isActive = activeTab === tab;
              return (
                <Link
                  key={tab}
                  href={tabPath}
                  className="whitespace-nowrap py-4 text-sm font-medium border-b-2 transition-colors"
                  style={{
                    borderColor: isActive ? 'var(--foreground)' : 'transparent',
                    color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
                  }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {tab}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default ProjectNav;
