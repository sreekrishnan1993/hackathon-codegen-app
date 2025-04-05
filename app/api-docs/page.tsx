'use client'

import Link from 'next/link'

export default function ApiDocs() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">API Documentation</h1>
          <Link href="/" className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
            Back to Converter
          </Link>
        </div>

        <div className="space-y-8">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Available Endpoints</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium mb-2">Convert Design to Code</h3>
                <div className="bg-gray-100 p-4 rounded">
                  <p className="font-mono mb-2">POST /api/convert</p>
                  <p className="mb-2">Converts a Figma design or image to HTML, Sitecore fields, and a NextJS component.</p>
                  
                  <h4 className="font-medium mt-4 mb-2">Request Body (FormData):</h4>
                  <ul className="list-disc pl-5 mb-2">
                    <li><code>prompt</code> (required): Description of what to generate</li>
                    <li><code>figmaUrl</code> (optional): URL to a Figma design</li>
                    <li><code>image</code> (optional): Image file of the design</li>
                  </ul>
                  
                  <h4 className="font-medium mt-4 mb-2">Response:</h4>
                  <pre className="bg-gray-200 p-2 rounded overflow-auto">
{`{
  "success": true,
  "resultId": "unique-id",
  "results": {
    "html": "...",
    "sitecoreFields": "...",
    "component": "..."
  }
}`}
                  </pre>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-medium mb-2">Get Results</h3>
                <div className="bg-gray-100 p-4 rounded">
                  <p className="font-mono mb-2">GET /api/results/{'{id}'}</p>
                  <p className="mb-2">Retrieves the results for a specific conversion.</p>
                  
                  <h4 className="font-medium mt-4 mb-2">URL Parameters:</h4>
                  <ul className="list-disc pl-5 mb-2">
                    <li><code>id</code>: The result ID returned from the convert endpoint</li>
                  </ul>
                  
                  <h4 className="font-medium mt-4 mb-2">Response:</h4>
                  <pre className="bg-gray-200 p-2 rounded overflow-auto">
{`{
  "success": true,
  "results": {
    "html": "...",
    "sitecoreFields": "...",
    "component": "...",
    "timestamp": 1234567890
  }
}`}
                  </pre>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-medium mb-2">Get HTML</h3>
                <div className="bg-gray-100 p-4 rounded">
                  <p className="font-mono mb-2">GET /api/html/{'{id}'}</p>
                  <p className="mb-2">Retrieves just the HTML result for a specific conversion.</p>
                  
                  <h4 className="font-medium mt-4 mb-2">URL Parameters:</h4>
                  <ul className="list-disc pl-5 mb-2">
                    <li><code>id</code>: The result ID returned from the convert endpoint</li>
                  </ul>
                  
                  <h4 className="font-medium mt-4 mb-2">Response:</h4>
                  <pre className="bg-gray-200 p-2 rounded overflow-auto">
{`{
  "success": true,
  "html": "..."
}`}
                  </pre>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-medium mb-2">Get Sitecore Fields</h3>
                <div className="bg-gray-100 p-4 rounded">
                  <p className="font-mono mb-2">GET /api/sitecore-fields/{'{id}'}</p>
                  <p className="mb-2">Retrieves just the Sitecore fields result for a specific conversion.</p>
                  
                  <h4 className="font-medium mt-4 mb-2">URL Parameters:</h4>
                  <ul className="list-disc pl-5 mb-2">
                    <li><code>id</code>: The result ID returned from the convert endpoint</li>
                  </ul>
                  
                  <h4 className="font-medium mt-4 mb-2">Response:</h4>
                  <pre className="bg-gray-200 p-2 rounded overflow-auto">
{`{
  "success": true,
  "sitecoreFields": "..."
}`}
                  </pre>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-medium mb-2">Get Component</h3>
                <div className="bg-gray-100 p-4 rounded">
                  <p className="font-mono mb-2">GET /api/component/{'{id}'}</p>
                  <p className="mb-2">Retrieves just the component result for a specific conversion.</p>
                  
                  <h4 className="font-medium mt-4 mb-2">URL Parameters:</h4>
                  <ul className="list-disc pl-5 mb-2">
                    <li><code>id</code>: The result ID returned from the convert endpoint</li>
                  </ul>
                  
                  <h4 className="font-medium mt-4 mb-2">Response:</h4>
                  <pre className="bg-gray-200 p-2 rounded overflow-auto">
{`{
  "success": true,
  "component": "..."
}`}
                  </pre>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-medium mb-2">Get All Results</h3>
                <div className="bg-gray-100 p-4 rounded">
                  <p className="font-mono mb-2">GET /api/all</p>
                  <p className="mb-2">Retrieves all available results (limited to the most recent 10).</p>
                  
                  <h4 className="font-medium mt-4 mb-2">Response:</h4>
                  <pre className="bg-gray-200 p-2 rounded overflow-auto">
{`{
  "success": true,
  "results": [
    {
      "id": "unique-id-1",
      "html": "...",
      "sitecoreFields": "...",
      "component": "...",
      "timestamp": 1234567890
    },
    {
      "id": "unique-id-2",
      "html": "...",
      "sitecoreFields": "...",
      "component": "...",
      "timestamp": 1234567891
    }
  ]
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
} 