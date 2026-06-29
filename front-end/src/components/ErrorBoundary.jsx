import { Component } from 'react';
import { Link } from 'react-router-dom';

/**
 * Error Boundary — catches unhandled render errors and shows a fallback UI
 * instead of a blank white screen. Place near the top of the component tree.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="content-area error-404">
          <div className="container">
            <div className="error-404-content">
              <span className="error-code">:(</span>
              <h1>Something went wrong</h1>
              <p>An unexpected error occurred while rendering this page.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
                <button className="btn btn-accent" onClick={this.handleReset}>
                  Try Again
                </button>
                <Link to="/" className="btn btn-outline">
                  Back to Home
                </Link>
              </div>
              {this.state.error?.message && (
                <p style={{ marginTop: 24, fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                  {this.state.error.message}
                </p>
              )}
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}