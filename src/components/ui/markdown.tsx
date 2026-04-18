'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  children: string;
  className?: string;
};

export function Markdown({ children, className }: Props) {
  return (
    <div className={`markdown-body text-slate-200 text-sm leading-relaxed ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children: c }) => <h1 className="text-xl font-bold text-white mt-4 mb-2">{c}</h1>,
          h2: ({ children: c }) => <h2 className="text-lg font-bold text-white mt-4 mb-2">{c}</h2>,
          h3: ({ children: c }) => <h3 className="text-base font-semibold text-white mt-3 mb-1.5">{c}</h3>,
          h4: ({ children: c }) => <h4 className="text-sm font-semibold text-white mt-3 mb-1">{c}</h4>,
          p: ({ children: c }) => <p className="mb-3">{c}</p>,
          ul: ({ children: c }) => <ul className="list-disc pl-5 mb-3 space-y-1">{c}</ul>,
          ol: ({ children: c }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{c}</ol>,
          li: ({ children: c }) => <li className="text-slate-200">{c}</li>,
          strong: ({ children: c }) => <strong className="font-semibold text-white">{c}</strong>,
          em: ({ children: c }) => <em className="italic">{c}</em>,
          a: ({ href, children: c }) => (
            <a
              href={href ?? '#'}
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noreferrer' : undefined}
              className="text-amber-300 hover:underline"
            >
              {c}
            </a>
          ),
          blockquote: ({ children: c }) => (
            <blockquote className="border-l-4 border-amber-400/40 pl-4 my-3 text-slate-300 italic">
              {c}
            </blockquote>
          ),
          code: ({ children: c, className: cls }) => {
            const isBlock = cls?.includes('language-');
            if (isBlock) {
              return (
                <code className={`${cls} text-amber-200`}>
                  {c}
                </code>
              );
            }
            return (
              <code className="bg-white/10 text-amber-200 rounded px-1 py-0.5 text-[0.875em]">
                {c}
              </code>
            );
          },
          pre: ({ children: c }) => (
            <pre className="bg-black/40 border border-white/10 rounded-lg p-3 overflow-x-auto my-3 text-xs">
              {c}
            </pre>
          ),
          hr: () => <hr className="border-white/10 my-4" />,
          table: ({ children: c }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border border-white/10 text-sm">{c}</table>
            </div>
          ),
          thead: ({ children: c }) => <thead className="bg-white/5">{c}</thead>,
          th: ({ children: c }) => (
            <th className="border border-white/10 px-3 py-1.5 text-left text-white font-semibold">{c}</th>
          ),
          td: ({ children: c }) => (
            <td className="border border-white/10 px-3 py-1.5 text-slate-200">{c}</td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
