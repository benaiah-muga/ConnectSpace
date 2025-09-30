'use client'

import { useEffect } from 'react'

export function GlobalErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Handle clipboard errors specifically
      if (event.error?.message?.includes('Clipboard') || 
          event.error?.message?.includes('writeText')) {
        console.warn('Clipboard API blocked or unavailable:', event.error?.message)
        event.preventDefault()
        return false
      }
      
      // Handle other errors
      console.error('Global error:', event.error)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
      event.preventDefault()
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return null
}