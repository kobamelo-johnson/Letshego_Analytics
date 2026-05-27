const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptContent = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
fs.writeFileSync('test_script.js', scriptContent);
