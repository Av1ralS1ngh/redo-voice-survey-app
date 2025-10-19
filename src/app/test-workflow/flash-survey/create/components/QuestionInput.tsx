'use client';

import { useState } from 'react';

interface QuestionInputProps {
  onComplete: (questions: string[]) => void;
}

export default function QuestionInput({ onComplete }: QuestionInputProps) {
  const [inputMethod, setInputMethod] = useState<'text' | 'file'>('text');
  const [questionsText, setQuestionsText] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const processTextInput = (text: string): string[] => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => line.length >= 10) // Minimum question length
      .slice(0, 20); // Maximum 20 questions
  };

  const validateQuestions = (questionList: string[]): string[] => {
    const errors: string[] = [];
    
    if (questionList.length < 3) {
      errors.push('Please provide at least 3 questions');
    }
    
    if (questionList.length > 20) {
      errors.push('Please limit to 20 questions maximum');
    }

    // Check for very short questions
    const shortQuestions = questionList.filter(q => q.length < 10);
    if (shortQuestions.length > 0) {
      errors.push('Some questions are too short (minimum 10 characters)');
    }

    return errors;
  };

  const handleTextChange = (text: string) => {
    setQuestionsText(text);
    const processed = processTextInput(text);
    setQuestions(processed);
    setErrors(validateQuestions(processed));
  };

  const handleContinue = () => {
    const validationErrors = validateQuestions(questions);
    if (validationErrors.length === 0) {
      onComplete(questions);
    } else {
      setErrors(validationErrors);
    }
  };

  const sampleQuestions = `What is your overall satisfaction with our product?
How likely are you to recommend us to a friend or colleague?
What features do you use most frequently?
What improvements would you like to see in the next version?
How does our product compare to alternatives you've tried?`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Add Your Survey Questions
        </h2>
        <p className="text-gray-600">
          Provide 3-20 questions that you'd like to ask in your conversational interview.
        </p>
      </div>

      {/* Input Method Selection */}
      <div className="flex space-x-4 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setInputMethod('text')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            inputMethod === 'text'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📝 Paste Questions
        </button>
        <button
          onClick={() => setInputMethod('file')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            inputMethod === 'file'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📁 Upload File
        </button>
      </div>

      {/* Text Input Method */}
      {inputMethod === 'text' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="questions" className="block text-sm font-medium text-gray-700 mb-2">
              Enter your questions (one per line)
            </label>
            <textarea
              id="questions"
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder={sampleQuestions}
              value={questionsText}
              onChange={(e) => handleTextChange(e.target.value)}
            />
          </div>

          {/* Live Preview */}
          {questions.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">
                Questions Preview ({questions.length} questions)
              </h3>
              <div className="space-y-2">
                {questions.slice(0, 5).map((question, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-sm text-gray-500 mt-1">{index + 1}.</span>
                    <span className="text-sm text-gray-700">{question}</span>
                  </div>
                ))}
                {questions.length > 5 && (
                  <div className="text-sm text-gray-500 italic">
                    ... and {questions.length - 5} more questions
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* File Upload Method */}
      {inputMethod === 'file' && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="space-y-4">
            <div className="text-4xl">📁</div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Upload CSV or Excel File</h3>
              <p className="text-gray-500">
                File should contain questions in the first column
              </p>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
              Choose File
            </button>
            <p className="text-xs text-gray-400">
              CSV, Excel (.xlsx) files supported - Coming soon in Phase 2
            </p>
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="text-red-400 mr-2">⚠️</div>
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Please fix the following issues:
              </h3>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <div className="text-sm text-gray-500">
          {questions.length > 0 && (
            <span>✅ {questions.length} questions ready</span>
          )}
        </div>
        <button
          onClick={handleContinue}
          disabled={questions.length < 3 || errors.length > 0}
          className={`px-6 py-2 rounded-md font-medium transition-colors ${
            questions.length >= 3 && errors.length === 0
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continue to Recipients →
        </button>
      </div>
    </div>
  );
}
