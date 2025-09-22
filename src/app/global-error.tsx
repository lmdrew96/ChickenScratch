'use client';
export default function GlobalError({ error }:{ error: Error & { digest?: string } }){
  return <html><body><h1>App Error</h1><pre style={{whiteSpace:'pre-wrap'}}>{error.message}</pre></body></html>;
}
