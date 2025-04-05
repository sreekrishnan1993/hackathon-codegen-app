const fs = require('fs');
const path = require('path');

// Create tmp directory if it doesn't exist
const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) {
  console.log('Creating tmp directory for file uploads...');
  fs.mkdirSync(tmpDir);
  console.log('tmp directory created successfully!');
} else {
  console.log('tmp directory already exists.');
} 