'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function ResultsPage() {
  const params = useParams()
  const resultId = params.id as string
  
  const [results, setResults] = useState<{
    html: string;
    sitecoreFields: string;
    component: string;
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const MAX_RETRIES = 20 // 1 minute with 3-second intervals

  useEffect(() => {
    console.log('Results page loaded with ID:', resultId)
    
    // Check if results are already in localStorage
    const storedResults = localStorage.getItem('results')
    if (storedResults) {
      console.log('Found results in localStorage')
      try {
        const parsedResults = JSON.parse(storedResults)
        setResults(parsedResults)
        setLoading(false)
        return
      } catch (error) {
        console.error('Error parsing stored results:', error)
        localStorage.removeItem('results')
      }
    }
    
    // Start polling for results
    startPolling()
    
    // Clean up polling interval on unmount
    return () => {
      if (pollingInterval) {
        console.log('Cleaning up polling interval')
        clearInterval(pollingInterval)
      }
    }
  }, [resultId])

  const startPolling = () => {
    console.log('Starting polling for result ID:', resultId)
    
    // Clear any existing interval
    if (pollingInterval) {
      console.log('Clearing existing polling interval')
      clearInterval(pollingInterval)
    }

    // Reset retry count
    setRetryCount(0)

    // Start polling every 3 seconds
    const interval = setInterval(async () => {
      try {
        console.log('Polling for results, attempt:', retryCount + 1)
        
        // Check results API
        const response = await fetch(`/api/results/${resultId}`)
        console.log('Poll response status:', response.status)
        
        if (!response.ok) {
          console.error('Poll response not OK:', response.status, response.statusText)
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('Poll response data:', data)
        
        if (data.success && data.results && data.results.html !== 'Processing...') {
          // Results are ready
          console.log('Results are ready')
          clearInterval(interval)
          setResults(data.results)
          setLoading(false)
          setPollingInterval(null)
        } else {
          // Increment retry count
          setRetryCount(prev => {
            const newCount = prev + 1
            console.log('Incrementing retry count to:', newCount)
            
            if (newCount >= MAX_RETRIES) {
              // Stop polling after max retries
              console.log('Max retries reached, stopping polling')
              clearInterval(interval)
              setLoading(false)
              setError('Processing timed out. Please try again.')
            }
            return newCount
          })
        }
      } catch (error) {
        console.error('Error polling for results:', error)
        // Don't stop polling on error, let it retry
      }
    }, 3000)

    setPollingInterval(interval)
  }

  const retryPolling = () => {
    setError(null)
    setLoading(true)
    startPolling()
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Results</h1>
          <Link href="/" className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
            Back to Converter
          </Link>
        </div>

        {loading ? (
          <div className="p-8 bg-gray-100 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Processing your request...</h2>
            <p className="mb-4">Your request is being processed. This may take a minute or two.</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full animate-pulse" 
                style={{ width: `${(retryCount / MAX_RETRIES) * 100}%` }}
              ></div>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Attempt {retryCount} of {MAX_RETRIES}
            </p>
          </div>
        ) : error ? (
          <div className="p-8 bg-red-100 text-red-700 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Error</h2>
            <p className="mb-4">{error}</p>
            <button
              onClick={retryPolling}
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        ) : results ? (
          <div className="space-y-8">
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">HTML</h2>
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                <code>{results.html}</code>
              </pre>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Sitecore Fields</h2>
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                <code>{results.sitecoreFields}</code>
              </pre>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Component</h2>
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                <code>{results.component}</code>
              </pre>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  )
} 