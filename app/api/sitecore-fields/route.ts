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
    
    console.log('Sitecore fields API called with ID:', id)
    
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

export async function POST(request: Request) {
  try {
    const { html } = await request.json()
    
    if (!html) {
      return NextResponse.json(
        { success: false, error: 'HTML content is required' },
        { status: 400 }
      )
    }

    // Generate Sitecore fields
    const sitecoreFieldsCompletion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: `Based on this HTML, generate Sitecore field definitions in JSON format. Include field types and descriptions. HTML: ${html}`,
        },
      ],
      max_tokens: 1000,
    })

    const sitecoreFields = sitecoreFieldsCompletion.choices[0].message.content

    return NextResponse.json({
      success: true,
      sitecoreFields: sitecoreFields
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 