type SummaryRowProps = {
  label: string;
  value: string;
  valueClassName?: string;
};

export const SummaryRow = ({ label, value, valueClassName }: SummaryRowProps) => (
  <div className="flex items-center justify-between text-sm text-slate-500">
    <span>{label}</span>
    <span className={`font-semibold text-slate-700 ${valueClassName ?? ""}`}>{value}</span>
  </div>
);
