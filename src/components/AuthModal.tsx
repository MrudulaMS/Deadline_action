import React, { useState } from 'react';
import { X, Lock, Mail, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const { login, register, loginWithGoogle, resetPassword, error, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    try {
      if (mode === 'login') {
        await login(email, password);
        onClose();
      } else if (mode === 'register') {
        await register(email, password, displayName);
        onClose();
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setStatusMessage('Password reset instructions sent to your email.');
      }
    } catch (err) {
      // Error is set in AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err) {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-[8px] border border-[#D1D5DB] shadow-[0_4px_6px_-1px_rgba(15,23,42,0.1)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <div>
            <h3 className="text-base font-semibold text-[#111827]">
              {mode === 'login' ? 'Academic Registry Sign In' : mode === 'register' ? 'Create Student Account' : 'Reset Password'}
            </h3>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              Secure, user-isolated workload persistence on Firebase.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#6B7280] hover:text-[#111827] rounded-[4px] hover:bg-[#F3F4F6]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Mode Switcher Tabs */}
          {mode !== 'forgot' && (
            <div className="flex bg-[#F3F4F6] p-0.5 rounded-[6px] border border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  clearError();
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-[4px] transition-colors ${
                  mode === 'login' ? 'bg-white text-[#111827] shadow-sm font-semibold' : 'text-[#4B5563]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  clearError();
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-[4px] transition-colors ${
                  mode === 'register' ? 'bg-white text-[#111827] shadow-sm font-semibold' : 'text-[#4B5563]'
                }`}
              >
                Register
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] text-xs text-[#DC2626] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-[6px] text-xs text-[#059669]">
              {statusMessage}
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Display Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Alex Chen"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-[38px] pl-9 pr-3 text-xs bg-white text-[#111827] border border-[#D1D5DB] rounded-[6px] focus:outline-none focus:border-[#1E3A8A]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Academic or Personal Email *
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

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-[#374151]">
                  Password *
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
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
            className="w-full h-[38px] bg-[#1E3A8A] text-white rounded-[6px] text-xs font-medium hover:bg-[#172554] disabled:opacity-50 transition-colors shadow-none mt-2"
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
          </button>

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-center text-xs text-[#4B5563] hover:text-[#111827]"
            >
              Back to Sign In
            </button>
          )}

          {mode !== 'forgot' && (
            <>
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E5E7EB]" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wide">
                  <span className="bg-white px-2 text-[#6B7280]">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-[38px] bg-white border border-[#D1D5DB] text-[#111827] rounded-[6px] text-xs font-medium hover:bg-[#F9FAFB] transition-colors flex items-center justify-center gap-2"
              >
                <span>Google Account</span>
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
