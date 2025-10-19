'use client';

import { useState } from 'react';

interface ProjectPreviewProps {
  questions: string[];
  recipientData: {
    participantName: string;
    companyName: string;
    productDescription: string;
    interviewPurpose: string;
  };
  onBack: () => void;
}

export default function ProjectPreview({ questions, recipientData, onBack }: ProjectPreviewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [interviewLink, setInterviewLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateInterviewLink = async () => {
    setIsGenerating(true);
    
    // Simulate API call to generate interview
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate a mock interview link
    const mockId = Math.random().toString(36).substring(2, 15);
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/test-workflow/flash-survey/interview/${mockId}`;
    
    setInterviewLink(link);
    setIsGenerating(false);
  };

  const copyToClipboard = async () => {
    if (interviewLink) {
      await navigator.clipboard.writeText(interviewLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sampleConversation = [
    {
      role: 'agent',
      message: `Hi ${recipientData.participantName}! Thanks for taking a moment to chat with me about your experience with ${recipientData.companyName}. This should take less than 5 minutes, and your insights will directly help shape the product's future. How has your day been so far?`
    },
    {
      role: 'user', 
      message: "Pretty good, thanks! I'm excited to share my thoughts."
    },
    {
      role: 'agent',
      message: "That's wonderful to hear! Let me start by asking - what is your overall satisfaction with our product?"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Review & Generate Interview
        </h2>
        <p className="text-gray-600">
          Review your setup and generate the AI-powered interview link.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Project Summary */}
        <div className="space-y-6">
          {/* Recipient Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Interview Details</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Participant:</span> {recipientData.participantName}</div>
              <div><span className="font-medium">Company:</span> {recipientData.companyName}</div>
              <div><span className="font-medium">Product:</span> {recipientData.productDescription}</div>
              {recipientData.interviewPurpose && (
                <div><span className="font-medium">Purpose:</span> {recipientData.interviewPurpose}</div>
              )}
            </div>
          </div>

          {/* Questions Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">
              Questions ({questions.length})
            </h3>
            <div className="space-y-1 text-sm max-h-40 overflow-y-auto">
              {questions.map((question, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="text-gray-500 mt-1">{index + 1}.</span>
                  <span className="text-gray-700">{question}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          {!interviewLink && (
            <button
              onClick={generateInterviewLink}
              disabled={isGenerating}
              className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                isGenerating
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Generating AI Agent...
                </span>
              ) : (
                '🚀 Generate Interview Link'
              )}
            </button>
          )}

          {/* Generated Link */}
          {interviewLink && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">
                ✅ Interview Link Generated!
              </h3>
              <div className="space-y-3">
                <div className="bg-white border rounded p-3">
                  <p className="text-sm text-gray-600 mb-1">Share this link:</p>
                  <code className="text-xs text-gray-800 break-all">{interviewLink}</code>
                </div>
                <button
                  onClick={copyToClipboard}
                  className={`w-full py-2 px-4 rounded text-sm font-medium transition-colors ${
                    copied
                      ? 'bg-green-100 text-green-800'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {copied ? '✅ Copied!' : '📋 Copy Link'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Conversation Preview */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">
            Conversation Preview
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Here's how the AI agent will start the conversation:
          </p>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {sampleConversation.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-800 border'
                }`}>
                  {message.message}
                </div>
              </div>
            ))}
            
            {/* Continuing indicator */}
            <div className="flex justify-start">
              <div className="bg-white border rounded-lg px-3 py-2 text-sm text-gray-500 italic">
                ... conversation continues naturally through all {questions.length} questions
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Back to Recipients
        </button>
        
        {interviewLink && (
          <button
            onClick={() => window.open(interviewLink, '_blank')}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Test Interview →
          </button>
        )}
      </div>
    </div>
  );
}
