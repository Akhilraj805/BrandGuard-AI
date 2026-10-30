
import React, { useState } from 'react';
import { ShieldCheck, LockKeyhole, Copy, Check } from 'lucide-react';
import { api } from '../api';

const DEMO_ACCOUNTS = [
  {
    role: 'Admin',
    username: 'demo_admin',
    password: 'DemoAdmin@12345',
    description: 'Create content, analyze risks, and assign reviews.',
  },
  {
    role: 'Reviewer',
    username: 'judge_demo',
    password: 'Judge@12345',
    description: 'Review assigned content and approve or request changes.',
  },
];

export function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');

  async function copyValue(label, value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(''), 1800);
    } catch {
      setError('Copy failed. Please copy the text manually.');
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      const data = await api.login(username, password);
      localStorage.setItem('bg_token', data.access_token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-5">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-white p-8 shadow-2xl"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-blue-600 p-3 text-white">
            <ShieldCheck />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              BrandGuard AI
            </h1>
            <p className="text-sm text-slate-500">
              Secure governance workspace
            </p>
          </div>
        </div>

        <h2 className="mb-1 text-lg font-semibold text-slate-900">
          Sign in
        </h2>
        <p className="mb-5 text-sm text-slate-500">
          Explore the platform using either demo account.
        </p>

        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-1 font-semibold text-blue-950">
            Judge Demo Access
          </h3>
          <p className="mb-4 text-xs text-blue-800">
            Use these public demo accounts to explore the workflow.
          </p>

          <div className="space-y-4">
            {DEMO_ACCOUNTS.map((account) => (
              <div
                key={account.role}
                className="rounded-lg border border-blue-200 bg-white p-3"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-slate-900">
                    {account.role} Account
                  </h4>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                    Demo
                  </span>
                </div>

                <p className="mb-3 text-xs text-slate-500">
                  {account.description}
                </p>

                <div className="mb-2">
                  <p className="mb-1 text-xs font-medium text-slate-600">
                    Username
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 break-all text-sm text-slate-900">
                      {account.username}
                    </code>
                    <button
                      type="button"
                      onClick={() =>
                        copyValue(`${account.role}-username`, account.username)
                      }
                      className="rounded-md border border-blue-200 p-2 text-blue-700"
                      aria-label={`Copy ${account.role} username`}
                    >
                      {copied === `${account.role}-username` ? (
                        <Check size={16} />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="mb-1 text-xs font-medium text-slate-600">
                    Password
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 break-all text-sm text-slate-900">
                      {account.password}
                    </code>
                    <button
                      type="button"
                      onClick={() =>
                        copyValue(`${account.role}-password`, account.password)
                      }
                      className="rounded-md border border-blue-200 p-2 text-blue-700"
                      aria-label={`Copy ${account.role} password`}
                    >
                      {copied === `${account.role}-password` ? (
                        <Check size={16} />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setUsername(account.username);
                    setPassword(account.password);
                    setError('');
                  }}
                  className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Use {account.role.toLowerCase()} credentials
                </button>
              </div>
            ))}
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-slate-700">
          Username
        </label>
        <input
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />

        <label className="mb-1 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <p className="mb-4 flex items-center gap-2 text-xs text-slate-500">
          <LockKeyhole size={14} />
          Sessions expire after 8 hours.
        </p>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="mt-4 text-center text-xs text-slate-500">
          BrandGuard AI · Round 3 Judge Access
        </p>
      </form>
    </div>
  );
}
