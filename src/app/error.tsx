'use client';
export default function Error({ error }:{ error: Error & { digest?: string } }){
  return <div style={{padding:24}}><h1>Something went wrong</h1><pre style={{whiteSpace:'pre-wrap'}}>{error.message}</pre></div>;
}
