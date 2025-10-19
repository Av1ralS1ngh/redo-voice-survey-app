'use client';

import { useState, useEffect } from 'react';

interface InterviewPageProps {
  params: Promise<{ id: string }>;
}

export default function InterviewPage({ params }: InterviewPageProps) {
  const [interviewData, setInterviewData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interviewId, setInterviewId] = useState<string>('');

  useEffect(() => {
    const loadInterviewData = async () => {
      try {
        const { id } = await params;
        setInterviewId(id);
        console.log('Loading interview for ID:', id);
        const response = await fetch(`/test-workflow/api/flash-survey/interview/${id}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.interview) {
            setInterviewData(data.interview);
            console.log('Interview data loaded successfully');
          } else {
            setError('Interview not found. The link may have expired.');
          }
        } else {
          setError('Failed to load interview data.');
        }
      } catch (err) {
        setError('Failed to load interview data.');
        console.error('Error loading interview:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInterviewData();
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Interview Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/test-workflow/flash-survey/create'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create New Flash Survey
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎙️ Flash Survey Interview
          </h1>
          <p className="text-gray-600">Welcome to your personalized interview experience</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Interview Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Participant:</span>
              <span className="ml-2 text-gray-600">{interviewData?.recipientData?.participantName}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Company:</span>
              <span className="ml-2 text-gray-600">{interviewData?.recipientData?.companyName}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Questions:</span>
              <span className="ml-2 text-gray-600">{interviewData?.questions?.length} topics</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Interview ID:</span>
              <span className="ml-2 text-gray-600 font-mono text-xs">{interviewId}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">About This Interview</h3>
          <p className="text-gray-700 leading-relaxed">{interviewData?.recipientData?.productDescription}</p>
        </div>

        <div className="text-center">
          <button
            onClick={() => alert('🚀 Interview interface integration coming in next phase!')}
            className="px-8 py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-lg"
          >
            🎤 Start Voice Interview
          </button>
          <p className="mt-2 text-sm text-gray-500">Click to begin your personalized interview experience</p>
        </div>
      </div>
    </div>
  );
}
