import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Change this (e.g. to the page path) to clear the error when the user navigates. */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches a crash in one page so the rest of the app (sidebar, navigation)
 * keeps working, instead of the whole screen going white.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page crashed:", error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        <p className="font-semibold">Something went wrong on this page.</p>
        <p className="mt-1">The rest of the app still works. Try another page, or reload.</p>
        <p className="mt-3 font-mono text-xs opacity-80">{this.state.error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md border border-red-300 bg-white px-3 py-1.5 font-medium hover:bg-red-100"
        >
          Reload
        </button>
      </div>
    );
  }
}
