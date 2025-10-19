# Bug Fix: Interview Guide Not Loading from Database

## 🐛 Issue
The "Generate AI demo" button remained disabled even though the interview guide was visible and the voice agent was working. The interview guide data existed in the database but wasn't being loaded into `wizardData`.

## 🔍 Root Cause

### Problem 1: API Not Fetching Interview Guide
The `/api/interviews/[id]` GET endpoint was only fetching basic interview fields and **not** including:
- `research_brief`
- `interview_guide`
- `hume_system_prompt`
- `workflow_state`

**File**: `src/app/api/interviews/[id]/route.ts`  
**Lines**: 14-28

The SELECT query was missing these critical fields, so even though they existed in the database, they were never sent to the frontend.

### Problem 2: Wizard Not Falling Back to Database Columns
The wizard was only loading data from `workflow_state.inputData`, but if the interview guide was stored directly in the database columns (which can happen during autosave), it wasn't being loaded.

**File**: `src/app/interview-wizard/[interviewId]/page.tsx`  
**Lines**: 89-96

---

## 💡 The Fix

### Fix 1: Update API to Return Interview Guide Data

**File**: `src/app/api/interviews/[id]/route.ts`

#### Change 1: Add Fields to SELECT Query
```typescript
// BEFORE:
.select(`
  id,
  project_id,
  name,
  description,
  category,
  status,
  created_at,
  updated_at,
  response_count,
  target_response_count,
  share_url,
  is_public,
  questions
`)

// AFTER:
.select(`
  id,
  project_id,
  name,
  description,
  category,
  status,
  created_at,
  updated_at,
  response_count,
  target_response_count,
  share_url,
  is_public,
  questions,
  research_brief,
  interview_guide,
  hume_system_prompt,
  workflow_state
`)
```

#### Change 2: Include Fields in Response
```typescript
// BEFORE:
const interviewDetails = {
  id: interview.id,
  // ... other fields ...
  questions: interview.questions || [],
  project: project ? { ... } : null,
};

// AFTER:
const interviewDetails = {
  id: interview.id,
  // ... other fields ...
  questions: interview.questions || [],
  research_brief: interview.research_brief || undefined,
  interview_guide: interview.interview_guide || undefined,
  hume_system_prompt: interview.hume_system_prompt || undefined,
  workflow_state: interview.workflow_state || undefined,
  project: project ? { ... } : null,
};
```

### Fix 2: Update Wizard to Load from Database Columns

**File**: `src/app/interview-wizard/[interviewId]/page.tsx`

```typescript
// BEFORE:
setWizardData(prev => ({
  ...prev,
  projectName: data.interview.name || '',
  projectDescription: data.interview.description || '',
  interviewType: data.interview.category || 'custom',
  ...(savedWorkflowState || {}),
}));

// AFTER:
setWizardData(prev => ({
  ...prev,
  projectName: data.interview.name || '',
  projectDescription: data.interview.description || '',
  interviewType: data.interview.category || 'custom',
  ...(savedWorkflowState || {}),
  // Also restore from direct database columns if not in workflow_state
  researchBrief: savedWorkflowState?.researchBrief || data.interview.research_brief || prev.researchBrief,
  interviewGuide: savedWorkflowState?.interviewGuide || data.interview.interview_guide || prev.interviewGuide,
  humeSystemPrompt: savedWorkflowState?.humeSystemPrompt || data.interview.hume_system_prompt || prev.humeSystemPrompt,
}));
```

---

## 🎯 Why This Works

### Data Priority Order
The fix implements a **fallback chain**:

1. **First**: Check `workflow_state.inputData.interviewGuide` (in-memory wizard state)
2. **Second**: Check `interview.interview_guide` (database column)
3. **Third**: Keep `prev.interviewGuide` (existing React state)

This ensures the interview guide is loaded regardless of where it's stored.

### Database vs Workflow State
- **`workflow_state`**: JSON blob containing the entire wizard state (preferred)
- **`interview_guide`**: Direct database column (autosaved for persistence)
- **Why both?**: 
  - `workflow_state` is updated when user navigates wizard
  - `interview_guide` is updated when guide is generated/modified
  - Sometimes only one is saved, so we need to check both

---

## ✅ Testing

### Before Fix
```javascript
// Console output:
🔍 [VoiceSettings] Wizard Data: {
  hasResearchBrief: true,
  hasInterviewGuide: false,  // ❌ Missing!
  interviewGuideLength: 0,
  interviewGuidePreview: "MISSING"
}

🔍 [VoiceTestSection] Props: {
  hasBriefContent: true,
  hasInterviewGuideContent: false,  // ❌ Not passed!
  buttonWillBeDisabled: true  // ❌ Button disabled
}
```

### After Fix
```javascript
// Console output (expected):
🔍 [VoiceSettings] Wizard Data: {
  hasResearchBrief: true,
  hasInterviewGuide: true,  // ✅ Loaded!
  interviewGuideLength: 1234,
  interviewGuidePreview: "## Interview Questions..."
}

🔍 [VoiceTestSection] Props: {
  hasBriefContent: true,
  hasInterviewGuideContent: true,  // ✅ Passed!
  buttonWillBeDisabled: false  // ✅ Button enabled!
}
```

### Manual Test Steps
1. **Refresh the page** (force reload to fetch from API with new fields)
2. Check browser console for debug logs
3. Verify `hasInterviewGuide: true`
4. Navigate to Voice Settings
5. **"Generate AI demo" button should now be enabled** ✅

---

## 🔒 Impact Analysis

### Files Changed
1. `src/app/api/interviews/[id]/route.ts` - API data fetching
2. `src/app/interview-wizard/[interviewId]/page.tsx` - Wizard data loading

### Backward Compatibility
- ✅ **Fully backward compatible**
- Existing projects with data in either location will work
- Fallback chain ensures data is found regardless of storage method

### Performance Impact
- ✅ **Negligible** - adds 4 fields to SELECT query
- Data already exists in database, just not being returned

### Related Features Fixed
This also fixes potential issues with:
- Voice agent not having interview guide (if it was relying on the column)
- Research brief not loading properly
- Hume system prompt not being preserved

---

## 📝 Related Issues

### Issue #1: Wizard Data Overwrites (Previously Fixed)
- **File**: `ProjectBriefStep.tsx`
- **Issue**: `interviewGuide: undefined` was overwriting saved guide
- **Status**: Fixed by conditional field inclusion

### Issue #2: Interview Guide Not Loading (This Fix)
- **File**: API routes and wizard loading
- **Issue**: Interview guide in database wasn't being fetched/loaded
- **Status**: Fixed by updating API and wizard loading logic

Both issues were required to fully enable the AI Demo button!

---

## 🎓 Lessons Learned

1. **Always check the full data flow**: Frontend → API → Database → API → Frontend
2. **Database queries must explicitly include all needed fields** - Supabase doesn't return columns not in SELECT
3. **Implement fallback chains** when data can be in multiple locations
4. **Debug logging is essential** for understanding what data exists where
5. **API responses should match frontend expectations** - missing fields cause undefined values

---

## 🚀 Next Steps

### Recommended: Clean Up Debug Logging
After confirming the fix works, remove debug logs from:
- `VoiceSettingsStep.tsx` (lines 44-53)
- `VoiceTestSection.tsx` (lines 40-50)

### Optional: Database Migration
Consider consolidating data storage:
- Either: Always use `workflow_state` for everything
- Or: Always use direct columns for artifacts
- Current: Both work (fallback chain handles it)

---

## ✅ Status

- [x] Bug identified (interview guide not loading from DB)
- [x] Root cause analyzed (API not fetching fields)
- [x] Fix implemented (API + wizard updates)
- [x] Linter checks passed
- [x] Build succeeded
- [x] Documentation created
- [ ] User testing (refresh page and verify button enabled)
- [ ] Remove debug logging (optional cleanup)

---

**Fixed by**: AI Assistant  
**Date**: 2024  
**Files Changed**: 2  
**Lines Changed**: ~20  
**Build Status**: ✅ Passing

