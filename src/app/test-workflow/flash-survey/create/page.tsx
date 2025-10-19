'use client';

import { useState } from 'react';
import QuestionInput from './components/QuestionInput';
import RecipientForm from './components/RecipientForm';
import ProjectPreview from './components/ProjectPreview';

export default function CreateFlashSurvey() {
  const [currentStep, setCurrentStep] = useState<'questions' | 'recipients' | 'preview'>('questions');
  const [questions, setQuestions] = useState<string[]>([]);
  const [recipientData, setRecipientData] = useState({
    participantName: '',
    companyName: '',
    productDescription: '',
    interviewPurpose: ''
  });

  const handleQuestionsComplete = (questionList: string[]) => {
    setQuestions(questionList);
    setCurrentStep('recipients');
  };

  const handleRecipientsComplete = (data: any) => {
    setRecipientData(data);
    setCurrentStep('preview');
  };

  const handleBack = () => {
    if (currentStep === 'recipients') setCurrentStep('questions');
    if (currentStep === 'preview') setCurrentStep('recipients');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Flash Survey Agent
          </h1>
          <p className="text-lg text-gray-600">
            Transform your questions into an AI-powered conversational interview
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-4">
            <div className={`flex items-center ${currentStep === 'questions' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'questions' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                1
              </div>
              <span className="ml-2">Questions</span>
            </div>
            <div className="flex items-center text-gray-300">
              <div className="w-8 border-t-2 border-gray-300"></div>
            </div>
            <div className={`flex items-center ${currentStep === 'recipients' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'recipients' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                2
              </div>
              <span className="ml-2">Recipients</span>
            </div>
            <div className="flex items-center text-gray-300">
              <div className="w-8 border-t-2 border-gray-300"></div>
            </div>
            <div className={`flex items-center ${currentStep === 'preview' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                3
              </div>
              <span className="ml-2">Preview</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {currentStep === 'questions' && (
            <QuestionInput onComplete={handleQuestionsComplete} />
          )}
          
          {currentStep === 'recipients' && (
            <RecipientForm 
              onComplete={handleRecipientsComplete}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 'preview' && (
            <ProjectPreview 
              questions={questions}
              recipientData={recipientData}
              onBack={handleBack}
            />
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500">
          <p>Flash Survey Agent MVP - Experimental Testing Environment</p>
        </div>
      </div>
    </div>
  );
}
