import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import type { ThisWeekItem, ThisWeekTone } from '@/lib/data/this-week';

const toneClasses: Record<ThisWeekTone, { wrap: string; chip: string }> = {
  info: {
    wrap: 'border-white/10 bg-white/5 hover:bg-white/10',
    chip: 'text-slate-300',
  },
  warn: {
    wrap: 'border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/10',
    chip: 'text-amber-200',
  },
  danger: {
    wrap: 'border-rose-400/30 bg-rose-400/10 hover:bg-rose-400/20',
    chip: 'text-rose-200',
  },
  success: {
    wrap: 'border-emerald-400/30 bg-emerald-400/5 hover:bg-emerald-400/10',
    chip: 'text-emerald-200',
  },
};

export function ThisWeekCard({
  roleLabel,
  items,
}: {
  roleLabel: string;
  items: ThisWeekItem[];
}) {
  return (
    <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 via-transparent to-transparent p-4 sm:p-6 shadow-lg">
      <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-amber-400" />
        This Week for {roleLabel}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-300">
          Nothing pressing on your plate. Use the time to write, proofread, or terrorize the advisor.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const tc = toneClasses[item.tone];
            const inner = (
              <>
                <span className="text-lg leading-none shrink-0 mt-0.5">{item.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm font-medium ${tc.chip}`}>{item.title}</span>
                  {item.deadline && (
                    <span className="block text-[11px] text-slate-400 mt-0.5">{item.deadline}</span>
                  )}
                </span>
                {item.href && <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
              </>
            );
            const className = `flex items-start gap-3 rounded-xl border px-3 py-2 min-h-[44px] transition-colors ${tc.wrap}`;
            if (item.href) {
              return (
                <li key={item.id}>
                  <Link href={item.href} className={className}>
                    {inner}
                  </Link>
                </li>
              );
            }
            return (
              <li key={item.id} className={className}>
                {inner}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
