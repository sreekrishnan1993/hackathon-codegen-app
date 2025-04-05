import { NextResponse } from 'next/server'
import { getResults } from '@/app/lib/storage'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Results API called for ID:', params.id)
    
    const results = await getResults(params.id)
    console.log('Results retrieved:', !!results)
    
    if (!results) {
      console.log('No results found for ID:', params.id)
      return NextResponse.json(
        { success: false, error: 'Results not found or expired' },
        { status: 404 }
      )
    }
    
    console.log('Results found for ID:', params.id)
    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Error retrieving results:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 