import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Lock, User, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register({
          username,
          password,
          displayName: displayName || undefined,
          bio: bio || undefined,
        });
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-4 sm:mt-10">
      <div className="rounded-2xl bg-[#1a0c10] border border-rose-950/80 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center mb-3">
            <Film className="w-6 h-6 text-rose-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 mt-1">
            Track films you’ve watched, rate movies, and curate shared watchlists with friends.
          </p>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[#120609] border border-rose-950/80 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition ${
              mode === 'login'
                ? 'bg-rose-600 text-white shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition ${
              mode === 'register'
                ? 'bg-rose-600 text-white shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. cinephile_99"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#120609] border border-rose-950/80 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Display Name (optional)
                </label>
                <div className="relative">
                  <Sparkles className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How friends see you"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#120609] border border-rose-950/80 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Short Bio (optional)
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Favorite genres, directors, or comfort films..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#120609] border border-rose-950/80 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#120609] border border-rose-950/80 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition disabled:opacity-50 shadow-lg shadow-rose-950/60"
          >
            {submitting
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : 'Create Betterboxd Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
