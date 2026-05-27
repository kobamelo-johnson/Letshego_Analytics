const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetLogin = `            const u = document.getElementById('username').value.trim();\r
            const p = document.getElementById('password').value.trim();\r
            if ((u === ADMIN_AUTH.username && p === ADMIN_AUTH.password) || (u === SUPER_ADMIN_AUTH.username && p === SUPER_ADMIN_AUTH.password)) {\r
                currentUserRole = (u === SUPER_ADMIN_AUTH.username) ? 'super_admin' : 'admin';`;

const replaceLogin = `            const u = document.getElementById('username').value.trim().toLowerCase();\r
            const p = document.getElementById('password').value.trim();\r
            if ((u === 'admin' && p === 'Letshego2026!') || (u === 'admin02' && p === 'Letshego2026@IDH')) {\r
                currentUserRole = (u === 'admin02') ? 'super_admin' : 'admin';`;

if (html.includes(targetLogin)) {
    console.log("Matched login logic!");
    html = html.replace(targetLogin, replaceLogin);
    fs.writeFileSync('index.html', html, 'utf8');
} else {
    // Try LF
    const targetLoginLF = targetLogin.replace(/\r/g, '');
    const replaceLoginLF = replaceLogin.replace(/\r/g, '');
    if (html.includes(targetLoginLF)) {
        console.log("Matched login logic (LF)!");
        html = html.replace(targetLoginLF, replaceLoginLF);
        fs.writeFileSync('index.html', html, 'utf8');
    } else {
        console.log("Login logic not found.");
    }
}
