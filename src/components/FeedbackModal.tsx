"use client";

import { useState } from 'react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFeedback: (isPositive: boolean) => void;
}

export default function FeedbackModal({ isOpen, onClose, onFeedback }: FeedbackModalProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFeedbackClick = async (isPositive: boolean) => {
    setSelectedFeedback(isPositive);
    setIsSubmitting(true);
    
    // Give visual feedback for a moment
    await new Promise(resolve => setTimeout(resolve, 800));
    
    onFeedback(isPositive);
    setIsSubmitting(false);
    
    // Close modal after a brief delay
    setTimeout(() => {
      onClose();
      setSelectedFeedback(null);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50 p-8 max-w-md w-full mx-auto transform transition-all duration-300">
        <div className="text-center">
          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            How was your experience?
          </h2>
          
          {/* Subtitle */}
          <p className="text-gray-600 mb-8">
            Your feedback helps us create better conversations
          </p>
          
          {/* Feedback Buttons */}
          <div className="flex justify-center space-x-8 mb-6">
            {/* Thumbs Up */}
            <button
              onClick={() => handleFeedbackClick(true)}
              disabled={isSubmitting}
              className={`group relative w-20 h-20 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 ${
                selectedFeedback === true
                  ? 'bg-green-500/80 text-white shadow-lg shadow-green-500/30'
                  : 'bg-white/60 hover:bg-green-100/80 text-gray-700 hover:text-green-600 border border-white/60 hover:border-green-300'
              } ${isSubmitting ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="text-3xl">👍</span>
              {selectedFeedback === true && (
                <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
              )}
            </button>
            
            {/* Thumbs Down */}
            <button
              onClick={() => handleFeedbackClick(false)}
              disabled={isSubmitting}
              className={`group relative w-20 h-20 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 ${
                selectedFeedback === false
                  ? 'bg-red-500/80 text-white shadow-lg shadow-red-500/30'
                  : 'bg-white/60 hover:bg-red-100/80 text-gray-700 hover:text-red-600 border border-white/60 hover:border-red-300'
              } ${isSubmitting ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="text-3xl">👎</span>
              {selectedFeedback === false && (
                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
              )}
            </button>
          </div>
          
          {/* Status Message */}
          {selectedFeedback !== null && (
            <div className="text-center">
              <p className={`text-lg font-medium ${
                selectedFeedback ? 'text-green-600' : 'text-red-600'
              }`}>
                {selectedFeedback 
                  ? "✨ Thank you for the positive feedback!" 
                  : "🙏 Thanks for your feedback, we'll improve!"
                }
              </p>
            </div>
          )}
          
          {/* Close Button */}
          {!isSubmitting && selectedFeedback === null && (
            <div className="mt-6">
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors duration-200"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
