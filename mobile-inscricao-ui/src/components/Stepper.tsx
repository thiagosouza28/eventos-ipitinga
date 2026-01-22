import { Check } from "lucide-react";

export type StepItem = {
  label: string;
  caption: string;
};

type StepperProps = {
  steps: StepItem[];
  currentStep: number;
};

export const Stepper = ({ steps, currentStep }: StepperProps) => (
  <div className="rounded-2xl border border-[color:var(--card-border)] bg-white px-4 py-4 shadow-soft">
    <div className="flex items-center">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isComplete = currentStep > stepNumber;
        const isActive = currentStep === stepNumber;
        const circleClass = isComplete
          ? "bg-emerald-500 text-white"
          : isActive
            ? "bg-[color:var(--primary)] text-white"
            : "bg-slate-200 text-slate-500";
        const lineClass = currentStep > stepNumber ? "bg-emerald-400" : "bg-slate-200";

        return (
          <div key={step.label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-2">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${circleClass}`}>
                {isComplete ? <Check size={16} strokeWidth={3} /> : stepNumber}
              </div>
              <div className="text-center">
                <p className={`text-xs font-semibold ${isActive ? "text-slate-900" : "text-slate-400"}`}>
                  {step.label}
                </p>
                <p className="text-[11px] text-slate-400">{step.caption}</p>
              </div>
            </div>
            {index < steps.length - 1 ? <div className={`mx-2 h-px flex-1 ${lineClass}`} /> : null}
          </div>
        );
      })}
    </div>
  </div>
);
