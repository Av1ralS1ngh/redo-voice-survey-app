// Usability Testing Key References
// Manually curated from authoritative sources
// These are the most valuable references to inject into agent prompts

export const USABILITY_TESTING_KEY_REFERENCES = `
<key_references>

[1] NIELSEN'S 5-USER TESTING RULE (Primary Authority)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Source: Nielsen Norman Group - "Why You Only Need to Test with 5 Users"
URL: https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/

Key Finding: Testing with 5 users reveals approximately 85% of usability problems.

Mathematical Formula:
  Problem Detection Rate = 1 - (1 - p)^n
  where:
    p = probability any given user encounters a problem
    n = number of test participants

For typical usability issues (p ≈ 31%):
  - 1 user: 31% problems found
  - 2 users: 53% problems found
  - 3 users: 69% problems found
  - 5 users: 85% problems found
  - 15 users: 99% problems found

Why 5 is optimal:
  • Cost-effective: Diminishing returns after 5 users
  • Allows multiple iterations: Better to test 3 iterations with 5 users than 1 iteration with 15
  • Formative testing: 85% detection is sufficient for identifying major issues
  • Budget-friendly: Save resources for fixing problems, not just finding them

When to use more:
  • Quantitative benchmarking: 8-12+ users for statistical significance
  • Multiple user groups: 5 users per distinct user type
  • High-stakes products: Medical devices, financial systems
  • Card sorting / tree testing: 30+ users for statistical patterns


[2] THINK-ALOUD PROTOCOL (Methodology Foundation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Source: Nielsen Norman Group - "Thinking Aloud: The #1 Usability Tool"
URL: https://www.nngroup.com/articles/thinking-aloud-the-1-usability-tool/
Origin: Ericsson & Simon (1984) - Protocol Analysis

Definition: Having users verbalize their thoughts while interacting with a product.

Three Variants:

1. Concurrent Think-Aloud (Most Common)
   • Users speak while performing tasks
   • Provides real-time cognitive insights
   • Pros: Rich qualitative data, natural verbalization
   • Cons: Slight performance impact (10-20% slower task times)
   • Best for: Formative testing, finding usability issues

2. Retrospective Think-Aloud
   • Users review session video and comment afterward
   • Requires screen recording capability
   • Pros: No performance impact, accurate timing data
   • Cons: Memory decay, less natural, longer sessions
   • Best for: When timing/performance is critical metric

3. Interactive/Probing Approach (Hybrid)
   • Moderator asks questions during natural pauses
   • "What are you thinking?" / "What would you do next?"
   • Pros: Balances depth with natural behavior
   • Cons: Requires skilled moderation
   • Best for: Most real-world moderated testing

Best Practices:
  ✓ Explain protocol clearly with demonstration
  ✓ "We're testing the design, not you"
  ✓ Encourage continuous verbalization
  ✓ Count to 10 before prompting if user goes silent
  ✓ Use echo technique: Repeat last phrase with questioning tone
  ✓ Never lead or suggest solutions

Common Mistakes:
  ✗ Asking "Why did you do that?" (sounds judgmental)
  ✗ Interrupting user's natural flow
  ✗ Asking too many questions (becomes interview, not observation)
  ✗ Leading questions like "Was that easy?"


[3] TASK SCENARIO DESIGN (Critical Success Factor)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Source: Nielsen Norman Group - "Task Scenarios for Usability Testing"
URL: https://www.nngroup.com/articles/task-scenarios-usability-testing/
+ "Better Usability Tasks"
URL: https://www.nngroup.com/articles/better-usability-tasks/

Golden Rules:

1. NEVER use interface language in task descriptions
   ✗ Bad: "Click the 'Add to Cart' button"
   ✓ Good: "You want to purchase this item"

2. Provide realistic context and motivation
   ✗ Bad: "Find information about shipping"
   ✓ Good: "You're buying a gift for your sister's birthday next week. You need to know if it will arrive in time."

3. State the end goal, not the steps
   ✗ Bad: "Go to Settings, then Privacy, then delete your account"
   ✓ Good: "You've decided to stop using this service. Remove your account."

4. Keep tasks independent
   • One task's completion shouldn't be required for the next
   • Allows partial session completion if time runs short
   • Prevents cascading failures

5. Realistic task duration: 3-8 minutes each
   • Too short: Doesn't reveal workflow issues
   • Too long: User fatigue, time pressure

Task Structure Template:
━━━━━━━━━━━━━━━━━━━━
CONTEXT: [Realistic scenario, user motivation]
GOAL: [What user wants to accomplish]
STARTING POINT: [Where user begins]
SUCCESS CRITERIA: [How you know task is complete]

Example - E-commerce:
  Context: "You're planning a camping trip next month and need a tent that sleeps 4 people. Your budget is around $200."
  Goal: Find and add a suitable tent to your cart
  Starting Point: Home page
  Success: Tent added to cart, or user gives up

Number of Tasks:
  • 3-5 tasks: Standard session (60 min total)
  • 5-8 tasks: Comprehensive evaluation
  • Never exceed 8 tasks in one session (cognitive overload)


[4] ISO 9241-11 USABILITY METRICS (Industry Standard)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Source: ISO 9241-11:2018 - Ergonomics of human-system interaction
Standard: International Organization for Standardization

Official Definition of Usability:
"The extent to which a system, product or service can be used by specified users 
to achieve specified goals with effectiveness, efficiency and satisfaction in a 
specified context of use."

Three Core Metrics:

1. EFFECTIVENESS
   Definition: Accuracy and completeness with which users achieve goals
   Measures:
   • Task completion rate (%)
   • Task success rate (binary: success/failure)
   • Error frequency
   • Error severity (critical/major/minor)
   
   Calculation:
     Task Completion Rate = (# successful tasks / # attempted tasks) × 100
     
   Benchmarks:
     • >78%: Above average
     • 70-78%: Average
     • <70%: Below average (requires attention)

2. EFFICIENCY  
   Definition: Resources expended in relation to accuracy/completeness
   Measures:
   • Time on task (seconds/minutes)
   • Time-based efficiency: (# tasks completed / time spent)
   • Clicks/taps to completion
   • Deviations from optimal path
   
   Context matters:
     • First-time users: Expect longer times
     • Expert users: Optimize for speed
     • Infrequent tasks: Clarity > speed

3. SATISFACTION
   Definition: User comfort and acceptability
   Measures:
   • System Usability Scale (SUS): 10 questions, 0-100 score
   • Single Ease Question (SEQ): "How easy was this task?" (1-7 scale)
   • Net Promoter Score (NPS): "Would you recommend?" (-100 to +100)
   • Post-task satisfaction ratings
   
   SUS Benchmarks:
     • >80.3: Grade A (Excellent)
     • 68-80.3: Grade B/C (Good)
     • <68: Grade D/F (Poor)

Why This Matters:
  • Common language for stakeholders
  • Enables longitudinal tracking (measure improvement)
  • Industry-recognized framework
  • Connects UX metrics to business outcomes


[5] REMOTE MODERATED TESTING SETUP (Modern Best Practice)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Source: Maze - "Remote Usability Testing Guide"
URL: https://maze.co/guides/usability-testing/remote/
+ NN/g "Moderated Remote Usability Testing"
URL: https://www.nngroup.com/articles/moderated-remote-usability-test/

When to Use Remote:
  ✓ Geographic diversity needed
  ✓ Cost constraints (no travel, lab rental)
  ✓ Distributed teams
  ✓ Testing in natural environment (especially for software/web)
  ✓ Faster recruitment and scheduling

Technical Requirements:
  • Reliable internet (both moderator and participant)
  • Screen sharing capability (Zoom, Teams, Google Meet)
  • Recording consent and capability
  • Backup communication channel (phone, chat)
  • Test environment accessible remotely (web app, clickable prototype)

Session Structure (add 10-15 min buffer):
  1. Technical Setup & Ice-Breaking (10 min)
     - Test screenshare
     - Ensure recording started
     - Verify participant can see/hear
     - Quick rapport building
  
  2. Introduction (5 min)
     - Same as in-person: "Testing design, not you"
     - Think-aloud explanation
     - Answer questions
  
  3. Tasks (35-40 min)
     - Same task structure as in-person
     - More explicit instructions (can't point at screen)
     - Use chat for sharing links/resources
  
  4. Wrap-up (5 min)
     - Overall impressions
     - Technical issues to note
     - Thanks and compensation
  
  Total: 60-70 min (vs. 60 min in-person)

Remote-Specific Best Practices:
  ✓ Send calendar invite with clear joining instructions
  ✓ Test 5 minutes before scheduled time
  ✓ Have backup moderator to handle technical issues
  ✓ Mute yourself when participant is working (avoid keyboard noise)
  ✓ Record locally AND in cloud (redundancy)
  ✓ Use virtual backgrounds sparingly (can be distracting)
  ✓ Share links in chat rather than reading URLs aloud

Common Remote Pitfalls:
  ✗ Assuming participant is tech-savvy
  ✗ Not having a Plan B for screenshare failures
  ✗ Poor internet causing connection drops
  ✗ Participant multitasking (email, messages)
  ✗ Moderator looking at other screen (participant notices)

Mobile Testing Remotely:
  • Use platform-specific screenshare (iOS Reflector, Android apps)
  • Or: Ask participant to hold device up to webcam (lower quality, works in pinch)
  • Consider unmoderated testing for mobile (easier for participants)

</key_references>
`;

// Export individual references for selective use
export const REFERENCE_5_USER_TESTING = `[1] Nielsen's 5-User Testing Rule: Testing with 5 users reveals ~85% of usability problems. Formula: 1 - (1 - p)^n where p ≈ 31%. Cost-effective for formative testing. Source: https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/`;

export const REFERENCE_THINK_ALOUD = `[2] Think-Aloud Protocol: Users verbalize thoughts while performing tasks. Three variants: Concurrent (real-time), Retrospective (video review), Interactive (probing). Best practice: Explain clearly, count to 10 before prompting. Source: https://www.nngroup.com/articles/thinking-aloud-the-1-usability-tool/`;

export const REFERENCE_TASK_SCENARIOS = `[3] Task Scenario Design: Never use UI language. Provide realistic context and motivation. State end goal, not steps. Keep tasks independent. 3-8 min per task. Source: https://www.nngroup.com/articles/task-scenarios-usability-testing/`;

export const REFERENCE_ISO_METRICS = `[4] ISO 9241-11 Usability Metrics: Effectiveness (task completion %), Efficiency (time/clicks), Satisfaction (SUS score). SUS >80.3 = Grade A. Source: ISO 9241-11:2018`;

export const REFERENCE_REMOTE_TESTING = `[5] Remote Moderated Testing: Add 10-15 min buffer for tech setup. Test screenshare before starting. Have backup communication. Send clear joining instructions. Source: https://maze.co/guides/usability-testing/remote/`;

// Helper to get all references as array
export const getAllReferences = () => [
  REFERENCE_5_USER_TESTING,
  REFERENCE_THINK_ALOUD,
  REFERENCE_TASK_SCENARIOS,
  REFERENCE_ISO_METRICS,
  REFERENCE_REMOTE_TESTING
];

// Helper to get reference by topic
export const getReferenceByTopic = (topic: string): string => {
  const topicMap: Record<string, string> = {
    'sample_size': REFERENCE_5_USER_TESTING,
    'participants': REFERENCE_5_USER_TESTING,
    'think_aloud': REFERENCE_THINK_ALOUD,
    'protocol': REFERENCE_THINK_ALOUD,
    'tasks': REFERENCE_TASK_SCENARIOS,
    'scenarios': REFERENCE_TASK_SCENARIOS,
    'metrics': REFERENCE_ISO_METRICS,
    'iso': REFERENCE_ISO_METRICS,
    'remote': REFERENCE_REMOTE_TESTING,
    'moderated': REFERENCE_REMOTE_TESTING
  };
  
  return topicMap[topic.toLowerCase()] || USABILITY_TESTING_KEY_REFERENCES;
};

