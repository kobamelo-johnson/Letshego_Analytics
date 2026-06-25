const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptStart = '<script type="module">';
const scriptEnd = '</script>';
const startIndex = html.indexOf(scriptStart);
const endIndex = html.lastIndexOf(scriptEnd);
if (startIndex !== -1 && endIndex !== -1) {
    const script = html.substring(startIndex + scriptStart.length, endIndex);
    fs.writeFileSync('extracted_script.js', script);
    console.log('Extracted successfully');
} else {
    console.log('Failed to find script tags');
}
