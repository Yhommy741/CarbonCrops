import { Component } from 'react'

/** Shows the crash instead of a blank white page when any screen throws while rendering. */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('CarbonCrops crashed:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="mb-2 text-xl font-semibold text-red-700">Something broke / เกิดข้อผิดพลาด</h1>
        <pre className="mb-4 overflow-auto whitespace-pre-wrap rounded-xl bg-red-50 p-3 text-xs text-red-800">
          {String(error?.stack || error)}
        </pre>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-xl bg-green-700 px-4 py-2 text-sm text-white"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
          <button
            type="button"
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm"
            onClick={() => {
              try {
                localStorage.removeItem('cc_token')
              } catch {
                // storage blocked
              }
              window.location.href = '/'
            }}
          >
            Sign out and reload
          </button>
        </div>
      </div>
    )
  }
}
