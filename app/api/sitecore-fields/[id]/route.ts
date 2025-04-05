import { NextResponse } from 'next/server'
import { getResults } from '@/app/lib/storage'

// Define types for Sitecore fields
interface SitecoreField {
  type?: string;
  value?: string;
  description?: string;
}

interface SitecoreFields {
  [key: string]: SitecoreField;
}

interface ConversionResult {
  sitecoreFields: SitecoreFields;
  [key: string]: any;
}

// Function to convert JSON to CSV
function jsonToCSV(jsonData: any): string {
  try {
    console.log('Converting to CSV, input data type:', typeof jsonData);
    
    // Parse the JSON if it's a string
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    console.log('Parsed data structure:', Object.keys(data));
    
    // Extract fields from the data
    let fields: any[] = [];
    
    // Handle different data structures
    if (data.fields) {
      console.log('Found direct fields object');
      // Direct fields object
      fields = Object.entries(data.fields).map(([key, value]: [string, any]) => ({
        fieldName: key,
        type: value.type || '',
        value: value.value || '',
        description: value.description || ''
      }));
    } else if (data.sitecoreFields) {
      console.log('Found sitecoreFields property');
      // Try to parse sitecoreFields if it's a string
      const sitecoreFieldsData = typeof data.sitecoreFields === 'string' 
        ? JSON.parse(data.sitecoreFields) 
        : data.sitecoreFields;
      
      console.log('Parsed sitecoreFields structure:', Object.keys(sitecoreFieldsData));
      
      if (sitecoreFieldsData.fields) {
        console.log('Found fields in sitecoreFields');
        fields = Object.entries(sitecoreFieldsData.fields).map(([key, value]: [string, any]) => ({
          fieldName: key,
          type: value.type || '',
          value: value.value || '',
          description: value.description || ''
        }));
      } else {
        console.log('No fields found in sitecoreFields, trying to extract from the object itself');
        // Try to extract fields from the object itself
        fields = Object.entries(sitecoreFieldsData)
          .filter(([key]) => key !== 'componentName')
          .map(([key, value]: [string, any]) => {
            // If value is an object with type, value, description properties
            if (typeof value === 'object' && value !== null && 
                ('type' in value || 'value' in value || 'description' in value)) {
              return {
                fieldName: key,
                type: value.type || '',
                value: value.value || '',
                description: value.description || ''
              };
            }
            // Otherwise treat it as a simple field
            return {
              fieldName: key,
              type: typeof value,
              value: String(value),
              description: ''
            };
          });
      }
    } else if (typeof data === 'object' && data !== null) {
      console.log('No direct fields or sitecoreFields found, searching recursively');
      // Try to find fields in nested structure
      const findFields = (obj: any): any[] => {
        if (obj.fields) {
          console.log('Found fields in nested object');
          return Object.entries(obj.fields).map(([key, value]: [string, any]) => ({
            fieldName: key,
            type: value.type || '',
            value: value.value || '',
            description: value.description || ''
          }));
        }
        
        // Recursively search for fields in nested objects
        for (const key in obj) {
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            const found = findFields(obj[key]);
            if (found.length > 0) return found;
          }
        }
        
        return [];
      };
      
      fields = findFields(data);
    }
    
    console.log('Extracted fields count:', fields.length);
    
    if (fields.length === 0) {
      console.log('No fields found in the data');
      return 'No fields data available';
    }
    
    // Define headers for Sitecore fields
    const headers = ['fieldName', 'type', 'value', 'description'];
    
    // Create CSV header row
    const csvRows = [headers.join(',')];
    
    // Add data rows
    fields.forEach(field => {
      const values = headers.map(header => {
        const value = field[header];
        // Handle special characters and commas
        if (typeof value === 'string') {
          // Escape quotes and wrap in quotes if contains comma or newline
          const escaped = value.replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('\n') ? `"${escaped}"` : escaped;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });
    
    console.log('CSV generated with rows:', csvRows.length);
    return csvRows.join('\n');
  } catch (error) {
    console.error('Error converting JSON to CSV:', error);
    return 'Error converting data to CSV';
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    console.log('Fetching Sitecore fields for ID:', id)

    // Get the result from storage
    const result = await getResults(id)
    console.log('Storage result type:', typeof result)
    console.log('Storage result keys:', result ? Object.keys(result) : 'null')

    if (!result) {
      console.log('No result found for ID:', id)
      return NextResponse.json(
        { success: false, error: 'Result not found' },
        { status: 404 }
      )
    }

    // Check if the result has sitecoreFields
    if (!result.sitecoreFields) {
      console.log('No Sitecore fields found in result')
      return NextResponse.json(
        { success: false, error: 'Sitecore fields not found' },
        { status: 404 }
      )
    }

    // Parse sitecoreFields if it's a string
    let sitecoreFieldsData = result.sitecoreFields
    if (typeof sitecoreFieldsData === 'string') {
      try {
        console.log('Parsing sitecoreFields string')
        sitecoreFieldsData = JSON.parse(sitecoreFieldsData)
        console.log('Parsed sitecoreFields type:', typeof sitecoreFieldsData)
        console.log('Parsed sitecoreFields keys:', Object.keys(sitecoreFieldsData))
      } catch (parseError) {
        console.error('Error parsing sitecoreFields:', parseError)
        return NextResponse.json(
          { success: false, error: 'Invalid Sitecore fields format' },
          { status: 500 }
        )
      }
    }

    // Check if the request wants CSV format
    const url = new URL(request.url);
    const format = url.searchParams.get('format');
    
    if (format === 'csv') {
      console.log('Converting to CSV format')
      // Convert to CSV
      const csv = jsonToCSV(sitecoreFieldsData);
      
      // Return CSV with appropriate headers
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="sitecore-fields-${id}.csv"`
        }
      });
    }

    // Return JSON by default
    return NextResponse.json({
      success: true,
      sitecoreFields: sitecoreFieldsData
    })
  } catch (error) {
    console.error('Error fetching Sitecore fields:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Sitecore fields' },
      { status: 500 }
    )
  }
} 