'use client';

import { useState } from 'react';

interface RecipientFormProps {
  onComplete: (data: RecipientData) => void;
  onBack: () => void;
}

interface RecipientData {
  participantName: string;
  companyName: string;
  productDescription: string;
  interviewPurpose: string;
}

export default function RecipientForm({ onComplete, onBack }: RecipientFormProps) {
  const [formData, setFormData] = useState<RecipientData>({
    participantName: '',
    companyName: '',
    productDescription: '',
    interviewPurpose: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.participantName.trim()) {
      newErrors.participantName = 'Participant name is required';
    }

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if (!formData.productDescription.trim()) {
      newErrors.productDescription = 'Product description is required';
    }

    if (formData.productDescription.length > 0 && formData.productDescription.length < 10) {
      newErrors.productDescription = 'Please provide a more detailed description (at least 10 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof RecipientData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleContinue = () => {
    if (validateForm()) {
      onComplete(formData);
    }
  };

  const isFormValid = formData.participantName.trim() && 
                     formData.companyName.trim() && 
                     formData.productDescription.trim().length >= 10;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Recipient Information
        </h2>
        <p className="text-gray-600">
          Provide context about your participant and interview to personalize the conversation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Participant Name */}
        <div>
          <label htmlFor="participantName" className="block text-sm font-medium text-gray-700 mb-2">
            Participant Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="participantName"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.participantName ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., Sarah Johnson"
            value={formData.participantName}
            onChange={(e) => handleInputChange('participantName', e.target.value)}
          />
          {errors.participantName && (
            <p className="mt-1 text-sm text-red-600">{errors.participantName}</p>
          )}
        </div>

        {/* Company Name */}
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="companyName"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.companyName ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., TechCorp Inc."
            value={formData.companyName}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
          />
          {errors.companyName && (
            <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
          )}
        </div>
      </div>

      {/* Product Description */}
      <div>
        <label htmlFor="productDescription" className="block text-sm font-medium text-gray-700 mb-2">
          Product/Service Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="productDescription"
          rows={3}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
            errors.productDescription ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="e.g., A mobile app for project management that helps teams collaborate and track progress in real-time..."
          value={formData.productDescription}
          onChange={(e) => handleInputChange('productDescription', e.target.value)}
        />
        <div className="mt-1 flex justify-between">
          {errors.productDescription ? (
            <p className="text-sm text-red-600">{errors.productDescription}</p>
          ) : (
            <p className="text-sm text-gray-500">
              Describe what you're surveying about - this helps personalize the conversation
            </p>
          )}
          <p className="text-sm text-gray-400">
            {formData.productDescription.length}/500
          </p>
        </div>
      </div>

      {/* Interview Purpose */}
      <div>
        <label htmlFor="interviewPurpose" className="block text-sm font-medium text-gray-700 mb-2">
          Interview Purpose <span className="text-gray-400">(Optional)</span>
        </label>
        <input
          type="text"
          id="interviewPurpose"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., Gather feedback for our next product update"
          value={formData.interviewPurpose}
          onChange={(e) => handleInputChange('interviewPurpose', e.target.value)}
        />
        <p className="mt-1 text-sm text-gray-500">
          Why are you conducting this interview? This context helps the AI be more conversational.
        </p>
      </div>

      {/* Preview Card */}
      {isFormValid && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Preview</h3>
          <p className="text-sm text-blue-800">
            The AI will greet <strong>{formData.participantName}</strong> and ask about their experience with{' '}
            <strong>{formData.companyName}</strong>'s {formData.productDescription.toLowerCase().slice(0, 50)}
            {formData.productDescription.length > 50 ? '...' : ''}.
            {formData.interviewPurpose && (
              <span> The purpose is to {formData.interviewPurpose.toLowerCase()}.</span>
            )}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Back to Questions
        </button>
        <button
          onClick={handleContinue}
          disabled={!isFormValid}
          className={`px-6 py-2 rounded-md font-medium transition-colors ${
            isFormValid
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continue to Preview →
        </button>
      </div>
    </div>
  );
}
