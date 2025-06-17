import React from 'react'

export default function LoadingSpinner() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-16 w-16 sm:h-24 sm:w-24 md:h-32 md:w-32 border-b-2 border-gray-900"></div>
    </div>
  )
} 