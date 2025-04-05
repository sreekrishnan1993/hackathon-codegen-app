import { NextResponse } from 'next/server'
import { getResults } from '@/app/lib/storage'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Component API called with ID:', params.id)
    
    const results = await getResults(params.id)
    if (!results) {
      return NextResponse.json(
        { success: false, error: 'Results not found' },
        { status: 404 }
      )
    }

    // Return the component data directly since it's already in the correct format
    return NextResponse.json({
      componentName: results.component.componentName,
      componentData: results.component.componentData
    })
  } catch (error) {
    console.error('Error in component API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 