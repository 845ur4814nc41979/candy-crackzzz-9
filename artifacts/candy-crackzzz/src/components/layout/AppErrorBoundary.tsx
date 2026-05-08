import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Candy CrackZZZ app crash caught by error boundary.', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-xl w-full rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h1 className="text-2xl font-black mb-2">Candy CrackZZZ hit a loading error.</h1>
            <p className="text-muted-foreground mb-4">Try refresh, or check the browser console.</p>
            <Button onClick={this.handleRetry} className="mb-4">Retry / Reload</Button>
            {import.meta.env.DEV && this.state.error && (
              <pre className="whitespace-pre-wrap rounded-xl bg-muted p-4 text-xs overflow-auto max-h-80">
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}