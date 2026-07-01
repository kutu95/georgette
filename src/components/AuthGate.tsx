import { useCallback, useEffect, useState } from "react";
import { api, type AuthStatus } from "../lib/api";
import { LoginPage } from "../pages/LoginPage";

type Props = {
  children: React.ReactNode;
};

export function AuthGate({ children }: Props) {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await api.getAuthStatus();
      setStatus(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check sign-in status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 text-sm text-stone-600">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-sm text-red-800">
          <p className="font-medium">Could not verify access</p>
          <p className="mt-2">{error}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-4 rounded-md border border-stone-300 px-3 py-1.5 text-stone-700 hover:bg-stone-50"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (status?.required && !status.authenticated) {
    return <LoginPage onLoggedIn={() => void refresh()} />;
  }

  return <>{children}</>;
}
