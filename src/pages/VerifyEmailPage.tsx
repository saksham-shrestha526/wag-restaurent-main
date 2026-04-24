import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Clock, Mail, ArrowLeft, X } from 'lucide-react';

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as any)?.email || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [canResend, setCanResend] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!email) {
      // No email, redirect to login
      navigate('/login');
      return;
    }
    startTimer();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [email, navigate]);

  const startTimer = () => {
    setTimeLeft(120);
    setCanResend(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code || code.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Email verified! You can now log in.');
        navigate('/login');
      } else {
        toast.error(data.message || 'Invalid code');
      }
    } catch (err) {
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) {
      toast.error(`Please wait ${formatTime(timeLeft)} before requesting another code`);
      return;
    }
    setResendLoading(true);
    try {
      const res = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('New verification code sent!');
        startTimer();
        setCode('');
        inputRef.current?.focus();
      } else {
        toast.error(data.message || 'Failed to resend code');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setResendLoading(false);
    }
  };

  useEffect(() => {
    if (code.length === 6) {
      handleVerify();
    }
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass border-white/10 rounded-2xl p-8 shadow-2xl relative">
          {/* Back arrow – go to login (one step back) */}
          <button
            onClick={() => navigate('/login')}
            className="absolute top-4 left-4 text-muted-foreground hover:text-white transition-colors z-10 flex items-center gap-1 text-sm"
          >
            <ArrowLeft size={18} /> Back to Login
          </button>

          {/* Cross icon – close and go to login */}
          <button
            onClick={() => navigate('/login')}
            className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors z-10"
          >
            <X size={20} />
          </button>

          <div className="text-center mb-8">
            <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Verify Your Email</h1>
            <p className="text-muted-foreground text-sm mt-2">
              We sent a 6‑digit code to <strong>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="XXXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-widest font-mono h-14"
                autoFocus
                ref={inputRef}
              />
              <p className="text-xs text-muted-foreground text-center">Enter the 6‑digit code sent to your email</p>
            </div>

            <Button type="submit" disabled={loading} className="w-full gold-gradient h-12 font-bold">
              {loading ? <Loader2 className="animate-spin mr-2" /> : null}
              Verify Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              {timeLeft > 0 ? (
                <span>Code expires in <span className="font-mono font-bold text-primary">{formatTime(timeLeft)}</span></span>
              ) : (
                <span className="text-red-500">Code expired</span>
              )}
            </div>
            <Button
              variant="ghost"
              onClick={handleResend}
              disabled={resendLoading || (!canResend && timeLeft > 0)}
              className="text-primary hover:text-primary/80"
            >
              {resendLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              Send new code
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmailPage;