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
      sitecoreFields: results.sitecoreFields
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 