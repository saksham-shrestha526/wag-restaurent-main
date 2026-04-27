import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, X, ChefHat, Mail, KeyRound, Lock, ArrowLeft, RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import ReCAPTCHA from 'react-google-recaptcha';

type AuthView = 'auth' | 'forgot' | 'verify' | 'reset';

const LoginPage = () => {
  const [view, setView] = useState<AuthView>('auth');
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', code: '' });
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const submittedRef = useRef(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/';

  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

  useEffect(() => {
    if ((view === 'verify' || view === 'forgot') && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [view, timer]);

  const handleResendCode = async () => {
    if (!canResend && timer > 0) {
      toast.error(`Please wait ${timer} seconds`);
      return;
    }
    setResendLoading(true);
    try {
      let response;
      if (view === 'verify') {
        response = await api.resendVerification(formData.email);
      } else if (view === 'forgot') {
        response = await api.resendResetCode(formData.email);
      } else {
        return;
      }
      if (response.success) { 
        toast.success('New code sent to your email'); 
        setTimer(120); 
        setCanResend(false); 
      } else {
        toast.error(response.message);
      }
    } catch (error: any) { 
      toast.error(error.message || 'Failed to resend code'); 
    } finally { 
      setResendLoading(false); 
    }
  };

  const handleRecaptchaChange = (token: string | null) => setRecaptchaToken(token);
  const refreshRecaptcha = () => { recaptchaRef.current?.reset(); setRecaptchaToken(null); toast.info('reCAPTCHA refreshed'); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittedRef.current) return;
    setLoading(true);
    
    if (view === 'auth') {
      if (!isLogin) {
        // Registration
        if (!recaptchaToken) { toast.error('Please complete the reCAPTCHA'); setLoading(false); return; }
        submittedRef.current = true;
        try {
          const data = await api.register(formData.name, formData.email, formData.password, recaptchaToken);
          if (data.success) {
            navigate('/verify-email', { state: { email: formData.email } });
          } else {
            toast.error(data.message);
          }
        } catch (err: any) { 
          toast.error(err.message || 'Registration failed'); 
        } finally { 
          setLoading(false); 
          submittedRef.current = false; 
        }
        return;
      } else {
        // LOGIN
        if (!formData.email || !formData.password) {
          toast.error('Email and password are required');
          setLoading(false);
          return;
        }
        submittedRef.current = true;
        try {
          const user = await login(formData.email, formData.password);
          toast.success(`Welcome back, ${user.name}`);
          const target = user.role === 'admin' && from === '/' ? '/admin' : from;
          navigate(target, { replace: true });
        } catch (err: any) {
          toast.error(err.message || 'Login failed');
        } finally {
          setLoading(false);
          submittedRef.current = false;
        }
        return;
      }
    }
    
    // Forgot Password
    if (view === 'forgot') {
      try {
        const data = await api.forgotPassword(formData.email);
        if (data.success) { 
          toast.success(data.message); 
          setTimer(120); 
          setCanResend(false); 
          setView('verify'); 
        } else {
          toast.error(data.message);
        }
      } catch (error: any) { 
        toast.error(error.message || 'Failed to send reset code'); 
      } finally { 
        setLoading(false); 
      }
    } 
    // Verify Code
    else if (view === 'verify') {
      try {
        const data = await api.verifyResetCode(formData.email, formData.code);
        if (data.success) {
          setView('reset');
        } else {
          toast.error(data.message);
        }
      } catch (error: any) { 
        toast.error(error.message || 'Verification failed'); 
      } finally { 
        setLoading(false); 
      }
    } 
    // Reset Password
    else if (view === 'reset') {
      if (formData.password !== formData.confirmPassword) { 
        toast.error('Passwords do not match'); 
        setLoading(false); 
        return; 
      }
      try {
        const data = await api.resetPassword(formData.email, formData.code, formData.password);
        if (data.success) { 
          toast.success(data.message); 
          setView('auth'); 
          setIsLogin(true); 
          setFormData({ ...formData, password: '', confirmPassword: '', code: '' }); 
        } else {
          toast.error(data.message);
        }
      } catch (error: any) { 
        toast.error(error.message || 'Failed to reset password'); 
      } finally { 
        setLoading(false); 
      }
    }
  };

  const renderHeader = () => {
    switch (view) {
      case 'forgot': return { title: 'Forgot Password', desc: 'Enter your email to receive a 6-digit reset code' };
      case 'verify': return { title: 'Verify Code', desc: `We've sent a code to ${formData.email}` };
      case 'reset': return { title: 'New Password', desc: 'Create a strong password for your account' };
      default: return { title: isLogin ? 'Welcome Back' : 'Join WAG', desc: isLogin ? 'Enter your credentials to access your account' : 'Create an account to start your culinary journey' };
    }
  };
  const header = renderHeader();

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-12 pt-12 bg-background/95">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-md relative">
        <Card className="glass border-white/10 shadow-2xl overflow-hidden">
          {view === 'auth' ? <button onClick={() => navigate('/')} className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors z-10"><X size={20} /></button> : <button onClick={() => setView(view === 'verify' ? 'forgot' : view === 'reset' ? 'verify' : 'auth')} className="absolute top-4 left-4 text-muted-foreground hover:text-white transition-colors z-10 flex items-center gap-1 text-xs"><ArrowLeft size={16} /> Back</button>}
          <CardHeader className="text-center pt-10 pb-6">
            <div className="flex justify-center mb-4"><div className="h-12 w-12 rounded-xl gold-gradient flex items-center justify-center shadow-lg">{view === 'auth' ? <ChefHat className="h-7 w-7 text-primary-foreground" /> : view === 'forgot' ? <Mail className="h-7 w-7 text-primary-foreground" /> : view === 'verify' ? <KeyRound className="h-7 w-7 text-primary-foreground" /> : <Lock className="h-7 w-7 text-primary-foreground" />}</div></div>
            <CardTitle className="text-2xl font-bold text-white">{header.title}</CardTitle>
            <CardDescription className="text-sm">{header.desc}</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <AnimatePresence mode="wait">
                {view === 'auth' && (<motion.div key="auth-fields" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3 }} className="space-y-5">
                  {!isLogin && (<div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" placeholder="Enter your name" required className="bg-muted/50 border-white/10" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>)}
                  <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="Your email" required className="bg-muted/50 border-white/10" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                  <div className="space-y-2"><Label htmlFor="password">Password</Label><div className="relative"><Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Your password" required className="bg-muted/50 border-white/10 pr-10" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{!isLogin && <p className="text-[10px] text-muted-foreground">Must be at least 8 characters</p>}</div>
                  <div className="flex items-center justify-between"><div className="flex items-center space-x-2"><Checkbox id="remember" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked as boolean)} className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" /><label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer select-none">Remember me</label></div>{isLogin && <button type="button" onClick={() => setView('forgot')} className="text-xs text-primary hover:underline">Forgot password?</button>}</div>
                  {!isLogin && (<div className="flex flex-col items-center gap-3 my-2"><ReCAPTCHA ref={recaptchaRef} sitekey={recaptchaSiteKey} onChange={handleRecaptchaChange} /><Button type="button" variant="ghost" size="sm" onClick={refreshRecaptcha} className="text-xs text-muted-foreground hover:text-primary"><RefreshCw className="h-3 w-3 mr-1" /> Refresh reCAPTCHA</Button></div>)}
                </motion.div>)}
                {view === 'forgot' && (<motion.div key="forgot-fields" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2"><Label htmlFor="forgot-email">Email Address</Label><Input id="forgot-email" type="email" placeholder="Your email" required className="bg-muted/50 border-white/10" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></motion.div>)}
                {view === 'verify' && (<motion.div key="verify-fields" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4"><div className="space-y-2"><Label htmlFor="code">6-Digit Code</Label><Input id="code" type="text" placeholder="XXXXXX" maxLength={6} required className="bg-muted/50 border-white/10 text-center text-2xl tracking-[0.5em] font-bold h-14" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.replace(/\D/g, '').slice(0, 6) })} /></div><div className="flex items-center justify-between text-sm"><div className="text-muted-foreground">{timer > 0 ? (<span>Code expires in: <span className="font-mono font-bold text-primary">{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</span></span>) : (<span className="text-red-400">Code expired</span>)}</div><button type="button" onClick={handleResendCode} disabled={!canResend || resendLoading} className={`text-xs font-medium transition-all ${canResend ? 'text-primary hover:underline' : 'text-muted-foreground cursor-not-allowed opacity-50'}`}>{resendLoading ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null}Resend code</button></div></motion.div>)}
                {view === 'reset' && (<motion.div key="reset-fields" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5"><div className="space-y-2"><Label htmlFor="new-password">New Password</Label><Input id="new-password" type="password" placeholder="New password" required className="bg-muted/50 border-white/10" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirm Password</Label><Input id="confirm-password" type="password" placeholder="Confirm password" required className="bg-muted/50 border-white/10" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} /></div></motion.div>)}
              </AnimatePresence>
              <Button type="submit" disabled={loading} className="w-full gold-gradient text-primary-foreground font-bold h-11 text-sm">{loading ? <Loader2 className="animate-spin mr-2" /> : null}{view === 'auth' ? (isLogin ? 'Sign In' : 'Create Account') : view === 'forgot' ? 'Send Reset Code' : view === 'verify' ? 'Verify Code' : 'Reset Password'}</Button>
            </form>
            {view === 'auth' && (<div className="mt-6 text-center"><button onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline transition-all">{isLogin ? "Don't have an account? Register" : "Already have an account? Login"}</button></div>)}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;