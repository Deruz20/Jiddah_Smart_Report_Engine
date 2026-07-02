import React from 'react'
import { logger } from '@/lib/logger'

interface State {
  hasError: boolean
  error?: unknown
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error }
  }

  componentDidCatch(error: unknown, info: unknown) {
    logger.error('Uncaught render error', { error, info })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Something went wrong</h2>
          <p>We're sorry — an unexpected error occurred. You can try again.</p>
          <button onClick={this.handleRetry}>Try Again</button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
