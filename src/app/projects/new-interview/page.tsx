'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import {
  Lightbulb,
  MousePointerClick,
  MessageSquare,
  Sparkles,
  Target,
  Heart,
  LogOut,
  type LucideIcon,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { createResearchStudy } from '@/lib/research-studies/createResearchStudy';
import { UseCaseCard } from '@/components/projects/UseCaseCard';
import type { InterviewCategory } from '@/types/projects';

interface UseCase {
  id: string;
  title: string;
  description: string;
  category: InterviewCategory;
  icon: LucideIcon;
}

const useCaseDefinitions: UseCase[] = [
  {
    id: 'concept-testing',
    title: 'Concept Testing',
    description: 'Validate product concepts early with fast customer feedback before you invest in build.',
    category: 'concept_testing',
    icon: Lightbulb,
  },
  {
    id: 'usability-testing',
    title: 'Usability Testing',
    description: 'Observe how users interact with prototypes to uncover friction and improve UX flows.',
    category: 'usability_testing',
  icon: MousePointerClick,
  },
  {
    id: 'product-feedback',
    title: 'Product Feedback',
    description: 'Gather insights on live features to prioritize your roadmap with confidence.',
    category: 'product_feedback',
    icon: MessageSquare,
  },
  {
    id: 'creative-testing',
    title: 'Stimuli Study',
    description: 'Test creative variations to see which messages and visuals resonate fastest.',
    category: 'custom',
    icon: Sparkles,
  },
  {
    id: 'brand-perception',
    title: 'Brand Perception',
    description: 'Understand how your brand is perceived across touchpoints and audiences.',
    category: 'custom',
    icon: Target,
  },
  {
    id: 'customer-satisfaction',
    title: 'Customer Satisfaction Survey',
    description: 'Track sentiment and satisfaction drivers to protect retention and loyalty.',
    category: 'customer_satisfaction',
    icon: Heart,
  },
];

export default function NewInterviewPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [selectedUseCaseId, setSelectedUseCaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function ensureAuthenticated() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace('/login?next=/projects/new-interview');
          return;
        }
      } catch (authError) {
        console.error('Authentication check failed:', authError);
        setError('Unable to verify your session. Please log in again.');
      } finally {
        if (isMounted) {
          setCheckingAuth(false);
        }
      }
    }

    ensureAuthenticated();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  const selectedUseCase = selectedUseCaseId ? useCaseDefinitions.find((useCase) => useCase.id === selectedUseCaseId) : null;

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        throw signOutError;
      }
      router.replace('/login');
      router.refresh();
    } catch (signOutError) {
      console.error('Logout failed:', signOutError);
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleCreateInterview = async () => {
    if (!selectedUseCase) {
      setError('Please choose a use case to continue.');
      return;
    }

    // Special handling for Stimuli Study - create research study and redirect
    if (selectedUseCase.id === 'creative-testing') {
      setLoading(true);
      setError(null);

      try {
        const user = await getAuthenticatedUser(supabase);
        const { projectId, projectSlug } = await createResearchStudy({
          supabase,
          userId: user.id,
          name: selectedUseCase.title,
          description: selectedUseCase.description,
        });

        const identifier = projectSlug || projectId;
        router.replace(`/research-study/${identifier}`);
      } catch (creationError) {
        console.error('Error creating research study:', creationError);
        setError(creationError instanceof Error ? creationError.message : 'Unable to create research study.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await getAuthenticatedUser(supabase);

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: `${selectedUseCase.title}`,
          description: selectedUseCase.description,
          category: selectedUseCase.category,
          status: 'active',
          user_id: user.id,
        } as any)
        .select()
        .single();

      if (projectError) {
        throw projectError;
      }

      const projectId = (projectData as any).id;
      const shareId = uuidv4();
      const shareUrl = `/interview/${shareId}`;

      const { data: interviewData, error: interviewError } = await supabase
        .from('interviews')
        .insert({
          project_id: projectId,
          name: `${selectedUseCase.title} Interview`,
          description: `${selectedUseCase.title} interview created on ${new Date().toLocaleDateString()}`,
          category: selectedUseCase.category,
          status: 'draft',
          questions: [],
          response_count: 0,
          target_response_count: 10,
          share_url: shareUrl,
          is_public: false,
        } as any)
        .select()
        .single();

      if (interviewError) {
        throw interviewError;
      }

      const interviewId = (interviewData as any).id;
      router.replace(`/interview-wizard/${interviewId}`);
    } catch (creationError) {
      console.error('Error creating interview:', creationError);
      setError(creationError instanceof Error ? creationError.message : 'Unable to create interview.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-500 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted">
          <svg className="h-8 w-8 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <p>Preparing your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 px-8 py-12 flex flex-col items-center">
      <div className="w-full max-w-6xl">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-lg font-semibold">
              P
            </span>
            <span className="text-xl font-semibold">Pluve</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/projects')}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-gray-200 transition-colors"
            >
              Back to Projects
            </button>
            <button
              onClick={handleLogout}
              disabled={logoutLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {logoutLoading ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              <span>{logoutLoading ? 'Signing out' : 'Log out'}</span>
            </button>
          </div>
        </nav>

        <header className="mt-12 text-center">
          <h1 className="text-4xl font-bold">Create Your First Study</h1>
          <p className="mt-2 text-lg text-muted">
            Choose a use case to get started with AI-moderated research
          </p>
        </header>

        <section className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {useCaseDefinitions.map((useCase) => (
            <UseCaseCard
              key={useCase.id}
              icon={useCase.icon}
              title={useCase.title}
              description={useCase.description}
              isSelected={useCase.id === selectedUseCaseId}
              onClick={() => setSelectedUseCaseId(useCase.id)}
            />
          ))}
        </section>

        {error ? (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-muted">
            {selectedUseCase ? (
              <>
                Selected: <span className="font-semibold text-foreground">{selectedUseCase.title}</span>
              </>
            ) : (
              'Choose a use case above'
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/projects')}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateInterview}
              disabled={loading || !selectedUseCase}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              ) : null}
              <span>{loading ? 'Creating...' : 'Continue'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

async function getAuthenticatedUser(supabase: ReturnType<typeof createClient>) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  let user = session?.user;

  if (!user) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      throw refreshError;
    }
    if (refreshData?.user) {
      user = refreshData.user;
    }
  }

  if (!user) {
    const {
      data: { user: fetchedUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!fetchedUser) {
      throw new Error('User not authenticated');
    }

    user = fetchedUser;
  }

  return user;
}
