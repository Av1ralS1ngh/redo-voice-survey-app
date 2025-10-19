'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface ProjectRow {
  id: string;
  name: string;
  description?: string | null;
  slug?: string | null;
}

interface ResearchBriefRow {
  content: string;
  metadata: Record<string, unknown> | null;
}

interface QuestionState {
  id: string;
  type: QuestionType;
  text: string;
  followUps: string;
  showFollowUps: boolean;
  stimulusEnabled: boolean;
  stimulusType: QuestionStimulusType;
  videoUrl: string;
  imageFile: File | null;
  imagePreviewUrl: string | null;
}

interface ObjectiveState {
  id: string;
  title: string;
  description: string;
  stimulusNotes: string;
  questions: QuestionState[];
}

export interface ResearchStudyDetailProps {
  initialIdentifier: string;
}

const DEFAULT_TITLE = '';
const DEFAULT_HEADING = 'Research objective';
const DEFAULT_DESCRIPTION = '';
const DEFAULT_STIMULUS_PLACEHOLDER = 'Add stimulus details or notes that will help guide your participants.';

const QUESTION_TYPE_OPTIONS = [
  { value: 'open-ended', label: 'Open-ended' },
  { value: 'multiple-choice', label: 'Multiple choice' },
  { value: 'scale', label: 'Scale (1-5)' },
  { value: 'rating', label: 'Rating' },
] as const;

type QuestionType = typeof QUESTION_TYPE_OPTIONS[number]['value'];
type QuestionStimulusType = 'video' | 'image';

function parseString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return fallback;
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => parseString(entry, ''))
      .map((entry) => entry.replace(/^[-*]\s*/, '').trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(/\r?\n/)
      .map((entry) => entry.replace(/^[-*]\s*/, '').trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
}

function toListString(values: string[]): string {
  return values
    .map((value) => (value.startsWith('- ') ? value : `- ${value}`))
    .join('\n');
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return v;

      const pathSegments = parsed.pathname.split('/').filter(Boolean);
      if (pathSegments[0] === 'embed' && pathSegments[1]) {
        return pathSegments[1];
      }
    }

    if (parsed.hostname === 'youtu.be') {
      const pathSegments = parsed.pathname.split('/').filter(Boolean);
      if (pathSegments[0]) {
        return pathSegments[0];
      }
    }
  } catch (error) {
    console.warn('Failed to parse YouTube URL:', error);
  }

  return null;
}

const createQuestionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `question-${Math.random().toString(36).slice(2, 10)}`;
};

const createQuestionState = (overrides: Partial<QuestionState> = {}): QuestionState => ({
  id: createQuestionId(),
  type: 'open-ended',
  text: '',
  followUps: '',
  showFollowUps: false,
  stimulusEnabled: false,
  stimulusType: 'video',
  videoUrl: '',
  imageFile: null,
  imagePreviewUrl: null,
  ...overrides,
});

function InfoChip({ tooltip }: { tooltip: string }) {
  return (
    <span
      className="ml-2 inline-flex items-center justify-center rounded-full border text-xs font-medium"
      role="img"
      aria-label={tooltip}
      title={tooltip}
      style={{
        width: '1.6rem',
        height: '1.6rem',
        borderColor: 'var(--card-border)',
        backgroundColor: 'var(--background)',
        color: 'var(--muted-foreground)',
      }}
    >
      i
    </span>
  );
}

export default function ResearchStudyDetail({ initialIdentifier }: ResearchStudyDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [heading, setHeading] = useState(DEFAULT_HEADING);
  const [subHeading, setSubHeading] = useState<string | null>(null);
  const [stimulusNotes, setStimulusNotes] = useState('');

  const [objectives, setObjectives] = useState<ObjectiveState[]>([
    {
      id: 'default',
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      stimulusNotes: '',
      questions: [createQuestionState()],
    },
  ]);

  const [projectId, setProjectId] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [launching, setLaunching] = useState(false);
  const [, setInterviewId] = useState<string | null>(null);

  const applyBriefMetadata = useCallback((brief: ResearchBriefRow) => {
    const metadataRecord = (brief.metadata ?? {}) as Record<string, unknown>;

    const extractedTitle = parseString(metadataRecord.title, '');
    if (extractedTitle.length > 0) {
      setObjectives((prev) => {
        if (prev.length === 0) return prev;
        return [
          {
            ...prev[0],
            title: extractedTitle,
          },
          ...prev.slice(1),
        ];
      });
      setHeading(extractedTitle);
    }

    const extractedDescription = parseString(metadataRecord.description, '');
    if (extractedDescription.length > 0) {
      setObjectives((prev) => {
        if (prev.length === 0) return prev;
        return [
          {
            ...prev[0],
            description: extractedDescription,
          },
          ...prev.slice(1),
        ];
      });
      setSubHeading(extractedDescription);
    }

    const extractedQuestion = parseString(metadataRecord.primary_question, '');

    const rawQuestionType = parseString(metadataRecord.question_type, 'open-ended')
      .toLowerCase()
      .replace(/\s+/g, '-');

    const sanitizedQuestionType: QuestionType = QUESTION_TYPE_OPTIONS.some((option) => option.value === rawQuestionType)
      ? (rawQuestionType as QuestionType)
      : 'open-ended';

    const followUpsFromMetadata = (() => {
      const first = parseStringArray(metadataRecord.follow_ups);
      if (first.length > 0) return first;
      const second = parseStringArray(metadataRecord.followUpPrompts);
      if (second.length > 0) return second;
      return [];
    })();

    const videoLink = parseString(metadataRecord.stimulus_video_url, '');
    const hasVideoLink = videoLink.length > 0;

    setObjectives((previous) => {
      if (previous.length === 0) return previous;
      const firstObjective = previous[0];
      return [
        {
          ...firstObjective,
          questions: [
            {
              id: createQuestionId(),
              type: sanitizedQuestionType,
              text: extractedQuestion.length > 0 ? extractedQuestion : '',
              followUps: followUpsFromMetadata.length > 0 ? toListString(followUpsFromMetadata) : '',
              showFollowUps: followUpsFromMetadata.length > 0,
              stimulusEnabled: hasVideoLink,
              stimulusType: hasVideoLink ? 'video' : 'video',
              videoUrl: hasVideoLink ? videoLink : '',
              imageFile: null,
              imagePreviewUrl: null,
            },
          ],
        },
        ...previous.slice(1),
      ];
    });

    const combinedStimulus = [
      parseString(metadataRecord.stimulus_description, ''),
      parseString(metadataRecord.stimulus_text, ''),
    ]
      .filter(Boolean)
      .join('\n')
      .trim();

    if (combinedStimulus.length > 0) {
      setObjectives((prev) => {
        if (prev.length === 0) return prev;
        return [
          {
            ...prev[0],
            stimulusNotes: combinedStimulus,
          },
          ...prev.slice(1),
        ];
      });
    }
  }, []);

  const loadObjective = useCallback(
    async (identifier: string) => {
      if (!identifier) {
        setError('Missing research study identifier');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        let projectRecord: ProjectRow | null = null;
        let lastError: unknown = null;

        const { data: slugMatch, error: slugError } = await supabase
          .from('projects')
          .select('id, name, description, slug')
          .eq('slug', identifier)
          .maybeSingle();

        if (slugMatch) {
          projectRecord = slugMatch as ProjectRow;
        } else if (slugError && slugError.code !== 'PGRST116') {
          lastError = slugError;
        }

        if (!projectRecord) {
          const { data: idMatch, error: idError } = await supabase
            .from('projects')
            .select('id, name, description, slug')
            .eq('id', identifier)
            .maybeSingle();

          if (idMatch) {
            projectRecord = idMatch as ProjectRow;
          } else if (idError && idError.code !== 'PGRST116') {
            lastError = idError;
          }
        }

        if (!projectRecord) {
          throw lastError instanceof Error ? lastError : new Error('Project not found');
        }

  setProjectId(projectRecord.id);

        const hasProjectName = projectRecord.name?.trim().length > 0;
        setHeading(hasProjectName ? projectRecord.name : DEFAULT_HEADING);
        setObjectives([
          {
            id: 'default',
            title: hasProjectName ? projectRecord.name : '',
            description: '',
            stimulusNotes: '',
            questions: [createQuestionState()],
          },
        ]);

        const descriptionValue = parseString(projectRecord.description, '');
        setSubHeading(descriptionValue.length > 0 ? descriptionValue : null);

        setStimulusNotes('');
        setObjectives((prev) => {
          const first = prev[0];
          if (!first) return prev;

          return [
            {
              ...first,
              questions: [createQuestionState()],
            },
            ...prev.slice(1),
          ];
        });

        const { data: briefRows, error: briefsError } = await supabase
          .from('research_briefs')
          .select('content, metadata')
          .eq('project_id', projectRecord.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (briefsError) {
          throw briefsError;
        }

        const briefRow = (briefRows?.[0] ?? null) as ResearchBriefRow | null;
        if (briefRow) {
          applyBriefMetadata(briefRow);
        }

        const { data: interviewData, error: interviewError } = await supabase
          .from('interviews')
          .select('id, status, questions')
          .eq('project_id', projectRecord.id)
          .maybeSingle();

        if (interviewError && interviewError.code !== 'PGRST116') {
          console.warn('Failed to load interview:', interviewError);
        } else if (interviewData) {
          setInterviewId(interviewData.id);
          if (interviewData.questions && Array.isArray(interviewData.questions)) {
            const loadedQuestions = interviewData.questions.map((q: any) =>
              createQuestionState({
                id: q.id || createQuestionId(),
                type: q.type || 'open-ended',
                text: q.text || '',
                followUps: q.followUps || '',
                stimulusEnabled: q.stimulusEnabled || false,
                stimulusType: q.stimulusType || 'video',
                videoUrl: q.videoUrl || '',
              }),
            );
            if (loadedQuestions.length > 0) {
              setObjectives((prev) => {
                const first = prev[0];
                if (!first) return prev;

                return [
                  {
                    ...first,
                    questions: loadedQuestions,
                  },
                  ...prev.slice(1),
                ];
              });
            }
          }
        }
      } catch (loadError) {
        console.error('Failed to load research study:', loadError);
        setError(loadError instanceof Error ? loadError.message : 'Failed to load research study');
      } finally {
        setLoading(false);
      }
    },
    [applyBriefMetadata],
  );

  useEffect(() => {
    if (!initialIdentifier) {
      setError('Missing research study identifier');
      setLoading(false);
      return;
    }

    void loadObjective(initialIdentifier);
  }, [initialIdentifier, loadObjective]);

  const handleDelete = useCallback(async () => {
    if (!projectId) {
      setDeleteError('Unable to locate the project for deletion.');
      return;
    }

    try {
      setDeleting(true);
      setDeleteError(null);

      const supabase = createClient();

      const { error: briefsDeleteError } = await supabase.from('research_briefs').delete().eq('project_id', projectId);

      if (briefsDeleteError) {
        throw briefsDeleteError;
      }

      const { error: projectDeleteError } = await supabase.from('projects').delete().eq('id', projectId);

      if (projectDeleteError) {
        throw projectDeleteError;
      }

      setDeleteDialogOpen(false);
      router.push('/projects');
    } catch (deleteErr) {
      console.error('Failed to delete research study:', deleteErr);
      setDeleteError(deleteErr instanceof Error ? deleteErr.message : 'Failed to delete research study');
    } finally {
      setDeleting(false);
    }
  }, [projectId, router]);

  const handleLaunchStudy = useCallback(async () => {
    if (!projectId) {
      alert('Project not found. Please refresh the page and try again.');
      return;
    }

    try {
      setLaunching(true);
      const supabase = createClient();

      const { data: existingInterview, error: fetchError } = await supabase
        .from('interviews')
        .select('id, status')
        .eq('project_id', projectId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      let interviewIdToUpdate = existingInterview?.id;

      if (!existingInterview) {
        const { data: newInterview, error: createError } = await supabase
          .from('interviews')
          .insert({
            project_id: projectId,
            name: objectives[0]?.title || heading || 'Research Interview',
            description: objectives[0]?.description || 'Automatically created interview',
            category: 'usability_testing',
            status: 'active',
            questions:
              objectives[0]?.questions.map((q) => ({
                id: q.id,
                type: q.type,
                text: q.text,
                followUps: q.followUps,
                stimulusEnabled: q.stimulusEnabled,
                stimulusType: q.stimulusType,
                videoUrl: q.videoUrl,
              })) || [],
            response_count: 0,
            target_response_count: 10,
            share_url: `/interview/${crypto.randomUUID()}`,
            is_public: false,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        interviewIdToUpdate = newInterview.id;
        setInterviewId(newInterview.id);
      } else {
        const { error: updateError } = await supabase
          .from('interviews')
          .update({
            status: 'active',
            questions:
              objectives[0]?.questions.map((q) => ({
                id: q.id,
                type: q.type,
                text: q.text,
                followUps: q.followUps,
                stimulusEnabled: q.stimulusEnabled,
                stimulusType: q.stimulusType,
                videoUrl: q.videoUrl,
              })) || [],
          })
          .eq('id', existingInterview.id);

        if (updateError) throw updateError;
        setInterviewId(existingInterview.id);
      }

      if (interviewIdToUpdate) {
        await supabase
          .from('projects')
          .update({ status: 'active' })
          .eq('id', projectId);
      }

      alert('Study launched successfully! The interview is now active and can collect responses.');
      router.push('/projects');
    } catch (err) {
      console.error('Failed to launch study:', err);
      alert('Failed to launch study. Please try again.');
    } finally {
      setLaunching(false);
    }
  }, [projectId, objectives, heading, router]);

  const handleQuestionTypeChange = (objectiveIndex: number, questionId: string, newType: QuestionType) => {
    setObjectives((previous) =>
      previous.map((objective, index) => {
        if (index !== objectiveIndex) return objective;

        return {
          ...objective,
          questions: objective.questions.map((question) => (question.id === questionId ? { ...question, type: newType } : question)),
        };
      }),
    );
  };

  const handleQuestionTextChange = (objectiveIndex: number, questionId: string, value: string) => {
    setObjectives((previous) =>
      previous.map((objective, index) => {
        if (index !== objectiveIndex) return objective;

        return {
          ...objective,
          questions: objective.questions.map((question) => (question.id === questionId ? { ...question, text: value } : question)),
        };
      }),
    );
  };

  const handleFollowUpsToggle = (objectiveIndex: number, questionId: string) => {
    setObjectives((previous) =>
      previous.map((objective, index) => {
        if (index !== objectiveIndex) return objective;

        return {
          ...objective,
          questions: objective.questions.map((question) =>
            question.id === questionId ? { ...question, showFollowUps: !question.showFollowUps } : question,
          ),
        };
      }),
    );
  };

  const handleFollowUpsChange = (objectiveIndex: number, questionId: string, value: string) => {
    setObjectives((previous) =>
      previous.map((objective, index) => {
        if (index !== objectiveIndex) return objective;

        return {
          ...objective,
          questions: objective.questions.map((question) => (question.id === questionId ? { ...question, followUps: value } : question)),
        };
      }),
    );
  };

  const handleQuestionVideoChange = (objectiveIndex: number, questionId: string, value: string) => {
    setObjectives((previous) =>
      previous.map((objective, index) => {
        if (index !== objectiveIndex) return objective;

        return {
          ...objective,
          questions: objective.questions.map((question) => (question.id === questionId ? { ...question, videoUrl: value } : question)),
        };
      }),
    );
  };

  const handleStimulusToggle = (objectiveIndex: number, questionId: string) => {
    setObjectives((previous) =>
      previous.map((objective, index) => {
        if (index !== objectiveIndex) return objective;

        const updatedQuestions = objective.questions.map((question) => {
          if (question.id !== questionId) {
            return question;
          }

          if (question.stimulusEnabled) {
            if (question.imagePreviewUrl) {
              URL.revokeObjectURL(question.imagePreviewUrl);
            }

            return {
              ...question,
              stimulusEnabled: false,
              stimulusType: 'video',
              videoUrl: '',
              imageFile: null,
              imagePreviewUrl: null,
            } as QuestionState;
          }

          return {
            ...question,
            stimulusEnabled: true,
            stimulusType: question.stimulusType,
          } as QuestionState;
        });

        return {
          ...objective,
          questions: updatedQuestions,
        };
      }),
    );
  };

  const handleStimulusTypeChange = (objectiveIndex: number, questionId: string, nextType: QuestionStimulusType) => {
    setObjectives((previous) =>
      previous.map((objective, index) => {
        if (index !== objectiveIndex) return objective;

        const updatedQuestions = objective.questions.map((question) => {
          if (question.id !== questionId) {
            return question;
          }

          if (nextType === 'video') {
            if (question.imagePreviewUrl) {
              URL.revokeObjectURL(question.imagePreviewUrl);
            }

            return {
              ...question,
              stimulusType: nextType,
              videoUrl: '',
              imageFile: null,
              imagePreviewUrl: null,
            } as QuestionState;
          }

          return {
            ...question,
            stimulusType: nextType,
            videoUrl: '',
          } as QuestionState;
        });

        return {
          ...objective,
          questions: updatedQuestions,
        };
      }),
    );
  };

  const handleQuestionImageChange = (objectiveIndex: number, questionId: string, files: FileList | null) => {
    const file = files?.[0] ?? null;

    setObjectives((previous) =>
      previous.map((objective, index) => {
        if (index !== objectiveIndex) return objective;

        const updatedQuestions = objective.questions.map((question) => {
          if (question.id !== questionId) {
            return question;
          }

          if (question.imagePreviewUrl) {
            URL.revokeObjectURL(question.imagePreviewUrl);
          }

          if (!file) {
            return {
              ...question,
              imageFile: null,
              imagePreviewUrl: null,
            } as QuestionState;
          }

          return {
            ...question,
            imageFile: file,
            imagePreviewUrl: URL.createObjectURL(file),
          } as QuestionState;
        });

        return {
          ...objective,
          questions: updatedQuestions,
        };
      }),
    );
  };

  const handleAddQuestion = (objectiveIndex: number) => {
    setObjectives((previous) =>
      previous.map((objective, index) => {
        if (index !== objectiveIndex) return objective;

        const newQuestion = createQuestionState();
        return {
          ...objective,
          questions: [...objective.questions, newQuestion],
        };
      }),
    );
  };

  const handleRemoveQuestion = (objectiveIndex: number, questionId: string) => {
    setObjectives((previous) =>
      previous.map((objective, index) => {
        if (index !== objectiveIndex) return objective;

        return {
          ...objective,
          questions: objective.questions.filter((question) => question.id !== questionId),
        };
      }),
    );
  };

  const handleObjectiveTitleChange = (objectiveIndex: number, value: string) => {
    setObjectives((previous) =>
      previous.map((objective, index) => {
        if (index !== objectiveIndex) return objective;
        return { ...objective, title: value };
      }),
    );
  };

  const handleObjectiveDescriptionChange = (objectiveIndex: number, value: string) => {
    setObjectives((previous) =>
      previous.map((objective, index) => {
        if (index !== objectiveIndex) return objective;
        return { ...objective, description: value };
      }),
    );
  };

  const handleObjectiveStimulusChange = (objectiveIndex: number, value: string) => {
    setObjectives((previous) =>
      previous.map((objective, index) => {
        if (index !== objectiveIndex) return objective;
        return { ...objective, stimulusNotes: value };
      }),
    );
  };

  const handleAddObjective = () => {
    const newObjective: ObjectiveState = {
      id: `objective-${Date.now()}`,
      title: '',
      description: '',
      stimulusNotes: '',
      questions: [createQuestionState()],
    };
    setObjectives((previous) => [...previous, newObjective]);
  };

  const handleRemoveObjective = (objectiveId: string) => {
    setObjectives((previous) => previous.filter((objective) => objective.id !== objectiveId));
  };

  const handleSave = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      if (!projectId) {
        throw new Error('Project ID is missing');
      }

      const { error: projectError } = await supabase
        .from('projects')
        .update({
          name: heading,
          description: subHeading,
        })
        .eq('id', projectId);

      if (projectError) {
        throw projectError;
      }

      const briefData = {
        content: '',
        metadata: {
          title: heading,
          description: subHeading,
          primary_question: objectives[0]?.questions[0]?.text,
          question_type: objectives[0]?.questions[0]?.type,
          follow_ups: objectives[0]?.questions[0]?.followUps,
          stimulus_video_url: objectives[0]?.questions[0]?.videoUrl,
          stimulus_description: stimulusNotes,
          stimulus_text: stimulusNotes,
        },
      };

      const { error: briefError } = await supabase
        .from('research_briefs')
        .upsert({
          project_id: projectId,
          content: briefData.content,
          metadata: briefData.metadata,
        });

      if (briefError) {
        throw briefError;
      }

      alert('Changes saved successfully!');
    } catch (saveError) {
      console.error('Failed to save changes:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  }, [projectId, heading, subHeading, objectives, stimulusNotes]);

  return (
    <div className="min-h-screen p-4" style={{ background: 'var(--page-bg)' }}>
      <div className="mx-auto max-w-[80vw] w-full">
        <div className="mb-4 flex flex-col gap-2">
          <h1 className="text-2xl font-bold">{heading}</h1>
          {subHeading && <p className="text-sm text-muted-foreground">{subHeading}</p>}
        </div>

        {error && <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>}

        <div className="mb-4 flex flex-col gap-4">
          {objectives.map((objective, objectiveIndex) => (
            <div key={objective.id} className="relative rounded-lg p-6 shadow-md" style={{ backgroundColor: 'var(--card-bg)' }}>
              {objectives.length > 1 && (
                <button
                  onClick={() => handleRemoveObjective(objective.id)}
                  className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:text-red-500 transition-colors"
                  title="Delete objective"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
                  Research Objective {objectiveIndex + 1}
                </h2>
              </div>

              <section className="space-y-6">
                <div>
                  <div className="flex items-center" style={{ color: 'var(--foreground)' }}>
                    <label htmlFor={`title-${objective.id}`} className="text-sm font-semibold">
                      Title
                    </label>
                    <InfoChip tooltip="Provide a clear, concise title for this research objective." />
                  </div>
                  <input
                    id={`title-${objective.id}`}
                    type="text"
                    value={objective.title}
                    onChange={(e) => handleObjectiveTitleChange(objectiveIndex, e.target.value)}
                    placeholder="Enter research objective title"
                    className="mt-2 w-full rounded-lg px-4 py-3"
                    style={{
                      border: '1px solid var(--card-border)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)',
                    }}
                  />
                </div>

                <div>
                  <div className="flex items-center" style={{ color: 'var(--foreground)' }}>
                    <label htmlFor={`description-${objective.id}`} className="text-sm font-semibold">
                      Description
                    </label>
                    <InfoChip tooltip="Provide a detailed explanation of what you are trying to achieve with this research objective." />
                  </div>
                  <textarea
                    id={`description-${objective.id}`}
                    value={objective.description}
                    onChange={(e) => handleObjectiveDescriptionChange(objectiveIndex, e.target.value)}
                    placeholder="What is the description of your research objective?"
                    className="mt-2 w-full rounded-lg px-4 py-3"
                    rows={5}
                    style={{
                      border: '1px solid var(--card-border)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div>
                  <div className="flex items-center" style={{ color: 'var(--foreground)' }}>
                    <span className="text-sm font-semibold">Research objective stimulus</span>
                    <InfoChip tooltip="A stimulus is an image, video, or text shown to the user to gauge their reaction." />
                  </div>
                  <textarea
                    value={objective.stimulusNotes}
                    onChange={(e) => handleObjectiveStimulusChange(objectiveIndex, e.target.value)}
                    placeholder={DEFAULT_STIMULUS_PLACEHOLDER}
                    className="mt-2 w-full rounded-lg px-4 py-3 text-sm"
                    rows={4}
                    style={{
                      border: '1px solid var(--card-border)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </section>

              <div className="mt-12 space-y-8">
                {objective.questions.map((question, questionIndex) => {
                  const followUpButtonLabel = question.showFollowUps ? 'Hide follow-ups' : '2+ follow-ups';
                  const isVideoStimulus = question.stimulusEnabled && question.stimulusType === 'video';
                  const isImageStimulus = question.stimulusEnabled && question.stimulusType === 'image';
                  const videoId = isVideoStimulus ? extractYouTubeId(question.videoUrl.trim()) : null;
                  const videoThumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

                  return (
                    <section key={question.id} className="p-6 space-y-6 rounded-lg shadow-sm" style={{ backgroundColor: 'var(--card-bg)' }}>
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
                          Question {questionIndex + 1}
                        </h2>
                        <div className="flex items-center gap-3">
                          {objective.questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(objectiveIndex, question.id)}
                              className="p-2 rounded-full transition-colors"
                              style={{
                                color: 'var(--muted-foreground)',
                                backgroundColor: 'transparent',
                                border: '1px solid transparent',
                              }}
                              onMouseEnter={(event) => {
                                event.currentTarget.style.backgroundColor = 'var(--background)';
                              }}
                              onMouseLeave={(event) => {
                                event.currentTarget.style.backgroundColor = 'transparent';
                              }}
                              aria-label={`Delete question ${questionIndex + 1}`}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m1 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z"
                                />
                              </svg>
                            </button>
                          )}
                          <select
                            value={question.type}
                            onChange={(event) =>
                              handleQuestionTypeChange(objectiveIndex, question.id, event.target.value as QuestionType)
                            }
                            className="rounded-lg px-3 py-2 text-sm capitalize"
                            style={{
                              border: '1px solid var(--card-border)',
                              backgroundColor: 'var(--background)',
                              color: 'var(--foreground)',
                            }}
                          >
                            {QUESTION_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                              Question
                            </label>
                            <textarea
                              value={question.text}
                              onChange={(event) => handleQuestionTextChange(objectiveIndex, question.id, event.target.value)}
                              className="mt-2 w-full rounded-lg px-4 py-3"
                              rows={4}
                              placeholder="Please look at this commercial. What's your first impression? Are you drawn more to the Jaguar brand or less?"
                              style={{
                                border: '1px solid var(--card-border)',
                                backgroundColor: 'var(--background)',
                                color: 'var(--foreground)',
                                resize: 'vertical',
                              }}
                            />
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
                              <input
                                type="checkbox"
                                checked={question.showFollowUps}
                                onChange={() => handleFollowUpsToggle(objectiveIndex, question.id)}
                                className="h-4 w-4 rounded border"
                                style={{ borderColor: 'var(--card-border)' }}
                              />
                              {followUpButtonLabel}
                            </label>
                          </div>

                          {question.showFollowUps && (
                            <div>
                              <label className="block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                                Follow-up guidance
                              </label>
                              <textarea
                                value={question.followUps}
                                onChange={(event) => handleFollowUpsChange(objectiveIndex, question.id, event.target.value)}
                                className="mt-2 w-full rounded-lg px-4 py-3"
                                rows={6}
                                placeholder="- Ask them what stood out\n- Dig into tone or emotion\n- Ask what they would change"
                                style={{
                                  border: '1px solid var(--card-border)',
                                  backgroundColor: 'var(--background)',
                                  color: 'var(--foreground)',
                                  resize: 'vertical',
                                }}
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <label className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                                Stimulus
                              </label>
                              <div className="flex flex-wrap items-center gap-3">
                                <label className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
                                  <input
                                    type="checkbox"
                                    checked={question.stimulusEnabled}
                                    onChange={() => handleStimulusToggle(objectiveIndex, question.id)}
                                    className="h-4 w-4 rounded border"
                                    style={{ borderColor: 'var(--card-border)' }}
                                  />
                                  Attach a stimulus
                                </label>
                                {question.stimulusEnabled && (
                                  <select
                                    value={question.stimulusType}
                                    onChange={(event) =>
                                      handleStimulusTypeChange(
                                        objectiveIndex,
                                        question.id,
                                        event.target.value as QuestionStimulusType,
                                      )
                                    }
                                    className="rounded-lg px-3 py-2 text-sm"
                                    style={{
                                      border: '1px solid var(--card-border)',
                                      backgroundColor: 'var(--background)',
                                      color: 'var(--foreground)',
                                    }}
                                  >
                                    <option value="image">Single image</option>
                                    <option value="video">YouTube video</option>
                                  </select>
                                )}
                              </div>
                            </div>

                            {isVideoStimulus && (
                              <>
                                <input
                                  type="url"
                                  value={question.videoUrl}
                                  onChange={(event) =>
                                    handleQuestionVideoChange(objectiveIndex, question.id, event.target.value)
                                  }
                                  placeholder="https://www.youtube.com/watch?v=example"
                                  className="mt-3 w-full rounded-lg px-4 py-3"
                                  style={{
                                    border: '1px solid var(--card-border)',
                                    backgroundColor: 'var(--background)',
                                    color: 'var(--foreground)',
                                  }}
                                />
                                <div
                                  className="mt-4 rounded-lg overflow-hidden"
                                  style={{
                                    border: '1px solid var(--card-border)',
                                    backgroundColor: 'var(--background)',
                                  }}
                                >
                                  {videoThumbnailUrl ? (
                                    <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
                                      <img
                                        src={videoThumbnailUrl}
                                        alt="YouTube video thumbnail preview"
                                        className="w-full h-full object-cover"
                                        style={{ display: 'block' }}
                                      />
                                    </div>
                                  ) : (
                                    <div
                                      className="w-full flex flex-col items-center justify-center text-center"
                                      style={{
                                        height: '18rem',
                                        background: 'linear-gradient(135deg, var(--card-bg), var(--background))',
                                        color: 'var(--muted-foreground)',
                                      }}
                                    >
                                      <div className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                                        Add a YouTube link to preview the thumbnail
                                      </div>
                                      <p className="mt-2 max-w-sm text-sm" style={{ color: 'var(--muted-foreground)' }}>
                                        Once you paste a valid URL, we'll show the preview automatically.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}

                            {isImageStimulus && (
                              <div className="mt-4">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(event) => handleQuestionImageChange(objectiveIndex, question.id, event.target.files)}
                                  className="w-full rounded-lg px-4 py-3"
                                  style={{
                                    border: '1px solid var(--card-border)',
                                    backgroundColor: 'var(--background)',
                                    color: 'var(--foreground)',
                                  }}
                                />
                                {question.imagePreviewUrl && (
                                  <div className="mt-4 rounded-lg overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
                                    <img src={question.imagePreviewUrl} alt="Stimulus preview" className="w-full h-48 object-cover" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>
                  );
                })}

                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => handleAddQuestion(objectiveIndex)}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{
                      border: '1px solid var(--card-border)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)',
                    }}
                  >
                    Add another question
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-lg p-6 shadow-md" style={{ backgroundColor: 'var(--card-bg)' }}>
            <div className="flex justify-center">
              <button
                onClick={handleAddObjective}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                </svg>
                Add another research objective
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleLaunchStudy}
              disabled={launching}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: 'var(--accent, #2563eb)',
                color: 'white',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = 'var(--accent-hover, #1d4ed8)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = 'var(--accent, #2563eb)';
              }}
            >
              {launching ? 'Launching…' : 'Launch study'}
            </button>
          </div>
        </div>

        {deleteDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="w-full max-w-md rounded-lg p-6" style={{ backgroundColor: 'var(--card-bg)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Confirm Deletion</h3>

              <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Are you sure you want to delete this research study? This action cannot be undone.
              </p>

              {deleteError && <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-800">{deleteError}</div>}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setDeleteDialogOpen(false)}
                  className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </button>

                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                >
                  {deleting ? 'Deleting...' : 'Delete Study'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}
      </div>
    </div>
  );
}
