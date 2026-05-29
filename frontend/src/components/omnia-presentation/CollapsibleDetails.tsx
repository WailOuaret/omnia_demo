import { useState, type ReactNode } from "react";

export function CollapsibleDetails({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
        aria-expanded={open}
      >
        <span>{label}</span>
        <span className="text-slate-400 transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }}>
          v
        </span>
      </button>
      {open ? <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-600">{children}</div> : null}
    </div>
  );
}
