import { NextResponse } from 'next/server'
import { getResults } from '@/app/lib/storage'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    console.log('HTML API called with ID:', id)

    const results = await getResults(id)
    if (!results) {
      return NextResponse.json(
        { success: false, error: 'Results not found' },
        { status: 404 }
      )
    }

    // Parse the stored JSON string
    const htmlData = JSON.parse(results.html)

    return NextResponse.json({
      componentName: htmlData.componentName,
      html: htmlData.html
    })
  } catch (error) {
    console.error('Error in HTML API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 