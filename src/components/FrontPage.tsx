import React, { useState } from 'react';
import {
  Calendar,
  Sliders,
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  TrendingDown,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { WorkloadTimelineBar } from './WorkloadTimelineBar';

interface FrontPageProps {
  onEnterDemo: () => void;
}

export const FrontPage: React.FC<FrontPageProps> = ({ onEnterDemo }) => {
  const { login, register, loginWithGoogle, resetPassword, error, clearError } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    try {
      if (authMode === 'login') {
        await login(email, password);
      } else if (authMode === 'register') {
        await register(email, password, displayName);
      } else if (authMode === 'forgot') {
        await resetPassword(email);
        setStatusMessage('Password reset instructions sent to your email.');
      }
    } catch (err) {
      // Error handled by AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      // Error handled
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] flex flex-col antialiased">
      {/* Front Page Header */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[6px] bg-[#1E3A8A] flex items-center justify-center text-white font-semibold text-sm">
                DR
              </div>
              <div>
                <span className="text-base font-semibold tracking-tight text-[#111827] block leading-tight">
                  Deadline Radar
                </span>
                <span className="text-xs text-[#6B7280] font-normal leading-none block mt-0.5">
                  Academic Workload & Velocity Management
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onEnterDemo}
                className="h-[38px] px-3.5 bg-white text-[#4B5563] border border-[#D1D5DB] rounded-[6px] text-xs font-medium hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors flex items-center gap-1.5"
              >
                <span>Guest Preview Mode</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  clearError();
                  const formEl = document.getElementById('auth-form-card');
                  formEl?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="h-[38px] px-4 bg-[#1E3A8A] text-white rounded-[6px] text-xs font-medium hover:bg-[#172554] transition-colors shadow-none flex items-center gap-1.5"
              >
                <span>Sign Up Free</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Hero & Login Gateway */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Value Proposition & Architecture */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#F1F3FF] border border-[#DCE2F7] rounded-[4px] text-xs font-semibold text-[#1E3A8A] tracking-[0.02em]">
              <Layers className="w-3.5 h-3.5" />
              <span>ACADEMIC WORKLOAD ARCHITECTURE</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#111827] tracking-tight leading-[1.15]">
                Eliminate Crunch Spikes. <br className="hidden sm:inline" />
                <span className="text-[#1E3A8A]">Map True Study Velocity.</span>
              </h1>
              <p className="text-sm sm:text-base text-[#4B5563] max-w-xl leading-relaxed">
                Most students track deadlines, but ignore effort velocity. Deadline Radar analyzes
                syllabus weights, estimated effort hours, and concurrent exams across your term to
                prevent late-night cramming.
              </p>
            </div>

            {/* 3 Core Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <div className="bg-white p-4 rounded-[8px] border border-[#E5E7EB] space-y-1.5">
                <div className="w-7 h-7 rounded-[4px] bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626]">
                  <AlertCircle className="w-4 h-4" strokeWidth={2} />
                </div>
                <div className="text-xs font-semibold text-[#111827]">Clash Detection</div>
                <div className="text-[11px] text-[#6B7280] leading-snug">
                  Identifies multi-exam days and high-stake overlapping deliverables automatically.
                </div>
              </div>

              <div className="bg-white p-4 rounded-[8px] border border-[#E5E7EB] space-y-1.5">
                <div className="w-7 h-7 rounded-[4px] bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669]">
                  <TrendingDown className="w-4 h-4" strokeWidth={2} />
                </div>
                <div className="text-xs font-semibold text-[#111827]">Anti-Crunch Balancer</div>
                <div className="text-[11px] text-[#6B7280] leading-snug">
                  Simulates shifting prep hours forward to flatten dangerous 11+ hour bottleneck days.
                </div>
              </div>

              <div className="bg-white p-4 rounded-[8px] border border-[#E5E7EB] space-y-1.5">
                <div className="w-7 h-7 rounded-[4px] bg-[#F1F3FF] border border-[#DCE2F7] flex items-center justify-center text-[#1E3A8A]">
                  <Sparkles className="w-4 h-4" strokeWidth={2} />
                </div>
                <div className="text-xs font-semibold text-[#111827]">Plan with AI</div>
                <div className="text-[11px] text-[#6B7280] leading-snug">
                  Natural-language parser turns unstructured notes into structured tasks with mandatory user verification.
                </div>
              </div>
            </div>

            {/* Interactive Demo CTA strip */}
            <div className="p-4 bg-white rounded-[8px] border border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[#111827]">
                  Want to explore without creating an account?
                </div>
                <div className="text-[11px] text-[#6B7280]">
                  Launch the interactive guest sandbox with a sample Cornell Fall term schedule.
                </div>
              </div>
              <button
                type="button"
                onClick={onEnterDemo}
                className="h-[36px] px-4 bg-white hover:bg-[#F9FAFB] text-[#1E3A8A] border border-[#1E3A8A] rounded-[6px] text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <span>Launch Guest Sandbox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Column: Embedded Student Login Card */}
          <div id="auth-form-card" className="lg:col-span-5">
            <div className="bg-white rounded-[8px] border border-[#D1D5DB] p-6 sm:p-7 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06)] space-y-5">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#059669] font-semibold mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Cloud Firestore Isolated Workspace</span>
                </div>
                <h2 className="text-lg font-bold text-[#111827] tracking-tight">
                  {authMode === 'login'
                    ? 'Student Registry Sign In'
                    : authMode === 'register'
                    ? 'Create Student Account'
                    : 'Reset Account Password'}
                </h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Sign in to store, calculate, and persist your personal academic deadlines.
                </p>
              </div>

              {/* Mode Switcher */}
              {authMode !== 'forgot' && (
                <div className="flex bg-[#F3F4F6] p-0.5 rounded-[6px] border border-[#E5E7EB]">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      clearError();
                    }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-[4px] transition-colors ${
                      authMode === 'login'
                        ? 'bg-white text-[#111827] shadow-sm font-semibold'
                        : 'text-[#4B5563] hover:text-[#111827]'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      clearError();
                    }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-[4px] transition-colors ${
                      authMode === 'register'
                        ? 'bg-white text-[#111827] shadow-sm font-semibold'
                        : 'text-[#4B5563] hover:text-[#111827]'
                    }`}
                  >
                    Register
                  </button>
                </div>
              )}

              {/* Error & Status Banners */}
              {error && (
                <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] text-xs text-[#DC2626] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {statusMessage && (
                <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-[6px] text-xs text-[#059669] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1">
                      Display Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. Maya Patel"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full h-[38px] pl-9 pr-3 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:border-[#1E3A8A]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">
                    Student or Personal Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="student@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-[38px] pl-9 pr-3 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:border-[#1E3A8A]"
                    />
                  </div>
                </div>

                {authMode !== 'forgot' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-[#374151]">
                        Password *
                      </label>
                      {authMode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('forgot');
                            clearError();
                          }}
                          className="text-[11px] text-[#1E3A8A] hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-[38px] pl-9 pr-3 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:border-[#1E3A8A]"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[38px] bg-[#1E3A8A] text-white rounded-[6px] text-xs font-semibold hover:bg-[#172554] disabled:opacity-50 transition-colors shadow-none mt-1"
                >
                  {loading
                    ? 'Processing...'
                    : authMode === 'login'
                    ? 'Sign In to Workspace'
                    : authMode === 'register'
                    ? 'Create Student Account'
                    : 'Send Password Reset Link'}
                </button>

                {authMode === 'forgot' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      clearError();
                    }}
                    className="w-full text-center text-xs text-[#4B5563] hover:text-[#111827] pt-1"
                  >
                    Back to Sign In
                  </button>
                )}

                {authMode !== 'forgot' && (
                  <>
                    <div className="relative my-2.5">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#E5E7EB]" />
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase tracking-wide">
                        <span className="bg-white px-2 text-[#6B7280]">Or authenticate with</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full h-[38px] bg-white border border-[#D1D5DB] text-[#111827] rounded-[6px] text-xs font-medium hover:bg-[#F9FAFB] transition-colors flex items-center justify-center gap-2"
                    >
                      <span>Google Student Account</span>
                    </button>
                  </>
                )}
              </form>

              <div className="pt-2 border-t border-[#F3F4F6] text-center text-[11px] text-[#6B7280]">
                Strict Zero-Trust ABAC security: Your tasks are never accessible by other users.
              </div>
            </div>
          </div>
        </div>

        {/* Live Velocity Radar Preview Strip */}
        <div className="mt-12 pt-8 border-t border-[#E5E7EB] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#111827]">
                Live Workload Horizon Preview
              </h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                How Deadline Radar monitors velocity across Fall 2026 examination weeks.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#4B5563]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#059669]" /> Light (&lt;3h)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#D97706]" /> Moderate (3–6h)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#EA580C]" /> Heavy (6–8h)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#DC2626]" /> Overloaded (&gt;8h)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {[
              { day: 'Mon 12', hours: 3.5, tier: 'Moderate' as const, note: 'Normal prep' },
              { day: 'Tue 13', hours: 5.0, tier: 'Moderate' as const, note: 'CS lab sprint' },
              { day: 'Wed 14', hours: 10.0, tier: 'Overloaded' as const, note: 'Clash: 2 Exams Due' },
              { day: 'Thu 15', hours: 4.5, tier: 'Moderate' as const, note: 'Post-midterm' },
              { day: 'Fri 16', hours: 7.0, tier: 'Heavy' as const, note: 'Paper deadline' },
              { day: 'Sat 17', hours: 2.0, tier: 'Light' as const, note: 'Reading block' },
              { day: 'Sun 18', hours: 1.5, tier: 'Light' as const, note: 'Weekly planning' },
            ].map((d, i) => (
              <div
                key={i}
                className={`p-3 rounded-[6px] border bg-white ${
                  d.tier === 'Overloaded' ? 'border-[#FCA5A5] bg-[#FEF2F2]/30 ring-1 ring-[#DC2626]' : 'border-[#E5E7EB]'
                }`}
              >
                <div className="text-[11px] font-semibold text-[#6B7280]">{d.day}</div>
                <div className={`text-sm font-bold tabular-num mt-1 ${d.tier === 'Overloaded' ? 'text-[#DC2626]' : 'text-[#111827]'}`}>
                  {d.hours.toFixed(1)}h
                </div>
                <div className="mt-2">
                  <WorkloadTimelineBar
                    totalHours={d.hours}
                    capacityLimit={8.0}
                    tier={d.tier}
                  />
                </div>
                <div className="text-[10px] text-[#6B7280] mt-2 truncate font-medium">
                  {d.note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-5 mt-auto">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#6B7280] gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#111827]">Deadline Radar</span>
            <span>·</span>
            <span>University Workload Analytics</span>
            <span>·</span>
            <span>Firebase Firestore Backend</span>
          </div>
          <div>
            Built with strict ABAC data isolation & deterministic pacing mathematics
          </div>
        </div>
      </footer>
    </div>
  );
};
