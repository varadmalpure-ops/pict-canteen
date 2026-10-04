import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import { ArrowRight, Loader2, LockKeyhole, Mail, UtensilsCrossed } from 'lucide-react';
import { auth } from '../firebase';

export default function StudentAuth({ mode = 'page' }: { mode?: 'page' | 'dialog' }) {
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const formatAuthError = (err: any) => {
    const code = err?.code || '';
    if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
      return 'That email and password combination could not be signed in. You can create an account below.';
    }
    if (code.includes('email-already-in-use')) return 'An account already uses this email. Sign in instead.';
    if (code.includes('weak-password')) return 'Choose a password with at least six characters.';
    if (code.includes('invalid-email')) return 'Enter a valid email address.';
    if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) return 'Google sign-in was closed before it finished.';
    if (code.includes('network-request-failed')) return 'Check your internet connection and try again.';
    return err?.message || 'Sign-in could not be completed. Please try again.';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (isCreatingAccount && password.length < 6) {
      setError('Choose a password with at least six characters.');
      return;
    }

    setLoading(true);
    try {
      if (isCreatingAccount) await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked') {
        try {
          const provider = new GoogleAuthProvider();
          await signInWithRedirect(auth, provider);
          return;
        } catch {}
      }
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Enter your email address first, then choose “Forgot password?”.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice('If an account exists for that email, a password reset link is on the way.');
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const card = (
    <section className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-200/50 ring-1 ring-slate-900/5 sm:rounded-[2.5rem]">
      {/* Header / Illustration Area */}
      <div className="bg-slate-50 px-6 py-10 sm:px-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-100">
          <UtensilsCrossed size={32} strokeWidth={1.5} />
        </div>
        <h1 className="text-center text-2xl font-normal tracking-tight text-slate-900">
          {isCreatingAccount ? 'Create an account' : 'Welcome back'}
        </h1>
        <p className="mx-auto mt-3 max-w-[16rem] text-center text-[15px] leading-relaxed text-slate-500">
          {isCreatingAccount
            ? 'Sign up to order ahead and follow your pickup token.'
            : 'Sign in to place an order and keep track of your pickup.'}
        </p>
      </div>

      <div className="px-6 pb-10 pt-8 sm:px-10">
        {/* Hero Action: Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="relative flex min-h-[3.5rem] w-full items-center justify-center gap-3 rounded-full bg-white px-4 text-[15px] font-semibold text-slate-800 shadow-sm ring-1 ring-inset ring-slate-300 transition-all hover:bg-slate-50 hover:ring-slate-400 hover:shadow-md disabled:opacity-50 active:scale-[0.98] cursor-pointer"
        >
          <svg aria-hidden="true" viewBox="0 0 48 48" className="h-[22px] w-[22px]">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.06 13.22l7.98 6.19C12.02 13.72 17.51 9.5 24 9.5Z" transform="translate(0 4)" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.03 46.98 31.95 46.98 24.55Z" />
            <path fill="#FBBC05" d="M10.04 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.93 23.93 0 0 0 0 21.56l7.98-6.19Z" transform="translate(0 4)" />
            <path fill="#34A853" d="M24 48c6.47 0 11.9-2.13 15.87-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.14 2.3-6.49 0-11.98-4.22-13.96-10.09l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
          </svg>
          Sign in with Google
        </button>

        {/* Collapsible Email Form */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out ${
            showEmailForm ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="pt-8">
              {error && (
                <p role="alert" className="mb-6 rounded-2xl border border-rose-200/60 bg-rose-50/50 px-4 py-3 text-[13px] text-rose-800">
                  {error}
                </p>
              )}
              {notice && (
                <p role="status" className="mb-6 rounded-2xl border border-emerald-200/60 bg-emerald-50/50 px-4 py-3 text-[13px] text-emerald-800">
                  {notice}
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="min-h-[3.25rem] w-full rounded-2xl border-0 bg-slate-50 pl-10 pr-4 text-[15px] text-slate-900 ring-1 ring-inset ring-slate-200 transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center justify-between text-[13px] font-medium text-slate-700">
                    Password
                    {!isCreatingAccount && (
                      <button
                        type="button"
                        onClick={handlePasswordReset}
                        disabled={loading}
                        className="text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50"
                      >
                        Forgot?
                      </button>
                    )}
                  </label>
                  <div className="relative">
                    <LockKeyhole size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={isCreatingAccount ? 6 : undefined}
                      autoComplete={isCreatingAccount ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={isCreatingAccount ? 'At least 6 characters' : '••••••••'}
                      className="min-h-[3.25rem] w-full rounded-2xl border-0 bg-slate-50 pl-10 pr-4 text-[15px] text-slate-900 ring-1 ring-inset ring-slate-200 transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 flex min-h-[3.5rem] w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-[15px] font-medium text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 disabled:opacity-50 active:scale-[0.98]"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      {isCreatingAccount ? 'Create account' : 'Sign in'} <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Toggle Email Form Button (Hidden if form is shown) */}
        {!showEmailForm && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex w-full items-center gap-4">
              <div className="h-px flex-1 bg-slate-200"></div>
              <span className="text-[13px] font-medium text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200"></div>
            </div>
            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              className="text-[15px] font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Continue with email
            </button>
          </div>
        )}

        {/* Footer Links */}
        <div className="mt-8 border-t border-slate-100 pt-6 text-center">
          <p className="text-[13px] text-slate-500">
            {isCreatingAccount ? 'Already have an account?' : 'New to PICT Canteen?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsCreatingAccount((value) => !value);
                setError('');
                setNotice('');
              }}
              className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              {isCreatingAccount ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </div>
      </div>
    </section>
  );

  if (mode === 'dialog') return card;
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50/50 p-4 font-sans sm:p-6">
      {card}
    </div>
  );
}
