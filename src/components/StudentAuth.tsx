import { useState, useRef, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Loader2, Camera, User, Lock, Mail, Calendar, CreditCard, CheckCircle2, X, Info } from 'lucide-react';

export default function StudentAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    const saved = localStorage.getItem('authError');
    localStorage.removeItem('authError');
    return saved || '';
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pnr, setPnr] = useState('');
  const [dob, setDob] = useState('');
  const [photoBase64, setPhotoBase64] = useState('');
  const [selfieBase64, setSelfieBase64] = useState('');

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraMode, setCameraMode] = useState<'ID' | 'SELFIE' | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const registrationReady = Boolean(photoBase64 && selfieBase64 && pnr && dob);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isCameraActive, cameraMode]);

  const startCamera = async (mode: 'ID' | 'SELFIE') => {
    try {
      setCameraMode(mode);
      setIsCameraActive(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode === 'SELFIE' ? 'user' : 'environment' }
      });
      setStream(mediaStream);
    } catch (err) {
      console.error(err);
      setError('Could not access camera. Please check permissions.');
      setCameraMode(null);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCameraMode(null);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (cameraMode === 'ID') {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const sw = window.innerWidth;
        const sh = window.innerHeight;

        const scale = Math.max(sw / vw, sh / vh);
        const offsetX = (sw - vw * scale) / 2;
        const offsetY = (sh - vh * scale) / 2;

        const boxWidth = Math.min(sw * (2 / 3), 320);
        const boxHeight = boxWidth * 1.586;

        const boxLeft = (sw - boxWidth) / 2;
        const boxTop = (sh - boxHeight) / 2;

        const cropLeft = (boxLeft - offsetX) / scale;
        const cropTop = (boxTop - offsetY) / scale;
        const cropWidth = boxWidth / scale;
        const cropHeight = boxHeight / scale;

        const sx = Math.max(0, cropLeft);
        const sy = Math.max(0, cropTop);
        const sw_crop = Math.min(vw - sx, cropWidth);
        const sh_crop = Math.min(vh - sy, cropHeight);

        canvas.width = sw_crop;
        canvas.height = sh_crop;

        ctx.drawImage(video, sx, sy, sw_crop, sh_crop, 0, 0, sw_crop, sh_crop);
      } else {
        const maxSize = 800;
        let width = video.videoWidth;
        let height = video.videoHeight;
        if (width > height) {
          if (width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize; }
        } else {
          if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(video, 0, 0, width, height);
      }

      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      if (cameraMode === 'ID') setPhotoBase64(base64);
      else setSelfieBase64(base64);
      stopCamera();
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setPhotoBase64(dataUrl);
        setError('');
      };
      img.onerror = () => {
        setError('Unsupported file format. Please upload a standard image file (JPG, PNG).');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const stashPendingReg = () => {
    localStorage.setItem('pendingReg', JSON.stringify({
      pnr,
      dob,
      idDataUrl: photoBase64,
      selfieDataUrl: selfieBase64
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLogin) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        setError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
        return;
      }
      if (!registrationReady) {
        setError('Upload your college ID and a live selfie before registering. Staff will review them — there is no automatic face match.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        stashPendingReg();
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      if (!isLogin && !registrationReady) {
        setError('Upload your college ID and a live selfie before registering with Google.');
        return;
      }

      setLoading(true);
      setError('');

      if (!isLogin) {
        stashPendingReg();
      }

      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Authentication failed.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-gray-50/50 p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg bg-white p-6 sm:p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/60 transition-all duration-300">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <User size={40} strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-500 mt-3 text-sm sm:text-base px-4">
            {isLogin ? 'Sign in to access your PICT CANTEEN dashboard.' : 'Register with your PICT ID. Photos are stored securely for staff review.'}
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50/80 backdrop-blur-sm text-red-600 rounded-2xl text-sm font-medium border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <Info size={18} className="mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 ml-1">Email Address</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-600">
                <Mail size={18} className="text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 rounded-2xl border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                placeholder="student@gmail.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-end ml-1 mb-1">
              <label className="text-sm font-semibold text-gray-700">
                {isLogin ? 'Password' : 'Create a Password'}
              </label>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 rounded-2xl border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            {!isLogin && (
              <p className="text-[11px] font-medium text-gray-400 ml-1">
                Must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character.
              </p>
            )}
          </div>

          {!isLogin && (
            <div className="pt-6 mt-6 border-t border-gray-100 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-1 bg-blue-600 rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900">Student Verification</h3>
              </div>
              <p className="text-xs text-gray-500">
                ID and selfie are uploaded to secure storage for canteen staff review. This app does not perform automatic face matching.
              </p>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 ml-1">PNR Number</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <CreditCard size={18} className="text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    value={pnr}
                    onChange={e => setPnr(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 rounded-2xl border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all uppercase"
                    placeholder="e.g. 120B0000"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 ml-1">Date of Birth</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Calendar size={18} className="text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  </div>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 rounded-2xl border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 ml-1">College ID photo</label>
                {photoBase64 ? (
                  <div className="relative group overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
                    <img src={photoBase64} alt="ID" className="w-full h-48 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={() => setPhotoBase64('')} className="bg-white text-gray-900 px-4 py-2 rounded-full font-bold text-sm">
                        Retake
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button type="button" onClick={() => startCamera('ID')} className="flex-1 bg-gray-900 text-white rounded-2xl p-5 flex flex-col items-center gap-2">
                      <Camera size={26} />
                      <span className="font-semibold text-sm">Open Camera</span>
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 bg-white border-2 border-dashed border-gray-200 rounded-2xl p-5 flex flex-col items-center gap-2 text-gray-500">
                      <User size={26} />
                      <span className="font-semibold text-sm">Upload File</span>
                    </button>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/png, image/jpeg, image/jpg, image/webp" className="hidden" />
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">Live selfie (for staff review)</label>
                {!photoBase64 ? (
                  <div className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center text-sm text-gray-500">
                    Scan your ID card first.
                  </div>
                ) : selfieBase64 ? (
                  <div className="w-full space-y-4">
                    <div className="flex gap-3 justify-center">
                      <img src={photoBase64} alt="ID" className="w-24 h-24 rounded-2xl object-cover border" />
                      <img src={selfieBase64} alt="Selfie" className="w-24 h-24 rounded-2xl object-cover border" />
                    </div>
                    <div className="flex items-center justify-center gap-2 text-emerald-700 font-bold text-sm">
                      <CheckCircle2 size={18} /> Photos ready for staff review
                    </div>
                    <button type="button" onClick={() => setSelfieBase64('')} className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm">
                      Retake selfie
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => startCamera('SELFIE')} className="w-full bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl p-6 flex flex-col items-center gap-3">
                    <Camera size={24} />
                    <span className="font-bold text-sm">Take Live Selfie</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="pt-6 mt-6 border-t border-gray-100 space-y-3">
            <button
              type="submit"
              disabled={loading || (!isLogin && !registrationReady)}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={24} className="animate-spin" /> : (isLogin ? 'Sign In with Email' : 'Create Account')}
            </button>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading || (!isLogin && !registrationReady)}
              className="w-full py-4 bg-white border-2 border-gray-200 text-gray-800 rounded-2xl font-bold text-lg hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
              {isLogin ? 'Continue with Google' : 'Register with Google'}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center bg-gray-50 rounded-2xl p-4">
          <p className="text-sm text-gray-500 font-medium">
            {isLogin ? "Don't have an account yet?" : 'Already verified?'}
          </p>
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="mt-1 text-blue-600 font-bold hover:text-blue-800 transition-colors text-sm"
          >
            {isLogin ? 'Create a new account' : 'Sign in to your account'}
          </button>
        </div>
      </div>

      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex-1 relative">
            <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center text-white z-10">
              <span className="font-bold text-lg">{cameraMode === 'ID' ? 'Scan ID Card' : 'Take Selfie'}</span>
              <button type="button" onClick={stopCamera} className="p-3 bg-white/10 rounded-full">
                <X size={24} />
              </button>
            </div>
            {cameraMode === 'ID' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-2/3 max-w-xs aspect-[1/1.586] border-2 border-white/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center z-10">
              <button type="button" onClick={capturePhoto} className="w-20 h-20 bg-white/20 rounded-full border border-white/30 p-2">
                <div className="w-full h-full bg-white rounded-full" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
