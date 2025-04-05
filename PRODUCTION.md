# Production Setup Guide

This guide provides instructions for setting up your Figma to Sitecore Converter application for production use, including database integration for persistent storage.

## Database Integration

The current implementation uses in-memory storage, which is suitable for development but not for production. For production, you should use a persistent database solution.

### Option 1: Vercel KV (Redis)

[Vercel KV](https://vercel.com/docs/storage/vercel-kv) is a Redis-compatible key-value database that integrates seamlessly with Vercel deployments.

1. Install the Vercel KV package:
   ```bash
   npm install @vercel/kv
   ```

2. Create a KV database in the Vercel dashboard:
   - Go to the Vercel dashboard
   - Select your project
   - Go to Storage > KV
   - Create a new KV database

3. Update your storage implementation:

```typescript
// app/lib/storage.ts
import { kv } from '@vercel/kv'
import { v4 as uuidv4 } from 'uuid'

// Define the structure of a generated result
interface GeneratedResult {
  html: string;
  sitecoreFields: string;
  component: string;
  timestamp: number;
}

// Generate a unique ID for each result set
export function generateResultId(): string {
  return uuidv4()
}

// Store results with the given ID
export async function storeResults(id: string, results: Omit<GeneratedResult, 'timestamp'>): Promise<void> {
  const data: GeneratedResult = {
    ...results,
    timestamp: Date.now()
  }
  
  await kv.set(`result:${id}`, data)
}

// Get results by ID
export async function getResults(id: string): Promise<GeneratedResult | null> {
  const result = await kv.get<GeneratedResult>(`result:${id}`)
  
  if (!result) {
    return null
  }
  
  // Check if the result has expired (older than 1 hour)
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  if (result.timestamp < oneHourAgo) {
    await kv.del(`result:${id}`)
    return null
  }
  
  return result
}

// Clean up old results (older than 1 hour)
export async function cleanupOldResults(): Promise<void> {
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  
  // Note: This is a simplified approach. For a production app, you might want to use
  // a more efficient way to find and delete expired keys.
  const keys = await kv.keys('result:*')
  
  for (const key of keys) {
    const result = await kv.get<GeneratedResult>(key)
    if (result && result.timestamp < oneHourAgo) {
      await kv.del(key)
    }
  }
}
```

4. Update your API routes to use the async functions:

```typescript
// app/api/results/[id]/html/route.ts
import { NextResponse } from 'next/server'
import { getResults } from '@/app/lib/storage'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Result ID is required' },
        { status: 400 }
      )
    }

    const results = await getResults(id)
    
    if (!results) {
      return NextResponse.json(
        { success: false, error: 'Results not found or expired' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      html: results.html
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Option 2: MongoDB Atlas

[MongoDB Atlas](https://www.mongodb.com/cloud/atlas) is a cloud-hosted MongoDB service.

1. Install the MongoDB package:
   ```bash
   npm install mongodb
   ```

2. Create a MongoDB Atlas account and set up a cluster.

3. Update your storage implementation:

```typescript
// app/lib/storage.ts
import { MongoClient, ObjectId } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'

// Define the structure of a generated result
interface GeneratedResult {
  _id?: ObjectId;
  id: string;
  html: string;
  sitecoreFields: string;
  component: string;
  timestamp: number;
}

// MongoDB connection
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const client = new MongoClient(uri)
const db = client.db('figma-to-sitecore')
const collection = db.collection('results')

// Generate a unique ID for each result set
export function generateResultId(): string {
  return uuidv4()
}

// Store results with the given ID
export async function storeResults(id: string, results: Omit<GeneratedResult, 'id' | 'timestamp'>): Promise<void> {
  const data: GeneratedResult = {
    id,
    ...results,
    timestamp: Date.now()
  }
  
  await collection.updateOne(
    { id },
    { $set: data },
    { upsert: true }
  )
}

// Get results by ID
export async function getResults(id: string): Promise<GeneratedResult | null> {
  const result = await collection.findOne({ id })
  
  if (!result) {
    return null
  }
  
  // Check if the result has expired (older than 1 hour)
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  if (result.timestamp < oneHourAgo) {
    await collection.deleteOne({ id })
    return null
  }
  
  return result
}

// Clean up old results (older than 1 hour)
export async function cleanupOldResults(): Promise<void> {
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  
  await collection.deleteMany({
    timestamp: { $lt: oneHourAgo }
  })
}
```

4. Update your API routes to use the async functions as shown in the Vercel KV example.

### Option 3: Supabase

[Supabase](https://supabase.com/) is an open-source Firebase alternative.

1. Install the Supabase package:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Create a Supabase account and set up a project.

3. Update your storage implementation:

```typescript
// app/lib/storage.ts
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

// Define the structure of a generated result
interface GeneratedResult {
  id: string;
  html: string;
  sitecore_fields: string;
  component: string;
  timestamp: number;
}

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Generate a unique ID for each result set
export function generateResultId(): string {
  return uuidv4()
}

// Store results with the given ID
export async function storeResults(id: string, results: Omit<GeneratedResult, 'id' | 'timestamp'>): Promise<void> {
  const data: GeneratedResult = {
    id,
    html: results.html,
    sitecore_fields: results.sitecoreFields,
    component: results.component,
    timestamp: Date.now()
  }
  
  await supabase
    .from('results')
    .upsert(data)
}

// Get results by ID
export async function getResults(id: string): Promise<GeneratedResult | null> {
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error || !data) {
    return null
  }
  
  // Check if the result has expired (older than 1 hour)
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  if (data.timestamp < oneHourAgo) {
    await supabase
      .from('results')
      .delete()
      .eq('id', id)
    return null
  }
  
  return {
    id: data.id,
    html: data.html,
    sitecoreFields: data.sitecore_fields,
    component: data.component,
    timestamp: data.timestamp
  }
}

// Clean up old results (older than 1 hour)
export async function cleanupOldResults(): Promise<void> {
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  
  await supabase
    .from('results')
    .delete()
    .lt('timestamp', oneHourAgo)
}
```

4. Update your API routes to use the async functions as shown in the Vercel KV example.

## Environment Variables

For production, you'll need to set up the following environment variables in the Vercel dashboard:

- `OPENAI_API_KEY`: Your OpenAI API key
- Database-specific variables (depending on your choice):
  - For Vercel KV: `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`
  - For MongoDB: `MONGODB_URI`
  - For Supabase: `SUPABASE_URL`, `SUPABASE_KEY`

## Custom Domain

To set up a custom domain for your application:

1. Go to the Vercel dashboard
2. Select your project
3. Go to Settings > Domains
4. Add your domain and follow the instructions to configure DNS settings

## Monitoring and Logging

For production applications, it's important to set up monitoring and logging:

1. **Vercel Analytics**: Enable Vercel Analytics in your project settings
2. **Error Tracking**: Consider using a service like [Sentry](https://sentry.io/) for error tracking
3. **Logging**: Use a logging service like [Logtail](https://logtail.com/) or [Papertrail](https://www.papertrail.com/)

## Conclusion

By following these steps, you can deploy your Figma to Sitecore Converter application to production with a persistent database for storing results. This will ensure that your application is reliable and scalable for production use. 