import { useState, useRef, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Loader2, Camera, User, Lock, Mail, Calendar, CreditCard, ScanFace, CheckCircle2, X, Info } from 'lucide-react';

export default function StudentAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    const saved = localStorage.getItem('authError');
    localStorage.removeItem('authError');
    return saved || '';
  });

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pnr, setPnr] = useState('');
  const [dob, setDob] = useState('');
  const [photoBase64, setPhotoBase64] = useState('');
  
  // Facial verification state
  const [selfieBase64, setSelfieBase64] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraMode, setCameraMode] = useState<'ID' | 'SELFIE' | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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
        // Crop perfectly to the alignment guide
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const sw = window.innerWidth;
        const sh = window.innerHeight;
        
        const scale = Math.max(sw / vw, sh / vh);
        const offsetX = (sw - vw * scale) / 2;
        const offsetY = (sh - vh * scale) / 2;
        
        const boxWidth = Math.min(sw * (2/3), 320);
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

  const verifyFaceMatch = async () => {
    if (!photoBase64 || !selfieBase64) return;
    setIsVerifyingFace(true);
    // Simulate AI Facial Recognition
    await new Promise(resolve => setTimeout(resolve, 2500));
    setIsVerifyingFace(false);
    setFaceVerified(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10MB");
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
        setError("Unsupported file format. Please upload a standard image file (JPG, PNG).");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!faceVerified) {
          throw new Error("You must complete Facial Verification before registering.");
        }
        
        localStorage.setItem('pendingReg', JSON.stringify({ pnr, dob, photoBase64 }));
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
      if (!isLogin && !faceVerified) {
        setError("Please complete Facial Verification above before clicking Register with Google.");
        return;
      }
      
      setLoading(true);
      setError('');
      
      localStorage.setItem('isLoginGoogle', isLogin ? 'true' : 'false');
      if (!isLogin) {
        localStorage.setItem('pendingReg', JSON.stringify({ pnr, dob, photoBase64 }));
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
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <User size={40} strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-500 mt-3 text-sm sm:text-base px-4">
            {isLogin ? 'Sign in to access your PICT CANTEEN dashboard.' : 'Register with your PICT ID card to securely order food.'}
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50/80 backdrop-blur-sm text-red-600 rounded-2xl text-sm font-medium border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <Info size={18} className="mt-0.5 flex-shrink-0" />
            <p leading-relaxed>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Email Input */}
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

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-end ml-1 mb-1">
              <label className="text-sm font-semibold text-gray-700">
                {isLogin ? 'Password' : 'Create a Password'}
              </label>
              {!isLogin && (
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Required for email login</span>
              )}
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
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-500 ml-1">
                  This will be your dedicated password for the canteen app.
                </p>
                <p className="text-[11px] font-medium text-gray-400 ml-1">
                  Must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character.
                </p>
              </div>
            )}
          </div>

          {!isLogin && (
            <div className="pt-6 mt-6 border-t border-gray-100 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-1 bg-blue-600 rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900">Student Verification</h3>
              </div>

              {/* PNR Input */}
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

              {/* DOB Input */}
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

              {/* ID Card */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 ml-1">Scan ID Card</label>
                <p className="text-xs text-gray-500 ml-1 mb-3">Please upload or snap a clear picture of your college ID.</p>
                
                {photoBase64 ? (
                  <div className="relative group overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
                    <img src={photoBase64} alt="ID" className="w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        type="button" 
                        onClick={() => setPhotoBase64('')}
                        className="bg-white text-gray-900 px-4 py-2 rounded-full font-bold text-sm shadow-xl flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all"
                      >
                        <X size={16} /> Retake Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => startCamera('ID')}
                      className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-5 flex flex-col items-center justify-center gap-2 shadow-lg shadow-gray-900/20 hover:shadow-gray-900/30 transition-all active:scale-95 border border-gray-700"
                    >
                      <Camera size={26} strokeWidth={1.5} />
                      <span className="font-semibold text-sm">Open Camera</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 bg-white border-2 border-dashed border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95"
                    >
                      <User size={26} strokeWidth={1.5} />
                      <span className="font-semibold text-sm">Upload File</span>
                    </button>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/png, image/jpeg, image/jpg, image/webp" className="hidden" />
              </div>
              
              {/* Facial Verification */}
              <div className="space-y-1.5 pt-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">Live Facial Verification</label>
                <p className="text-xs text-gray-500 ml-1 mb-3">Take a quick selfie to prove it's really you.</p>

                {!photoBase64 ? (
                  <div className="w-full bg-gray-50/80 border border-gray-200 rounded-2xl p-5 text-center text-sm font-medium text-gray-500">
                    Scan your ID Card first.
                  </div>
                ) : faceVerified ? (
                  <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center justify-center gap-2 text-emerald-700 font-bold shadow-sm">
                    <CheckCircle2 size={22} className="text-emerald-500" /> Face Match Confirmed
                  </div>
                ) : isVerifyingFace ? (
                  <div className="w-full bg-blue-50 border border-blue-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-blue-700 font-semibold shadow-sm">
                    <ScanFace size={36} className="animate-pulse text-blue-500" />
                    <div className="flex items-center gap-2">
                      <Loader2 size={18} className="animate-spin" /> Analyzing features...
                    </div>
                  </div>
                ) : selfieBase64 ? (
                  <div className="w-full space-y-4">
                    <div className="flex gap-3 justify-center">
                      <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-md">
                        <img src={photoBase64} alt="ID" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end justify-center pb-1"><span className="text-[10px] font-bold text-white uppercase tracking-wider">ID</span></div>
                      </div>
                      <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-md">
                        <img src={selfieBase64} alt="Selfie" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end justify-center pb-1"><span className="text-[10px] font-bold text-white uppercase tracking-wider">Live</span></div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setSelfieBase64('')} className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-colors">
                        Retake
                      </button>
                      <button type="button" onClick={verifyFaceMatch} className="flex-[2] py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
                        <ScanFace size={18}/> Verify Match
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => startCamera('SELFIE')} className="w-full bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-blue-100 transition-colors group">
                    <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                      <Camera size={24} />
                    </div>
                    <span className="font-bold text-sm">Take Live Selfie</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-6 mt-6 border-t border-gray-100 space-y-3">
            <button
              type="submit"
              disabled={loading || (!isLogin && !faceVerified)}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-gray-900/20"
            >
              {loading ? <Loader2 size={24} className="animate-spin" /> : (isLogin ? 'Sign In with Email' : 'Create Account')}
            </button>
            
            <div className="relative py-3 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <span className="relative bg-white px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Or</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading || (!isLogin && !faceVerified)}
              className="w-full py-4 bg-white border-2 border-gray-200 text-gray-800 rounded-2xl font-bold text-lg hover:border-gray-300 hover:bg-gray-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
              {isLogin ? 'Continue with Google' : 'Register with Google'}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center bg-gray-50 rounded-2xl p-4">
          <p className="text-sm text-gray-500 font-medium">
            {isLogin ? "Don't have an account yet?" : "Already verified?"}
          </p>
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="mt-1 text-blue-600 font-bold hover:text-blue-800 transition-colors text-sm"
          >
            {isLogin ? "Create a new account" : "Sign in to your account"}
          </button>
        </div>
      </div>
      
      {/* Full Screen Camera Modal */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-200">
          <div className="flex-1 relative">
            <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
            
            <div className="absolute top-0 left-0 right-0 p-4 pt-safe-top bg-gradient-to-b from-black/80 via-black/40 to-transparent flex justify-between items-center text-white z-10">
              <span className="font-bold text-lg drop-shadow-md">{cameraMode === 'ID' ? 'Scan ID Card' : 'Take Selfie'}</span>
              <button type="button" onClick={stopCamera} className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors border border-white/20">
                <X size={24} />
              </button>
            </div>

            {cameraMode === 'ID' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-2/3 max-w-xs aspect-[1/1.586] border-2 border-white/80 rounded-2xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] backdrop-blur-[2px]">
                  <span className="text-white font-bold text-lg tracking-wider uppercase text-center px-4 drop-shadow-lg">Align ID Card Here</span>
                </div>
              </div>
            )}
            
            <div className="absolute bottom-0 left-0 right-0 p-8 pb-safe-bottom bg-gradient-to-t from-black/90 via-black/50 to-transparent flex justify-center pb-12 z-10">
              <button 
                type="button" 
                onClick={capturePhoto} 
                className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full border border-white/30 p-2 flex items-center justify-center active:scale-90 transition-transform"
              >
                <div className="w-full h-full bg-white rounded-full shadow-lg"></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
