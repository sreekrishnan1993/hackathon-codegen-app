import { NextResponse } from 'next/server'
import { OpenAI } from 'openai'
import { getResults } from '@/app/lib/storage'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID parameter is required' },
        { status: 400 }
      )
    }
    
    console.log('Component API called with ID:', id)
    
    // Get results from storage
    const results = await getResults(id)
    
    if (!results) {
      return NextResponse.json(
        { error: 'Results not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      component: results.component
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { html, sitecoreFields } = await request.json()
    
    if (!html) {
      return NextResponse.json(
        { success: false, error: 'HTML content is required' },
        { status: 400 }
      )
    }

    if (!sitecoreFields) {
      return NextResponse.json(
        { success: false, error: 'Sitecore fields are required' },
        { status: 400 }
      )
    }

    // Generate NextJS component
    const componentCompletion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: `Generate a NextJS component with Sitecore integration based on this HTML and Sitecore fields. HTML: ${html}, Fields: ${sitecoreFields}`,
        },
      ],
      max_tokens: 1000,
    })

    const component = componentCompletion.choices[0].message.content

    return NextResponse.json({
      success: true,
      component: component
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 