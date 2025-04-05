import { NextResponse } from 'next/server'
import { OpenAI } from 'openai'
import { v4 as uuidv4 } from 'uuid'
import { generateResultId, storeResults, getResults } from '@/app/lib/storage'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Figma API configuration
const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN
const FIGMA_API_BASE = 'https://api.figma.com/v1'

// Function to extract file key from Figma URL
function getFigmaFileKey(url: string): string | null {
  // Remove @ if present at the start
  url = url.replace(/^@/, '')
  
  // Handle different Figma URL formats
  const patterns = [
    /figma\.com\/file\/([a-zA-Z0-9]+)(?:\/|$)/, // Standard file URL
    /figma\.com\/design\/([a-zA-Z0-9]+)(?:\/|$)/, // Design URL
    /figma\.com\/proto\/([a-zA-Z0-9]+)(?:\/|$)/, // Prototype URL
    /[a-zA-Z0-9]{22,}/ // Direct file key
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  // If no pattern matches but we find a 22+ character alphanumeric string, it might be a file key
  const possibleKey = url.match(/[a-zA-Z0-9]{22,}/)
  if (possibleKey) {
    return possibleKey[0]
  }

  return null
}

// Function to process component data and limit its size
function processComponentData(component: any) {
  try {
    const structure = component.document || {};
    // Extract only essential properties
    return {
      name: structure.name || '',
      type: structure.type || '',
      description: structure.description || '',
      // Include only basic layout information
      layout: {
        width: structure.absoluteBoundingBox?.width,
        height: structure.absoluteBoundingBox?.height,
        children: (structure.children || []).map((child: any) => ({
          type: child.type,
          name: child.name
        }))
      }
    };
  } catch (error) {
    console.error('Error processing component data:', error);
    return {
      name: component.name || '',
      type: component.type || '',
      description: 'Error processing component data'
    };
  }
}

// Function to get Figma file data using Vercel v0 API
async function getFigmaFileDataV0(fileKey: string) {
  if (!FIGMA_ACCESS_TOKEN) {
    throw new Error('Figma access token not configured')
  }

  if (!process.env.VERCEL_ACCESS_TOKEN) {
    throw new Error('Vercel access token not configured')
  }

  console.log('Fetching Figma file with key using v0:', fileKey)

  try {
    // First get the file data using v0 API
    const v0Response = await fetch(`https://v0.dev/api/figma/${fileKey}`, {
      headers: {
        'Authorization': `Bearer ${process.env.VERCEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!v0Response.ok) {
      const errorText = await v0Response.text()
      console.error('Vercel v0 API error:', errorText)
      throw new Error(`Failed to fetch Figma file from v0: ${v0Response.statusText}. ${errorText}`)
    }

    const v0Data = await v0Response.json()
    console.log('Successfully fetched Figma file data from v0')
    return v0Data
  } catch (error) {
    console.error('Error in getFigmaFileDataV0:', error)
    throw error
  }
}

// Function to get Figma file data
async function getFigmaFileData(fileKey: string) {
  if (!FIGMA_ACCESS_TOKEN) {
    throw new Error('Figma access token not configured')
  }

  console.log('Fetching Figma file with key:', fileKey)

  try {
    // First get the file data
    const fileResponse = await fetch(`${FIGMA_API_BASE}/files/${fileKey}`, {
      headers: {
        'X-Figma-Token': FIGMA_ACCESS_TOKEN
      }
    })

    if (!fileResponse.ok) {
      const errorText = await fileResponse.text()
      console.error('Figma API error:', errorText)
      throw new Error(`Failed to fetch Figma file: ${fileResponse.statusText}. ${errorText}`)
    }

    const fileData = await fileResponse.json()
    console.log('Figma file data retrieved:', fileData.name)
    
    // Extract the main canvas or frame
    const mainCanvas = fileData.document?.children?.find((child: any) => 
      child.type === 'CANVAS' || child.type === 'FRAME'
    )
    
    if (!mainCanvas) {
      throw new Error('No main canvas or frame found in the Figma file')
    }
    
    // Get the node ID of the main canvas
    const mainCanvasId = mainCanvas.id
    
    // Fetch detailed node data for the main canvas
    const nodesResponse = await fetch(`${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${mainCanvasId}`, {
      headers: {
        'X-Figma-Token': FIGMA_ACCESS_TOKEN
      }
    })

    if (!nodesResponse.ok) {
      const errorText = await nodesResponse.text()
      console.error('Figma API error:', errorText)
      throw new Error(`Failed to fetch Figma nodes: ${nodesResponse.statusText}. ${errorText}`)
    }

    const nodesData = await nodesResponse.json()
    const mainCanvasData = nodesData.nodes[mainCanvasId]
    
    if (!mainCanvasData) {
      throw new Error('Failed to retrieve main canvas data')
    }
    
    // Process the Figma data into a structured description
    const processedData = {
      name: fileData.name,
      lastModified: fileData.lastModified,
      mainCanvas: {
        name: mainCanvasData.document?.name || 'Main Canvas',
        type: mainCanvasData.document?.type || 'CANVAS',
        children: processFigmaNodes(mainCanvasData.document?.children || [])
      }
    }

    console.log('Successfully processed Figma file data')
    return processedData
  } catch (error) {
    console.error('Error in getFigmaFileData:', error)
    throw error
  }
}

// Function to process Figma nodes recursively
function processFigmaNodes(nodes: any[]): any[] {
  return nodes.map(node => {
    const processedNode: {
      id: string;
      name: string;
      type: string;
      visible: boolean;
      layout: {
        width?: number;
        height?: number;
        x?: number;
        y?: number;
      };
      style: {
        backgroundColor?: any;
        fills?: any[];
        strokes?: any[];
        effects?: any[];
        cornerRadius?: number;
      };
      children?: any[];
    } = {
      id: node.id,
      name: node.name,
      type: node.type,
      visible: node.visible !== false,
      layout: {
        width: node.absoluteBoundingBox?.width,
        height: node.absoluteBoundingBox?.height,
        x: node.absoluteBoundingBox?.x,
        y: node.absoluteBoundingBox?.y
      },
      style: {
        backgroundColor: node.backgroundColor,
        fills: node.fills,
        strokes: node.strokes,
        effects: node.effects,
        cornerRadius: node.cornerRadius
      }
    }
    
    // Process children recursively
    if (node.children && node.children.length > 0) {
      processedNode.children = processFigmaNodes(node.children)
    }
    
    return processedNode
  })
}

// Function to clean up generated code
function cleanGeneratedCode(code: string, prefix?: string): string {
  return code
    .replace(/```(?:html|tsx|typescript|json|javascript)?\n?/g, '') // Remove code block markers
    .replace(/```\n?/g, '') // Remove closing code block markers
    .replace(/^\s*[\r\n]/gm, '') // Remove empty lines
    .trim()
}

export async function POST(request: Request) {
  try {
    console.log('Convert API called')
    console.log('OPENAI_API_KEY available:', !!process.env.OPENAI_API_KEY)
    console.log('FIGMA_ACCESS_TOKEN available:', !!process.env.FIGMA_ACCESS_TOKEN)
    
    // Check if required API keys are available
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set')
      return NextResponse.json(
        { success: false, error: 'OpenAI API key is not configured' },
        { status: 500 }
      )
    }

    if (!process.env.FIGMA_ACCESS_TOKEN) {
      console.log(process.env.FIGMA_ACCESS_TOKEN)
      console.error('FIGMA_ACCESS_TOKEN is not set')
      return NextResponse.json(
        { success: false, error: 'Figma access token is not configured' },
        { status: 500 }
      )
    }
    
    const formData = await request.formData()
    
    const figmaUrl = formData.get('figmaUrl') as string
    const prompt = formData.get('prompt') as string
    const componentName = formData.get('componentName') as string
    const imageFile = formData.get('image') as File | null

    console.log('Form data received:', { 
      hasFigmaUrl: !!figmaUrl, 
      hasPrompt: !!prompt,
      hasComponentName: !!componentName,
      hasImage: !!imageFile,
      promptLength: prompt?.length || 0
    })

    if (!componentName) {
      return NextResponse.json(
        { success: false, error: 'Component name is required' },
        { status: 400 }
      )
    }

    if (!figmaUrl && !imageFile) {
      return NextResponse.json(
        { success: false, error: 'Either Figma URL or image file is required' },
        { status: 400 }
      )
    }

    // If Figma URL is provided, get the file data
    let figmaFileData = null
    if (figmaUrl) {
      try {
        const fileKey = getFigmaFileKey(figmaUrl)
        if (!fileKey) {
          return NextResponse.json(
            { success: false, error: 'Invalid Figma URL format' },
            { status: 400 }
          )
        }

        figmaFileData = await getFigmaFileData(fileKey)
        console.log('Figma file data retrieved successfully')
      } catch (error) {
        console.error('Error fetching Figma file:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to access Figma file. Please check the URL and ensure proper access permissions.' },
          { status: 500 }
        )
      }
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
      console.log('Calling OpenAI for HTML generation with prompt:', prompt?.substring(0, 100) + '...')
      
      // Choose the appropriate model based on whether an image is provided
      const model = imageContent ? "gpt-4o" : "gpt-4"
      console.log('Using model:', model)
      
      let htmlCompletion;
      
      if (imageContent) {
        // Format for vision model
        htmlCompletion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { 
                  type: "text", 
                  text: `Generate semantic HTML for this design. Include all necessary elements and structure for a web component. ${prompt || ''}` 
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
          max_tokens: 3000,
        });
      } else {
        // Format for text-only model with Figma data
        const designDescription = figmaFileData ? `
Design Name: ${figmaFileData.name}
Last Modified: ${figmaFileData.lastModified}
Main Canvas: ${figmaFileData.mainCanvas.name}
Structure:
${JSON.stringify(figmaFileData.mainCanvas.children, null, 2)}
` : figmaUrl

        htmlCompletion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "user",
              content: `Generate semantic HTML for this Figma design. Include all necessary elements and structure for a web component.

Design Details:
${designDescription}

Additional context: ${prompt || ''}

Return only the HTML code without any explanations.`,
            },
          ],
          max_tokens: 3000,
        });
      }
      
      console.log('OpenAI HTML generation completed with response:', htmlCompletion.choices[0].message.content?.substring(0, 100) + '...')
      
      html = cleanGeneratedCode(htmlCompletion.choices[0].message.content || '')
      console.log('HTML generated, length:', html.length)
      
      if (!html || html.trim() === '') {
        throw new Error('Generated HTML is empty')
      }
      
      // Update the stored results with HTML
      try {
        await storeResults(resultId, {
          html: JSON.stringify({ componentName, html }),
          sitecoreFields: 'Processing...',
          component: 'Processing...'
        })
        console.log('Updated results with HTML')
      } catch (error) {
        console.error('Error updating results with HTML:', error)
      }
    } catch (error) {
      console.error('Error generating HTML:', error)
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack)
      }
      html = 'Error: Failed to generate HTML'
      try {
        await storeResults(resultId, {
          html: JSON.stringify({ componentName, html: 'Error: Failed to generate HTML' }),
          sitecoreFields: JSON.stringify({ componentName, sitecoreFields: 'Error: HTML generation failed' }),
          component: JSON.stringify({
            componentName,
            componentData: 'Error: HTML generation failed'
          })
        })
      } catch (storageError) {
        console.error('Error storing error result:', storageError)
      }
      // Return early with error
      return NextResponse.json({
        success: false,
        error: 'Failed to generate HTML: ' + (error instanceof Error ? error.message : 'Unknown error'),
        resultId
      }, { status: 500 })
    }
    
    // Only proceed with component generation if HTML was successfully generated
    if (html && !html.startsWith('Error:')) {
      try {
        console.log('Calling OpenAI for component generation')
        // Generate React component with Tailwind CSS
        console.log('Sending request to OpenAI API for component generation')
        console.log('Using model: gpt-4')
        
        const componentCompletion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "user",
              content: `Create a NextJS component named "${componentName}" with Tailwind CSS integration. Return only the component code without any explanations. The component should:
1. Use proper TypeScript types
2. Use Tailwind CSS classes for styling
3. Include proper imports for Sitecore Headless with Next JS and Tailwind
4. Follow Sitecore Headless with Next JS component structure with Field components
5. Include responsive design with Tailwind breakpoints
6. Use Tailwind's utility classes for layout, spacing, colors, and typography
7. Below is example of a Hero component which is error free and you can use it as a reference:
import React from 'react';
import { Text, RichText, Field, Link, ImageField, LinkField, Image as JssImage } from '@sitecore-jss/sitecore-jss-nextjs';
// Initialize TypeScript interfaces for the fields
interface HeroTestingProps {
  fields: {
    Title: Field<string>;
    Description: Field<string>;
    Image: ImageField;
    Link1: LinkField;
    Link2: LinkField;
  };
}
// Define the HeroTesting function as a TypeScript Functional Component
const HeroTesting: React.FC<HeroTestingProps> = ({ fields }) => {
  return (
    <section className="flex bg-blue-800 text-white">
      <div className="p-5 flex-1">
        <Text tag="h1" field={fields.Title} className="text-4xl font-bold"/>
        <RichText field={fields.Description} className="mt-1 mb-3 text-lg"/>
        <div className="flex space-x-4">
          <Link field={fields.Link1} className="bg-white text-blue-800 px-4 py-2 rounded-md"/>
        </div>
      </div>
      <div className="flex-1 border-l-5 border-blue-900">
        <JssImage field={fields?.Image} layout="fill"/>
      </div>
    </section>
  );
};
// Export the component to be used in the rest of the app
export default HeroTesting;

HTML: ${html}`,
            },
          ],
          max_tokens: 2000,
        })
        
        console.log('OpenAI component generation completed with response:', componentCompletion.choices[0].message.content?.substring(0, 100) + '...')
        
        // Extract only the component code without any descriptions
        const componentCode = cleanGeneratedCode(componentCompletion.choices[0].message.content || 'Error: Failed to generate component')
        component = componentCode
        console.log('Component generated, length:', component.length)
        
        // Update the stored results with component
        try {
          await storeResults(resultId, {
            html: JSON.stringify({ componentName, html }),
            sitecoreFields: JSON.stringify({ componentName, sitecoreFields }),
            component: JSON.stringify({
              componentName,
              componentData: component.toString().replace(/^Here's how you can achieve it using NextJS, TypeScript, and JSS:\njsx\n/, '')
                .replace(/\nIn this code.*$/, '')
            })
          })
          console.log('Updated results with all data')
        } catch (error) {
          console.error('Error updating final results:', error)
        }
      } catch (error) {
        console.error('Error generating component:', error)
        if (error instanceof Error) {
          console.error('Error details:', error.message, error.stack)
        }
        component = 'Error: Failed to generate component'
        try {
          await storeResults(resultId, {
            html: JSON.stringify({ componentName, html }),
            sitecoreFields: JSON.stringify({ componentName, sitecoreFields }),
            component: JSON.stringify({
              componentName,
              componentData: 'Error: Failed to generate component'
            })
          })
        } catch (storageError) {
          console.error('Error storing error result:', storageError)
        }
      }
      
      // Only proceed with Sitecore fields generation if HTML was successfully generated
      try {
        console.log('Calling OpenAI for Sitecore fields generation')
        // Generate Sitecore fields
        console.log('Sending request to OpenAI API for Sitecore fields generation')
        console.log('Using model: gpt-4')
        
        const sitecoreFieldsCompletion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "user",
              content: `Generate Sitecore field definitions in JSON format for a "${componentName}" component. Based on this HTML, create fields that would be needed to populate the content. Include field types, descriptions, and validation rules. Return ONLY the JSON object without any explanations or markdown formatting.

Example format:
{
  "fields": {
    "title": {
      "type": "Single-Line Text",
      "description": "Main title of the component",
      "validation": "Required"
    }
  }
}

HTML to analyze: ${html}`,
            },
          ],
          max_tokens: 2000,
        })
        
        console.log('OpenAI Sitecore fields generation completed with response:', sitecoreFieldsCompletion.choices[0].message.content?.substring(0, 100) + '...')
        
        sitecoreFields = cleanGeneratedCode(sitecoreFieldsCompletion.choices[0].message.content || 'Error: Failed to generate Sitecore fields', 'sitecore')
        console.log('Sitecore fields generated, length:', sitecoreFields.length)
        
        // Update the stored results with Sitecore fields
        try {
          await storeResults(resultId, {
            html: JSON.stringify({ componentName, html }),
            sitecoreFields: JSON.stringify({ 
              componentName, 
              sitecoreFields 
            }),
            component: JSON.stringify({
              componentName,
              componentData: component
            })
          })
          console.log('Updated results with Sitecore fields')
        } catch (error) {
          console.error('Error updating results with Sitecore fields:', error)
        }
      } catch (error) {
        console.error('Error generating Sitecore fields:', error)
        if (error instanceof Error) {
          console.error('Error details:', error.message, error.stack)
        }
        sitecoreFields = 'Error: Failed to generate Sitecore fields'
        try {
          await storeResults(resultId, {
            html: JSON.stringify({ componentName, html }),
            sitecoreFields: JSON.stringify({ 
              componentName, 
              sitecoreFields: 'Error: Failed to generate Sitecore fields' 
            }),
            component: JSON.stringify({
              componentName,
              componentData: component
            })
          })
        } catch (storageError) {
          console.error('Error storing error result:', storageError)
        }
      }
    }
    
    // Return the results
    return NextResponse.json({
      success: true,
      resultId,
      results: {
        html: {
          componentName,
          html
        },
        sitecoreFields: {
          componentName,
          sitecoreFields
        },
        component: {
          componentName,
          componentData: component.toString().replace(/^Here's how you can achieve it using NextJS, TypeScript, and JSS:\njsx\n/, '')
            .replace(/\nIn this code.*$/, '')
        }
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