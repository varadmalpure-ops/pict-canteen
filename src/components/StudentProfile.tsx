import { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { Loader2, UserRound, LockKeyhole, CheckCircle2, Clock3, Palette, Check } from 'lucide-react';
import { useFoodTheme } from '../lib/useFoodTheme';
import { THEME_OPTIONS, type FoodTheme } from '../lib/themeConstants';

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
  const { theme, setTheme } = useFoodTheme();

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
        if (!cancelled) setError('Account details could not be loaded.');
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
      setPasswordMessage('Password updated successfully.');
      setNewPassword('');
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setError('Please sign out and sign back in before updating your password.');
      } else {
        setError(err.message || 'Password could not be updated.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="animate-spin text-blue-700" size={28} />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center text-sm text-slate-600">
        {error || 'Account details are not available.'}
      </div>
    );
  }

  const verified = profileData.verificationStatus === 'verified';

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 pb-28 font-sans">
      <div className="mb-2">
        <h1 className="text-2xl font-black tracking-tight text-slate-950">Student Account</h1>
        <p className="mt-0.5 text-xs text-slate-500 font-medium">PICT Canteen account & preferences</p>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          {error}
        </p>
      )}

      {/* User Information */}
      <section className="rounded-3xl border theme-border theme-surface p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <UserRound size={26} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-black text-slate-950">{profileData.name || 'PICT Student'}</h2>
            <p className="truncate text-xs text-slate-500 font-semibold">{profileData.email}</p>
          </div>
        </div>
        <div className="mt-4 border-t theme-border pt-3">
          {verified ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
              <CheckCircle2 size={14} className="text-emerald-600" /> Student account verified
            </div>
          ) : profileData.verificationStatus === 'rejected' ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-800 border border-rose-200">
              Account needs review
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-200">
              <Clock3 size={14} className="text-amber-600" /> Pending review
            </div>
          )}
        </div>
      </section>

      {/* Background Theme Selector Section */}
      <section className="rounded-3xl border theme-border theme-surface p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Palette size={18} className="text-amber-500" />
            <h2 className="text-sm font-black text-slate-950">Canteen Theme & Mood</h2>
          </div>
        </div>
        <p className="text-xs text-slate-500 font-medium mb-4">
          Light WhatsApp chat wallpapers, matching tinted title bar & plain white option.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {THEME_OPTIONS.filter((o, idx, arr) => arr.findIndex(t => t.id === o.id) === idx && o.id !== 'midnight').map((opt) => {
            const isSelected = theme === opt.id;
            const hasPattern = opt.patternUrl !== 'none';
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id as FoodTheme)}
                className={`relative flex flex-col p-3 rounded-2xl border-2 text-left transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-xs overflow-hidden ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-500/30'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
                style={{
                  backgroundColor: opt.bgHex,
                  backgroundImage: hasPattern ? opt.patternUrl : 'none',
                  backgroundSize: '160px 160px',
                  backgroundRepeat: 'repeat',
                  color: '#0f172a',
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/90 text-slate-900 shadow-2xs backdrop-blur-xs text-xs border border-black/5">
                    {opt.emojis.slice(0, 3).map((em, idx) => (
                      <span key={idx} className="select-none">{em}</span>
                    ))}
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div 
                  className="p-1.5 rounded-lg text-slate-950 shadow-2xs backdrop-blur-xs border mt-auto"
                  style={{
                    backgroundColor: opt.surfaceHex,
                    borderColor: opt.borderHex,
                  }}
                >
                  <span className="font-black text-xs line-clamp-1 block">{opt.name}</span>
                  <span className="text-[10px] text-slate-500 font-semibold line-clamp-1 block">{opt.tagline}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Password Change */}
      <section className="rounded-3xl border theme-border theme-surface p-5 sm:p-6 shadow-2xs">
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-950">
          <LockKeyhole size={17} className="text-blue-700" /> Change Password
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 font-medium">Use 6 or more characters.</p>
        <form onSubmit={handleChangePassword} className="mt-3 flex flex-col gap-2.5 sm:flex-row">
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="min-h-11 flex-1 rounded-2xl border border-slate-300 px-4 text-xs font-semibold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            className="min-h-11 rounded-2xl bg-slate-950 px-5 text-xs font-black text-white hover:bg-slate-800 transition-colors"
          >
            Update
          </button>
        </form>
        {passwordMessage && (
          <p role="status" className="mt-2.5 text-xs font-bold text-emerald-700">
            {passwordMessage}
          </p>
        )}
      </section>
    </div>
  );
}
