import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Prevents a rendering bug in one screen from blanking the whole app. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="content">
        <div className="card" style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
          <h2>Đã xảy ra lỗi hiển thị</h2>
          <p style={{ color: 'var(--color-muted)', margin: '10px 0 20px' }}>
            Ứng dụng gặp sự cố không mong muốn. Hãy tải lại trang để tiếp tục.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Tải lại trang
          </button>
        </div>
      </div>
    );
  }
}
