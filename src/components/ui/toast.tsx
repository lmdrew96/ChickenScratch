'use client';
import * as React from 'react';
export type ToastLevel = 'info' | 'success' | 'error';
type Toast = { id: string; title?: string; description?: string; level: ToastLevel; };
export type ToastContextValue = {
  toasts: Toast[];
  push: (t: Omit<Toast,'id'> | string) => void;
  notify: (t: Omit<Toast,'id'> | string) => void;
  success: (t: Omit<Toast,'id'> | string) => void;
  error: (t: Omit<Toast,'id'> | string) => void;
  dismiss: (id: string) => void;
};
const ToastContext = React.createContext<ToastContextValue | null>(null);
function asToast(input: Omit<Toast,'id'> | string, level?: ToastLevel): Omit<Toast,'id'> {
  if (typeof input === 'string') return { title: input, level: level || 'info' };
  return { level: input.level || level || 'info', title: input.title, description: input.description };
}
export function useToast(){
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <Toaster/>');
  return ctx;
}
export default function Toaster({ children }:{ children?: React.ReactNode }){
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const dismiss = (id:string)=> setToasts(xs=>xs.filter(t=>t.id!==id));
  const pushBase = (t: Omit<Toast,'id'>)=> {
    const id = crypto.randomUUID(); setToasts(xs=>[...xs,{...t,id}]);
    setTimeout(()=>dismiss(id), 4000);
  };
  const push = (t: Omit<Toast,'id'> | string)=> pushBase(asToast(t));
  const notify = (t: Omit<Toast,'id'> | string)=> pushBase(asToast(t,'info'));
  const success = (t: Omit<Toast,'id'> | string)=> pushBase(asToast(t,'success'));
  const error = (t: Omit<Toast,'id'> | string)=> pushBase(asToast(t,'error'));
  return (
    <ToastContext.Provider value={{ toasts, push, notify, success, error, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map(t=>(
          <div key={t.id} className="rounded border p-3 max-w-sm
            bg-black/80 text-white border-white/20">
            {t.title ? <div className="font-medium">{t.title}</div> : null}
            {t.description ? <div className="text-sm opacity-90">{t.description}</div> : null}
            <button className="text-xs underline mt-1" onClick={()=>dismiss(t.id)}>dismiss</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
