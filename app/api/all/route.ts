import { NextResponse } from 'next/server'
import { OpenAI } from 'openai'
import fs from 'fs'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { listResults } from '@/app/lib/storage'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET(request: Request) {
  try {
    console.log('All API called to retrieve all results')
    
    // Get all results from storage
    const results = await listResults()
    
    return NextResponse.json({
      success: true,
      results
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
    const formData = await request.formData()
    
    const figmaUrl = formData.get('figmaUrl') as string
    const prompt = formData.get('prompt') as string
    const imageFile = formData.get('image') as File | null

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (!figmaUrl && !imageFile) {
      return NextResponse.json(
        { success: false, error: 'Either Figma URL or image file is required' },
        { status: 400 }
      )
    }

    let imageContent = ''
    if (imageFile) {
      // Create a temporary file
      const bytes = await imageFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      // Create a unique filename
      const uniqueId = uuidv4()
      const filename = `${uniqueId}-${imageFile.name}`
      const tmpDir = join(process.cwd(), 'tmp')
      const path = join(tmpDir, filename)
      
      // Ensure tmp directory exists
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true })
      }
      
      // Write the file to disk
      await writeFile(path, buffer)
      
      // Read the file and convert to base64
      const imageBuffer = await fs.promises.readFile(path)
      imageContent = imageBuffer.toString('base64')
      
      // Clean up the temporary file
      await fs.promises.unlink(path)
    }

    // Generate HTML using OpenAI
    const content: any[] = [
      { type: "text", text: `Generate HTML for this design. ${prompt}` }
    ]
    
    if (imageContent) {
      content.push({ 
        type: "image_url", 
        image_url: { url: `data:image/jpeg;base64,${imageContent}` } 
      })
    }
    
    if (figmaUrl) {
      content.push({ type: "text", text: `Figma URL: ${figmaUrl}` })
    }
    
    const htmlCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: content,
        },
      ],
      max_tokens: 1000,
    })

    const html = htmlCompletion.choices[0].message.content

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
      html,
      sitecoreFields,
      component,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 