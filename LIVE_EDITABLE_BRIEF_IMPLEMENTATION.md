# Live Editable Research Brief - Implementation Guide

## Overview

This document outlines the transformation of the research brief from a "static document viewer" to a "live editable document" that updates in real-time as the conversation progresses.

## 🎯 Key Features Implemented

### 1. Real-Time Section Population
- ✅ Sections stream as they're generated (no "pop-in" effect)
- ✅ Visual status indicators for each section:
  - ✓ Complete (green checkmark)
  - ⏳ Generating (blue spinner)
  - ⏳ Pending (gray clock)
- ✅ Each section fades in smoothly as it completes
- ✅ Progressive disclosure of content

### 2. Inline Editing System
- ✅ Single click on any complete section → edit mode
- ✅ Text becomes editable textarea
- ✅ Save/Cancel buttons appear inline
- ✅ On save → updates backend, regenerates affected sections
- ✅ "Updating..." indicator while processing
- ✅ Optimistic UI updates

## 📁 New Files Created

### 1. `/src/app/api/chat/research-brief-stream/route.ts`
**Purpose:** Streaming API endpoint for real-time brief generation

**Key Features:**
- Server-Sent Events (SSE) streaming
- Section-by-section parsing
- Progressive content delivery
- Function calling support for structured output

**Event Types:**
```typescript
{
  type: 'message',      // Chat message chunks
  content: string
}

{
  type: 'sections',     // Section updates
  sections: BriefSection[],
  metadata: BriefMetadata
}

{
  type: 'complete',     // Final complete signal
  message: string,
  researchBrief: string,
  metadata: BriefMetadata
}

{
  type: 'error',        // Error handling
  error: string
}
```

### 2. `/src/components/wizard/EditableBriefSection.tsx`
**Purpose:** Editable section component with status indicators

**Features:**
- Click-to-edit functionality
- Status indicators (complete/generating/pending)
- Inline save/cancel buttons
- Auto-resizing textarea
- Markdown rendering in view mode
- Fade-in animation
- Loading states

**Props:**
```typescript
interface EditableBriefSectionProps {
  id: string;
  title: string;
  content: string;
  status: 'complete' | 'generating' | 'pending';
  onSave?: (id: string, newContent: string) => Promise<void>;
  isEditing?: boolean;
  onEditStart?: (id: string) => void;
  onEditCancel?: () => void;
}
```

### 3. `/src/app/api/chat/update-section/route.ts`
**Purpose:** Backend endpoint for section updates

**Features:**
- Accepts section-specific edits
- Regenerates affected sections for consistency
- Returns updated full brief
- Identifies which sections changed

**Request:**
```typescript
{
  sectionId: string;
  sectionContent: string;
  fullBrief: string;
  interviewType: string;
  projectName: string;
}
```

**Response:**
```typescript
{
  updatedBrief: string;
  changedSections: string[];
  message: string;
}
```

### 4. `/src/components/wizard/ResearchBriefPreviewLive.tsx`
**Purpose:** Live preview component with streaming and editing

**Features:**
- Renders editable sections
- Manages editing state
- Handles section updates
- PDF download support
- Status tracking
- Progressive rendering

**Props:**
```typescript
interface ResearchBriefPreviewLiveProps {
  researchBrief?: string;
  sections?: BriefSection[];
  projectName: string;
  interviewType: string;
  onUse?: () => void;
  onNextStep?: () => void;
  hasInterviewGuide?: boolean;
  onSectionUpdate?: (sectionId: string, newContent: string) => Promise<void>;
}
```

### 5. `/src/app/globals.css` (Updated)
**Purpose:** CSS animations for section transitions

**Added:**
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}
```

## 🔧 Integration Steps

### Step 1: Update ProjectBriefStep to use streaming

```typescript
// In ProjectBriefStep.tsx
import { ResearchBriefPreviewLive } from '@/components/wizard/ResearchBriefPreviewLive';

// Add state for sections
const [briefSections, setBriefSections] = useState<BriefSection[]>([]);

// Handle section updates
const handleSectionUpdate = async (sectionId: string, newContent: string) => {
  const response = await fetch('/api/chat/update-section', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sectionId,
      sectionContent: newContent,
      fullBrief: wizardData.researchBrief,
      interviewType: wizardData.interviewType,
      projectName: projectName,
    }),
  });
  
  const data = await response.json();
  
  // Update wizard data with new brief
  onUpdateData({
    researchBrief: data.updatedBrief,
  });
  
  // Update sections
  setBriefSections(parseBriefIntoSections(data.updatedBrief));
};

// Replace ResearchBriefPreview with ResearchBriefPreviewLive
<ResearchBriefPreviewLive
  sections={briefSections}
  projectName={projectName}
  interviewType={wizardData.interviewType || 'usability_testing'}
  onUse={handleGenerateGuide}
  hasInterviewGuide={!!interviewGuide}
  onSectionUpdate={handleSectionUpdate}
/>
```

### Step 2: Update ChatInterface to use streaming

```typescript
// In ChatInterface.tsx

const handleStreamingMessage = async (messageContent: string) => {
  try {
    const response = await fetch('/api/chat/research-brief-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName,
        projectDescription,
        chatHistory: messages,
        interviewType,
        currentView,
        researchBrief,
      }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    let accumulatedMessage = '';
    let currentSections: BriefSection[] = [];

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.substring(6));

          if (data.type === 'message') {
            accumulatedMessage += data.content;
            // Update UI with streaming message
          } else if (data.type === 'sections') {
            currentSections = data.sections;
            // Update UI with sections
            onSectionsUpdate(currentSections);
          } else if (data.type === 'complete') {
            // Final update
            onBriefComplete(data.researchBrief || data.interviewGuide);
          }
        }
      }
    }
  } catch (error) {
    console.error('Streaming error:', error);
  }
};
```

### Step 3: Wire up the components

```typescript
// In ProjectBriefStep.tsx

// 1. Track sections state
const [briefSections, setBriefSections] = useState<BriefSection[]>([]);

// 2. Handle section updates from streaming
const handleSectionsUpdate = (sections: BriefSection[]) => {
  setBriefSections(sections);
};

// 3. Pass to ChatInterface
<ChatInterface
  // ... existing props
  onSectionsUpdate={handleSectionsUpdate}
/>

// 4. Use in ResearchBriefPreviewLive
<ResearchBriefPreviewLive
  sections={briefSections}
  projectName={projectName}
  interviewType={wizardData.interviewType || 'usability_testing'}
  onSectionUpdate={handleSectionUpdate}
  // ... other props
/>
```

## 🎨 User Experience Flow

### Generation Flow
1. User starts conversation
2. AI gathers information
3. AI triggers brief generation
4. **Stream begins:**
   - Section 1 appears with "generating..." status
   - Content streams in
   - Section 1 completes → ✓ green checkmark
   - Section 2 appears with "generating..." status
   - ... continues for all sections
5. All sections complete → "Generate Interview Guide" button enabled

### Editing Flow
1. User clicks on any complete section
2. Section expands into edit mode
3. User modifies content
4. User clicks "Save Changes"
5. **Update process:**
   - Section shows "Updating..." spinner
   - Backend regenerates affected sections
   - UI updates with new content
   - Section returns to view mode
6. Related sections may also update automatically

## 🔄 Data Flow

```
User Chat Input
      ↓
ChatInterface
      ↓
/api/chat/research-brief-stream (SSE)
      ↓
OpenAI Streaming Response
      ↓
Section Parser
      ↓
Progressive Section Updates
      ↓
ResearchBriefPreviewLive
      ↓
EditableBriefSection (x N sections)
      ↓
User Edits Section
      ↓
/api/chat/update-section
      ↓
OpenAI Regeneration
      ↓
Updated Brief + Changed Sections
      ↓
UI Update
```

## 🧪 Testing Checklist

- [ ] Sections stream in progressively (no pop-in)
- [ ] Status indicators update correctly
- [ ] Click to edit works on complete sections
- [ ] Cannot edit sections that are generating/pending
- [ ] Save button only enabled when content changed
- [ ] Cancel button reverts changes
- [ ] Updating indicator shows during save
- [ ] Related sections update automatically
- [ ] PDF download includes all complete sections
- [ ] Fade-in animations work smoothly
- [ ] Edit mode textarea auto-resizes
- [ ] Markdown renders correctly in view mode
- [ ] Multiple sections can't be edited simultaneously

## 🚀 Next Steps (Not Yet Implemented)

### Step 6: Update ChatInterface
- [ ] Add streaming support to ChatInterface
- [ ] Handle section updates in real-time
- [ ] Pass section data to parent component
- [ ] Update message state during streaming

### Step 7: Apply to Interview Guide
- [ ] Create `EditableGuideSection` component
- [ ] Add streaming support for guide generation
- [ ] Implement section editing for guides
- [ ] Update `/api/chat/research-brief-stream` to handle guides

## 📝 Notes

- The streaming API uses Server-Sent Events (SSE) for real-time updates
- Section parsing happens on-the-fly as content streams
- Optimistic UI updates provide instant feedback
- Backend consistency checks ensure related sections stay aligned
- PDF generation works with partial briefs (only complete sections)

## 🐛 Potential Issues & Solutions

### Issue: Sections not streaming
**Solution:** Check that the API route is returning proper SSE format with `Content-Type: text/event-stream`

### Issue: Edit mode not triggering
**Solution:** Ensure section status is 'complete' before allowing edits

### Issue: Save not updating other sections
**Solution:** Backend should analyze dependencies and regenerate affected sections

### Issue: Animations not working
**Solution:** Verify `globals.css` is properly imported and animations are defined

## 🔐 Security Considerations

- Validate all user edits before saving
- Sanitize markdown content to prevent XSS
- Rate limit section update requests
- Verify user owns the project before allowing edits

## 📊 Performance Considerations

- Stream sections incrementally to reduce perceived latency
- Use optimistic UI updates for instant feedback
- Debounce textarea input to reduce re-renders
- Only regenerate truly affected sections
- Cache parsed sections to avoid re-parsing

---

**Status:** Core implementation complete. Integration with ChatInterface and Interview Guide pending.

**Last Updated:** October 2025

