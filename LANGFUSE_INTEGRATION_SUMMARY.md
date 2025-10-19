# Langfuse Integration Summary

## ✅ What Was Implemented

### 1. **Langfuse Client** (`src/lib/langfuse-client.ts`)
- Singleton client instance
- Automatic initialization from environment variables
- Graceful fallback if not configured
- Flush utility for serverless functions

### 2. **API Route Integration** (`src/app/api/chat/research-brief/route.ts`)
- Full tracing of research brief generation
- Input/output logging
- Token usage tracking
- Error tracking
- Metadata for analysis

### 3. **Environment Variables** (`.env.local`)
- `LANGFUSE_SECRET_KEY` - Your secret API key
- `LANGFUSE_PUBLIC_KEY` - Your public API key  
- `LANGFUSE_HOST` - Langfuse instance URL (defaults to cloud)

### 4. **Documentation** (`LANGFUSE_SETUP.md`)
- Complete setup guide
- Usage instructions
- Troubleshooting tips
- Advanced features overview

## 📊 What Gets Tracked

### Every Research Brief Generation Includes:

**Trace Level:**
- Unique trace ID
- Timestamp
- Total duration
- Success/failure status

**Input:**
```json
{
  "projectName": "Meta VR Workrooms",
  "interviewType": "usability_testing",
  "currentView": "brief",
  "chatHistoryLength": 5
}
```

**Generation Span:**
```json
{
  "model": "gpt-4o-mini",
  "temperature": 0.3,
  "max_tokens": 2000,
  "input": [...messages],
  "output": {...responseMessage},
  "usage": {
    "promptTokens": 1234,
    "completionTokens": 567,
    "totalTokens": 1801
  }
}
```

**Output:**
```json
{
  "hasResearchBrief": true,
  "briefLength": 2647,
  "briefVersion": 1,
  "functionCalled": true
}
```

## 🎯 Use Cases

### 1. **Prompt Evaluation**
- Compare different system prompts
- A/B test prompt variations
- Measure specificity improvements
- Track function calling success rate

### 2. **Performance Monitoring**
- Average generation time
- Token usage trends
- Cost per brief
- Success rate over time

### 3. **Quality Analysis**
- Brief length distribution
- User input vs. agent recommendations ratio
- Refinement frequency
- User satisfaction correlation

### 4. **Debugging**
- See exact prompts sent
- View full conversation context
- Identify failed function calls
- Trace error patterns

## 🚀 Next Actions

### Immediate (Required):
1. **Sign up for Langfuse**: https://cloud.langfuse.com
2. **Get API keys** from dashboard
3. **Add to `.env.local`**:
   ```bash
   LANGFUSE_SECRET_KEY=sk-lf-...
   LANGFUSE_PUBLIC_KEY=pk-lf-...
   ```
4. **Restart dev server**: `pnpm dev`

### Short-term (Recommended):
1. Generate 5-10 research briefs to populate data
2. Explore traces in Langfuse dashboard
3. Set up custom evaluations for:
   - Specificity score
   - Completeness check
   - Tone consistency
4. Create prompt versions for A/B testing

### Long-term (Optional):
1. Set up automated evaluations
2. Create dashboards for key metrics
3. Implement user feedback loop
4. Build prompt optimization pipeline

## 📈 Expected Benefits

### Immediate:
- ✅ Full visibility into LLM calls
- ✅ Token usage and cost tracking
- ✅ Error debugging capabilities

### Short-term:
- ✅ Prompt performance comparison
- ✅ Quality trend analysis
- ✅ Cost optimization insights

### Long-term:
- ✅ Continuous prompt improvement
- ✅ Automated quality assurance
- ✅ Data-driven decision making

## 🔍 Example Trace

When you generate a research brief, you'll see a trace like this in Langfuse:

```
research-brief-generation (12.5s)
├── Input
│   ├── projectName: "Meta VR Workrooms Onboarding"
│   ├── interviewType: "usability_testing"
│   └── chatHistoryLength: 5
├── research-brief-generation (12.3s)
│   ├── Model: gpt-4o-mini
│   ├── Temperature: 0.3
│   ├── Tokens: 1,234 → 567 (1,801 total)
│   ├── Cost: $0.0027
│   └── Function Called: generate_research_brief
└── Output
    ├── hasResearchBrief: true
    ├── briefLength: 2,647 chars
    ├── briefVersion: 1
    └── success: true
```

## 💡 Tips

1. **Tag traces** with user IDs or session IDs for better analysis
2. **Create scores** for automated quality evaluation
3. **Use comments** to annotate interesting traces
4. **Set up alerts** for high latency or errors
5. **Export data** for custom analysis

## 🆘 Support

If you run into issues:
1. Check `LANGFUSE_SETUP.md` for troubleshooting
2. Verify environment variables are set
3. Check Langfuse dashboard for API key status
4. Look for console warnings about Langfuse

## 📚 Resources

- Setup Guide: `LANGFUSE_SETUP.md`
- Langfuse Docs: https://langfuse.com/docs
- OpenAI Integration: https://langfuse.com/docs/integrations/openai
