'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

// Add type definition for ConversionResult
interface ConversionResult {
  id: string;
  componentName: string;
  html: string;
  component: string;
  sitecoreFields: string;
  timestamp: string;
}

export default function ResultsPage() {
  const params = useParams()
  const resultId = params.id as string
  
  const [results, setResults] = useState<{
    html: string;
    sitecoreFields: string;
    component: {
      componentName: string;
      componentData: string;
    };
    componentName?: string;
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const MAX_RETRIES = 20 // 1 minute with 3-second intervals

  const processApiData = (data: any) => {
    return {
      html: typeof data.html === 'string' ? data.html : JSON.stringify(data.html),
      sitecoreFields: typeof data.sitecoreFields === 'string' 
        ? data.sitecoreFields 
        : JSON.stringify(data.sitecoreFields),
      component: {
        componentName: data.component?.componentName || '',
        componentData: typeof data.component?.componentData === 'string'
          ? data.component.componentData
          : typeof data.component === 'string'
            ? data.component
            : JSON.stringify(data.component)
      },
      componentName: data.component?.componentName || ''
    }
  }

  useEffect(() => {
    console.log('Results page loaded with ID:', resultId)
    
    // Check if results are already in localStorage
    const storedResults = localStorage.getItem('results')
    if (storedResults) {
      console.log('Found results in localStorage')
      try {
        const parsedResults = JSON.parse(storedResults)
        setResults(processApiData(parsedResults))
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
          setResults(processApiData(data.results))
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

  const fetchResults = async () => {
    try {
      setLoading(true)
      setError('')

      const [htmlResponse, sitecoreFieldsResponse, componentResponse] = await Promise.all([
        fetch(`/api/html/${resultId}`),
        fetch(`/api/sitecore-fields/${resultId}`),
        fetch(`/api/component/${resultId}`)
      ])

      const [htmlData, sitecoreFieldsData, componentData] = await Promise.all([
        htmlResponse.json(),
        sitecoreFieldsResponse.json(),
        componentResponse.json()
      ])

      if (htmlResponse.status === 404 || sitecoreFieldsResponse.status === 404 || componentResponse.status === 404) {
        throw new Error('Results not found')
      }

      if (htmlResponse.status !== 200 || sitecoreFieldsResponse.status !== 200 || componentResponse.status !== 200) {
        throw new Error('Failed to fetch results')
      }

      setResults(processApiData({
        html: htmlData.html,
        sitecoreFields: sitecoreFieldsData.sitecoreFields,
        component: {
          componentName: componentData.componentName,
          componentData: componentData.componentData
        }
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Add API URL display component
  const ApiUrlDisplay = ({ url, title }: { url: string; title: string }) => (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
      <div className="flex items-center space-x-2">
        <code className="text-sm bg-gray-100 p-2 rounded flex-1 overflow-x-auto">
          {url}
        </code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(url);
            // You could add a toast notification here
          }}
          className="p-2 text-gray-500 hover:text-gray-700"
          title="Copy to clipboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
          </svg>
        </button>
      </div>
    </div>
  );

  // Add CSV download button component
  const CsvDownloadButton = ({ resultId }: { resultId: string }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const handleDownload = async (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDownloading(true);
      setDownloadError(null);

      try {
        const response = await fetch(`/api/sitecore-fields/${resultId}?format=csv`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to download CSV');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sitecore-fields-${resultId}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Error downloading CSV:', error);
        setDownloadError(error instanceof Error ? error.message : 'Failed to download CSV');
      } finally {
        setIsDownloading(false);
      }
    };

    return (
      <div>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {isDownloading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Downloading...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download CSV
            </>
          )}
        </button>
        {downloadError && (
          <p className="text-red-500 text-xs mt-1">{downloadError}</p>
        )}
      </div>
    );
  };

  // Update the ResultCard component
  const ResultCard = ({ result }: { result: ConversionResult }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'html' | 'component' | 'sitecore'>('html');
    const apiUrl = `${window.location.origin}/api/sitecore-fields/${result.id}`;

    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    };

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {result.componentName || 'Unnamed Component'}
              </h2>
              <p className="text-sm text-gray-500">
                Generated on {new Date(result.timestamp).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(result.html)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {isCopied ? 'Copied!' : 'Copy HTML'}
            </button>
          </div>

          {/* API URL Display */}
          <ApiUrlDisplay url={apiUrl} title="Component API URL" />

          {/* Tabs */}
          <div className="border-b border-gray-200 mt-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('html')}
                className={`${
                  activeTab === 'html'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                HTML
              </button>
              <button
                onClick={() => setActiveTab('component')}
                className={`${
                  activeTab === 'component'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                React Component
              </button>
              <button
                onClick={() => setActiveTab('sitecore')}
                className={`${
                  activeTab === 'sitecore'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Sitecore Fields
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="mt-4">
            {activeTab === 'html' && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">{result.html}</pre>
              </div>
            )}
            {activeTab === 'component' && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">{result.component}</pre>
              </div>
            )}
            {activeTab === 'sitecore' && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">{result.sitecoreFields}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Generated Results</h1>
        
        {loading && <p>Loading results...</p>}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {results && (
          <div className="space-y-8">
            {/* Component Section */}
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Component: {results.component.componentName}</h2>
              
              {/* Component API URL */}
              <ApiUrlDisplay 
                url={`${window.location.origin}/api/component/${resultId}`} 
                title="Component API URL" 
              />
              
              <div className="mt-4 bg-gray-100 p-4 rounded-md overflow-x-auto">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {typeof results.component.componentData === 'string' 
                    ? results.component.componentData 
                    : JSON.stringify(results.component.componentData, null, 2)}
                </pre>
              </div>
            </div>

            {/* HTML Section */}
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">HTML</h2>
              
              {/* HTML API URL */}
              <ApiUrlDisplay 
                url={`${window.location.origin}/api/html/${resultId}`} 
                title="HTML API URL" 
              />
              
              <div className="mt-4 bg-gray-100 p-4 rounded-md overflow-x-auto">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {typeof results.html === 'string' 
                    ? results.html 
                    : JSON.stringify(results.html, null, 2)}
                </pre>
              </div>
            </div>

            {/* Sitecore Fields Section */}
            <div className="p-6 bg-white rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Sitecore Fields</h2>
                <CsvDownloadButton resultId={resultId} />
              </div>
              
              {/* Sitecore Fields API URL */}
              <ApiUrlDisplay 
                url={`${window.location.origin}/api/sitecore-fields/${resultId}`} 
                title="Sitecore Fields API URL" 
              />
              
              <div className="mt-4 bg-gray-100 p-4 rounded-md overflow-x-auto">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {typeof results.sitecoreFields === 'string' 
                    ? results.sitecoreFields 
                    : JSON.stringify(results.sitecoreFields, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
} 