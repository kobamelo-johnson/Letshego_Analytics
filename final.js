const fs = require('fs');

// 1. Read the valid test script
let js = fs.readFileSync('test_script.js', 'utf8');

// A. Fix authentication
const loginTarget = `            const u = document.getElementById('username').value.trim();\r
            const p = document.getElementById('password').value.trim();\r
            if ((u === ADMIN_AUTH.username && p === ADMIN_AUTH.password) || (u === SUPER_ADMIN_AUTH.username && p === SUPER_ADMIN_AUTH.password)) {\r
                currentUserRole = (u === SUPER_ADMIN_AUTH.username) ? 'super_admin' : 'admin';`;
const loginReplace = `            const u = document.getElementById('username').value.trim().toLowerCase();\n            const p = document.getElementById('password').value.trim();\n            if ((u === 'admin' && p === 'Letshego2026!') || (u === 'admin02' && p === 'Letshego2026@IDH')) {\n                currentUserRole = (u === 'admin02') ? 'super_admin' : 'admin';`;
if (js.includes(loginTarget)) { js = js.replace(loginTarget, loginReplace); }
else { js = js.replace(loginTarget.replace(/\r/g, ''), loginReplace); }

// B. Fix processExcel
const excelTarget = `                    } catch (e) {\r
                        Swal.fire('Error', 'Failed to import. Check console.', 'error');\r
                        console.error(e);\r
                    }\r
                }\r
            });\r
        };`;
const excelReplace = `                    } catch (e) {\n                        Swal.fire('Error', 'Failed to import. Check console.', 'error');\n                        console.error(e);\n                    }\n                } catch(err) {\n                    console.error(err);\n                }\n            };\n            reader.readAsArrayBuffer(file);\n        };`;
if (js.includes(excelTarget)) { js = js.replace(excelTarget, excelReplace); }
else { js = js.replace(excelTarget.replace(/\r/g, ''), excelReplace); }

// 2. We don't read index.html because it might be completely broken.
// Wait, index.html is actually functional except for the js logic being bad inside <script type="module">.
let html = fs.readFileSync('index.html', 'utf8');

// 3. Remove existing script logic from index.html
const startTag = '<script type="module">';
const endTag = '</script>';
const startIndex = html.indexOf(startTag);
const endIndex = html.indexOf(endTag, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const htmlBefore = html.substring(0, startIndex + startTag.length);
    const htmlAfter = html.substring(endIndex);
    html = htmlBefore + "\n" + js + "\n        " + htmlAfter;
}

// 4. Apply all HTML-level fixes.
// Viewport
html = html.replace(
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
);
// Fix bad backdrop order
html = html.replace(
    /backdrop-filter: blur\((.*?)\);\n\s*-webkit-backdrop-filter: blur\((.*?)\);/g,
    '-webkit-backdrop-filter: blur($1);\n            backdrop-filter: blur($2);'
);
// Fix style inline
html = html.replace(
    '.animate-slide-in-right {\n            animation: slideInRightFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;\n        }\n    </style>',
    '.animate-slide-in-right {\n            animation: slideInRightFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;\n        }\n        .animation-delay-1 {\n            animation-delay: 1s;\n        }\n    </style>'
);
html = html.replace(
    'class="absolute top-1/2 right-1/3 w-20 h-20 bg-white/10 rounded-lg backdrop-blur-md animate-float border border-white/20 transform -rotate-12"\n                style="animation-delay: 1s;"',
    'class="absolute top-1/2 right-1/3 w-20 h-20 bg-white/10 rounded-lg backdrop-blur-md animate-float border border-white/20 transform -rotate-12 animation-delay-1"'
);

const buttonsToFix = [
    { search: '<button onclick="toggleSidebar()"', replace: '<button onclick="toggleSidebar()" aria-label="Toggle Sidebar" title="Toggle Sidebar"' },
    { search: '<button onclick="closeYieldOverlay()"', replace: '<button onclick="closeYieldOverlay()" aria-label="Close" title="Close"' },
    { search: '<button onclick="closePipOverlay()"', replace: '<button onclick="closePipOverlay()" aria-label="Close" title="Close"' },
    { search: '<button onclick="closeDailyOverlay()"', replace: '<button onclick="closeDailyOverlay()" aria-label="Close" title="Close"' },
    { search: '<button onclick="closeSubmissionOverlay()"', replace: '<button onclick="closeSubmissionOverlay()" aria-label="Close" title="Close"' },
    { search: '<button onclick="closeKYCOverlay()"', replace: '<button onclick="closeKYCOverlay()" aria-label="Close" title="Close"' },
    { search: '<button onclick="closeRiskOverlay()"', replace: '<button onclick="closeRiskOverlay()" aria-label="Close" title="Close"' },
    { search: '<button onclick="closePriorityOverlay()"', replace: '<button onclick="closePriorityOverlay()" aria-label="Close" title="Close"' },
    { search: '<button onclick="closeModal(\'bulkModal\')"', replace: '<button onclick="closeModal(\'bulkModal\')" aria-label="Close" title="Close"' },
    { search: '<button onclick="closeModal(\'advancedUploadModal\')"', replace: '<button onclick="closeModal(\'advancedUploadModal\')" aria-label="Close" title="Close"' },
    { search: '<button onclick="closeModal(\'editModal\')"', replace: '<button onclick="closeModal(\'editModal\')" aria-label="Close" title="Close"' }
];
buttonsToFix.forEach(b => { html = html.split(b.search).join(b.replace); });

const selectsToFix = [
    { search: '<select id="dashboard-period-filter"', replace: '<select id="dashboard-period-filter" aria-label="Period Filter" title="Period Filter"' },
    { search: '<select id="filter-status"', replace: '<select id="filter-status" aria-label="Filter Status" title="Filter Status"' },
    { search: '<select id="filter-risk"', replace: '<select id="filter-risk" aria-label="Filter Risk" title="Filter Risk"' },
    { search: '<select id="filter-priority"', replace: '<select id="filter-priority" aria-label="Filter Priority" title="Filter Priority"' },
    { search: '<select id="yield-period-filter"', replace: '<select id="yield-period-filter" aria-label="Yield Period" title="Yield Period"' },
    { search: '<select id="yield-month-filter"', replace: '<select id="yield-month-filter" aria-label="Yield Month" title="Yield Month"' },
    { search: '<select id="daily-period-filter"', replace: '<select id="daily-period-filter" aria-label="Daily Period" title="Daily Period"' },
    { search: '<select id="daily-month-filter"', replace: '<select id="daily-month-filter" aria-label="Daily Month" title="Daily Month"' },
    { search: '<select id="submission-month-filter"', replace: '<select id="submission-month-filter" aria-label="Submission Month" title="Submission Month"' },
    { search: '<select id="bi-main-pointer"', replace: '<select id="bi-main-pointer" aria-label="Main Pointer" title="Main Pointer"' },
    { search: '<select id="bi-sub-pointer"', replace: '<select id="bi-sub-pointer" aria-label="Sub Pointer" title="Sub Pointer"' },
    { search: '<select id="edit-pip-status-select"', replace: '<select id="edit-pip-status-select" aria-label="PIP Status" title="PIP Status"' },
    { search: '<select id="edit-source-wealth"', replace: '<select id="edit-source-wealth" aria-label="Source of Wealth" title="Source of Wealth"' },
    { search: '<select id="edit-kyc-status"', replace: '<select id="edit-kyc-status" aria-label="KYC Status" title="KYC Status"' }
];
selectsToFix.forEach(s => { html = html.split(s.search).join(s.replace); });

const inputsToFix = [
    { search: '<input type="checkbox" id="theme-toggle" class="sr-only peer" onchange="toggleTheme()">', replace: '<input type="checkbox" id="theme-toggle" class="sr-only peer" onchange="toggleTheme()" aria-label="Toggle Theme" title="Toggle Theme">' },
    { search: '<input type="date" id="filter-date"', replace: '<input type="date" id="filter-date" aria-label="Filter Date" title="Filter Date"' },
    { search: '<input type="file" id="excel-file" accept=".xlsx, .xls"', replace: '<input type="file" id="excel-file" accept=".xlsx, .xls" aria-label="Upload Excel" title="Upload Excel"' },
    { search: '<input type="file" id="bi-excel-file" accept=".xlsx, .xls"', replace: '<input type="file" id="bi-excel-file" accept=".xlsx, .xls" aria-label="BI Excel" title="BI Excel"' },
    { search: '<input type="text" id="edit-name"', replace: '<input type="text" id="edit-name" aria-label="Edit Name" title="Edit Name"' },
    { search: '<input type="text" id="edit-contact"', replace: '<input type="text" id="edit-contact" aria-label="Contact" title="Contact"' },
    { search: '<input type="text" id="edit-payout"', replace: '<input type="text" id="edit-payout" aria-label="Payout Date" title="Payout Date"' },
    { search: '<input type="text" id="edit-years"', replace: '<input type="text" id="edit-years" aria-label="Years Since Payout" title="Years Since Payout"' },
    { search: '<input type="file" id="file-omang" class="hidden"', replace: '<input type="file" id="file-omang" class="hidden" aria-label="Omang File" title="Omang File"' },
    { search: '<input type="file" id="file-payslip" class="hidden"', replace: '<input type="file" id="file-payslip" class="hidden" aria-label="Payslip File" title="Payslip File"' },
    { search: '<input type="file" id="file-utility" class="hidden"', replace: '<input type="file" id="file-utility" class="hidden" aria-label="Utility Bill" title="Utility Bill"' },
    { search: '<input type="file" id="file-confirm" class="hidden"', replace: '<input type="file" id="file-confirm" class="hidden" aria-label="Confirmation Letter" title="Confirmation Letter"' },
    { search: '<input type="file" id="file-affidavit" class="hidden"', replace: '<input type="file" id="file-affidavit" class="hidden" aria-label="Affidavit File" title="Affidavit File"' }
];
inputsToFix.forEach(i => { html = html.split(i.search).join(i.replace); });

fs.writeFileSync('index.html', html, 'utf8');
console.log('Done fully reconstructing and fixing index.html with reader start and all tags!');
