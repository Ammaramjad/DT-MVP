import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unknown error' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Fleet Dispatch] Render error:', error, info.componentStack)
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: '' })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="gatekeeper-fallback flex min-h-[100dvh] min-h-[100vh] min-h-[-webkit-fill-available] w-full flex-col items-center justify-center bg-[#030712] px-4 py-8 text-center text-slate-100"
          role="alert"
          data-testid="app-error-boundary"
        >
          <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-slate-950/90 p-6 shadow-xl">
            <h1 className="text-lg font-bold text-white">走瘋派車 · Fleet Dispatch</h1>
            <p className="mt-3 text-sm text-slate-300">
              Something went wrong loading this page. Please try again.
            </p>
            <p className="mt-1 text-xs text-slate-500">發生錯誤，請重新載入頁面。</p>
            {this.state.message ? (
              <p className="mt-3 break-all text-[10px] text-slate-600">{this.state.message}</p>
            ) : null}
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-sm font-bold text-white"
              data-testid="error-boundary-retry"
            >
              Reload / 重新載入
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
