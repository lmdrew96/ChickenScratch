'use client';

import React from 'react';
import * as P from '@/components/providers';
const AnyP = P as any;
const Providers = (AnyP && (AnyP.default || AnyP.Providers)) || (({children}:{children:React.ReactNode}) => <>{children}</>);
export default Providers;
export { Providers };
