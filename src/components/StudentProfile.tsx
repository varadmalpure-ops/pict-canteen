import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { Loader2, UserRound, LockKeyhole, CheckCircle2, Clock3, ShieldCheck, ChefHat, Tv } from 'lucide-react';

interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  created_at: unknown;
}

export default function StudentProfile() {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetchProfile = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }
      try {
        const snapshot = await getDoc(doc(db, 'users', currentUser.uid));
        if (!cancelled && snapshot.exists()) setProfileData(snapshot.data() as UserProfile);
      } catch (e) {
        console.error('Profile load failed:', e);
        if (!cancelled) setError('Your account details could not be loaded. Check your connection and try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchProfile();
    return () => { cancelled = true; };
  }, []);

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    const currentUser = auth.currentUser;
    if (!newPassword || !currentUser) return;
    setError('');
    setPasswordMessage('');
    try {
      await updatePassword(currentUser, newPassword);
      setPasswordMessage('Password updated.');
      setNewPassword('');
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setError('Sign out and sign in again before changing your password.');
      } else {
        setError(err.message || 'Password could not be changed.');
      }
    }
  };

  if (loading) {
    return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="animate-spin text-blue-700" size={28} /></div>;
  }

  if (!profileData) {
    return <div className="mx-auto max-w-xl p-8 text-center text-sm text-slate-600">{error || 'Account details are not available.'}</div>;
  }

  const verified = profileData.verificationStatus === 'verified';

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 pb-28">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Account</h1>
        <p className="mt-1 text-sm text-slate-500">Your sign-in and canteen account details.</p>
      </div>

      {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700"><UserRound size={25} /></div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-slate-900">{profileData.name || 'PICT Canteen student'}</h2>
            <p className="truncate text-sm text-slate-500">{profileData.email}</p>
          </div>
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4">
          {verified ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800"><CheckCircle2 size={16} /> Student account verified</div>
          ) : profileData.verificationStatus === 'rejected' ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-800">Account access needs staff review</div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900"><Clock3 size={16} /> Account pending staff review</div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><LockKeyhole size={18} className="text-blue-700" /> Change password</h2>
        <p className="mt-1 text-sm text-slate-500">Use at least six characters for your new password.</p>
        <form onSubmit={handleChangePassword} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input type="password" required minLength={6} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" className="min-h-12 flex-1 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          <button type="submit" className="min-h-12 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800">Update password</button>
        </form>
        {passwordMessage && <p role="status" className="mt-3 text-sm text-emerald-700">{passwordMessage}</p>}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">Canteen staff</h2>
        <p className="mt-1 text-sm text-slate-500">Staff sign in with their authorized account.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/admin" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"><ShieldCheck size={15} /> Manager</Link>
          <Link to="/kitchen" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"><ChefHat size={15} /> Kitchen</Link>
          <Link to="/live" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"><Tv size={15} /> Live board</Link>
        </div>
      </section>
    </div>
  );
}
