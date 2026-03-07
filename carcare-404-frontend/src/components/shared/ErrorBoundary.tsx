"use client";

import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("UI error", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="panel p-8 text-center">
          <p className="text-base font-semibold text-[var(--text-primary)]">Something went wrong</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Please refresh the page.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
