# Langfuse Setup Guide

Langfuse is integrated for LLM observability, prompt evaluation, and performance monitoring.

## 🚀 Quick Setup

### 1. Create Langfuse Account

1. Go to [https://cloud.langfuse.com](https://cloud.langfuse.com)
2. Sign up for a free account
3. Create a new project (e.g., "Voice Survey Research Briefs")

### 2. Get API Keys

1. In your Langfuse project dashboard, go to **Settings** → **API Keys**
2. Click "Create new API keys"
3. Copy the **Secret Key** and **Public Key**

### 3. Add to Environment Variables

Update your `.env.local` file with your Langfuse credentials:

```bash
# Langfuse - LLM Observability & Prompt Management
LANGFUSE_SECRET_KEY=sk-lf-your-secret-key-here
LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key-here
LANGFUSE_HOST=https://cloud.langfuse.com
```

### 4. Restart Your Dev Server

```bash
pnpm dev
```

## 📊 What's Being Tracked

### Research Brief Generation

Every research brief generation is tracked with:

**Input:**
- Project name
- Interview type (usability_testing, product_feedback, etc.)
- Current view (brief or guide)
- Chat history length

**Generation Details:**
- Model: `gpt-4o-mini`
- Temperature: `0.3`
- Max tokens: `2000`
- System prompt used
- All messages sent to OpenAI
- Tool/function calls made

**Output:**
- Generated brief content
- Brief length (characters)
- Version number
- Sections with user input vs. agent recommendations
- Token usage (prompt + completion)

**Metadata:**
- Success/failure status
- Whether function was called
- Interview type
- Execution time

## 🔍 Using Langfuse Dashboard

### View Traces

1. Go to your Langfuse dashboard
2. Click on **Traces** in the sidebar
3. You'll see all research brief generations

### Analyze Prompts

1. Click on any trace to see details
2. View the full conversation history
3. See token usage and costs
4. Check if function calling worked

### Compare Versions

1. Go to **Prompts** section
2. Create prompt versions
3. Compare performance across versions
4. A/B test different system prompts

### Monitor Performance

1. Go to **Dashboard**
2. See metrics:
   - Average latency
   - Token usage over time
   - Success rate
   - Cost per generation

## 🧪 Testing the Integration

1. Create a new usability testing interview
2. Go through the conversation flow
3. Generate a research brief
4. Check Langfuse dashboard for the trace

You should see:
- ✅ A new trace named "research-brief-generation"
- ✅ Input with project details
- ✅ Generation span with model parameters
- ✅ Output with brief content and metadata

## 🎯 Advanced Features

### Prompt Management

1. In Langfuse, go to **Prompts**
2. Create a new prompt with your system prompt
3. Version and test different variations
4. Use Langfuse SDK to fetch prompts dynamically

### Evaluations

1. Go to **Evaluations**
2. Create evaluation criteria:
   - Brief specificity score
   - Completeness check
   - Tone consistency
3. Run evaluations on generated briefs

### User Feedback

Track user feedback on generated briefs:
- Did they refine it?
- Did they approve it?
- How many iterations needed?

## 🔧 Troubleshooting

### Not Seeing Traces?

1. Check environment variables are set correctly
2. Restart dev server after adding keys
3. Check console for Langfuse warnings
4. Verify API keys in Langfuse dashboard

### Missing Data?

- Langfuse batches events for performance
- Events may take a few seconds to appear
- Check the `flushLangfuse()` calls are present

### Self-Hosting

To use self-hosted Langfuse:

```bash
LANGFUSE_HOST=https://your-langfuse-instance.com
```

## 📚 Resources

- [Langfuse Documentation](https://langfuse.com/docs)
- [Langfuse GitHub](https://github.com/langfuse/langfuse)
- [OpenAI Integration Guide](https://langfuse.com/docs/integrations/openai)

## 🎨 Next Steps

1. ✅ Set up Langfuse account and add API keys
2. ✅ Generate a few research briefs
3. ✅ Explore traces in dashboard
4. 📊 Set up custom evaluations
5. 🔄 Create prompt versions
6. 📈 Monitor performance over time
