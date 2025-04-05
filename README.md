# Figma to Sitecore Converter

A Next.js application that converts Figma designs or images into HTML, Sitecore fields, and NextJS components with Sitecore integration.

## Features

- Accept Figma URLs or image file uploads
- Custom prompt input for component generation
- Generates three outputs:
  1. HTML markup
  2. Sitecore field definitions
  3. NextJS component with Sitecore integration
- Public API endpoints for integration with other applications
- Result storage with unique IDs for later retrieval
- Asynchronous processing to handle long-running operations

## Prerequisites

- Node.js 18.x or later
- OpenAI API key

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Enter a Figma URL or upload an image file
2. Provide a prompt describing any specific requirements for the component
3. Click "Generate" to process the input
4. The application will return a Result ID immediately and continue processing in the background
5. The UI will automatically poll for results and display them when ready
6. Use the provided Result ID to access the generated HTML, Sitecore fields, and NextJS component via the API endpoints

## Storage System

The application uses Vercel Blob for persistent storage:

- Results are stored as JSON files in Vercel's Blob storage
- Each result has a timestamp and is automatically deleted after 1 hour
- Files are stored with public access for easy retrieval
- The result ID is stored in the browser's localStorage for persistence between page refreshes
- Processing status is also stored in localStorage to handle page refreshes during processing

This approach ensures that results persist across serverless function invocations and can be accessed from multiple tabs or browsers.

## Asynchronous Processing

The application uses an asynchronous processing approach to handle long-running operations:

1. When a request is submitted, the application immediately returns a Result ID
2. Processing continues in the background
3. The UI polls the API every 3 seconds to check if results are ready
4. Results are updated incrementally as they become available
5. This approach prevents timeout issues with serverless functions

## API Endpoints

The application provides several API endpoints that can be used to integrate with other applications:

### Convert Design to Code

```
POST /api/convert
```

Converts a Figma design or image to HTML, Sitecore fields, and NextJS component.

**Request**: Send a multipart/form-data request with:
- `figmaUrl` (optional): URL of the Figma design
- `imageFile` (optional): Image file
- `prompt` (required): Prompt for component generation

**Response**:
```json
{
  "success": true,
  "resultId": "unique_id_here",
  "results": {
    "html": "...",
    "sitecoreFields": "...",
    "component": "..."
  }
}
```

### Get Results

```
GET /api/results/{id}
```

Retrieves all results for a specific conversion.

**Response**:
```json
{
  "success": true,
  "results": {
    "html": "...",
    "sitecoreFields": "...",
    "component": "..."
  }
}
```

### Get HTML

```
GET /api/html/{id}
```

Retrieves just the HTML result for a specific conversion.

**Response**:
```json
{
  "success": true,
  "html": "..."
}
```

### Get Sitecore Fields

```
GET /api/sitecore-fields/{id}
```

Retrieves Sitecore fields for a specific conversion.

**Response**:
```json
{
  "success": true,
  "sitecoreFields": "..."
}
```

### Get Component

```
GET /api/component/{id}
```

Retrieves the component result for a specific conversion.

**Response**:
```json
{
  "success": true,
  "component": "..."
}
```

### Get All Results

```
GET /api/all
```

Retrieves all available results (limited to the most recent 10).

**Response**:
```json
{
  "success": true,
  "results": [
    {
      "id": "unique_id_1",
      "html": "...",
      "sitecoreFields": "...",
      "component": "..."
    },
    {
      "id": "unique_id_2",
      "html": "...",
      "sitecoreFields": "...",
      "component": "..."
    }
  ]
}
```

## Development

### Local Development

For local development, the application uses a file-based storage system instead of Vercel Blob. This allows you to develop without setting up Vercel Blob storage.

### Deployment

The application is designed to be deployed on Vercel. To deploy:

1. Push your code to a GitHub repository
2. Connect the repository to Vercel
3. Set the following environment variables in Vercel:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob token (for production)

## License

MIT 