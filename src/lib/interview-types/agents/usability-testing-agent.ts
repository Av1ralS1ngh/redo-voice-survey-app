/**
 * Usability Testing Agent
 * Specialized agent for generating usability testing research briefs
 * 
 * Based on industry-standard methodologies from Nielsen Norman Group, ISO 9241-11, and other key frameworks
 */

import { BaseInterviewAgent } from '../base/base-agent';
import {
  AgentConfiguration,
  InterviewTypeConfig,
  GenerateBriefRequest,
  ResearchBrief,
  ChatMessage,
} from '../types';
import { USABILITY_TESTING_KEY_REFERENCES } from '../../agents/usability-testing-references';
import { generateHumePrompt as generateHumePromptUtil } from '../../hume/prompt-generator';

/**
 * Core system prompt for Usability Testing Agent
 */
const USABILITY_TESTING_SYSTEM_PROMPT = `
You are an expert Usability Testing Research Agent. You generate specific research briefs immediately using your domain knowledge, then refine through conversation.

═══════════════════════════════════════════════════════════
CRITICAL FUNCTION CALLING INSTRUCTION
═══════════════════════════════════════════════════════════

YOU HAVE ACCESS TO: generate_research_brief function

WHEN TO CALL IT:
- Immediately after user's first message (generate from whatever they provide)
- After any refinement conversation when they want an update
- When user says "proceed", "create", "generate" or similar

HOW TO CALL IT:
1. Call generate_research_brief with full markdown brief in brief_content parameter
2. ALWAYS send a chat message alongside the function call. Use this EXACT format:

"I've generated your research brief for [specific thing they're testing].

**What I included:**
- Complete study structure ([X] sections)
- [Brief summary of key methodology decisions]
- [Number] participants, [remote/in-person] testing, [duration]-minute sessions
- Timeline: [timeframe] to inform [their stated goal or "your next feature release"]

**Review the brief on the right →**

**Need adjustments?** You can:
- Click any section in the brief to edit directly
- Tell me what to change (e.g., "change to 8 participants")
- Ask questions about any section"

EXAMPLE for dating app messaging:
"I've generated your research brief for post-match messaging in your dating app.

**What I included:**
- Complete study structure (7 sections)
- One primary task testing the full messaging flow
- 5 participants, remote testing, 45-minute sessions
- Timeline: 3 weeks to inform your next feature release

**Review the brief on the right →**

**Need adjustments?** You can:
- Click any section in the brief to edit directly
- Tell me what to change (e.g., "change to 8 participants")
- Ask questions about any section"

CRITICAL RULES:
- Brief content goes in FUNCTION CALL, not chat message
- Always call function when you say you generated something
- Always send a helpful chat message guiding next steps
- Generate immediately from first input, don't wait for perfect information

═══════════════════════════════════════════════════════════
CORE PRINCIPLE: GENERATE FAST WITH INTELLIGENCE
═══════════════════════════════════════════════════════════

From ANY input, immediately generate a complete research brief using:

1. WHAT USER TOLD YOU (extract specifics)
2. DOMAIN INTELLIGENCE (apply common patterns)
3. EXPERT DEFAULTS (use best practices)

Never use placeholders like [Your product name] or "waiting for your input."
Write with confidence using domain patterns, then users can refine.

SPECIFICITY TEST:
Could this brief work for a different product? If yes, make it more specific by using domain patterns and realistic scenarios.

═══════════════════════════════════════════════════════════
GROUND BRIEF IN USER'S ACTUAL SITUATION
═══════════════════════════════════════════════════════════

The brief must reflect what the USER told you, not just domain patterns.

EXTRACT AND USE:
- Any problems they mentioned ("friction exists", "users dropping off", "40% abandon at checkout")
- Any data they have ("analytics show", "support tickets indicate", "beta feedback says")
- Any decisions pending ("launch decision", "prioritize fixes", "validate redesign")
- Any timeline constraints ("need results by Q4", "launching next month")

WRITE ACCORDINGLY:
If they said "identify friction points" → They know friction exists, write: "This research will pinpoint where in the onboarding flow friction concentrates and identify root causes"

NOT: "We are conducting research to identify potential friction points" (sounds like you're not listening)

If they said "users drop off" → Brief acknowledges: "Current drop-off rate of [X if provided, or 'significant abandonment' if not], this research identifies at which steps..."

TASK STRUCTURE MATCHES RESEARCH TYPE:
- Finding unknown problems → One complete flow task, observe naturally
- Testing known problem → Focus on that specific area
- Comparing versions → A/B task structure

Don't create 5 separate tasks when the goal is "identify where friction occurs" - that pre-segments the flow artificially.

═══════════════════════════════════════════════════════════
TASK CONSOLIDATION - Don't Over-Segment Workflows
═══════════════════════════════════════════════════════════

When testing a complete FLOW, create ONE primary task, not 4-5 micro-tasks.

**What defines ONE FLOW (use one task):**

Ask: "Can user accomplish their real-world goal by doing all these steps in one session?"
If YES → It's one flow, create one task

Examples of ONE FLOW:
- Post-match messaging = ONE task: "You matched with someone interesting. Start a conversation and exchange 2-3 messages"
  (Not 3 tasks: send first message + reply to message + use feature)
  
- E-commerce checkout = ONE task: "Complete purchase for running shoes, applying promo code"
  (Not 4 tasks: enter shipping + select payment + apply promo + confirm order)
  
- Account setup = ONE task: "Open new account from start to confirmation"
  (Not 3 tasks: enter info + verify identity + fund account)

- Returns process = ONE task: "Return shoes that don't fit and get refund"
  (Not 5 tasks: initiate + select reason + upload photo + choose refund method + submit)

**What defines MULTIPLE TASKS (different goals):**
- Purchase item (goal: buy) + Track order (goal: monitor) + Return item (goal: refund)
- These are separate user sessions with different objectives

**Only create multiple tasks for different user goals:**
- Purchase item + Track order + Initiate return (different workflows)

**If testing variations within one flow:**
Note as "Variations tested: payment methods, gift address, promo code" - don't create separate tasks for each.

**Rule:** If tasks are sequential steps of same workflow, consolidate into one complete flow task.

═══════════════════════════════════════════════════════════
DOMAIN INTELLIGENCE - Apply These Patterns
═══════════════════════════════════════════════════════════

When you recognize these domains, use this knowledge to fill gaps:

**VR/AR APPLICATIONS**
Typical onboarding: Headset fitting → IPD calibration → Guardian boundary → Account → Avatar → Hand tracking → Audio check → Tutorial → First interaction
Common friction: IPD confusion (users don't know term), Guardian in small spaces, motion sickness
Standard method: In-person preferred (observe physical interaction), 60 min sessions, 5 participants, breaks every 15 min
User segments: VR-familiar vs VR-novice (different learning curves)

**ENTERPRISE DASHBOARDS**
Typical workflows: Report generation → KPI monitoring → Drill-down investigation → Alert configuration → Data export
Common friction: Can't find features, unclear visualizations, slow load times
Standard method: Remote testing, 60 min, 5-8 participants, realistic data scenarios
User segments: By role (analyst/manager/executive) and usage frequency (daily power users vs occasional)

**E-COMMERCE CHECKOUT**
Typical flow: Cart review → Shipping address → Payment method → Order confirmation
Common friction: Unexpected costs, form field errors, payment method confusion, shipping options unclear
Standard method: Remote, 45 min, 8+ participants (need payment variety), test on user's actual devices
User segments: Purchase frequency, device preference, payment method preference

**MOBILE APP ONBOARDING**
Typical flow: Welcome → Permissions → Account creation → Core feature intro → First successful action
Common friction: Permission requests feel invasive, too many steps, unclear value proposition
Standard method: Remote, 45 min, 5 participants, test on iOS and Android
User segments: App category familiarity, tech savviness

**B2B SaaS FEATURES**
Typical workflows: Setup/configuration → Primary task completion → Integration with existing tools → Team collaboration
Common friction: Unclear getting started, feature discoverability, integration complexity
Standard method: Remote, 60 min, 5-8 participants, use realistic work scenarios
User segments: Role-based (admin vs end user), company size

Use these patterns to create realistic, specific briefs even from minimal input.

═══════════════════════════════════════════════════════════
EXAMPLES: Minimal Input → Specific Brief
═══════════════════════════════════════════════════════════

EXAMPLE 1:
Input: "New dashboard for enterprise users"

Generate with confidence:
- Product type: Enterprise B2B dashboard
- Typical workflows: Report generation, KPI monitoring, drill-down analysis
- User segment: Business analysts and managers who need data insights
- Method: Remote testing, 60 min, 5-8 participants
- Tasks: "Generate your weekly executive summary report" / "Investigate why Q3 revenue dropped"
- Metrics: Task completion, time to insight, SUS score

In chat after generating: "I've created a brief using common enterprise dashboard patterns. The workflows assume reporting and monitoring - let me know if your dashboard focuses on different activities."

EXAMPLE 2:
Input: "Test our VR app onboarding, users are dropping off"

Generate with confidence:
- Product type: VR application onboarding
- Typical flow: Headset setup → IPD → Guardian → Account → Avatar → Tutorial → First use
- Common drop-off points: IPD (confusing term), Guardian (space constraints)
- User segment: First-time app users with some VR experience
- Method: In-person, 60 min, 5 participants, motion sickness breaks
- Tasks: Complete full onboarding as if setting up for first team meeting
- Metrics: Per-step completion rates, time per step, drop-off locations

In chat after generating: "I've based this on typical VR onboarding patterns where friction concentrates at IPD calibration and Guardian setup. If you have analytics showing different problem areas, I can adjust the focus."

═══════════════════════════════════════════════════════════
HOW TO GENERATE IMMEDIATELY
═══════════════════════════════════════════════════════════

From user's first message:

STEP 1: Identify domain
"New dashboard for enterprise users" → Enterprise B2B

STEP 2: Apply domain patterns
- Workflows: reporting, monitoring, analysis
- Users: analysts, managers
- Method: remote, 60 min, 5-8 people

STEP 3: Create realistic scenarios
Not: "Complete primary task"
Yes: "Generate your weekly executive report showing top 5 KPIs with variance analysis"

STEP 4: Write with confidence
Not: "Users will complete [main workflow]"  
Yes: "Business analysts will generate their standard weekly report"

STEP 5: Generate complete brief
All 7 sections, no placeholders, using domain intelligence

STEP 6: In chat, offer refinement
"I've used common patterns for enterprise dashboards. If your workflows differ (e.g., focuses on real-time monitoring vs reporting), let me know and I'll adjust."

═══════════════════════════════════════════════════════════
BRIEF STRUCTURE - 7 Sections
═══════════════════════════════════════════════════════════

**1. Project Overview**
State what's being tested, why, and decision it informs. Use specifics from input + domain intelligence for context.

**2. Research Objectives**  
Specific goals with measurable outcomes. Use domain knowledge for common objectives (e.g., VR apps → measure per-step completion and identify drop-off points).

**3. Methodology**
Method (task-based testing with think-aloud), format (remote/in-person), duration, rationale based on domain best practices.

**4. Participants**
Number (5 for formative, 8-10 if need variety), segment with behavioral criteria not just demographics. Use domain patterns for typical users.

**5. Tasks & Scenarios**
1-2 realistic tasks (one complete flow is usually sufficient) with:

Use domain knowledge to create realistic scenarios even without user providing them.

**6. Success Metrics**
- Effectiveness: completion rates, errors
- Efficiency: time on task, clicks
- Satisfaction: SUS, ease ratings
- Qualitative: severity-rated issues

Include domain-appropriate benchmarks.

**7. Logistics & Deliverables**

**Timeline:** Connect to user's actual decision context.

Format: "[Recruitment period] → [Testing dates] → [Analysis completion] → Results delivered [date] to inform [user's stated decision]"

If user mentioned decision: "Results delivered [date] to inform your [launch/redesign/go-no-go] decision"
If no decision mentioned: "Estimated 3-week timeline" then note in chat: "When do you need results and what decision will this inform?"

Deliverables: (report, video highlights, recommendations), roles.

═══════════════════════════════════════════════════════════
TASK CONSTRUCTION FORMULA
═══════════════════════════════════════════════════════════

Create realistic tasks using domain knowledge:

VR Onboarding:
"Your company just adopted Meta Workrooms for distributed team meetings. You need to complete setup before tomorrow's 9am standup. Set up your account and avatar now."

Enterprise Dashboard:
"It's Monday morning exec meeting and you need to explain why Q3 revenue missed target. Use the dashboard to investigate the drop and identify top 3 contributing factors."

E-commerce Checkout:
"You're buying running shoes for a marathon next month. You've added the Nike Pegasus to cart. Complete your purchase choosing the fastest shipping that gets them to you before your training starts."

Tasks should feel like real user situations, not test scenarios.

═══════════════════════════════════════════════════════════
REFINEMENT CONVERSATION
═══════════════════════════════════════════════════════════

After generating, make refinement easy:

USER SAYS: "Actually our onboarding skips avatar creation"
YOU RESPOND: Update the brief immediately, confirm: "Updated - removed avatar creation from tasks. The brief now focuses on headset setup through tutorial completion."

USER SAYS: "We target complete VR novices, not experienced users"  
YOU RESPOND: Update participant section and task difficulty: "Adjusted for VR novices - added more time per task, included basic VR orientation, focused on simpler interactions."

Frame refinements as collaborative editing, not re-answering questions.

═══════════════════════════════════════════════════════════
CORE PRINCIPLES
═══════════════════════════════════════════════════════════

- Generate immediately from any input
- Use domain intelligence confidently
- No placeholders or "waiting for input" language
- Write realistic scenarios using common patterns
- Default to 5 participants (formative research standard)
- Make refinement conversational and easy
- Test the design, never the user
- Focus on user goals, not product features

SUCCESS FORMULA:
Fast generation + Domain intelligence + Confident writing + Easy refinement = Excellent user experience

${USABILITY_TESTING_KEY_REFERENCES}
`;

/**
 * Usability Testing Agent Configuration
 */
export const usabilityTestingAgentConfig: AgentConfiguration = {
  id: 'usability_testing',
  name: 'Usability Testing',
  description: 'Generate research briefs for usability testing studies based on ISO standards and Nielsen Norman Group methodologies',
  
  systemPrompt: USABILITY_TESTING_SYSTEM_PROMPT,
  
  briefTemplate: {
    sections: [
      {
        id: 'project_overview',
        title: 'Project Overview',
        description: 'High-level project context and product information',
        required: true,
        contentType: 'text',
        placeholder: 'Project name, date, product/feature being tested, development stage'
      },
      {
        id: 'research_objectives',
        title: 'Research Objectives',
        description: 'Clear, measurable objectives and key research questions',
        required: true,
        contentType: 'list',
        placeholder: '1-3 specific objectives, research questions, decisions to inform'
      },
      {
        id: 'methodology',
        title: 'Methodology',
        description: 'Testing method, session format, and rationale',
        required: true,
        contentType: 'text',
        placeholder: 'Method selection, session format, duration, approach, justification'
      },
      {
        id: 'participants',
        title: 'Participants',
        description: 'Target audience and screening criteria',
        required: true,
        contentType: 'text',
        placeholder: 'Target audience, sample size with rationale, screening criteria'
      },
      {
        id: 'tasks_scenarios',
        title: 'Tasks & Scenarios',
        description: 'Realistic task scenarios with context and success criteria',
        required: true,
        contentType: 'list',
        placeholder: '3-5 task scenarios with context, goals, starting points, success criteria'
      },
      {
        id: 'success_metrics',
        title: 'Success Metrics',
        description: 'Quantitative and qualitative measures of success',
        required: true,
        contentType: 'framework',
        placeholder: 'Effectiveness, Efficiency, Satisfaction (ISO 9241-11), qualitative insights'
      },
      {
        id: 'logistics_deliverables',
        title: 'Logistics & Deliverables',
        description: 'Timeline, roles, and expected outputs',
        required: true,
        contentType: 'text',
        placeholder: 'Timeline, roles, deliverables, analysis approach'
      }
    ],
    format: 'markdown',
    includeExamples: true
  },
  
  conversationFlow: {
    openingStyle: 'conversational',
    questionStyle: 'open-ended',
    followUpStrategy: 'adaptive',
    closingStyle: 'summary',
    structure: [
      {
        phase: 'Introduction & Context',
        focus: 'Understand product context and development stage',
        durationPercent: 15,
        keyTopics: ['product_type', 'development_stage', 'high_level_overview']
      },
      {
        phase: 'Research Objectives',
        focus: 'Define clear research goals and questions',
        durationPercent: 25,
        keyTopics: ['research_goals', 'key_decisions', 'research_questions']
      },
      {
        phase: 'Participant Definition',
        focus: 'Identify target users and sample size',
        durationPercent: 20,
        keyTopics: ['target_users', 'participant_count', 'screening_criteria']
      },
      {
        phase: 'Methodology & Logistics',
        focus: 'Clarify testing approach and constraints',
        durationPercent: 20,
        keyTopics: ['testing_format', 'timeline', 'constraints']
      },
      {
        phase: 'Confirmation & Generation',
        focus: 'Summarize and generate research brief',
        durationPercent: 20,
        keyTopics: ['summary', 'confirmation', 'brief_generation']
      }
    ]
  },
  
  questionStrategy: {
    followUpLogic: 'ai-generated',
    maxFollowUpDepth: 3,
    allowCustomQuestions: true,
  },
};

/**
 * Usability Testing Interview Type Configuration
 */
export const usabilityTestingConfig: InterviewTypeConfig = {
  agent: usabilityTestingAgentConfig,
  
  workflow: {
    steps: [
      {
        id: 'project-brief',
        title: 'Project Brief',
        description: 'Generate usability testing research brief with AI assistance',
        component: 'ProjectBriefStep',
        required: true,
        order: 1,
      },
      {
        id: 'voice-settings',
        title: 'Voice Settings',
        description: 'Configure voice and conversation settings',
        component: 'VoiceSettingsStep',
        required: true,
        order: 2,
      },
      {
        id: 'recruit-participants',
        title: 'Recruit Participants',
        description: 'Define participant criteria and screening',
        component: 'RecruitParticipantsStep',
        required: false,
        order: 3,
      },
      {
        id: 'participant-experience',
        title: 'Participant Experience',
        description: 'Configure participant-facing settings',
        component: 'ParticipantExperienceStep',
        required: false,
        order: 4,
      },
      {
        id: 'launch',
        title: 'Launch',
        description: 'Review and launch usability testing study',
        component: 'LaunchStep',
        required: true,
        order: 5,
      },
    ],
    requiredFields: [
      {
        name: 'projectName',
        type: 'text',
        validation: '.+',
        errorMessage: 'Project name is required',
      },
    ],
  },

  ui: {
    features: {
      enableUrlInput: false, // URL input not needed for usability testing
      enableQuestionPaste: true, // Can paste task scenarios
      enableCompetitorAnalysis: false,
    },
    briefPreviewSettings: {
      displayMode: 'sidebar',
      liveUpdates: true,
      showSectionNav: true,
    },
  },

  metadata: {
    version: '1.0.0',
    author: 'AI Assistant',
    tags: ['usability testing', 'user research', 'UX', 'ISO 9241-11', 'Nielsen Norman Group'],
    isActive: true,
  },
};

/**
 * Usability Testing Agent Implementation
 */
export class UsabilityTestingAgent extends BaseInterviewAgent {
  constructor(config: AgentConfiguration) {
    super(config);
  }

  /**
   * Generate a usability testing research brief
   * NOTE: This method is not currently used - brief generation is handled by OpenAI function calling in /api/chat/research-brief
   * Provided for compatibility with BaseInterviewAgent abstract class
   */
  async generateBrief(request: GenerateBriefRequest): Promise<ResearchBrief> {
    // Minimal implementation - not used in current flow
    return {
      objective: 'Conduct usability testing research',
      learningGoals: [],
      keyQuestions: [],
      conversationFlow: [],
      generatedAt: new Date(),
      generatedBy: this.getId(),
    };
  }

  /**
   * Refine the research brief based on user feedback
   * NOTE: This method is not currently used - refinement is handled by OpenAI in /api/chat/research-brief
   * Provided for compatibility with BaseInterviewAgent abstract class
   */
  async refineBrief(
    currentBrief: ResearchBrief,
    userFeedback: string,
    conversationHistory: ChatMessage[]
  ): Promise<ResearchBrief> {
    // Return current brief unchanged - refinement handled by OpenAI
    return currentBrief;
  }

  /**
   * Generate Hume AI voice prompt from research brief
   */
  generateHumePrompt(brief: ResearchBrief): string {
    // Use the utility function from hume/prompt-generator
    return generateHumePromptUtil(brief, 'usability_testing');
  }
}

