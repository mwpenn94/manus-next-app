import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, User, Settings, ClipboardList, CheckCircle } from 'lucide-react';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Step {
  id: number;
  name: string;
  isOptional?: boolean;
}

const steps: Step[] = [
  { id: 1, name: 'Personal Info' },
  { id: 2, name: 'Preferences', isOptional: true },
  { id: 3, name: 'Review' },
  { id: 4, name: 'Confirm' },
];

const stepIcons = [
  <User className="h-5 w-5" />,
  <Settings className="h-5 w-5" />,
  <ClipboardList className="h-5 w-5" />,
  <CheckCircle className="h-5 w-5" />,
];

interface FormData {
  fullName: string;
  email: string;
  theme: string;
  notifications: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
}

const MultiStepWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    theme: 'dark',
    notifications: 'all',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());

  const progress = useMemo(() => ((currentStep - 1) / (steps.length - 1)) * 100, [currentStep]);

  const validateStep = useCallback(() => {
    const newErrors: FormErrors = {};
    if (currentStep === 1) {
      if (!formData.fullName) newErrors.fullName = 'Full name is required.';
      if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'A valid email is required.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, formData]);

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < steps.length) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      let prevStep = currentStep - 1;
      while(skippedSteps.has(prevStep) && prevStep > 1) {
        prevStep--;
      }
      setCurrentStep(prevStep);
    }
  };

  const handleSkip = () => {
    const step = steps.find(s => s.id === currentStep);
    if (step && step.isOptional) {
      setSkippedSteps(prev => new Set(prev).add(currentStep));
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof FormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-muted-foreground mb-1">Full Name</label>
              <Input id="fullName" name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="John Doe" aria-describedby="fullName-error" />
              {errors.fullName && <p id="fullName-error" className="text-sm text-red-500 mt-1">{errors.fullName}</p>}
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">Email Address</label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="john.doe@example.com" aria-describedby="email-error" />
              {errors.email && <p id="email-error" className="text-sm text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="theme" className="block text-sm font-medium text-muted-foreground mb-1">Theme</label>
              <Select name="theme" value={formData.theme} onValueChange={handleSelectChange('theme')}>
                <SelectTrigger id="theme"><SelectValue placeholder="Select theme" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="notifications" className="block text-sm font-medium text-muted-foreground mb-1">Notifications</label>
              <Select name="notifications" value={formData.notifications} onValueChange={handleSelectChange('notifications')}>
                <SelectTrigger id="notifications"><SelectValue placeholder="Select notification level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="mentions">Mentions Only</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-3 text-sm">
            <h3 className="font-semibold text-lg mb-2">Review Your Information</h3>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Full Name:</span>
              <span className="font-medium">{formData.fullName}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{formData.email}</span>
            </div>
            {!skippedSteps.has(2) && (
              <>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Theme:</span>
                  <span className="font-medium capitalize">{formData.theme}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-muted-foreground">Notifications:</span>
                  <span className="font-medium capitalize">{formData.notifications}</span>
                </div>
              </>
            )}
            {skippedSteps.has(2) && <Badge variant="outline">Preferences step was skipped</Badge>}
          </div>
        );
      case 4:
        return (
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold">Setup Complete!</h3>
            <p className="text-muted-foreground">Your wizard setup is successfully completed.</p>
          </div>
        );
      default:
        return null;
    }
  };

  const currentStepInfo = steps.find(s => s.id === currentStep);

  return (
    <div className="bg-background text-foreground min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl" role="application" aria-label="Multi-step wizard">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">Multi-Step Wizard</CardTitle>
          <div className="mt-4">
            <Progress value={progress} className="w-full" />
            <div className="flex justify-between items-center mt-2">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center w-1/4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                      currentStep > step.id ? "bg-green-500 border-green-500 text-white" :
                      currentStep === step.id ? "border-primary scale-110" : "border-border bg-card"
                    )}
                  >
                    {currentStep > step.id ? <Check className="h-6 w-6" /> : stepIcons[index]}
                  </div>
                  <p className={cn(
                    "text-xs mt-2 text-center",
                    currentStep === step.id ? "font-bold text-primary" : "text-muted-foreground"
                  )}>
                    {step.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-h-[250px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </CardContent>
        <CardFooter className="flex justify-between">
          {currentStep > 1 && currentStep < steps.length ? (
            <Button variant="outline" onClick={handleBack}>Back</Button>
          ) : <div />} 
          <div className="flex items-center gap-2">
            {currentStepInfo?.isOptional && currentStep < steps.length -1 && (
                <Button variant="ghost" onClick={handleSkip}>Skip</Button>
            )}
            {currentStep < steps.length ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button onClick={() => alert("Wizard Finished!")}>Finish</Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default MultiStepWizard;
