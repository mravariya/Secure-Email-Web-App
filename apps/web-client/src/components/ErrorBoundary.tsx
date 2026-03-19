'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught:', error.message, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-[200px] flex items-center justify-center p-6 text-zinc-400">
            <div className="text-center">
              <p className="font-medium text-zinc-300">Something went wrong</p>
              <p className="text-sm mt-1">Try refreshing the page.</p>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
