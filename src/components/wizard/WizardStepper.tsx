'use client';

interface WizardStep {
  id: string;
  label: string;
  component: any;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick: (stepIndex: number) => void;
  canProceedToStep: (stepIndex: number) => boolean;
  isExpanded: boolean;
}

export function WizardStepper({ steps, currentStep, onStepClick, canProceedToStep, isExpanded }: WizardStepperProps) {
  const getStepStatus = (stepIndex: number) => {
    if (stepIndex === currentStep) return 'active';
    if (stepIndex < currentStep) return 'completed';
    if (canProceedToStep(stepIndex)) return 'available';
    return 'disabled';
  };

  const getStepIcon = (stepIndex: number, status: string) => {
    if (status === 'completed') {
      return (
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#10b981' }}>
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
    
    if (status === 'active') {
      return (
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#10b981' }}>
          <span className="text-white text-sm font-medium">{stepIndex + 1}</span>
        </div>
      );
    }
    
    if (status === 'available') {
      return (
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3b82f6' }}>
          <span className="text-white text-sm font-medium">{stepIndex + 1}</span>
        </div>
      );
    }
    
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--button-bg)', border: '1px solid var(--card-border)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>{stepIndex + 1}</span>
      </div>
    );
  };

  const getTextColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'font-medium';
      case 'completed':
        return 'font-medium';
      case 'available':
        return 'font-medium';
      default:
        return '';
    }
  };

  return (
    <nav className="space-y-6">
      {steps.map((step, index) => {
        const status = getStepStatus(index);
        
        return (
          <div key={step.id} className="relative">
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="absolute left-4 top-8 w-px h-6" style={{ backgroundColor: 'var(--card-border)' }}></div>
            )}
            
            {/* Step Item */}
            <div className="flex items-center space-x-3">
              {/* Step Icon */}
              {getStepIcon(index, status)}
              
              {/* Step Label */}
              <span className={`text-sm transition-colors ${getTextColor(status)}`} style={{ color: 'var(--foreground)', opacity: status === 'disabled' ? 0.5 : 1 }}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
