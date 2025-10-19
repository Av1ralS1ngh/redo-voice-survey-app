'use client';

interface ExampleCuesProps {
  interviewType: string;
  onCueClick: (text: string) => void;
}

const INTERVIEW_TYPE_CUES: Record<string, string[]> = {
  product_feedback: [
    "How's our new feature working out for customers?",
    "Are we delivering the right value to our customers?",
    "What do customers think about our latest service?",
  ],
  usability_testing: [
    "I want to test our new checkout flow with users who shop online frequently",
    "We need to evaluate if users can complete account setup without assistance",
    "Help me understand where users get stuck in our mobile app onboarding",
  ],
  customer_satisfaction: [
    "Meal kit subscription service, seeing cancellations after 2-3 months",
    "SaaS product with NPS of 42, need to understand why and improve retention",
    "Restaurant getting negative reviews about service quality and cleanliness",
  ],
  concept_testing: [
    "Test 3 packaging design concepts for our protein powder, targeting younger Gen Z fitness enthusiasts",
    "Evaluate 4 new flavor variants for our meal kit service before launch",
    "Validate our new mobile app feature concept with power users to decide if we should build it",
  ],
  nps: [
    "What drives customer loyalty in our industry?",
    "How can we improve our Net Promoter Score?",
    "What are the main reasons customers recommend us?",
  ],
  custom: [
    "What research question are we trying to answer?",
    "Who is our target audience for this research?",
    "What insights are we hoping to uncover?",
  ],
};

export function ExampleCues({ interviewType, onCueClick }: ExampleCuesProps) {
  const cues = INTERVIEW_TYPE_CUES[interviewType] || INTERVIEW_TYPE_CUES.custom;

  return (
    <div className="space-y-3">
      {cues.map((cue, index) => (
        <button
          key={index}
          onClick={() => onCueClick(cue)}
          className="w-full text-left px-6 py-4 rounded-xl bg-gray-100 text-gray-900 hover:bg-gray-200 transition-all border border-gray-200"
        >
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="text-base text-gray-900">
              {cue}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

