'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { ui } from '@/lib/ui';

export default function LoginPage() {
  const router = useRouter();
  const { login, staff, isReady } = useAuth();
  const handleError = useApiErrorHandler();
  const [email, setEmail] = useState('super@example.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && staff) {
      router.replace('/');
    }
  }, [isReady, staff, router]);

  if (!isReady || staff) {
    return (
      <div className="grid min-h-screen place-items-center text-zinc-400">
        Redirecting…
      </div>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.push('/');
    } catch (err) {
      setError(await handleError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className={`${ui.card} w-full max-w-md`}>
        <h1 className="text-2xl font-semibold">Back office sign in</h1>
        <p className={`${ui.muted} mt-2`}>
          Staff credentials from the API seed (separate from player launch
          tokens).
        </p>
        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-1">
            <span className={ui.label}>Email</span>
            <input
              className={ui.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label className="grid gap-1">
            <span className={ui.label}>Password</span>
            <input
              className={ui.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button type="submit" className={ui.btn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <pre className="mt-6 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-400">
          {`super@example.com / Super123!       (SUPER_ADMIN)\nplatform@example.com / Platform123!  (PLATFORM_ADMIN)\nadmin@acme.example.com / Acme123!    (OPERATOR_ADMIN — tenant)`}
        </pre>
      </div>
    </div>
  );
}
