import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: '40px 20px',
            maxWidth: '600px',
            margin: '0 auto',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}
          >
            ⚠️
          </div>
          <h2
            style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#212529',
              marginBottom: '12px'
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              fontSize: '16px',
              color: '#6c757d',
              marginBottom: '24px',
              lineHeight: '1.5'
            }}
          >
            We encountered an unexpected error. Please try refreshing the page.
          </p>
          {this.state.error && (
            <details
              style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                textAlign: 'left',
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#495057'
              }}
            >
              <summary style={{ cursor: 'pointer', marginBottom: '8px', fontWeight: '600' }}>
                Error Details
              </summary>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.error.toString()}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '24px',
              padding: '12px 24px',
              backgroundColor: '#b794f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9b72cf'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#b794f6'}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
