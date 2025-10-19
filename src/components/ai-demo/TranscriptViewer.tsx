/**
 * Transcript Viewer
 * Displays conversation transcripts from AI demo simulations
 */

'use client';

import React, { useState } from 'react';
import { SimulationResult, ConversationMessage } from '@/lib/ai-demo/types';
import { X, Download, User, Bot, Clock, MessageCircle } from 'lucide-react';

interface TranscriptViewerProps {
  results: SimulationResult[];
  initialPersonaId?: string;
  onClose?: () => void;
}

export default function TranscriptViewer({ results, initialPersonaId, onClose }: TranscriptViewerProps) {
  const [selectedPersonaId, setSelectedPersonaId] = useState(initialPersonaId || results[0]?.personaId);
  
  const selectedResult = results.find(r => r.personaId === selectedPersonaId);

  if (!selectedResult) {
    return null;
  }

  const handleDownload = () => {
    const transcript = selectedResult.transcript
      .map(msg => `[${msg.role.toUpperCase()}]: ${msg.content}`)
      .join('\n\n');
    
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${selectedPersonaId}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getPersonaName = (id: string) => {
    switch (id) {
      case 'ideal': return 'Ideal Participant';
      case 'typical': return 'Typical Participant';
      case 'difficult': return 'Difficult Participant';
      default: return id;
    }
  };

  const getPersonaDescription = (id: string) => {
    switch (id) {
      case 'ideal': return 'Highly engaged, articulate, and cooperative';
      case 'typical': return 'Average engagement with occasional comprehension issues';
      case 'difficult': return 'Challenging participant with frequent tangents and frustration';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-8 py-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Interview Transcript</h2>
              <p className="text-gray-300 text-sm">Review the simulated conversation</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Download transcript"
              >
                <Download className="w-5 h-5" />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Persona Tabs */}
          <div className="flex gap-2">
            {results.map((result) => (
              <button
                key={result.personaId}
                onClick={() => setSelectedPersonaId(result.personaId)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPersonaId === result.personaId
                    ? 'bg-white text-gray-900'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {getPersonaName(result.personaId)}
              </button>
            ))}
          </div>
        </div>

        {/* Persona Info Banner */}
        <div className="px-8 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{getPersonaName(selectedPersonaId)}</h3>
              <p className="text-sm text-gray-600">{getPersonaDescription(selectedPersonaId)}</p>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{selectedResult.duration.toFixed(1)} min</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                <span>{selectedResult.transcript.length} messages</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${selectedResult.completed ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>{selectedResult.completed ? 'Completed' : 'Dropped Off'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transcript Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-gray-50">
          {selectedResult.transcript.map((message, index) => (
            <MessageBubble key={index} message={message} />
          ))}

          {/* Drop-off indicator */}
          {!selectedResult.completed && selectedResult.dropOffReason && (
            <div className="flex justify-center">
              <div className="bg-red-100 border border-red-300 rounded-lg px-4 py-3 text-center max-w-md">
                <p className="text-sm font-semibold text-red-900 mb-1">Participant Dropped Off</p>
                <p className="text-xs text-red-700">{selectedResult.dropOffReason}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Coverage: <span className="font-semibold">{selectedResult.metrics.agent.coverageRate.toFixed(0)}%</span> • 
            Probing: <span className="font-semibold">{selectedResult.metrics.agent.probingQuality.toFixed(1)}/10</span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ message }: { message: ConversationMessage }) {
  const isAgent = message.role === 'agent';
  const formattedTime = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className={`flex gap-3 ${isAgent ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        isAgent ? 'bg-gray-900' : 'bg-blue-500'
      }`}>
        {isAgent ? (
          <Bot className="w-5 h-5 text-white" />
        ) : (
          <User className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-2xl ${isAgent ? '' : 'flex flex-col items-end'}`}>
        <div className={`rounded-2xl px-5 py-3 ${
          isAgent 
            ? 'bg-white border border-gray-200' 
            : 'bg-blue-500 text-white'
        }`}>
          <p className={`text-sm leading-relaxed ${isAgent ? 'text-gray-900' : 'text-white'}`}>
            {message.content}
          </p>
          
          {/* Metadata */}
          {message.metadata && (
            <div className={`mt-2 pt-2 border-t ${isAgent ? 'border-gray-200' : 'border-blue-400'} text-xs ${isAgent ? 'text-gray-500' : 'text-blue-100'}`}>
              {message.metadata.isProbe && (
                <span className="inline-block bg-purple-100 text-purple-700 px-2 py-0.5 rounded mr-2">
                  Probe
                </span>
              )}
              {message.metadata.wordCount && (
                <span>{message.metadata.wordCount} words</span>
              )}
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        <div className={`text-xs text-gray-500 mt-1 px-2 ${isAgent ? '' : 'text-right'}`}>
          {formattedTime}
        </div>
      </div>
    </div>
  );
}

