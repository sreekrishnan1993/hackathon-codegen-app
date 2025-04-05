import { NextResponse } from 'next/server'
import { getResults } from '@/app/lib/storage'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('HTML API called with ID:', params.id)
    
    // Get results from storage
    const results = await getResults(params.id)
    
    if (!results) {
      return NextResponse.json(
        { error: 'Results not found' },
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