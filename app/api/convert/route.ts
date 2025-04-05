import { NextResponse } from 'next/server'
import { OpenAI } from 'openai'
import { v4 as uuidv4 } from 'uuid'
import { generateResultId, storeResults, getResults } from '@/app/lib/storage'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    console.log('Convert API called')
    console.log('OPENAI_API_KEY available:', !!process.env.OPENAI_API_KEY)
    console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0)
    console.log('BLOB_READ_WRITE_TOKEN available:', !!process.env.BLOB_READ_WRITE_TOKEN)
    
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set')
      return NextResponse.json(
        { success: false, error: 'OpenAI API key is not configured' },
        { status: 500 }
      )
    }
    
    const formData = await request.formData()
    
    const figmaUrl = formData.get('figmaUrl') as string
    const prompt = formData.get('prompt') as string
    const imageFile = formData.get('image') as File | null

    console.log('Form data received:', { 
      hasFigmaUrl: !!figmaUrl, 
      hasPrompt: !!prompt, 
      hasImage: !!imageFile,
      promptLength: prompt?.length || 0
    })

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
      try {
        // Convert the file to base64 directly without writing to disk
        const bytes = await imageFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        imageContent = buffer.toString('base64')
        console.log('Image processed successfully, size:', imageContent.length)
      } catch (error) {
        console.error('Error processing image:', error)
        return NextResponse.json(
          { success: false, error: 'Error processing image file' },
          { status: 500 }
        )
      }
    }

    // Generate a unique ID for the results
    const resultId = generateResultId()
    console.log('Generated result ID:', resultId)
    
    // Store initial result with empty values
    try {
      await storeResults(resultId, {
        html: 'Processing...',
        sitecoreFields: 'Processing...',
        component: 'Processing...'
      })
      console.log('Initial results stored')
    } catch (error) {
      console.error('Error storing initial results:', error)
      // Continue processing even if initial storage fails
    }

    // Process the request synchronously instead of in the background
    console.log('Starting synchronous processing for result ID:', resultId)
    
    // Generate HTML using OpenAI
    let html = 'Processing...'
    let sitecoreFields = 'Processing...'
    let component = 'Processing...'
    
    try {
      console.log('Calling OpenAI for HTML generation with prompt:', prompt.substring(0, 100) + '...')
      
      // Choose the appropriate model based on whether an image is provided
      const model = imageContent ? "gpt-4o" : "gpt-4"
      console.log('Using model:', model)
      
      let htmlCompletion;
      
      if (imageContent) {
        // Format for vision model
        htmlCompletion = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: "user",
              content: [
                { 
                  type: "text", 
                  text: `Generate HTML for this design. ${prompt}${figmaUrl ? ` Figma URL: ${figmaUrl}` : ''}` 
                },
                { 
                  type: "image_url", 
                  image_url: { 
                    url: `data:image/jpeg;base64,${imageContent}` 
                  } 
                }
              ],
            },
          ],
          max_tokens: 2000,
        });
      } else {
        // Format for text-only model
        htmlCompletion = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: "user",
              content: `Generate HTML for this design. ${prompt}${figmaUrl ? ` Figma URL: ${figmaUrl}` : ''}`,
            },
          ],
          max_tokens: 2000,
        });
      }
      
      console.log('OpenAI HTML generation completed with response:', htmlCompletion.choices[0].message.content?.substring(0, 100) + '...')
      
      html = htmlCompletion.choices[0].message.content || 'Error: Failed to generate HTML'
      console.log('HTML generated, length:', html.length)
      
      // Update the stored results with HTML
      try {
        await storeResults(resultId, {
          html,
          sitecoreFields,
          component
        })
        console.log('Updated results with HTML')
      } catch (error) {
        console.error('Error updating results with HTML:', error)
        // Continue processing even if storage fails
      }
    } catch (error) {
      console.error('Error generating HTML:', error)
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack)
      }
      html = 'Error: Failed to generate HTML'
      try {
        await storeResults(resultId, {
          html,
          sitecoreFields,
          component
        })
      } catch (storageError) {
        console.error('Error storing error result:', storageError)
      }
    }
    
    try {
      console.log('Calling OpenAI for Sitecore fields generation')
      // Generate Sitecore fields
      console.log('Sending request to OpenAI API for Sitecore fields generation')
      console.log('Using model: gpt-4')
      
      const sitecoreFieldsCompletion = await openai.chat.completions.create({
        model: "gpt-4", // Using a more capable model for structured output
        messages: [
          {
            role: "user",
            content: `Based on this HTML, generate Sitecore field definitions in JSON format. Include field types and descriptions. HTML: ${html}`,
          },
        ],
        max_tokens: 2000,
      })
      
      console.log('OpenAI Sitecore fields generation completed with response:', sitecoreFieldsCompletion.choices[0].message.content?.substring(0, 100) + '...')
      
      sitecoreFields = sitecoreFieldsCompletion.choices[0].message.content || 'Error: Failed to generate Sitecore fields'
      console.log('Sitecore fields generated, length:', sitecoreFields.length)
      
      // Update the stored results with Sitecore fields
      try {
        await storeResults(resultId, {
          html,
          sitecoreFields,
          component
        })
        console.log('Updated results with Sitecore fields')
      } catch (error) {
        console.error('Error updating results with Sitecore fields:', error)
        // Continue processing even if storage fails
      }
    } catch (error) {
      console.error('Error generating Sitecore fields:', error)
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack)
      }
      sitecoreFields = 'Error: Failed to generate Sitecore fields'
      try {
        await storeResults(resultId, {
          html,
          sitecoreFields,
          component
        })
      } catch (storageError) {
        console.error('Error storing error result:', storageError)
      }
    }
    
    try {
      console.log('Calling OpenAI for component generation')
      // Generate NextJS component
      console.log('Sending request to OpenAI API for component generation')
      console.log('Using model: gpt-4')
      
      const componentCompletion = await openai.chat.completions.create({
        model: "gpt-4", // Using a more capable model for code generation
        messages: [
          {
            role: "user",
            content: `Generate a NextJS component with Sitecore integration based on this HTML and Sitecore fields. HTML: ${html}, Fields: ${sitecoreFields}`,
          },
        ],
        max_tokens: 2000,
      })
      
      console.log('OpenAI component generation completed with response:', componentCompletion.choices[0].message.content?.substring(0, 100) + '...')
      
      component = componentCompletion.choices[0].message.content || 'Error: Failed to generate component'
      console.log('Component generated, length:', component.length)
      
      // Update the stored results with the component
      try {
        await storeResults(resultId, {
          html,
          sitecoreFields,
          component
        })
        console.log('Updated results with component')
      } catch (error) {
        console.error('Error updating results with component:', error)
        // Continue processing even if storage fails
      }
    } catch (error) {
      console.error('Error generating component:', error)
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack)
      }
      component = 'Error: Failed to generate component'
      try {
        await storeResults(resultId, {
          html,
          sitecoreFields,
          component
        })
      } catch (storageError) {
        console.error('Error storing error result:', storageError)
      }
    }
    
    console.log('Processing completed for result ID:', resultId)
    
    // Return the result ID and results
    return NextResponse.json({
      success: true,
      resultId,
      results: {
        html,
        sitecoreFields,
        component
      }
    })
  } catch (error) {
    console.error('Error in convert API:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack)
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 