'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { staff, isReady } = useAuth();

  useEffect(() => {
    if (isReady && !staff) {
      router.replace('/login');
    }
  }, [isReady, staff, router]);

  if (!isReady || !staff) {
    return (
      <div className="grid min-h-screen place-items-center text-zinc-400">
        Loading session…
      </div>
    );
  }

  return <>{children}</>;
}
