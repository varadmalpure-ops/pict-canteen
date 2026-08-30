import { useState, useRef, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Loader2, Camera, User, Lock, Mail, Calendar, CreditCard, X, Info } from 'lucide-react';

export default function StudentAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    const saved = sessionStorage.getItem('authError');
    sessionStorage.removeItem('authError');
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
    sessionStorage.setItem('pendingReg', JSON.stringify({
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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-gradient-to-b from-gray-50 to-gray-100/60 p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 transition-all duration-300">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/25">
            <span className="font-black text-2xl tracking-tighter">P</span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            PICT Canteen Portal
          </h2>
          <p className="text-gray-500 text-xs font-medium mt-1">
            {isLogin ? 'Sign in to order food, track tokens, and skip the line' : 'Create your verified student canteen pass'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              isLogin ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              !isLogin ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Register Student
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 text-red-600 rounded-2xl text-xs font-medium border border-red-100 flex items-start gap-2.5 animate-in fade-in">
            <Info size={16} className="mt-0.5 shrink-0 text-red-500" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {isLogin ? (
          /* Sign In Form */
          <div className="space-y-4">
            {/* 1-Tap Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 shadow-sm hover:shadow transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-gray-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0">or with email</span>
              <div className="border-t border-gray-200 w-full" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600 ml-1">Email</label>
                <div className="relative group">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:border-blue-500 outline-none text-sm font-medium transition-all"
                    placeholder="student@gmail.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600 ml-1">Password</label>
                <div className="relative group">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:border-blue-500 outline-none text-sm font-medium transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
              </button>
            </form>
          </div>
        ) : (
          /* Register Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600 ml-1">Email</label>
              <div className="relative group">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:border-blue-500 outline-none text-sm font-medium transition-all"
                  placeholder="student@gmail.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600 ml-1">Password</label>
              <div className="relative group">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:border-blue-500 outline-none text-sm font-medium transition-all"
                  placeholder="Min 8 chars, 1 capital, 1 symbol"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600 ml-1">PNR / Roll No</label>
                <div className="relative group">
                  <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="text"
                    required
                    value={pnr}
                    onChange={e => setPnr(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:border-blue-500 outline-none text-xs font-bold uppercase transition-all"
                    placeholder="e.g. 120B1020"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600 ml-1">Date of Birth</label>
                <div className="relative group">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    className="w-full pl-9 pr-2 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:border-blue-500 outline-none text-xs font-medium transition-all"
                  />
                </div>
              </div>
            </div>

            {/* ID & Selfie Verification Box */}
            <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Student ID & Selfie</span>
                <span className="text-[10px] text-gray-400 font-medium">For counter pickup verification</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* ID Photo */}
                <div>
                  {photoBase64 ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 h-24 bg-white">
                      <img src={photoBase64} alt="ID" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setPhotoBase64('')} className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-md font-bold">
                        Retake
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <button type="button" onClick={() => startCamera('ID')} className="h-16 bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors">
                        <Camera size={18} className="text-blue-600" />
                        <span className="text-[10px] font-bold mt-1">Scan ID</span>
                      </button>
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[10px] text-gray-500 text-center font-semibold hover:text-blue-600">
                        or Upload File
                      </button>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/png, image/jpeg, image/jpg, image/webp" className="hidden" />
                </div>

                {/* Selfie */}
                <div>
                  {selfieBase64 ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 h-24 bg-white">
                      <img src={selfieBase64} alt="Selfie" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setSelfieBase64('')} className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-md font-bold">
                        Retake
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => startCamera('SELFIE')} className="h-16 w-full bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors">
                      <User size={18} className="text-purple-600" />
                      <span className="text-[10px] font-bold mt-1">Take Selfie</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={loading || !registrationReady}
                className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Create Account'}
              </button>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading || !registrationReady}
                className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold text-xs hover:bg-gray-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                Register with Google
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Camera Capture Fullscreen Overlay */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex-1 relative">
            <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center text-white z-10">
              <span className="font-bold text-base">{cameraMode === 'ID' ? 'Scan College ID Card' : 'Take Verification Selfie'}</span>
              <button type="button" onClick={stopCamera} className="p-2.5 bg-white/10 rounded-full">
                <X size={20} />
              </button>
            </div>
            {cameraMode === 'ID' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-2/3 max-w-xs aspect-[1/1.586] border-2 border-white/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center z-10">
              <button type="button" onClick={capturePhoto} className="w-18 h-18 bg-white/20 rounded-full border border-white/40 p-2">
                <div className="w-14 h-14 bg-white rounded-full mx-auto" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
