interface Props {
  step?: string;
}

export function Loading({ step }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="18" fill="none" stroke="#27272a" strokeWidth="3" />
        <circle
          cx="24"
          cy="24"
          r="18"
          fill="none"
          stroke="#a855f7"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="28 85"
          className="animate-spin origin-center"
        />
      </svg>
      <span className="text-[13px] text-zinc-500 transition-opacity duration-200">
        {step || "Analyzing posting..."}
      </span>
    </div>
  );
}
