import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { Loader2, Camera, User, Lock, CheckCircle2, Clock, Sun, Moon, Laptop, Palette, ShieldCheck, ChefHat, Tv } from 'lucide-react';
import { uploadUserImage, getUserImageUrl } from '../lib/userPhotos';
import { useTheme } from '../lib/ThemeContext';

interface UserProfile {
  uid: string;
  email: string;
  pnr: string;
  dob: string;
  idPhotoPath?: string;
  selfiePath?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  created_at: unknown;
  lastOrderAt?: unknown;
}

export default function StudentProfile() {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfileData(data);
          const path = data.idPhotoPath || data.selfiePath;
          if (path) {
            try {
              setPhotoUrl(await getUserImageUrl(path));
            } catch {
              setPhotoUrl(null);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      try {
        const path = await uploadUserImage(auth.currentUser!.uid, 'avatar.jpg', dataUrl);
        await updateDoc(doc(db, 'users', auth.currentUser!.uid), { idPhotoPath: path });
        setPhotoUrl(await getUserImageUrl(path));
        setProfileData((prev: any) => ({ ...prev, idPhotoPath: path }));
        alert('Profile photo updated successfully!');
      } catch (err) {
        console.error(err);
        alert('Failed to update photo');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !auth.currentUser) return;
    try {
      await updatePassword(auth.currentUser, newPassword);
      setPasswordMessage('Password changed successfully!');
      setNewPassword('');
      setTimeout(() => setPasswordMessage(''), 3000);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        alert('Please log out and log back in to change your password.');
      } else {
        alert('Failed to change password. ' + err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={32} />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="text-center p-12 text-slate-600 dark:text-slate-400 font-semibold">
        Profile not found.
      </div>
    );
  }

  const verified = profileData.verificationStatus === 'verified';

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 pb-32 transition-colors duration-200">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Settings & Profile
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
          Manage your account, appearance theme, and personal preferences
        </p>
      </div>

      {/* 1. Profile Information Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 dark:border-slate-800 mb-6 transition-colors">
        <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="relative group">
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" className="w-28 h-28 rounded-full object-cover shadow-md border-4 border-white dark:border-slate-800" />
            ) : (
              <div className="w-28 h-28 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-md">
                <User size={42} />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg google-touch google-ripple transition-transform cursor-pointer"
              title="Upload photo"
              aria-label="Upload photo"
            >
              <Camera size={16} />
            </button>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
          </div>

          <div className="text-center md:text-left flex-1 min-w-0">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white break-all">
              {profileData.email}
            </h3>
            <div className="text-slate-500 dark:text-slate-400 font-semibold text-xs mt-1">
              PNR: <span className="font-mono text-slate-800 dark:text-slate-200">{profileData.pnr}</span>
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              DOB: {profileData.dob}
            </div>
            {verified ? (
              <div className="inline-flex items-center gap-1 mt-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 px-3 py-1 rounded-full text-xs font-bold">
                <CheckCircle2 size={14} /> Verified Student
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 mt-3 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 px-3 py-1 rounded-full text-xs font-bold">
                <Clock size={14} /> Pending staff review
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Theme & Appearance Settings Card (Google M3 Segmented Control) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 dark:border-slate-800 mb-6 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-base">
            <Palette size={18} className="text-blue-600 dark:text-blue-400" />
            <span>Theme & Appearance</span>
          </div>
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 capitalize">
            Active: {resolvedTheme} mode
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Choose how PICT Canteen looks on your device.
        </p>

        {/* 3-Way Google Segmented Pill Switcher */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`py-3 px-3 rounded-xl font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer google-touch ${
              theme === 'light'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sun size={16} className={theme === 'light' ? 'text-amber-500' : ''} />
            <span>Light</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`py-3 px-3 rounded-xl font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer google-touch ${
              theme === 'dark'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Moon size={16} className={theme === 'dark' ? 'text-indigo-400' : ''} />
            <span>Dark</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`py-3 px-3 rounded-xl font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer google-touch ${
              theme === 'system'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Laptop size={16} className={theme === 'system' ? 'text-blue-500' : ''} />
            <span>System</span>
          </button>
        </div>

        <div className="mt-3 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          {theme === 'system' && '💻 System default automatically synchronizes with your device settings.'}
          {theme === 'light' && '☀️ Light mode provides high contrast and bright readability.'}
          {theme === 'dark' && '🌙 Dark mode reduces glare and saves battery on OLED screens.'}
        </div>
      </div>

      {/* 3. Password & Security Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 dark:border-slate-800 transition-colors mb-6">
        <h4 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Lock size={18} className="text-blue-600 dark:text-blue-400" />
          <span>Security & Password</span>
        </h4>
        <form onSubmit={handleChangePassword} className="max-w-md space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Change Account Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new strong password"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm google-touch google-ripple transition-all cursor-pointer"
          >
            Update Password
          </button>
          {passwordMessage && (
            <div className="text-emerald-600 dark:text-emerald-400 text-xs font-bold mt-2">
              {passwordMessage}
            </div>
          )}
        </form>
      </div>

      {/* 4. Staff Portal Section (Discreet access for authorized staff) */}
      <div className="bg-slate-100/70 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs mb-3">
          <ShieldCheck size={16} className="text-blue-600 dark:text-blue-400" />
          <span>Canteen Staff & Kitchen Access</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
          Authorized staff can access kitchen and order management portals directly.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin"
            className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-full border border-slate-200/80 dark:border-slate-700 font-bold text-xs flex items-center gap-1.5 google-touch transition-all shadow-2xs"
          >
            <ShieldCheck size={13} className="text-blue-600" /> Manager Portal
          </Link>
          <Link
            to="/kitchen"
            className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-full border border-slate-200/80 dark:border-slate-700 font-bold text-xs flex items-center gap-1.5 google-touch transition-all shadow-2xs"
          >
            <ChefHat size={13} className="text-amber-500" /> Kitchen KDS
          </Link>
          <Link
            to="/live"
            className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-full border border-slate-200/80 dark:border-slate-700 font-bold text-xs flex items-center gap-1.5 google-touch transition-all shadow-2xs"
          >
            <Tv size={13} className="text-indigo-500" /> Live TV
          </Link>
        </div>
      </div>
    </div>
  );
}
