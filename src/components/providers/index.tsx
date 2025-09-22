'use client';

import React from 'react';
import * as SP from './supabase-provider';
const Supa = (SP as any).SupabaseProvider || (SP as any).default || (({children}:{children:React.ReactNode}) => <>{children}</>);
export default function Providers({children}:{children:React.ReactNode}){ return <Supa>{children}</Supa>; }
export { Supa as SupabaseProvider };
