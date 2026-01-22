import type { InputHTMLAttributes, ReactNode } from "react";

type InputFieldProps = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  icon?: ReactNode;
  type?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  error?: string;
};

export const InputField = ({
  label,
  placeholder,
  value,
  onChange,
  helper,
  icon,
  type = "text",
  inputMode,
  error
}: InputFieldProps) => (
  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
    <span>{label}</span>
    <div className="relative">
      {icon ? (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
      ) : null}
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 ${icon ? "pl-10" : ""}`}
      />
    </div>
    {helper ? <span className="text-xs text-slate-400">{helper}</span> : null}
    {error ? <span className="text-xs text-red-500">{error}</span> : null}
  </label>
);
