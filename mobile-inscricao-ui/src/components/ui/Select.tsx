import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export type SelectOption = {
  label: string;
  value: string;
};

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  helper?: string;
  icon?: ReactNode;
};

export const SelectField = ({ label, value, onChange, options, helper, icon }: SelectFieldProps) => (
  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
    <span>{label}</span>
    <div className="relative">
      {icon ? (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
      ) : null}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 ${icon ? "pl-10" : ""}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
        <ChevronDown size={18} />
      </span>
    </div>
    {helper ? <span className="text-xs text-slate-400">{helper}</span> : null}
  </label>
);
