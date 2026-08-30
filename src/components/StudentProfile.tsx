import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { Loader2, Camera, User, Lock, CheckCircle2, Clock } from 'lucide-react';
import { uploadUserImage, getUserImageUrl } from '../lib/userPhotos';

export default function StudentProfile() {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
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
    return <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  }

  if (!profileData) {
    return <div className="text-center p-12">Profile not found.</div>;
  }

  const verified = profileData.verificationStatus === 'verified';

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 pb-32">
      <h2 className="text-3xl font-bold mb-8 text-gray-900">My Profile</h2>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col md:flex-row items-center gap-8 mb-8 pb-8 border-b border-gray-100">
          <div className="relative group">
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" className="w-32 h-32 rounded-full object-cover shadow-md border-4 border-white" />
            ) : (
              <div className="w-32 h-32 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center border-4 border-white shadow-md">
                <User size={48} />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700"
            >
              <Camera size={18} />
            </button>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
          </div>

          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold text-gray-900">{profileData.email}</h3>
            <div className="text-gray-500 font-medium mt-1">PNR: {profileData.pnr}</div>
            <div className="text-gray-500 text-sm mt-1">DOB: {profileData.dob}</div>
            {verified ? (
              <div className="inline-flex items-center gap-1 mt-3 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                <CheckCircle2 size={16} /> Verified by staff
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 mt-3 bg-amber-50 text-amber-800 px-3 py-1 rounded-full text-sm font-semibold">
                <Clock size={16} /> Pending staff review
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Lock size={20} className="text-blue-600" /> Security
          </h4>
          <form onSubmit={handleChangePassword} className="max-w-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">Change Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none mb-3"
            />
            <button type="submit" className="px-6 py-2 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800">
              Update Password
            </button>
            {passwordMessage && <div className="mt-3 text-green-600 text-sm font-medium">{passwordMessage}</div>}
          </form>
        </div>
      </div>
    </div>
  );
}
