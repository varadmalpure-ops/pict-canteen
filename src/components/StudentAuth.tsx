import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { ArrowRight, Loader2, LockKeyhole, Mail, UtensilsCrossed } from 'lucide-react';
import { auth } from '../firebase';

export default function StudentAuth({ mode = 'page' }: { mode?: 'page' | 'dialog' }) {
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
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
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
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
    <section className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-700">
          <UtensilsCrossed size={24} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{isCreatingAccount ? 'Create your account' : 'Welcome back'}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {isCreatingAccount ? 'Sign up once to order ahead and follow your pickup token.' : 'Sign in to place an order and keep track of your pickup.'}
        </p>
      </div>

      <button type="button" onClick={handleGoogleSignIn} disabled={loading} className="google-touch flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50">
        <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.06 13.22l7.98 6.19C12.02 13.72 17.51 9.5 24 9.5Z" transform="translate(0 4)" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.03 46.98 31.95 46.98 24.55Z" />
          <path fill="#FBBC05" d="M10.04 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.93 23.93 0 0 0 0 21.56l7.98-6.19Z" transform="translate(0 4)" />
          <path fill="#34A853" d="M24 48c6.47 0 11.9-2.13 15.87-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.14 2.3-6.49 0-11.98-4.22-13.96-10.09l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
        </svg>
        Sign in with Google
      </button>

      <div className="my-5 flex items-center gap-3 text-xs font-medium text-slate-400"><span className="h-px flex-1 bg-slate-200" />or use email<span className="h-px flex-1 bg-slate-200" /></div>

      {error && <p role="alert" className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Email address
          <span className="relative mt-1.5 block">
            <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </span>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Password
          <span className="relative mt-1.5 block">
            <LockKeyhole size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="password" required minLength={isCreatingAccount ? 6 : undefined} autoComplete={isCreatingAccount ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isCreatingAccount ? 'At least 6 characters' : 'Your password'} className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </span>
        </label>

        {!isCreatingAccount && <button type="button" onClick={handlePasswordReset} disabled={loading} className="-mt-1 text-sm font-medium text-blue-700 hover:underline disabled:opacity-50">Forgot password?</button>}

        <button type="submit" disabled={loading} className="google-touch flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <>{isCreatingAccount ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></>}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-600">
        {isCreatingAccount ? 'Already have an account?' : 'New to PICT Canteen?'}{' '}
        <button type="button" onClick={() => { setIsCreatingAccount((value) => !value); setError(''); setNotice(''); }} className="font-semibold text-blue-700 hover:underline">
          {isCreatingAccount ? 'Sign in' : 'Create an account'}
        </button>
      </p>
    </section>
  );

  if (mode === 'dialog') return card;
  return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f6f7fb] p-4 sm:p-6">{card}</div>;
}
