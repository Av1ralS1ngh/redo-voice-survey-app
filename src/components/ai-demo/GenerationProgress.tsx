/**
 * Generation Progress Component
 * Shows real-time progress during AI demo generation
 */

'use client';

import React from 'react';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

interface PersonaProgress {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  turn: number;
  message: string;
  duration?: number;
  messagesCount?: number;
  error?: string;
}

interface GenerationProgressProps {
  personas: PersonaProgress[];
  isEvaluating?: boolean;
  onCancel?: () => void;
}

export default function GenerationProgress({ personas, isEvaluating, onCancel }: GenerationProgressProps) {
  const completedCount = personas.filter(p => p.status === 'complete').length;
  const totalCount = personas.length;
  const progress = (completedCount / totalCount) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {isEvaluating ? 'Evaluating Results' : 'Running AI Demo'}
              </h2>
              <p className="text-gray-300 text-sm">
                {isEvaluating 
                  ? 'Analyzing simulations and generating recommendations...'
                  : `Simulating interviews with ${totalCount} personas`}
              </p>
            </div>
            {onCancel && !isEvaluating && (
              <button
                onClick={onCancel}
                className="text-gray-300 hover:text-white transition-colors text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-600">{completedCount} of {totalCount} completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gray-900 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Evaluation State */}
        {isEvaluating && (
          <div className="p-8 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-gray-900 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">Analyzing Results</p>
              <p className="text-sm text-gray-600 mt-1">
                Generating insights and recommendations based on simulations...
              </p>
            </div>
          </div>
        )}

        {/* Persona Progress List */}
        {!isEvaluating && (
          <div className="p-8 space-y-4 max-h-96 overflow-y-auto">
            {personas.map((persona) => (
              <PersonaProgressCard key={persona.id} persona={persona} />
            ))}
          </div>
        )}

        {/* Footer Info */}
        {!isEvaluating && (
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>This typically takes 2-3 minutes per persona</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Persona Progress Card
function PersonaProgressCard({ persona }: { persona: PersonaProgress }) {
  const getStatusIcon = () => {
    switch (persona.status) {
      case 'complete':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'running':
        return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
      default:
        return <div className="w-6 h-6 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusText = () => {
    switch (persona.status) {
      case 'complete':
        return 'Completed';
      case 'error':
        return 'Failed';
      case 'running':
        return `Turn ${persona.turn}`;
      default:
        return 'Waiting...';
    }
  };

  const getBgColor = () => {
    switch (persona.status) {
      case 'complete':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'running':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getBgColor()} transition-all duration-300`}>
      <div className="flex items-start gap-4">
        {/* Status Icon */}
        <div className="flex-shrink-0 mt-1">
          {getStatusIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900">{persona.name}</h3>
            <span className="text-sm font-medium text-gray-600">{getStatusText()}</span>
          </div>

          {/* Progress Message */}
          {persona.message && persona.status === 'running' && (
            <p className="text-sm text-gray-700 mb-2">{persona.message}</p>
          )}

          {/* Completion Info */}
          {persona.status === 'complete' && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {persona.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {persona.duration.toFixed(1)} min
                </span>
              )}
              {persona.messagesCount && (
                <span>{persona.messagesCount} messages</span>
              )}
            </div>
          )}

          {/* Error Info */}
          {persona.status === 'error' && persona.error && (
            <p className="text-sm text-red-700 mt-1">{persona.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

