import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white p-8 bg-[url('https://picsum.photos/seed/elegant-error/1920/1080?blur=10')] bg-cover">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
          <div className="relative z-10 max-w-md w-full bg-[#0A0A0A]/40 backdrop-blur-xl p-12 rounded-[2.5rem] border border-white/5 text-center space-y-8 shadow-2xl">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-primary/20">
              <AlertCircle className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-serif font-bold text-white tracking-tight">Something went wrong</h1>
              <p className="text-muted-foreground text-base leading-relaxed font-light">
                Our digital concierge has encountered an unexpected interruption. We are working to restore your experience.
              </p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-mono text-primary/60 break-all text-left overflow-auto max-h-32 custom-scrollbar">
              {this.state.error?.message || 'Unknown constitutional error'}
            </div>
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full h-14 gold-gradient text-black font-bold rounded-2xl shadow-lg transform transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
