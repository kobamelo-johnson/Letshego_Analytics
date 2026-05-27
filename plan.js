const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const target = `        window.toggleSelectUser = (id) => {\n            if (window.selectedUsersForDeletion.has(id)) {\n                window.selectedUsersForDeletion.delete(id);\n            } else {\n                window.selectedUsersForDeletion.add(id);\n            }\n            document.getElementById('delete-count').innerText = window.selectedUsersForDeletion.size;\n        };`;

// Use regex replace to handle potential line-ending mismatches
const regexTarget = /window\.toggleSelectUser = \(id\) => \{[\s\S]*?document\.getElementById\('delete-count'\)\.innerText = window\.selectedUsersForDeletion\.size;\s*\};/;

if (regexTarget.test(html)) {
    html = html.replace(regexTarget, "");
    fs.writeFileSync('index.html', html, 'utf8');
    console.log("Deleted rogue function successfully.");
} else {
    console.error("Could not find the target code to delete.");
}
