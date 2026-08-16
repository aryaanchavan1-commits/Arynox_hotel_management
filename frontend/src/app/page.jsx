'use client';

import nextDynamic from 'next/dynamic';

const App = nextDynamic(() => import('@/App'), { ssr: false });

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function Page() {
  return <App />;
}