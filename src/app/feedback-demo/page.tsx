"use client";

import { useState } from 'react';
import FeedbackModal from '@/components/FeedbackModal';

export default function FeedbackDemoPage() {
  const [showModal, setShowModal] = useState(false);

  const handleFeedback = (isPositive: boolean) => {
    console.log(`Feedback received: ${isPositive ? 'Positive 👍' : 'Negative 👎'}`);
    // In real app, this would save to database
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Feedback Modal Demo
        </h1>
        
        <p className="text-gray-600 mb-8 max-w-md">
          Click the button below to see the post-survey feedback modal in action.
        </p>
        
        <button
          onClick={() => setShowModal(true)}
          className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-full hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          Show Feedback Modal
        </button>

        <div className="mt-8 text-sm text-gray-500">
          <p>This modal appears after users complete a voice survey</p>
        </div>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onFeedback={handleFeedback}
      />
    </div>
  );
}
