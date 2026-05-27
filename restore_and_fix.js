const fs = require('fs');

// 1. Read the valid script block that I saved 10 minutes ago
let validScript = fs.readFileSync('test_script.js', 'utf8');

// 2. Apply the exact logic fix to the valid script
const searchString = `            const u = document.getElementById('username').value.trim();
            const p = document.getElementById('password').value.trim();
            if ((u === ADMIN_AUTH.username && p === ADMIN_AUTH.password) || (u === SUPER_ADMIN_AUTH.username && p === SUPER_ADMIN_AUTH.password)) {
                currentUserRole = (u === SUPER_ADMIN_AUTH.username) ? 'super_admin' : 'admin';`;

const replacementString = `            const u = document.getElementById('username').value.trim().toLowerCase();
            const p = document.getElementById('password').value.trim();
            if ((u === 'admin' && p === 'Letshego2026!') || (u === 'admin02' && p === 'Letshego2026@IDH')) {
                currentUserRole = (u === 'admin02') ? 'super_admin' : 'admin';`;

// Check if the search string exists
if (!validScript.includes(`if ((u === ADMIN_AUTH`)) {
    console.error("Could not find the target string in test_script.js! Something is wrong.");
    process.exit(1);
}

validScript = validScript.replace(searchString, replacementString);

// 3. Read current index.html which has the mangled script
let html = fs.readFileSync('index.html', 'utf8');

// 4. Extract everything before <script type="module"> and everything after </script>
const scriptStartTag = '<script type="module">';
const scriptEndTag = '</script>';

const startIndex = html.indexOf(scriptStartTag);
// Find the last </script> after startIndex
const endIndex = html.indexOf(scriptEndTag, startIndex);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find script bounds in index.html");
    process.exit(1);
}

const htmlBefore = html.substring(0, startIndex + scriptStartTag.length);
const htmlAfter = html.substring(endIndex);

// 5. Piece it together with the corrected valid script
const finalHtml = htmlBefore + "\n" + validScript + "\n    " + htmlAfter;

// 6. Write it back
fs.writeFileSync('index.html', finalHtml, 'utf8');
console.log("Successfully restored and fixed index.html!");
