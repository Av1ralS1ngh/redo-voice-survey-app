'use client';

import { useState } from 'react';

interface PromptViewerProps {
  interviewId: string;
  visible: boolean;
}

export default function PromptViewer({ interviewId, visible }: PromptViewerProps) {
  const [promptData, setPromptData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompt = async () => {
    if (!interviewId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Load interview data from file storage via API
      const response = await fetch(\`/test-workflow/api/flash-survey/interview/\${interviewId}\`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.interview) {
          const project = data.interview;
          setPromptData({
            interview: {
              id: project.interviewId,
              participant: project.recipientData?.participantName,
              company: project.recipientData?.companyName,
              product: project.recipientData?.productDescription,
              questions: project.questions,
              generation: {
                method: project.generationMethod,
                quality: project.quality,
                processingTime: project.processingTime,
                notice: project.notice
              }
            },
            systemPrompt: project.systemPrompt
          });
        } else {
          setError('Interview data not found. Try creating a new Flash Survey.');
        }
      } else {
        setError('Failed to load interview data from server.');
      }
    } catch (err) {
      setError('Failed to retrieve prompt data');
      console.error('Error fetching prompt:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Generated System Prompt
        </h3>
        <button
          onClick={fetchPrompt}
          disabled={loading}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'View Prompt'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {promptData && (
        <div className="space-y-4">
          {/* Interview Info */}
          <div className="bg-white p-3 rounded border">
            <h4 className="font-medium text-gray-900 mb-2">Interview Details</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>ID:</strong> {promptData.interview.id}</div>
              <div><strong>Participant:</strong> {promptData.interview.participant}</div>
              <div><strong>Company:</strong> {promptData.interview.company}</div>
              <div><strong>Product:</strong> {promptData.interview.product}</div>
              <div><strong>Questions:</strong> {promptData.interview.questions?.length}</div>
              <div>
                <strong>Generation:</strong> {promptData.interview.generation.method} 
                ({promptData.interview.generation.quality} quality, {promptData.interview.generation.processingTime}ms)
              </div>
              {promptData.interview.generation.notice && (
                <div><strong>Notice:</strong> {promptData.interview.generation.notice}</div>
              )}
            </div>
          </div>

          {/* System Prompt */}
          <div className="bg-white p-3 rounded border">
            <h4 className="font-medium text-gray-900 mb-2">System Prompt for Hume AI</h4>
            <div className="bg-gray-100 p-3 rounded text-xs font-mono overflow-auto max-h-96">
              <pre className="whitespace-pre-wrap">{promptData.systemPrompt}</pre>
            </div>
          </div>

          {/* Copy Button */}
          <button
            onClick={() => navigator.clipboard.writeText(promptData.systemPrompt)}
            className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            📋 Copy System Prompt to Clipboard
          </button>
        </div>
      )}
    </div>
  );
}
