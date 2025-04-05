import { v4 as uuidv4 } from 'uuid'
import { put, list, del } from '@vercel/blob'
import fs from 'fs'
import path from 'path'

// Define the structure of a generated result
interface GeneratedResult {
  html: string;
  sitecoreFields: string;
  component: string;
  timestamp: number;
}

// Generate a unique ID for each result set
export function generateResultId(): string {
  const id = uuidv4()
  console.log('Generated result ID:', id)
  return id
}

// Store results with the given ID
export async function storeResults(id: string, results: Omit<GeneratedResult, 'timestamp'>): Promise<void> {
  try {
    console.log('Storing results for ID:', id)
    console.log('Results to store:', {
      htmlLength: results.html.length,
      sitecoreFieldsLength: results.sitecoreFields.length,
      componentLength: results.component.length
    })
    
    const data = {
      ...results,
      timestamp: Date.now()
    }
    
    // Check if BLOB_READ_WRITE_TOKEN is available
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN
    console.log('BLOB_READ_WRITE_TOKEN available:', hasBlobToken)
    
    if (hasBlobToken) {
      // Store the results in Vercel Blob
      console.log('Storing data in Vercel Blob')
      const blob = await put(`results/${id}.json`, JSON.stringify(data), {
        access: 'public',
        addRandomSuffix: false
      })
      
      console.log(`Stored results with ID: ${id} at URL: ${blob.url}`)
    } else {
      // Use local file storage for development
      console.log('Using local file storage for development')
      
      // Ensure the storage directory exists
      const storageDir = path.join(process.cwd(), 'storage')
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true })
      }
      
      // Write the results to a file
      const filePath = path.join(storageDir, `${id}.json`)
      fs.writeFileSync(filePath, JSON.stringify(data))
      
      console.log(`Stored results with ID: ${id} at local path: ${filePath}`)
    }
  } catch (error) {
    console.error('Error storing results:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack)
    }
    throw error // Propagate the error to handle it in the API route
  }
}

// Get results by ID
export async function getResults(id: string): Promise<GeneratedResult | null> {
  try {
    console.log('Getting results for ID:', id)
    
    // Check if BLOB_READ_WRITE_TOKEN is available
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN
    console.log('BLOB_READ_WRITE_TOKEN available:', hasBlobToken)
    
    if (hasBlobToken) {
      // Get the results from Vercel Blob
      console.log('Listing blobs with prefix:', `results/${id}.json`)
      const { blobs } = await list({ prefix: `results/${id}.json` })
      console.log('Blobs found:', blobs.length)
      
      if (!blobs || blobs.length === 0) {
        console.log('No blobs found for ID:', id)
        return null
      }
      
      console.log('Fetching blob from URL:', blobs[0].url)
      const response = await fetch(blobs[0].url)
      
      if (!response.ok) {
        console.error('Error fetching blob:', response.status, response.statusText)
        return null
      }
      
      const result = await response.json() as GeneratedResult
      
      // Check if the result has expired (older than 1 hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      if (result.timestamp < oneHourAgo) {
        console.log('Result expired, deleting blob')
        await del(blobs[0].url)
        return null
      }
      
      console.log('Result retrieved successfully:', {
        htmlLength: result.html.length,
        sitecoreFieldsLength: result.sitecoreFields.length,
        componentLength: result.component.length,
        timestamp: new Date(result.timestamp).toISOString()
      })
      
      return result
    } else {
      // Use local file storage for development
      console.log('Using local file storage for development')
      
      const storageDir = path.join(process.cwd(), 'storage')
      const filePath = path.join(storageDir, `${id}.json`)
      
      if (!fs.existsSync(filePath)) {
        console.log('No file found for ID:', id)
        return null
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const result = JSON.parse(fileContent) as GeneratedResult
      
      // Check if the result has expired (older than 1 hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      if (result.timestamp < oneHourAgo) {
        console.log('Result expired, deleting file')
        fs.unlinkSync(filePath)
        return null
      }
      
      console.log('Result retrieved successfully:', {
        htmlLength: result.html.length,
        sitecoreFieldsLength: result.sitecoreFields.length,
        componentLength: result.component.length,
        timestamp: new Date(result.timestamp).toISOString()
      })
      
      return result
    }
  } catch (error) {
    console.error('Error retrieving results:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack)
    }
    return null
  }
}

// Clean up old results (older than 1 hour)
export async function cleanupOldResults(): Promise<void> {
  try {
    console.log('Starting cleanup of old results')
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    
    // Check if BLOB_READ_WRITE_TOKEN is available
    console.log('BLOB_READ_WRITE_TOKEN available:', !!process.env.BLOB_READ_WRITE_TOKEN)
    
    // List all results
    console.log('Listing all blobs with prefix: results/')
    const { blobs } = await list({ prefix: 'results/' })
    console.log('Total blobs found:', blobs.length)
    
    // Delete expired results
    let deletedCount = 0
    for (const blob of blobs) {
      try {
        console.log('Fetching blob from URL:', blob.url)
        const response = await fetch(blob.url)
        
        if (!response.ok) {
          console.error('Error fetching blob:', response.status, response.statusText)
          continue
        }
        
        const result = await response.json() as GeneratedResult
        
        if (result.timestamp < oneHourAgo) {
          console.log('Deleting expired blob:', blob.url)
          await del(blob.url)
          deletedCount++
        }
      } catch (error) {
        console.error('Error processing blob during cleanup:', error)
        if (error instanceof Error) {
          console.error('Error details:', error.message, error.stack)
        }
      }
    }
    
    console.log(`Cleanup completed. Deleted ${deletedCount} expired results.`)
  } catch (error) {
    console.error('Error cleaning up results:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack)
    }
  }
}

// Run cleanup on startup
cleanupOldResults()

// List all results
export async function listResults(): Promise<{ id: string; timestamp: number }[]> {
  try {
    console.log('Listing all results')
    
    // Check if BLOB_READ_WRITE_TOKEN is available
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN
    console.log('BLOB_READ_WRITE_TOKEN available:', hasBlobToken)
    
    if (hasBlobToken) {
      // Get the results from Vercel Blob
      console.log('Listing blobs with prefix:', 'results/')
      const { blobs } = await list({ prefix: 'results/' })
      console.log('Blobs found:', blobs.length)
      
      if (!blobs || blobs.length === 0) {
        console.log('No blobs found')
        return []
      }
      
      // Extract IDs from blob URLs
      const results = blobs.map(blob => {
        const id = blob.url.split('/').pop()?.replace('.json', '') || ''
        return { id, timestamp: blob.uploadedAt.getTime() }
      })
      
      console.log('Results retrieved successfully:', results.length)
      
      return results
    } else {
      // Use local file storage for development
      console.log('Using local file storage for development')
      
      const storageDir = path.join(process.cwd(), 'storage')
      
      if (!fs.existsSync(storageDir)) {
        console.log('Storage directory not found')
        return []
      }
      
      const files = fs.readdirSync(storageDir)
      console.log('Files found:', files.length)
      
      // Extract IDs from filenames
      const results = files
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const id = file.replace('.json', '')
          const filePath = path.join(storageDir, file)
          const stats = fs.statSync(filePath)
          return { id, timestamp: stats.mtimeMs }
        })
      
      console.log('Results retrieved successfully:', results.length)
      
      return results
    }
  } catch (error) {
    console.error('Error listing results:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack)
    }
    return []
  }
} 