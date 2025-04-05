'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const [figmaUrl, setFigmaUrl] = useState('')
  const [prompt, setPrompt] = useState('')
  const [componentName, setComponentName] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resultId, setResultId] = useState('')
  const [results, setResults] = useState<{
    html: string;
    sitecoreFields: string;
    component: {
      componentName: string;
      componentData: string;
    };
    componentName?: string;
  } | null>(null)
  const router = useRouter()

  // Clear any stored result ID on page load to ensure a fresh start
  useEffect(() => {
    console.log('Clearing stored result ID on page load')
    localStorage.removeItem('resultId')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResults(null)
    
    if (!componentName) {
      setError('Component name is required')
      setLoading(false)
      return
    }
    
    console.log('Form submitted with:', { 
      figmaUrl, 
      prompt, 
      componentName,
      hasImage: !!image 
    })

    try {
      const formData = new FormData()
      if (figmaUrl) formData.append('figmaUrl', figmaUrl)
      if (prompt) formData.append('prompt', prompt)
      if (componentName) formData.append('componentName', componentName)
      if (image) formData.append('image', image)

      console.log('Sending request to /api/convert')
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      })

      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error:', errorData)
        throw new Error(errorData.error || 'Failed to convert design')
      }

      const data = await response.json()
      console.log('API response:', data)

      if (data.success && data.resultId) {
        console.log('Storing result ID:', data.resultId)
        localStorage.setItem('resultId', data.resultId)
        
        // If results are already available, process and store them
        if (data.results) {
          console.log('Results already available, processing them')
          const processedResults = {
            html: typeof data.results.html === 'string' ? data.results.html : JSON.stringify(data.results.html),
            sitecoreFields: typeof data.results.sitecoreFields === 'string' 
              ? data.results.sitecoreFields 
              : JSON.stringify(data.results.sitecoreFields),
            component: {
              componentName: data.results.component?.componentName || componentName,
              componentData: typeof data.results.component?.componentData === 'string'
                ? data.results.component.componentData
                : typeof data.results.component === 'string'
                  ? data.results.component
                  : JSON.stringify(data.results.component)
            },
            componentName: data.results.component?.componentName || componentName
          }
          localStorage.setItem('results', JSON.stringify(processedResults))
          setResults(processedResults)
        }
        
        setResultId(data.resultId)
        router.push(`/results/${data.resultId}`)
      } else {
        throw new Error('No result ID returned from API')
      }
    } catch (err) {
      console.error('Error in form submission:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Figma to Sitecore Converter</h1>
          <Link href="/api-docs" className="text-blue-500 hover:text-blue-700">
            API Documentation
          </Link>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="componentName" className="block text-sm font-medium text-gray-700 mb-2">
              Component Name *
            </label>
            <input
              type="text"
              id="componentName"
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="MyComponent"
              required
            />
          </div>

          <div>
            <label htmlFor="figmaUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Figma URL (optional)
            </label>
            <input
              type="text"
              id="figmaUrl"
              value={figmaUrl}
              onChange={(e) => setFigmaUrl(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.figma.com/file/..."
            />
          </div>

          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
              Upload Image (optional)
            </label>
            <input
              type="file"
              id="image"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              accept="image/*"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Instructions (optional)
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Add any specific requirements or instructions for the component generation..."
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {loading ? 'Converting...' : 'Convert Design'}
          </button>
        </form>

        {results && (
          <div className="mt-8 space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Generated Component: {results.component.componentName}</h2>
              <div className="bg-gray-100 p-4 rounded-md">
                <pre className="whitespace-pre-wrap">{results.component.componentData}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
} 