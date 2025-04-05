import { v4 as uuidv4 } from 'uuid'

// Define the structure of a generated result
interface GeneratedResult {
  html: string;
  sitecoreFields: string;
  component: string;
  timestamp: number;
}

// In-memory storage for local development
const resultsStorage: Record<string, GeneratedResult> = {};

// Generate a unique ID for each result set
export function generateResultId(): string {
  return uuidv4()
}

// Store results with the given ID
export async function storeResults(id: string, results: Omit<GeneratedResult, 'timestamp'>): Promise<void> {
  try {
    resultsStorage[id] = {
      ...results,
      timestamp: Date.now()
    }
    
    console.log(`Stored results with ID: ${id}`)
  } catch (error) {
    console.error('Error storing results:', error)
    // Continue execution even if storage fails
  }
}

// Get results by ID
export async function getResults(id: string): Promise<GeneratedResult | null> {
  try {
    const result = resultsStorage[id]
    
    if (!result) {
      return null
    }
    
    // Check if the result has expired (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    if (result.timestamp < oneHourAgo) {
      delete resultsStorage[id]
      return null
    }
    
    return result
  } catch (error) {
    console.error('Error retrieving results:', error)
    return null
  }
}

// Clean up old results (older than 1 hour)
export async function cleanupOldResults(): Promise<void> {
  try {
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    
    Object.keys(resultsStorage).forEach(id => {
      if (resultsStorage[id].timestamp < oneHourAgo) {
        delete resultsStorage[id]
      }
    })
  } catch (error) {
    console.error('Error cleaning up results:', error)
  }
}

// Run cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupOldResults, 60 * 60 * 1000)
}

// Run cleanup on startup
cleanupOldResults() 