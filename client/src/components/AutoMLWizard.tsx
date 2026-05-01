import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useAnimate } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { UploadCloud, Database, Target, Settings, Bot, Hourglass, CheckCircle, ArrowRight, ArrowLeft, Loader, RefreshCw } from 'lucide-react';

// --- TYPES AND MOCK DATA ---
type Feature = {
  id: string;
  name: string;
  type: 'numerical' | 'categorical' | 'text' | 'datetime';
  include: boolean;
  imputation: 'mean' | 'median' | 'mode' | 'none';
};

type Model = {
  id: string;
  name: string;
  description: string;
  selected: boolean;
};

type AutoMLConfig = {
  datasetName: string | null;
  targetColumn: string | null;
  features: Feature[];
  models: Model[];
  trainingTimeLimit: number; // in hours
  resourceBudget: number; // in percentage
};

const initialFeatures: Feature[] = [
  { id: 'age', name: 'Age', type: 'numerical', include: true, imputation: 'mean' },
  { id: 'job', name: 'Job', type: 'categorical', include: true, imputation: 'mode' },
  { id: 'marital', name: 'Marital Status', type: 'categorical', include: true, imputation: 'mode' },
  { id: 'education', name: 'Education', type: 'categorical', include: true, imputation: 'mode' },
  { id: 'balance', name: 'Balance', type: 'numerical', include: true, imputation: 'mean' },
  { id: 'housing', name: 'Housing Loan', type: 'categorical', include: true, imputation: 'mode' },
  { id: 'loan', name: 'Personal Loan', type: 'categorical', include: true, imputation: 'mode' },
  { id: 'contact', name: 'Contact Type', type: 'categorical', include: false, imputation: 'none' },
  { id: 'day', name: 'Last Contact Day', type: 'datetime', include: false, imputation: 'none' },
  { id: 'month', name: 'Last Contact Month', type: 'datetime', include: false, imputation: 'none' },
];

const initialModels: Model[] = [
    { id: 'linear', name: 'Linear Models', description: 'Fast and interpretable.', selected: true },
    { id: 'tree', name: 'Tree-based Models', description: 'Good for tabular data (XGBoost, LightGBM).', selected: true },
    { id: 'nn', name: 'Neural Networks', description: 'For complex patterns (requires more data).', selected: false },
    { id: 'ensemble', name: 'Ensemble Learning', description: 'Combines multiple models for better performance.', selected: false },
];

const steps = [
  { id: 'data', name: 'Data Upload', icon: UploadCloud },
  { id: 'target', name: 'Target Selection', icon: Target },
  { id: 'features', name: 'Feature Config', icon: Settings },
  { id: 'models', name: 'Model Selection', icon: Bot },
  { id: 'training', name: 'Training Config', icon: Hourglass },
  { id: 'review', name: 'Review & Launch', icon: CheckCircle },
];

export default function AutoMLWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [trainingStatus, setTrainingStatus] = useState<'idle' | 'training' | 'completed'>('idle');
  const [config, setConfig] = useState<AutoMLConfig>({
    datasetName: null,
    targetColumn: null,
    features: initialFeatures,
    models: initialModels,
    trainingTimeLimit: 2,
    resourceBudget: 50,
  });

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  const handlePrev = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const handleLaunch = () => {
    setTrainingStatus('training');
    setTimeout(() => {
        setTrainingStatus('completed');
    }, 3000);
  };

  const updateConfig = <K extends keyof AutoMLConfig>(key: K, value: AutoMLConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const isStepComplete = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: return config.datasetName !== null;
      case 1: return config.targetColumn !== null;
      case 2: return config.features.some(f => f.include);
      case 3: return config.models.some(m => m.selected);
      default: return true;
    }
  };

    const StepIndicator = () => {
    const [scope, animate] = useAnimate();

    useEffect(() => {
      const activeStepElement = scope.current.querySelector(`[data-step-id="${steps[currentStep].id}"]`);
      if (activeStepElement) {
        animate(activeStepElement, { scale: 1.15 }, { duration: 0.2 });
        const otherStepElements = scope.current.querySelectorAll(`[data-step-id]:not([data-step-id="${steps[currentStep].id}"])`);
        animate(otherStepElements, { scale: 1.0 }, { duration: 0.2 });
      }
    }, [currentStep, animate, scope]);

    return (
    <div ref={scope} className="flex items-center justify-center p-4 space-x-2 sm:space-x-4 md:space-x-8">
      {steps.map((step, index) => {
        const isCompleted = isStepComplete(index) && index < currentStep;
        const isActive = index === currentStep;
        return (
          <motion.div
            key={step.id}
            data-step-id={step.id}
            className="flex items-center flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2 cursor-pointer"
            onClick={() => isStepComplete(index - 1) && setCurrentStep(index)}
            whileHover={{scale: 1.05}}
          >
            <motion.div
              initial={false}
              animate={{
                backgroundColor: isCompleted ? 'hsl(var(--primary))' : isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                color: isCompleted || isActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))'
              }}
              transition={{ duration: 0.3 }}
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
            >
              {isCompleted ? <CheckCircle className="w-5 h-5" /> : <step.icon className="w-4 h-4" />}
            </motion.div>
            <span className={cn('text-xs sm:text-sm text-center sm:text-left', isActive ? 'text-foreground font-semibold' : 'text-muted-foreground')}>{step.name}</span>
          </motion.div>
        );
      })}
    </div>
  )};


  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <DataUploadStep config={config} updateConfig={updateConfig} />;
      case 1:
        return <TargetSelectionStep config={config} updateConfig={updateConfig} />;
      case 2:
        return <FeatureConfigStep config={config} updateConfig={updateConfig} />;
      case 3:
        return <ModelSelectionStep config={config} updateConfig={updateConfig} />;
      case 4:
        return <TrainingConfigStep config={config} updateConfig={updateConfig} />;
      case 5:
        return <ReviewStep config={config} />;
      default:
        return null;
    }
  };

  const resetWizard = () => {
      setCurrentStep(0);
      setConfig({
        datasetName: null,
        targetColumn: null,
        features: initialFeatures,
        models: initialModels,
        trainingTimeLimit: 2,
        resourceBudget: 50,
      });
      setTrainingStatus('idle');
  };

  if (trainingStatus === 'completed') {
    return (
        <div className="bg-background text-foreground w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
            <Card className="border-border/40 shadow-lg text-center p-12">
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Training Complete!</h2>
                    <p className="text-muted-foreground mb-6">Your AutoML model has been successfully trained.</p>
                    <Button onClick={resetWizard}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Start New Training
                    </Button>
                </motion.div>
            </Card>
        </div>
    );
  }

  return (
    <div className="bg-background text-foreground w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      <Card className="border-border/40 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center space-x-2">
            <Database className="w-7 h-7 text-primary" />
            <span>AutoML Training Wizard</span>
          </CardTitle>
          <div className="-mx-6 px-2 sm:px-6"><StepIndicator /></div>
        </CardHeader>
        <Separator />
        <CardContent className="p-6 min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </CardContent>
        <Separator />
        <CardFooter className="flex justify-between p-6">
          <Button variant="outline" onClick={handlePrev} disabled={currentStep === 0}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext} disabled={!isStepComplete(currentStep)}>
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleLaunch}
              disabled={trainingStatus === 'training'}
              className="bg-green-600 hover:bg-green-700 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
            >
              {trainingStatus === 'training' ? (
                <><Loader className="w-4 h-4 mr-2 animate-spin" /> Training...</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-2" /> Launch Training</>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

// --- STEP COMPONENTS ---

const DataUploadStep = ({ config, updateConfig }: { config: AutoMLConfig, updateConfig: <K extends keyof AutoMLConfig>(key: K, value: AutoMLConfig[K]) => void }) => {
  const datasets = ["customer_churn.csv", "market_basket.csv", "predictive_maintenance.csv"];
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <UploadCloud className="w-16 h-16 text-primary mb-4" />
      <h2 className="text-xl font-semibold mb-2">Upload Your Data</h2>
      <p className="text-muted-foreground mb-6">Select a dataset to begin the AutoML process.</p>
      <div className="w-full max-w-md">
        <Select onValueChange={(value) => updateConfig("datasetName", value)} defaultValue={config.datasetName || ""}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a dataset" />
          </SelectTrigger>
          <SelectContent>
            {datasets.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
       <Button variant="outline" className="mt-4">Or Upload a New File</Button>
    </div>
  );
};

const TargetSelectionStep = ({ config, updateConfig }: { config: AutoMLConfig, updateConfig: <K extends keyof AutoMLConfig>(key: K, value: AutoMLConfig[K]) => void }) => {
  const columns = useMemo(() => config.features.map(f => f.id), [config.features]);
  return (
    <div className="p-8">
      <h2 className="text-xl font-semibold mb-2">Select Target Variable</h2>
      <p className="text-muted-foreground mb-6">Choose the column you want to predict.</p>
      <RadioGroup onValueChange={(value) => updateConfig("targetColumn", value)} defaultValue={config.targetColumn || ""} className="pt-2">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {columns.map((col, index) => (
          <motion.div
            key={col}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Label htmlFor={col} className="flex items-center space-x-2 border p-4 rounded-lg hover:bg-muted hover:border-primary/50 transition-colors cursor-pointer">
              <RadioGroupItem value={col} id={col} />
              <span className="font-medium">{col}</span>
            </Label>
          </motion.div>
        ))}
        </div>
      </RadioGroup>
    </div>
  );
};

const FeatureConfigStep = ({ config, updateConfig }: { config: AutoMLConfig, updateConfig: <K extends keyof AutoMLConfig>(key: K, value: AutoMLConfig[K]) => void }) => {
  const handleFeatureToggle = (featureId: string, checked: boolean) => {
    const updatedFeatures = config.features.map(f => f.id === featureId ? { ...f, include: checked } : f);
    updateConfig("features", updatedFeatures);
  };

  return (
    <div className="p-2 sm:p-4">
      <h2 className="text-xl font-semibold mb-2">Configure Features</h2>
      <p className="text-muted-foreground mb-6">Select features to include in the model training.</p>
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 -mr-2">
        {config.features.filter(f => f.id !== config.targetColumn).map((feature, index) => (
          <motion.div
            key={feature.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Checkbox 
                id={feature.id} 
                checked={feature.include}
                onCheckedChange={(checked) => handleFeatureToggle(feature.id, checked as boolean)}
              />
              <Label htmlFor={feature.id} className="font-medium">{feature.name}</Label>
            </div>
            <Badge variant="outline">{feature.type}</Badge>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const ModelSelectionStep = ({ config, updateConfig }: { config: AutoMLConfig, updateConfig: <K extends keyof AutoMLConfig>(key: K, value: AutoMLConfig[K]) => void }) => {
    const handleModelToggle = (modelId: string, checked: boolean) => {
        const updatedModels = config.models.map(m => m.id === modelId ? { ...m, selected: checked } : m);
        updateConfig("models", updatedModels);
    };

    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold mb-2">Select Models</h2>
            <p className="text-muted-foreground mb-6">Choose the model types to train.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.models.map(model => (
                    <div key={model.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted">
                        <Checkbox 
                            id={model.id} 
                            checked={model.selected}
                            onCheckedChange={(checked) => handleModelToggle(model.id, checked as boolean)}
                            className="mt-1"
                        />
                        <div className="grid gap-1.5">
                            <Label htmlFor={model.id} className="font-semibold cursor-pointer">{model.name}</Label>
                            <p className="text-sm text-muted-foreground">{model.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TrainingConfigStep = ({ config, updateConfig }: { config: AutoMLConfig, updateConfig: <K extends keyof AutoMLConfig>(key: K, value: AutoMLConfig[K]) => void }) => {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-2">Training Time Limit</h2>
        <p className="text-muted-foreground mb-4">Set the maximum duration for the training job.</p>
        <div className="flex items-center space-x-4">
          <Slider 
            defaultValue={[config.trainingTimeLimit]} 
            max={24} 
            step={1} 
            onValueChange={([value]) => updateConfig("trainingTimeLimit", value)}
          />
          <span className="font-bold text-lg w-24 text-right">{config.trainingTimeLimit} hours</span>
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Resource Budget</h2>
        <p className="text-muted-foreground mb-4">Allocate compute resources for this job.</p>
        <div className="flex items-center space-x-4">
          <Slider 
            defaultValue={[config.resourceBudget]} 
            max={100} 
            step={5} 
            onValueChange={([value]) => updateConfig("resourceBudget", value)}
          />
          <span className="font-bold text-lg w-24 text-right">{config.resourceBudget}%</span>
        </div>
      </div>
    </div>
  );
};

const ReviewStep = ({ config }: { config: AutoMLConfig }) => {
  const includedFeatures = useMemo(() => config.features.filter(f => f.include), [config.features]);
  const selectedModels = useMemo(() => config.models.filter(m => m.selected), [config.models]);

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-semibold">Review Configuration</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div whileHover={{ y: -5 }}><Card>
          <CardHeader><CardTitle>Dataset & Target</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Dataset:</strong> <Badge>{config.datasetName}</Badge></p>
            <p><strong>Target:</strong> <Badge variant="secondary">{config.targetColumn}</Badge></p>
          </CardContent>
        </Card></motion.div>
        <motion.div whileHover={{ y: -5 }}><Card>
          <CardHeader><CardTitle>Features ({includedFeatures.length})</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {includedFeatures.map(f => <Badge key={f.id} variant="outline">{f.name}</Badge>)}
          </CardContent>
        </Card></motion.div>
        <motion.div whileHover={{ y: -5 }}><Card>
          <CardHeader><CardTitle>Models ({selectedModels.length})</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {selectedModels.map(m => <Badge key={m.id} variant="outline">{m.name}</Badge>)}
          </CardContent>
        </Card></motion.div>
        <motion.div whileHover={{ y: -5 }}><Card>
          <CardHeader><CardTitle>Training Settings</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Time Limit:</strong> {config.trainingTimeLimit} hours</p>
            <p><strong>Resource Budget:</strong> {config.resourceBudget}%</p>
            <p className="text-sm text-muted-foreground pt-2">Estimated cost: ~$ {(config.trainingTimeLimit * config.resourceBudget * 0.05).toFixed(2)}</p>
          </CardContent>
        </Card></motion.div>
      </div>
    </div>
  );
};
