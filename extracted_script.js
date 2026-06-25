

    // 1. CONFIGURATION
    const firebaseConfig = {
        apiKey: "AIzaSyCAH-tumQ2fIaGYmKr4s2oYFcc7_0fB1RQ",
        authDomain: "letshego-priority-kyc.firebaseapp.com",
        projectId: "letshego-priority-kyc",
        storageBucket: "letshego-priority-kyc.firebasestorage.app",
        messagingSenderId: "743962858388",
        appId: "1:743962858388:web:c3b4141973ec279e2db581"
    };

    const ADMIN_AUTH = {
        username: "admin",
        password: "Letshego2026!"
    };
    const SUPER_ADMIN_AUTH = {
        username: "admin02",
        password: "Letshego2026@IDH"
    };
    // Import Firebase
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
    import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
    import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
    // Initialize App
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const storage = getStorage(app);
    // Global State
    let currentUserRole = 'admin'; // 'admin' or 'super_admin'
    let allCustomers = [];
    let filteredCustomers = [];
    let charts = {};

    let currentPage = 1;
    const itemsPerPage = 15;

    let selectedPipStatusForDownload = null;
    let selectedDateForDownload = null;
    let selectedSubmissionDateForDownload = null;
    let selectedKYCType = null;

    let currentYieldUsers = [];
    let currentYieldBucket = "";
    // Advanced BI Global State
    let advancedBatches = JSON.parse(localStorage.getItem('letshego_advanced_batches')) || [];
    let biChart = null;
    // Date Format Helper
    const formatReadableDate = (dateStr) => {
        if (!dateStr || dateStr === '1970-01-01T00:00:00.000Z') return 'N/A';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    // --- UI/UX & MODAL LOGIC ---
    window.openModal = (id) => {
        const el = document.getElementById(id);
        el.classList.remove('hidden');
        el.classList.add('flex');
        setTimeout(() => {
            el.classList.remove('opacity-0');
            el.querySelector('.transform').classList.remove('scale-95');
            el.querySelector('.transform').classList.add('scale-100');
        }, 10);
    };

    window.closeModal = (id) => {
        const el = document.getElementById(id);
        el.classList.add('opacity-0');
        el.querySelector('.transform').classList.remove('scale-100');
        el.querySelector('.transform').classList.add('scale-95');
        setTimeout(() => {
            el.classList.add('hidden');
            el.classList.remove('flex');
        }, 300);
    };
    // --- SIDEBAR TOGGLE LOGIC ---
    window.toggleSidebar = () => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const isClosed = sidebar.classList.contains('-translate-x-full');
        if (isClosed) {
            sidebar.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden');
        } else {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        }
    };
    window.toggleSidebarIfMobile = () => {
        if (window.innerWidth < 768) {
            window.toggleSidebar();
        }
    };
    // --- THEME HANDLING ---
    window.toggleTheme = () => {
        const html = document.documentElement;
        const checkbox = document.getElementById('theme-toggle');

        if (checkbox.checked) {
            html.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            html.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
        updateCharts();
        if (document.getElementById('view-advanced').classList.contains('hidden') === false) {
            refreshAdvancedBI();
        }
    };
    // Init Theme
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
        document.documentElement.classList.add('dark');
        document.getElementById('theme-toggle').checked = true;
    }
    // 2. AUTHENTICATION & INIT
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('username').value.trim().toLowerCase();
        const p = document.getElementById('password').value.trim();
        if ((u === 'admin' && p === 'Letshego2026!') || (u === 'admin02' && p === 'Letshego2026@IDH')) {
            currentUserRole = (u === 'admin02') ? 'super_admin' : 'admin';
            const btn = e.target.querySelector('button');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';

            setTimeout(() => {
                document.getElementById('login-overlay').style.opacity = '0';
                document.getElementById('app-layout').classList.remove('opacity-0', 'pointer-events-none');
                document.getElementById('app-layout').classList.add('opacity-100');
                setTimeout(() => document.getElementById('login-overlay').remove(), 500);

                // Display Current Date in Header
                const now = new Date();
                const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                document.getElementById('current-header-date').innerText = now.toLocaleDateString('en-US', options);
                initDataListener(); initLoanListener();

                // Super Admin Profile Visuals (gold avatar + diamond indicator)
                if (currentUserRole === 'super_admin') {
                    const avatar = document.getElementById('profile-avatar');
                    const nameEl = document.getElementById('profile-name');
                    const statusEl = document.getElementById('profile-status');
                    avatar.src = 'https://ui-avatars.com/api/?name=Super+Admin&background=FFD700&color=000000';
                    nameEl.innerText = 'Super Admin';
                    statusEl.innerHTML = '<i class="fas fa-gem mr-1"></i>SUPER ADMIN';
                    statusEl.className = 'text-xs text-amber-500 font-medium';
                    document.getElementById('super-admin-tools').classList.remove('hidden');
                    const navBtnDeleteAll = document.getElementById('nav-btn-delete-all');
                    if (navBtnDeleteAll) navBtnDeleteAll.classList.remove('hidden');
                    if (window._showSuperAdminPortalTools) window._showSuperAdminPortalTools();
                }
            }, 800);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Access Denied',
                text: 'Invalid credentials provided.',
                confirmButtonColor: '#EE5D50'
            });
        }
    });
    // 3. KYC LOGIC - EDITED TO PULL FROM DATABASE MARKERS
    function calculateFileCount(data) {
        // We keep the file count ONLY for visual reference on the UI,
        // but the status strictly follows the new database markers.
        const otherDocsCount = [
            data.payslip_url,
            data.utility_bill_url,
            data.confirmation_letter_url,
            data.affidavit_url,
            data.omang_file_url
        ].filter(f => f && f.length > 5).length;
        return {
            total: otherDocsCount,
            isComplete: data.kyc_status === 'complete',
            kycStatus: data.kyc_status || 'not_set',
            lastStep: data.last_completed_step || ''
        };
    }
    function getBucket(dateStr, period) {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        if (isNaN(d)) return null;

        if (period === 'monthly') {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        } else if (period === 'weekly') {
            const day = d.getDay() || 7;
            d.setHours(-24 * (day - 1));
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} (Wk)`;
        } else {
            return dateStr.split('T')[0];
        }
    }
    // Helper for CSV export
    function downloadExcelHelper(filename, data) {
        if (!data || data.length === 0) {
            Swal.fire('Info', 'No data to export.', 'info');
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, filename.replace('.xlsx', '.xlsx'));
    }
    // Export Functions
    window.downloadTrendsCSV = () => {
        const periodEl = document.getElementById('dashboard-period-filter');
        const period = periodEl ? periodEl.value : 'daily';
        const dailyCountsTotal = {};
        allCustomers.forEach(c => {
            if (c.kycStatus === 'complete' && c.last_activity) {
                const bucket = getBucket(c.last_activity, period);
                if (bucket) dailyCountsTotal[bucket] = (dailyCountsTotal[bucket] || 0) + 1;
            }
        });
        const sortedTotalDates = Object.keys(dailyCountsTotal).sort();
        const exportData = sortedTotalDates.map(date => ({ Date: date, Onboarded_Count: dailyCountsTotal[date] }));
        downloadExcelHelper(`Onboarding_Trends_${period}.xlsx`, exportData);
    };
    window.downloadStatusCSV = () => {
        const stats = updateStats();
        const data = [
            { Status: 'Pending', Count: stats.pending },
            { Status: 'In Progress', Count: stats.total - stats.pending - stats.completed },
            { Status: 'Completed', Count: stats.completed }
        ];
        downloadExcelHelper('Onboarding_Status_Distribution.xlsx', data);
    };
    window.downloadPipSummaryCSV = () => {
        const pipCounts = {};
        allCustomers.forEach(c => {
            let status = c.display_pip_status || 'Not Set';
            pipCounts[status] = (pipCounts[status] || 0) + 1;
        });
        const data = Object.keys(pipCounts).map(k => ({ PIP_Status: k, User_Count: pipCounts[k] }));
        downloadExcelHelper('PIP_Summary_Analyses.xlsx', data);
    };
    window.downloadDailySummaryCSV = () => {
        const dailyUserCounts = {};
        const period = document.getElementById('daily-period-filter').value;
        allCustomers.forEach(c => {
            const baseDate = c.last_activity || c.created_at;
            if (baseDate) {
                const bucket = getBucket(baseDate, period);
                if (bucket) {
                    dailyUserCounts[bucket] = (dailyUserCounts[bucket] || 0) + 1;
                }
            }
        });
        const data = Object.keys(dailyUserCounts).sort().map(d => ({ Period: d, Unique_Users_Active: dailyUserCounts[d] }));
        downloadExcelHelper(`Activity_Summary_${period}.xlsx`, data);
    };
    window.downloadSubmissionSummaryCSV = () => {
        const dailySubmissionCounts = {};
        allCustomers.forEach(c => {
            if (c.last_upload_date) {
                const dateKey = c.last_upload_date.split('T')[0];
                dailySubmissionCounts[dateKey] = (dailySubmissionCounts[dateKey] || 0) + 1;
            }
        });
        const data = Object.keys(dailySubmissionCounts).sort().map(d => ({ Date: d, Total_Submissions: dailySubmissionCounts[d] }));
        downloadExcelHelper('Daily_Submission_Summary.xlsx', data);
    };
    window.downloadDocumentYieldCSV = () => {
        if (!charts.docYieldBar) return;
        const labels = charts.docYieldBar.data.labels;
        const datasets = charts.docYieldBar.data.datasets;

        let exportData = [];
        for (let i = 0; i < labels.length; i++) {
            let row = { Period: labels[i] };
            datasets.forEach(ds => {
                row[ds.label] = ds.data[i];
            });
            exportData.push(row);
        }
        downloadExcelHelper('File_Tracking_Timeline.xlsx', exportData);
    };
    window.downloadYieldList = () => {
        if (!currentYieldUsers || currentYieldUsers.length === 0) return;
        const data = currentYieldUsers.map(u => {
            let files = [];
            if (u.omang_file_url?.length > 5) files.push('Omang');
            if (u.utility_bill_url?.length > 5) files.push('Utility');
            if (u.confirmation_letter_url?.length > 5) files.push('Confirm');
            if (u.affidavit_url?.length > 5) files.push('Affidavit');
            if (u.payslip_url?.length > 5) files.push('Payslip');
            return {
                Name: u.full_name,
                Omang: u.omang,
                Furthest_Step: u.furthest,
                Files_Uploaded: files.join(', ')
            };
        });
        downloadExcelHelper(`Yield_Funnel_${currentYieldBucket}.xlsx`, data);
    };
    // Helper: fetch a file blob robustly (direct → CORS proxy → XHR fallback)
    async function fetchFileBlob(url) {
        // 1. Try direct fetch
        try {
            const response = await fetch(url, { mode: 'cors' });
            if (response.ok) {
                const blob = await response.blob();
                if (blob.size > 0) return blob;
            }
        } catch (_) { /* try next */ }

        // 2. Try CORS proxy
        try {
            const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
            const response = await fetch(proxyUrl);
            if (response.ok) {
                const blob = await response.blob();
                if (blob.size > 0) return blob;
            }
        } catch (_) { /* try next */ }

        // 3. XMLHttpRequest fallback (handles some environments that block fetch CORS)
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'blob';
            xhr.onload = () => {
                if (xhr.status === 200 && xhr.response && xhr.response.size > 0) {
                    resolve(xhr.response);
                } else {
                    reject(new Error(`XHR failed with status ${xhr.status}`));
                }
            };
            xhr.onerror = () => reject(new Error('XHR network error'));
            xhr.send();
        });
    }

    // Helper: detect extension from blob type OR url
    function detectExt(blob, url) {
        if (blob.type === 'application/pdf' || blob.type === 'application/octet-stream') return '.pdf';
        if (blob.type === 'image/jpeg') return '.jpg';
        if (blob.type === 'image/png') return '.png';
        if (blob.type === 'image/gif') return '.gif';
        if (blob.type === 'image/webp') return '.webp';
        // Fallback: sniff from URL
        const urlLower = (url || '').toLowerCase().split('?')[0];
        if (urlLower.endsWith('.pdf')) return '.pdf';
        if (urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg')) return '.jpg';
        if (urlLower.endsWith('.png')) return '.png';
        // Firebase Storage paths often encode the extension in the path segment
        const match = urlLower.match(/\.(pdf|jpg|jpeg|png|gif|webp|doc|docx)[&%]/);
        if (match) return '.' + match[1].replace('jpeg', 'jpg');
        return '.pdf'; // default assumption for KYC docs
    }

    window.downloadUserDocs = async (id) => {
        const user = allCustomers.find(u => u.id === id);
        if (!user) return;

        const docsToDownload = [
            { url: user.omang_file_url, prefix: 'Omang' },
            { url: user.payslip_url, prefix: 'Payslip' },
            { url: user.utility_bill_url, prefix: 'Utility_Bill' },
            { url: user.confirmation_letter_url, prefix: 'Confirmation_Letter' },
            { url: user.affidavit_url, prefix: 'Affidavit' }
        ].filter(item => item.url && item.url.length > 5);

        if (docsToDownload.length === 0) {
            Swal.fire('Info', 'No documents available for this user.', 'info');
            return;
        }

        Swal.fire({
            title: 'Preparing ZIP Archive',
            html: `Fetching <b>${docsToDownload.length}</b> document(s) for <b>${user.full_name || id}</b>. Please wait…`,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const zip = new JSZip();
            let failed = 0;

            for (const docItem of docsToDownload) {
                try {
                    const blob = await fetchFileBlob(docItem.url);
                    const ext = detectExt(blob, docItem.url);
                    zip.file(`${docItem.prefix}${ext}`, blob);
                } catch (e) {
                    console.warn(`Could not fetch ${docItem.prefix}:`, e);
                    failed++;
                }
            }

            if (zip.files && Object.keys(zip.files).length === 0) {
                throw new Error('All files failed to download');
            }

            const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
            const downloadUrl = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = downloadUrl;
            const safeUserName = (user.full_name || 'User').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            a.download = `Letshego_${safeUserName}_Documents.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);

            Swal.close();
            if (failed > 0) {
                Swal.fire({ icon: 'warning', title: 'Partial Download', html: `ZIP created with <b>${docsToDownload.length - failed}</b> file(s). <b>${failed}</b> could not be fetched.` });
            } else {
                Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, icon: 'success', title: 'ZIP downloaded successfully!' });
            }
        } catch (error) {
            console.error('ZIP creation failed:', error);
            Swal.fire({
                title: 'Download Error',
                html: 'Could not bundle files. Opening them individually in new tabs instead.',
                icon: 'warning'
            }).then(() => {
                docsToDownload.forEach((docItem, index) => {
                    setTimeout(() => {
                        const a = document.createElement('a');
                        a.href = docItem.url;
                        a.target = '_blank';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }, index * 800);
                });
            });
        }
    };

    /* ── Download ALL (filtered) customers' documents as one ZIP ──────── */
    window.downloadAllCustomersDocs = async () => {
        // Use FILTERED list so the download respects current table filters.
        // Also skip any customer that has zero uploaded files.
        const sourceList = filteredCustomers.length > 0 ? filteredCustomers : allCustomers;
        const customersWithDocs = sourceList.map(c => ({
            id: c.id,
            name: (c.full_name || c.id || 'Unknown').replace(/[^a-z0-9 _-]/gi, '_'),
            docs: [
                { url: c.omang_file_url, prefix: 'Omang' },
                { url: c.payslip_url, prefix: 'Payslip' },
                { url: c.utility_bill_url, prefix: 'Utility_Bill' },
                { url: c.confirmation_letter_url, prefix: 'Confirmation_Letter' },
                { url: c.affidavit_url, prefix: 'Affidavit' }
            ].filter(d => d.url && d.url.length > 5)
        })).filter(c => c.docs.length > 0); // ← only customers with at least 1 file

        if (customersWithDocs.length === 0) {
            Swal.fire('No Documents', 'No documents found in the current filtered list.', 'info');
            return;
        }

        const totalFiles = customersWithDocs.reduce((s, c) => s + c.docs.length, 0);
        const isFiltered = filteredCustomers.length > 0 && filteredCustomers.length !== allCustomers.length;

        const confirm = await Swal.fire({
            title: 'Download Files',
            html: `This will bundle <b>${totalFiles} file(s)</b> from <b>${customersWithDocs.length} customer(s)</b>${isFiltered ? ' <span style="color:#FFD100">(current filter)</span>' : ''} into one ZIP archive.<br><small style="color:#888">Only customers with uploaded files are included.</small>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#FFD100',
            confirmButtonText: '<i class="fas fa-cloud-download-alt"></i> Yes, Download',
            cancelButtonText: 'Cancel'
        });
        if (!confirm.isConfirmed) return;

        let processed = 0;
        Swal.fire({
            title: 'Preparing Archive…',
            html: `<div id="swal-dl-progress">Fetching file 0 of ${totalFiles}…</div>
                       <div class="w-full bg-gray-200 rounded-full h-2 mt-3"><div id="swal-dl-bar" class="bg-yellow-400 h-2 rounded-full transition-all" style="width:0%"></div></div>`,
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });

        const updateProgress = (current, total, label) => {
            const pct = Math.round((current / total) * 100);
            const el = document.getElementById('swal-dl-progress');
            const bar = document.getElementById('swal-dl-bar');
            if (el) el.textContent = label || `Fetching file ${current} of ${total}…`;
            if (bar) bar.style.width = pct + '%';
        };

        try {
            const zip = new JSZip();
            let failed = 0;

            for (const customer of customersWithDocs) {
                const folderName = (customer.name.trim() || customer.id).substring(0, 60);
                const folder = zip.folder(folderName);

                for (const docItem of customer.docs) {
                    processed++;
                    updateProgress(processed, totalFiles, `Fetching ${docItem.prefix} for ${customer.name.trim()}…`);

                    try {
                        const blob = await fetchFileBlob(docItem.url);
                        const ext = detectExt(blob, docItem.url);
                        folder.file(`${docItem.prefix}${ext}`, blob);
                    } catch (fetchErr) {
                        console.warn(`Could not fetch ${docItem.prefix} for ${customer.name}:`, fetchErr);
                        failed++;
                    }
                }
            }

            updateProgress(totalFiles, totalFiles, 'Compressing archive…');
            const content = await zip.generateAsync(
                { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
                (metadata) => {
                    const bar = document.getElementById('swal-dl-bar');
                    const el = document.getElementById('swal-dl-progress');
                    if (bar) bar.style.width = Math.round(metadata.percent) + '%';
                    if (el) el.textContent = `Compressing… ${Math.round(metadata.percent)}%`;
                }
            );

            const now = new Date().toISOString().slice(0, 10);
            const downloadUrl = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `Letshego_KYC_Documents_${now}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);

            Swal.close();
            Swal.fire({
                icon: failed > 0 ? 'warning' : 'success',
                title: 'Download Complete',
                html: failed > 0
                    ? `ZIP created with <b>${totalFiles - failed}</b> file(s). <b>${failed}</b> could not be fetched (network/CORS restriction).`
                    : `All <b>${totalFiles}</b> document(s) from <b>${customersWithDocs.length}</b> customer(s) downloaded successfully!`,
                toast: failed === 0,
                position: failed === 0 ? 'top-end' : 'center',
                showConfirmButton: failed > 0,
                timer: failed === 0 ? 4000 : undefined
            });
        } catch (err) {
            console.error('Download All Files failed:', err);
            Swal.fire('Error', 'An unexpected error occurred while creating the archive. Please try again.', 'error');
        }
    };

    window.exportAnalyticsPDF = () => {
        const element = document.getElementById('analytics-pdf-area');

        Chart.defaults.plugins.datalabels.display = true;
        for (let id in Chart.instances) { Chart.instances[id].update('none'); }

        const opt = {
            margin: 0.5,
            filename: 'Letshego_Analytics_Report.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' },
            pagebreak: { mode: ['css', 'legacy'] }
        };
        Swal.fire({ title: 'Generating PDF...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        html2pdf().set(opt).from(element).save().then(() => {
            Swal.close();
            Chart.defaults.plugins.datalabels.display = false;
            for (let id in Chart.instances) { Chart.instances[id].update('none'); }
        });
    };
    // 4. DATA LISTENER (REALTIME)
    function initDataListener() {
        const unsub = onSnapshot(collection(db, "customers"), (snapshot) => {
            allCustomers = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                const kyc = calculateFileCount(data);

                let displayPipStatus = data.pip_status || 'Not Set';
                const lastActivity = data.last_activity || data.last_upload_date || data.created_at || '1970-01-01T00:00:00.000Z';
                allCustomers.push({
                    id: doc.id,
                    omang: doc.id.replace('ID', ''),
                    ...data,
                    display_pip_status: displayPipStatus,
                    fileCount: kyc.total,
                    isComplete: kyc.isComplete,
                    kycStatus: kyc.kycStatus,
                    lastStep: kyc.lastStep,
                    sortTime: new Date(lastActivity).getTime(),
                    latestDate: lastActivity,
                    last_action: data.last_action || 'Registration'
                });
            });

            // SORT BY DATE LATEST ACTIVITY GOING DOWN
            allCustomers.sort((a, b) => b.sortTime - a.sortTime);
            updateStats();
            renderTable();
            updateCharts();
            updateBatchDropdown();
            refreshAdvancedBI();
        });
    }
    // --- REFRESH DATA SIMULATION ---
    window.refreshData = () => {
        const btn = document.querySelector('button[onclick="refreshData()"] i');
        if (btn) btn.classList.add('fa-spin');

        renderTable();
        updateCharts();
        refreshAdvancedBI();

        setTimeout(() => {
            if (btn) btn.classList.remove('fa-spin');
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Data Refreshed Successfully' });
        }, 600);
    };
    // 5. NAVIGATION LOGIC
    window.navTo = (page) => {
        document.querySelectorAll('main section').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${page}`).classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-nav', 'bg-light', 'text-primary'));

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('bg-light', 'text-primary');
            btn.classList.remove('dark:bg-night-hover', 'dark:text-white');
        });

        const btn = document.getElementById(`nav-${page}`);
        btn.classList.add('active-nav', 'bg-light', 'text-primary');

        const titles = {
            'dashboard': 'Dashboard Overview',
            'users': 'User Management',
            'analytics': 'Analytics & Reports',
            'loan-analytics': 'Chatbot User Analytics',
            'advanced': 'Advanced BI Playground'
        };
        document.getElementById('page-title').innerText = titles[page];
        if (page === 'loan-analytics') {
            setTimeout(() => { try { updateLoanAnalytics(); renderLoanTable(); } catch (e) { } }, 120);
        }
        if (page === 'advanced') {
            setTimeout(refreshAdvancedBI, 100);
        }
    };
    // 6. RENDER TABLE (PULLING FROM LAST STEP AND KYC STATUS)
    window.renderTable = () => {
        const filterStatus = document.getElementById('filter-status').value;
        const filterRisk = document.getElementById('filter-risk').value;
        const filterPriority = document.getElementById('filter-priority').value;
        const filterDate = document.getElementById('filter-date').value;
        const searchTerm = document.getElementById('table-search').value.toLowerCase();
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';
        filteredCustomers = allCustomers.filter(c => {
            let matchesStatus = true;
            if (filterStatus === 'pending') matchesStatus = !c.lastStep;
            else if (filterStatus === 'incomplete') matchesStatus = c.kycStatus === 'incomplete' || (c.lastStep && c.kycStatus !== 'complete');
            else if (filterStatus === 'completed') matchesStatus = c.kycStatus === 'complete';
            else if (filterStatus === 'pip_only') matchesStatus = (c.display_pip_status !== 'Not Set') && !c.lastStep;

            let matchesRisk = true;
            if (filterRisk !== 'all') {
                matchesRisk = (c.risk_rating || '').toLowerCase() === filterRisk;
            }

            let matchesPriority = true;
            if (filterPriority !== 'all') {
                matchesPriority = (c.priority || '').toLowerCase() === filterPriority;
            }

            if (filterDate) {
                const actDate = c.latestDate ? c.latestDate.split('T')[0] : '';
                if (actDate !== filterDate) matchesStatus = false;
            }
            const matchesSearch = (c.full_name || '').toLowerCase().includes(searchTerm) || (c.omang || '').includes(searchTerm);
            return matchesStatus && matchesRisk && matchesPriority && matchesSearch;
        });
        const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
        if (currentPage > totalPages) currentPage = totalPages || 1;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);
        document.getElementById('showing-text').innerText = `Showing ${filteredCustomers.length > 0 ? startIndex + 1 : 0}-${Math.min(endIndex, filteredCustomers.length)} of ${filteredCustomers.length} users`;

        if (filteredCustomers.length === 0) {
            document.getElementById('table-empty-state').classList.remove('hidden');
            renderPaginationControls(totalPages);
            return;
        } else {
            document.getElementById('table-empty-state').classList.add('hidden');
        }
        paginatedCustomers.forEach(c => {
            const tr = document.createElement('tr');
            let extraClass = "hover:bg-gray-50 dark:hover:bg-night-hover transition-colors group border-b border-gray-50 dark:border-night-border hover:-translate-y-[1px]";

            if (window.isSelectDeleteMode) {
                extraClass += " cursor-pointer";
                tr.onclick = (e) => {
                    if (e.target.closest('button')) return;
                    toggleSelectUser(c.id, tr);
                };
                if (window.selectedUsersForDeletion.has(c.id)) {
                    extraClass += " !bg-yellow-100 dark:!bg-yellow-900/50 border-l-4 !border-l-primary !border-b-yellow-200 dark:!border-b-yellow-900/60 opacity-100 font-medium";
                }
            }
            tr.className = extraClass;

            let statusBadge = '';
            const currentKYC = c.kycStatus;
            if (currentKYC === 'complete') {
                statusBadge = `<span class="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300 text-xs font-semibold shadow-sm">Completed</span>`;
            } else if (currentKYC === 'incomplete') {
                statusBadge = `<span class="px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 text-xs font-semibold shadow-sm">Incomplete</span>`;
            } else if (currentKYC === 'not_set' || !c.lastStep) {
                statusBadge = `<span class="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-[10px] font-semibold shadow-sm">Not Set</span>`;
            } else {
                const stepName = c.lastStep.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                statusBadge = `<span class="px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 text-xs font-semibold shadow-sm">Incomplete (${stepName})</span>`;
            }
            let vaultHTML = '<div class="flex flex-wrap">';

            let idLabel = 'Omang';
            let idIcon = 'fa-id-card';
            if (/^[a-zA-Z]/.test(c.omang)) {
                idLabel = 'Passport';
                idIcon = 'fa-passport';
            }
            if (c.omang_file_url && c.omang_file_url.length > 5) {
                vaultHTML += `<a href="${c.omang_file_url}" target="_blank" class="file-chip"><i class="fas ${idIcon}"></i> ${idLabel}</a>`;
            }
            if (c.payslip_url && c.payslip_url.length > 5) vaultHTML += `<a href="${c.payslip_url}" target="_blank" class="file-chip"><i class="fas fa-money-bill"></i> Slip</a>`;
            if (c.utility_bill_url && c.utility_bill_url.length > 5) vaultHTML += `<a href="${c.utility_bill_url}" target="_blank" class="file-chip"><i class="fas fa-bolt"></i> Bill</a>`;
            if (c.confirmation_letter_url && c.confirmation_letter_url.length > 5) vaultHTML += `<a href="${c.confirmation_letter_url}" target="_blank" class="file-chip"><i class="fas fa-envelope"></i> Letter</a>`;
            if (c.affidavit_url && c.affidavit_url.length > 5) vaultHTML += `<a href="${c.affidavit_url}" target="_blank" class="file-chip"><i class="fas fa-gavel"></i> Oath</a>`;
            vaultHTML += '</div>';
            let pipBadge = '';
            const pStatus = c.display_pip_status;
            if (pStatus === 'Not Set') {
                pipBadge = `<span class="bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-1 rounded text-[10px] font-semibold">Not Set</span>`;
            } else if (pStatus === 'None') {
                pipBadge = `<span class="bg-green-100 dark:bg-green-900/40 text-success border border-green-200 dark:border-green-800 px-2 py-1 rounded text-[10px] font-bold shadow-sm"><i class="fas fa-shield-alt mr-1"></i>None</span>`;
            } else {
                pipBadge = `<span class="bg-red-50 dark:bg-red-900/40 text-danger border border-red-100 dark:border-red-800 px-2 py-1 rounded text-[10px] font-bold shadow-sm"><i class="fas fa-exclamation-triangle mr-1"></i>${pStatus}</span>`;
            }

            let riskBadge = '';
            if (c.risk_rating === 'HIGH') riskBadge = `<span class="bg-red-100 dark:bg-[#4A1010] text-danger dark:text-red-400 border border-red-200 dark:border-red-900/50 px-2 py-1 rounded text-[10px] font-bold shadow-sm">${c.risk_rating}</span>`;
            else if (c.risk_rating === 'MEDIUM') riskBadge = `<span class="bg-yellow-100 dark:bg-[#4D3800] text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/50 px-2 py-1 rounded text-[10px] font-bold shadow-sm">${c.risk_rating}</span>`;
            else if (c.risk_rating === 'LOW') riskBadge = `<span class="bg-green-100 dark:bg-[#0B3D1B] text-success dark:text-[#05CD99] border border-green-200 dark:border-green-900/50 px-2 py-1 rounded text-[10px] font-bold shadow-sm">${c.risk_rating}</span>`;
            else riskBadge = `<span class="bg-gray-100 dark:bg-night-input text-gray-500 dark:text-night-muted border border-transparent dark:border-night-border px-2 py-1 rounded text-[10px] font-bold shadow-sm">${c.risk_rating || 'N/A'}</span>`;

            tr.innerHTML = `
                    <td class="p-4">
                        <div class="flex items-center gap-3">
                            <div class="h-8 w-8 min-w-[2rem] rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30 shadow-sm">
                                ${getInitials(c.full_name)}
                            </div>
                            <span onclick="event.stopImmediatePropagation(); window.editUser('${c.id}')" class="font-medium text-sm text-dark dark:text-white truncate max-w-[150px] cursor-pointer hover:text-primary hover:underline transition-colors">${c.full_name || 'Unknown'}</span>
                        </div>
                    </td>
                    <td class="p-4 text-sm text-gray-500 dark:text-gray-400 font-mono">${c.omang}</td>
                    <td class="p-4">${riskBadge}</td>
                    <td class="p-4 text-sm font-medium">
                        <span class="${(c.priority || 'N/A').toUpperCase() === 'HIGH' ? 'text-red-500 font-bold' : (c.priority || 'N/A').toUpperCase() === 'MEDIUM' ? 'text-orange-500 font-bold' : (c.priority || 'N/A').toUpperCase() === 'LOW' ? 'text-green-500 font-bold' : 'text-gray-700 dark:text-gray-300'}">
                            ${c.priority || 'N/A'}
                        </span>
                    </td>
                    <td class="p-4">${pipBadge}</td>
                    <td class="p-4 min-w-[150px]">${vaultHTML}</td>
                    <td class="p-4">${statusBadge}</td>
                    <td class="p-4 text-[11px] text-gray-500 font-mono leading-tight">
                        <div class="mb-1 text-primary font-bold uppercase tracking-wider text-[10px] bg-primary/10 px-2 py-0.5 rounded w-fit">${c.last_action}</div>
                        ${formatReadableDate(c.latestDate)}
                    </td>
                    <td class="p-4 text-right">
                        <div class="flex justify-end gap-1">
                            <button onclick="window.downloadUserDocs('${c.id}')" class="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all p-2 rounded hover:bg-light dark:hover:bg-zinc-700" title="Download All Files">
                                <i class="fas fa-download"></i>
                            </button>
                            <button onclick="window.editUser('${c.id}')" class="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-all p-2 rounded hover:bg-light dark:hover:bg-zinc-700" title="Edit/Upload">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button onclick="window.deleteUser('${c.id}')" class="text-gray-400 hover:text-danger transition-all p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete User">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                `;
            tbody.appendChild(tr);
        });
        renderPaginationControls(totalPages);
    };
    window.changePage = (page) => {
        currentPage = page;
        renderTable();
    };
    function renderPaginationControls(totalPages) {
        const container = document.getElementById('pagination-controls');
        if (!container) return;
        container.innerHTML = '';
        if (totalPages <= 1) return;
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '<i class="fas fa-chevron-left text-xs"></i>';
        prevBtn.className = `px-2 py-1 mx-0.5 rounded border dark:border-night-border transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer'}`;
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => changePage(currentPage - 1);
        container.appendChild(prevBtn);
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        if (startPage > 1) {
            const btn = document.createElement('button');
            btn.innerText = '1';
            btn.className = `px-2.5 py-1 mx-0.5 rounded border dark:border-night-border text-xs transition-colors hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer`;
            btn.onclick = () => changePage(1);
            container.appendChild(btn);
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.innerText = '...';
                ellipsis.className = 'px-1 text-xs text-gray-500';
                container.appendChild(ellipsis);
            }
        }
        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement('button');
            btn.innerText = i;
            btn.className = `px-2.5 py-1 mx-0.5 rounded border text-xs transition-colors ${currentPage === i ? 'bg-primary text-black font-bold border-primary' : 'dark:border-night-border hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer'}`;
            btn.onclick = () => changePage(i);
            container.appendChild(btn);
        }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.innerText = '...';
                ellipsis.className = 'px-1 text-xs text-gray-500';
                container.appendChild(ellipsis);
            }
            const btn = document.createElement('button');
            btn.innerText = totalPages;
            btn.className = `px-2.5 py-1 mx-0.5 rounded border dark:border-night-border text-xs transition-colors hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer`;
            btn.onclick = () => changePage(totalPages);
            container.appendChild(btn);
        }
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '<i class="fas fa-chevron-right text-xs"></i>';
        nextBtn.className = `px-2 py-1 mx-0.5 rounded border dark:border-night-border transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer'}`;
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => changePage(currentPage + 1);
        container.appendChild(nextBtn);
    }
    // 7. EDIT & EXECUTE CARD LOGIC
    window.editUser = (id) => {
        const user = allCustomers.find(u => u.id === id);
        if (!user) return;

        document.getElementById('edit-id').value = id;
        document.getElementById('edit-name').value = user.full_name || '';
        document.getElementById('edit-reg-date').innerText = formatReadableDate(user.created_at);

        document.getElementById('edit-pip-status-select').value = user.pip_status || 'Not Set';
        document.getElementById('edit-source-wealth').value = user.source_of_wealth || 'Not Set';

        document.getElementById('edit-contact').value = user.contact_details || '';
        document.getElementById('edit-payout').value = user.payout_date || '';
        document.getElementById('edit-years').value = user.years_since_payout || '';

        document.getElementById('edit-risk-rating').value = user.risk_rating || 'N/A';
        document.getElementById('edit-priority').value = user.priority || 'N/A';

        // SUPER ADMIN CHECK
        if (currentUserRole === 'super_admin') {
            document.getElementById('super-admin-kyc-override').classList.remove('hidden');
            document.getElementById('edit-kyc-status').value = user.kyc_status || 'not_set';
        } else {
            document.getElementById('super-admin-kyc-override').classList.add('hidden');
        }
        setFileStatusWithDelete('status-omang', 'del-btn-omang', user.omang_file_url);
        setFileStatusWithDelete('status-payslip', 'del-btn-payslip', user.payslip_url);
        setFileStatusWithDelete('status-utility', 'del-btn-utility', user.utility_bill_url);
        setFileStatusWithDelete('status-confirm', 'del-btn-confirm', user.confirmation_letter_url);
        setFileStatusWithDelete('status-affidavit', 'del-btn-affidavit', user.affidavit_url);
        openModal('editModal');
    };
    function setFileStatusWithDelete(elementId, deleteBtnId, url) {
        const el = document.getElementById(elementId);
        const delBtn = document.getElementById(deleteBtnId);

        if (url && url.length > 5) {
            el.innerHTML = '<span class="text-green-600 font-medium"><i class="fas fa-check-circle"></i> File Uploaded</span>';
            delBtn.classList.remove('hidden');
        } else {
            el.innerHTML = '<span class="text-gray-400">No file</span>';
            delBtn.classList.add('hidden');
        }
    }
    window.uploadFile = async (field, inputId, statusId, deleteBtnId) => {
        const id = document.getElementById('edit-id').value;
        const file = document.getElementById(inputId).files[0];
        if (!file) return;
        const statusEl = document.getElementById(statusId);
        statusEl.innerHTML = '<span class="text-primary"><i class="fas fa-spinner fa-spin"></i> Uploading...</span>';
        Swal.showLoading();
        try {
            const fileRef = ref(storage, `admin_uploads/${id}/${field}_${Date.now()}`);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);

            const actionText = (field.replace('_url', '').replace('_file', '').replace(/_/g, ' ') + ' Uploaded').toUpperCase();
            await updateDoc(doc(db, "customers", id), {
                [field]: url,
                last_upload_date: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                last_action: actionText
            });
            statusEl.innerHTML = '<span class="text-green-600"><i class="fas fa-check"></i> Success</span>';
            if (deleteBtnId) document.getElementById(deleteBtnId).classList.remove('hidden');
            Swal.close();
        } catch (error) {
            console.error(error);
            statusEl.innerHTML = '<span class="text-red-500">Error</span>';
            Swal.fire('Error', 'Upload failed', 'error');
        }
    };
    window.deleteFile = async (field, statusId) => {
        const id = document.getElementById('edit-id').value;
        const result = await Swal.fire({
            title: 'Delete this file?',
            text: "The user will need to upload it again.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EE5D50',
            confirmButtonText: 'Yes, delete it'
        });
        if (result.isConfirmed) {
            const statusEl = document.getElementById(statusId);
            statusEl.innerHTML = '<span class="text-primary"><i class="fas fa-spinner fa-spin"></i> Deleting...</span>';
            try {
                const actionText = (field.replace('_url', '').replace('_file', '').replace(/_/g, ' ') + ' Deleted').toUpperCase();
                await updateDoc(doc(db, "customers", id), {
                    [field]: "",
                    last_activity: new Date().toISOString(),
                    last_action: actionText
                });

                window.editUser(id);

            } catch (error) {
                console.error(error);
                statusEl.innerHTML = '<span class="text-red-500">Error deleting</span>';
            }
        }
    };
    window.saveUserChanges = async () => {
        const id = document.getElementById('edit-id').value;
        const newName = document.getElementById('edit-name').value;
        const newStatus = document.getElementById('edit-pip-status-select').value;
        const newWealth = document.getElementById('edit-source-wealth').value;
        const newContact = document.getElementById('edit-contact').value;
        const newPayout = document.getElementById('edit-payout').value;
        const newYears = document.getElementById('edit-years').value;
        const newRiskRating = document.getElementById('edit-risk-rating').value;
        const newPriority = document.getElementById('edit-priority').value;

        const updates = {
            full_name: newName,
            pip_status: newStatus,
            source_of_wealth: newWealth,
            contact_details: newContact,
            payout_date: newPayout,
            years_since_payout: newYears,
            risk_rating: newRiskRating,
            priority: newPriority,
            last_activity: new Date().toISOString(),
            last_action: 'Profile Updated'
        };
        // SUPER ADMIN KYC OVERRIDE
        if (currentUserRole === 'super_admin') {
            updates.kyc_status = document.getElementById('edit-kyc-status').value;
            updates.manual_override_by = "admin02";
            updates.override_date = new Date().toISOString();
        }
        try {
            await updateDoc(doc(db, "customers", id), updates);
            closeModal('editModal');
            Swal.fire({ title: 'Saved', icon: 'success', timer: 1000, showConfirmButton: false });
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        }
    };
    // 8. CSV & MANUAL IMPORT OPERATIONS
    window.switchImportTab = (tab) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`tab-${tab}`).classList.add('active');

        document.getElementById('content-csv').classList.add('hidden');
        document.getElementById('content-manual').classList.add('hidden');

        document.getElementById(`content-${tab}`).classList.remove('hidden');
    };
    window.updateFileName = () => {
        const input = document.getElementById('excel-file');
        const label = document.getElementById('file-label');
        if (input.files && input.files.length > 0) {
            label.innerHTML = `<span class="text-primary font-bold">${input.files[0].name}</span>`;
        } else {
            label.innerHTML = 'Click to upload or drag and drop';
        }
    };
    window.processExcel = () => {
        const file = document.getElementById('excel-file').files[0];
        if (!file) { Swal.fire('Error', 'Please select an Excel file first', 'warning'); return; }
        Swal.fire({ title: 'Initializing...', text: 'Reading Excel Data', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false });

                const batchPromises = [];
                const duplicateIDs = [];
                for (const row of rows) {
                    const rowOmang = row['ID Number'] || row.omang || row.Omang;
                    if (rowOmang) {
                        const exists = allCustomers.some(c => c.omang === rowOmang);
                        if (exists) {
                            duplicateIDs.push(rowOmang);
                        }
                    }
                }
                if (duplicateIDs.length > 0) {
                    closeModal('bulkModal');
                    Swal.fire({
                        icon: 'error',
                        title: 'Duplicates Found',
                        html: `The Excel file was rejected because the following IDs already exist in the system:<br><b>${duplicateIDs.slice(0, 5).join(', ')}${duplicateIDs.length > 5 ? '...' : ''}</b>`,
                        confirmButtonColor: '#EE5D50'
                    });
                    document.getElementById('excel-file').value = '';
                    document.getElementById('file-label').innerHTML = 'Click to upload or drag and drop';
                    return;
                }
                let count = 0;
                for (const row of rows) {
                    const rowOmang = row['ID Number'] || row.omang || row.Omang;
                    if (rowOmang) {
                        const userRef = doc(db, "customers", "ID" + rowOmang);
                        const userData = {
                            full_name: row['Full Names'] || row.full_name || row.name || 'Unknown',
                            omang: rowOmang,
                            contact_details: row['Contact Details'] || "",
                            payout_date: row['Payout date'] || "",
                            risk_rating: row['Risk Rating'] || "",
                            years_since_payout: row['Years since Payout date'] || "",
                            priority: row['Priority'] || "",
                            pip_status: "Not Set",
                            source_of_wealth: "Not Set",
                            kyc_status: "not_set",
                            created_at: new Date().toISOString(),
                            last_activity: new Date().toISOString(),
                            last_action: 'Profile Created'
                        };
                        batchPromises.push(setDoc(userRef, userData, { merge: true }));
                        count++;
                    }
                }

                try {
                    await Promise.all(batchPromises);
                    closeModal('bulkModal');
                    Swal.fire('Success', `Imported ${count} new users.`, 'success');
                    document.getElementById('excel-file').value = '';
                    document.getElementById('file-label').innerHTML = 'Click to upload or drag and drop';
                } catch (e) {
                    Swal.fire('Error', 'Failed to import. Check console.', 'error');
                    console.error(e);
                }
            } catch (err) {
                console.error(err);
            }
        };
        reader.readAsArrayBuffer(file);
    };
    window.isSelectDeleteMode = false;
    window.selectedUsersForDeletion = new Set();

    /* ── Build the portal dropdown menu (injected into <body>) ────────── */
    (function buildPortal() {
        const isDark = () => document.documentElement.classList.contains('dark');

        const portal = document.createElement('div');
        portal.id = 'action-dd-portal';
        portal.innerHTML = `
                <div style="padding:8px;">
                    <button class="dd-opt selected" id="ddp-export-excel" onclick="selectDropdownAction('export-excel')">
                        <span class="dd-opt-icon" style="background:rgba(255,209,0,0.15);color:#b38a00;">
                            <i class="fas fa-file-excel"></i>
                        </span>
                        <div>
                            <div class="dd-opt-title">Export Excel</div>
                            <div class="dd-opt-sub">Download filtered list as .xlsx</div>
                        </div>
                        <i class="fas fa-check dd-tick"></i>
                    </button>

                    <button class="dd-opt" id="ddp-download-all" onclick="selectDropdownAction('download-all')">
                        <span class="dd-opt-icon" style="background:rgba(59,130,246,0.12);color:#2563eb;">
                            <i class="fas fa-cloud-download-alt"></i>
                        </span>
                        <div>
                            <div class="dd-opt-title">Download All Files</div>
                            <div class="dd-opt-sub">ZIP of filtered customers' docs</div>
                        </div>
                        <i class="fas fa-check dd-tick"></i>
                    </button>

                    <button class="dd-opt" id="ddp-import" onclick="selectDropdownAction('import')">
                        <span class="dd-opt-icon" style="background:rgba(34,197,94,0.12);color:#16a34a;">
                            <i class="fas fa-file-import"></i>
                        </span>
                        <div>
                            <div class="dd-opt-title">Import / Add</div>
                            <div class="dd-opt-sub">Upload Excel or add a customer</div>
                        </div>
                        <i class="fas fa-check dd-tick"></i>
                    </button>

                    <div id="ddp-super-tools" style="display:none;">
                        <div class="dd-sep"></div>
                        <button class="dd-opt" id="ddp-select" onclick="selectDropdownAction('select')">
                            <span class="dd-opt-icon" style="background:rgba(249,115,22,0.12);color:#ea580c;">
                                <i class="fas fa-check-square"></i>
                            </span>
                            <div>
                                <div class="dd-opt-title" id="ddp-select-label">Selection Mode</div>
                                <div class="dd-opt-sub">Select rows for bulk delete</div>
                            </div>
                            <i class="fas fa-check dd-tick"></i>
                        </button>

                        <button id="btn-delete-selected" onclick="executeDeleteSelected()"
                            style="display:none;gap:12px;padding:10px 12px;cursor:pointer;border-radius:10px;border:1.5px solid #fca5a5;background:rgba(239,68,68,0.07);width:100%;text-align:left;color:#dc2626;align-items:center;margin-top:4px;">
                            <span class="dd-opt-icon" style="background:rgba(239,68,68,0.12);color:#dc2626;width:34px;height:34px;">
                                <i class="fas fa-trash-alt"></i>
                            </span>
                            <div>
                                <div class="dd-opt-title" style="color:#dc2626;">Delete Selected (<span id="delete-count">0</span>)</div>
                                <div class="dd-opt-sub">Permanently remove chosen rows</div>
                            </div>
                        </button>
                    </div>
                </div>`;
        document.body.appendChild(portal);
    })();

    /* ── Position & toggle the portal ───────────────────────────────── */
    window._lastDdAction = 'export-excel';
    window._ddOpen = false;

    window.toggleActionDropdown = () => {
        const portal = document.getElementById('action-dd-portal');
        const chevron = document.getElementById('action-dropdown-chevron');
        const trigger = document.getElementById('action-chevron-btn');

        window._ddOpen = !window._ddOpen;

        if (window._ddOpen) {
            // Apply dark mode class
            const isDark = document.documentElement.classList.contains('dark');
            portal.classList.toggle('dark-mode', isDark);

            // Compute position from trigger button bounding rect
            const rect = trigger.getBoundingClientRect();
            const menuW = 280;
            const margin = 8;

            // Prefer aligning right edge to trigger right edge
            let left = rect.right - menuW;
            if (left < margin) left = margin;
            if (left + menuW > window.innerWidth - margin) left = window.innerWidth - menuW - margin;

            // Show below trigger; if not enough room below, show above
            const spaceBelow = window.innerHeight - rect.bottom - margin;
            const approxH = 250; // rough portal height
            let top;
            if (spaceBelow >= approxH || spaceBelow > window.innerHeight / 2) {
                top = rect.bottom + 6;
            } else {
                // position above
                top = rect.top - approxH - 6;
                if (top < margin) top = margin;
            }

            portal.style.left = left + 'px';
            portal.style.top = top + 'px';
            portal.style.display = 'block';
            // Reset animation
            portal.style.animation = 'none';
            requestAnimationFrame(() => { portal.style.animation = ''; });
        } else {
            portal.style.display = 'none';
        }

        if (chevron) chevron.style.transform = window._ddOpen ? 'rotate(180deg)' : '';
    };

    // Close portal on outside click
    document.addEventListener('click', (e) => {
        const portal = document.getElementById('action-dd-portal');
        const wrapper = document.getElementById('action-dropdown-wrapper');
        if (!portal || !wrapper) return;
        if (!portal.contains(e.target) && !wrapper.contains(e.target)) {
            portal.style.display = 'none';
            const chevron = document.getElementById('action-dropdown-chevron');
            if (chevron) chevron.style.transform = '';
            window._ddOpen = false;
        }
    });

    // Close on scroll/resize so it doesn't drift
    ['scroll', 'resize'].forEach(ev => window.addEventListener(ev, () => {
        if (window._ddOpen) {
            document.getElementById('action-dd-portal').style.display = 'none';
            const chevron = document.getElementById('action-dropdown-chevron');
            if (chevron) chevron.style.transform = '';
            window._ddOpen = false;
        }
    }, { passive: true }));

    /* ── Select an action ───────────────────────────────────────────── */
    const _ddCfg = {
        'export-excel': { icon: 'fas fa-file-excel', label: 'Export Excel', portalId: 'ddp-export-excel', run: () => exportToCSV() },
        'download-all': { icon: 'fas fa-cloud-download-alt', label: 'Download All Files', portalId: 'ddp-download-all', run: () => downloadAllCustomersDocs() },
        'import': { icon: 'fas fa-file-import', label: 'Import / Add', portalId: 'ddp-import', run: () => openModal('bulkModal') },
        'select': { icon: 'fas fa-check-square', label: 'Selection Mode', portalId: 'ddp-select', run: () => toggleSelectionDeleteMode() }
    };

    window.selectDropdownAction = (action, silent = false) => {
        const c = _ddCfg[action] || _ddCfg['export-excel'];

        // Deselect all portal options
        document.querySelectorAll('#action-dd-portal .dd-opt').forEach(b => b.classList.remove('selected'));
        // Select chosen
        const chosen = document.getElementById(c.portalId);
        if (chosen) chosen.classList.add('selected');

        // Update split-button label
        document.getElementById('action-dropdown-icon').className = c.icon;
        document.getElementById('action-dropdown-label').textContent = c.label;

        window._lastDdAction = action;

        // Close portal
        const portal = document.getElementById('action-dd-portal');
        const chevron = document.getElementById('action-dropdown-chevron');
        if (portal) portal.style.display = 'none';
        if (chevron) chevron.style.transform = '';
        window._ddOpen = false;

        if (!silent) c.run();
    };

    /* ── Execute whatever is currently selected (left-button click) ── */
    window.executeCurrentDropdownAction = () => {
        const c = _ddCfg[window._lastDdAction] || _ddCfg['export-excel'];
        c.run();
    };

    /* ── Selection-delete mode toggle ───────────────────────────────── */
    window.toggleSelectionDeleteMode = () => {
        window.isSelectDeleteMode = !window.isSelectDeleteMode;
        window.selectedUsersForDeletion.clear();

        // Show / hide delete button inside portal
        const delBtn = document.getElementById('btn-delete-selected');
        if (delBtn) delBtn.style.display = window.isSelectDeleteMode ? 'flex' : 'none';

        // Update portal select label
        const lbl = document.getElementById('ddp-select-label');
        if (lbl) lbl.textContent = window.isSelectDeleteMode ? 'Selection Mode (ON)' : 'Selection Mode';

        // Sync split-button label
        if (window.isSelectDeleteMode) {
            document.getElementById('action-dropdown-icon').className = 'fas fa-check-square';
            document.getElementById('action-dropdown-label').textContent = 'Selection Mode';
        } else {
            const c = _ddCfg[window._lastDdAction] || _ddCfg['export-excel'];
            document.getElementById('action-dropdown-icon').className = c.icon;
            document.getElementById('action-dropdown-label').textContent = c.label;
        }

        document.getElementById('delete-count').innerText = '0';
        renderTable();
    };

    /* ── Show super-admin tools in portal when role is super_admin ── */
    window._showSuperAdminPortalTools = () => {
        const el = document.getElementById('ddp-super-tools');
        if (el) el.style.display = 'block';
        // also show old wrapper for compat
        const st = document.getElementById('super-admin-tools');
        if (st) st.classList.remove('hidden');
    };

    // Init default highlight
    window.selectDropdownAction('export-excel', true);

    window.toggleSelectUser = (id, trElement) => {
        if (!window.isSelectDeleteMode) return;
        if (window.selectedUsersForDeletion.has(id)) {
            window.selectedUsersForDeletion.delete(id);
            if (trElement) {
                trElement.classList.remove("!bg-yellow-100", "dark:!bg-yellow-900/50", "border-l-4", "!border-l-primary", "!border-b-yellow-200", "dark:!border-b-yellow-900/60", "opacity-100", "font-medium");
            }
        } else {
            window.selectedUsersForDeletion.add(id);
            if (trElement) {
                trElement.classList.add("!bg-yellow-100", "dark:!bg-yellow-900/50", "border-l-4", "!border-l-primary", "!border-b-yellow-200", "dark:!border-b-yellow-900/60", "opacity-100", "font-medium");
            }
        }
        document.getElementById('delete-count').innerText = window.selectedUsersForDeletion.size;
    };



    window.executeDeleteSelected = async () => {
        if (window.selectedUsersForDeletion.size === 0) { Swal.fire('Info', 'No users selected.', 'info'); return; }
        const result = await Swal.fire({
            title: 'Delete Selected?',
            html: `Are you sure you want to permanently delete <b>${window.selectedUsersForDeletion.size}</b> selected records?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EE5D50',
            confirmButtonText: 'Yes, Delete All'
        });
        if (result.isConfirmed) {
            Swal.fire({ title: 'Deleting...', text: 'Please wait.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                const promises = Array.from(window.selectedUsersForDeletion).map(id => deleteDoc(doc(db, "customers", id)));
                await Promise.all(promises);
                window.selectedUsersForDeletion.clear();
                document.getElementById('delete-count').innerText = '0';
                // Keep mode open, or close it:
                // toggleSelectionDeleteMode();
                renderTable();
                updateCharts();
                Swal.fire('Success', 'Selected records deleted successfully.', 'success');
            } catch (e) {
                console.error(e);
                Swal.fire('Error', 'Batch deletion failed.', 'error');
            }
        }
    };

    window.executeDeleteAll = async () => {
        if (filteredCustomers.length === 0) { Swal.fire('Info', 'List is already empty.', 'info'); return; }
        const result = await Swal.fire({
            title: 'Mass Deletion Warning',
            html: `Are you sure you want to permanently delete ALL <b>${filteredCustomers.length}</b> listed records from the active filters?`,
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#EE5D50',
            confirmButtonText: 'I am certain, delete list'
        });
        if (result.isConfirmed) {
            Swal.fire({ title: 'Deleting List...', text: 'Please wait.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                const promises = filteredCustomers.map(c => deleteDoc(doc(db, "customers", c.id)));
                await Promise.all(promises);
                if (window.isSelectDeleteMode) toggleSelectionDeleteMode();
                renderTable();
                updateCharts();
                Swal.fire('Success', 'The filtered list has been eradicated.', 'success');
            } catch (e) {
                console.error(e);
                Swal.fire('Error', 'List deletion failed.', 'error');
            }
        }
    };

    window.addManualUser = async () => {
        const name = document.getElementById('manual-name').value.trim();
        const omang = document.getElementById('manual-omang').value.trim();
        if (!name || !omang) {
            Swal.fire('Required', 'Please fill in both Name and Omang ID.', 'warning');
            return;
        }
        const exists = allCustomers.some(c => c.omang === omang);
        if (exists) {
            Swal.fire({
                icon: 'error',
                title: 'Duplicate ID',
                text: `A customer with Omang ID ${omang} already exists in the system.`,
                confirmButtonColor: '#EE5D50'
            });
            return;
        }
        try {
            const userRef = doc(db, "customers", "ID" + omang);
            const userData = {
                full_name: name,
                omang: omang,
                pip_status: "Not Set",
                source_of_wealth: "Not Set",
                kyc_status: "not_set",
                created_at: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                last_action: 'Profile Created',
                omang_file_url: "",
                payslip_url: "",
                utility_bill_url: "",
                confirmation_letter_url: "",
                affidavit_url: ""
            };

            await setDoc(userRef, userData);

            document.getElementById('manual-name').value = '';
            document.getElementById('manual-omang').value = '';

            closeModal('bulkModal');
            Swal.fire('Success', `User ${name} added successfully.`, 'success');
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Could not add user.', 'error');
        }
    };
    window.exportToCSV = () => {
        if (filteredCustomers.length === 0) { Swal.fire('Info', 'No data to export.', 'info'); return; }
        Swal.fire({ title: 'Exporting...', text: 'Preparing Excel List', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const cleanData = filteredCustomers.map(c => ({
            Name: c.full_name,
            Omang: c.omang,
            Contact_Details: c.contact_details || '',
            Payout_Date: c.payout_date || '',
            Risk_Rating: c.risk_rating || '',
            Priority: c.priority || '',
            Years_Since_Payout: c.years_since_payout || '',
            Status: c.kycStatus === 'complete' ? 'Completed' : (c.lastStep ? 'Incomplete' : 'Pending'),
            Last_Step: c.lastStep || 'None',
            Files: c.fileCount,
            PIP_Status: c.display_pip_status,
            Source_Of_Wealth: c.source_of_wealth || 'Not Set',
            Last_Activity_Details: `${formatReadableDate(c.latestDate)} - ${c.last_action}`,
            Registration_Date: formatReadableDate(c.created_at),
            Omang_URL: c.omang_file_url || '',
            Payslip_URL: c.payslip_url || '',
            Utility_Bill_URL: c.utility_bill_url || '',
            Confirmation_Letter_URL: c.confirmation_letter_url || '',
            Affidavit_URL: c.affidavit_url || ''
        }));
        const worksheet = XLSX.utils.json_to_sheet(cleanData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, `Letshego_KYC_Export.xlsx`);
        Swal.close();
    };
    // 9. STANDARD ANALYTICS & CHARTS
    Chart.register(ChartDataLabels);
    Chart.defaults.set('plugins.datalabels', {
        color: '#fff',
        font: { weight: 'bold', size: 10 },
        formatter: (value) => {
            return value > 0 ? value : '';
        }
    });

    function updateStats() {
        const total = allCustomers.length;
        const pending = total - allCustomers.filter(c => c.kycStatus === 'complete').length;
        const completed = allCustomers.filter(c => c.kycStatus === 'complete').length;
        const pipIssues = allCustomers.filter(c => c.display_pip_status && c.display_pip_status !== 'Not Set' && c.display_pip_status !== 'None').length;
        const incomplete = allCustomers.filter(c => c.kycStatus === 'incomplete' || (c.lastStep && c.kycStatus !== 'complete')).length;
        document.getElementById("stat-total").innerText = total.toLocaleString();
        document.getElementById("stat-pending").innerText = pending.toLocaleString();
        document.getElementById("stat-completed").innerText = completed.toLocaleString();
        document.getElementById("stat-pip").innerText = pipIssues.toLocaleString();
        document.getElementById("stat-incomplete").innerText = incomplete.toLocaleString();
        return { total, pending, completed, pipIssues, incomplete };
    }
    function populateMonthDropdown(selectId, dates) {
        const select = document.getElementById(selectId);
        const months = new Set();
        dates.forEach(d => {
            if (d) {
                try {
                    const date = new Date(d);
                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    months.add(key);
                } catch (e) { }
            }
        });
        const sortedMonths = Array.from(months).sort().reverse();
        if (sortedMonths.length === 0) return;
        const currentVal = select.value;
        select.innerHTML = '';
        sortedMonths.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            const [y, monthIdx] = m.split('-');
            const dateObj = new Date(parseInt(y), parseInt(monthIdx) - 1, 1);
            opt.textContent = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            select.appendChild(opt);
        });
        if (currentVal && sortedMonths.includes(currentVal)) {
            select.value = currentVal;
        } else {
            select.value = sortedMonths[0];
        }
    }
    function updateCharts() {
        const stats = updateStats();

        if (charts.statusPie) charts.statusPie.destroy();
        charts.statusPie = new Chart(document.getElementById('chart-status-pie'), {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'In Progress', 'Completed'],
                datasets: [{
                    data: [stats.pending, stats.total - stats.pending - stats.completed, stats.completed],
                    backgroundColor: ['#E2E8F0', '#F6AD55', '#05CD99'], borderWidth: 0
                }]
            },
            options: {
                maintainAspectRatio: false,
                cutout: '70%',
                animation: { animateScale: true, animateRotate: true, duration: 2000, easing: 'easeOutQuart' }
            }
        });
        const pipCounts = {};
        allCustomers.forEach(c => {
            let status = c.display_pip_status || 'Not Set';
            pipCounts[status] = (pipCounts[status] || 0) + 1;
        });
        const pipLabels = Object.keys(pipCounts);
        const pipData = Object.values(pipCounts);

        const colorMap = {
            'Not Set': '#E2E8F0',
            'None': '#05CD99',
            'President / Vice President': '#FBBF24',
            'Cabinet Minister / Speaker / Deputy Speaker / Member of National Assembly': '#EE5D50',
            'Senior Government Official / Judicial Officer': '#60A5FA',
            'Kgosi (per Bogosi Act)': '#A78BFA',
            'Senior Executive of Political Party': '#F472B6',
            'Senior Executive of Public Body': '#6366F1',
            'Senior Executive of Private Entity (Turnover ≥ P1M per annum or equivalent)': '#FB923C',
            'Senior Executive of International Organization in Botswana': '#2DD4BF'
        };
        const pipColors = pipLabels.map(l => colorMap[l] || '#A0AEC0');
        if (charts.pipDonut) charts.pipDonut.destroy();
        charts.pipDonut = new Chart(document.getElementById('chart-pip-donut'), {
            type: 'doughnut',
            data: {
                labels: pipLabels,
                datasets: [{
                    data: pipData, backgroundColor: pipColors, borderWidth: 0
                }]
            },
            options: {
                maintainAspectRatio: false, cutout: '50%',
                animation: { animateScale: true, animateRotate: true, duration: 2000, delay: 300, easing: 'easeOutElastic' },
                plugins: {
                    legend: {
                        display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } },
                        onClick: (e, legendItem, legend) => {
                            handlePipClick(legendItem.text);
                        }
                    }
                },
                onClick: (e, activeElements) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        handlePipClick(pipLabels[index]);
                    }
                }
            }
        });
        // New Incomplete vs Complete KYC 3D-style Pie (techy)
        if (charts.kycCompletionPie) charts.kycCompletionPie.destroy();
        charts.kycCompletionPie = new Chart(document.getElementById('chart-kyc-completion-pie'), {
            type: 'pie',
            data: {
                labels: ['Completed KYC', 'Incomplete KYC'],
                datasets: [{
                    data: [stats.completed, stats.incomplete],
                    backgroundColor: ['#05CD99', '#F59E0B'],
                    borderColor: '#fff',
                    borderWidth: 3,
                    hoverOffset: 30
                }]
            },
            options: {
                maintainAspectRatio: false,
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart',
                    animateRotate: true,
                    animateScale: true
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            boxWidth: 14,
                            font: { size: 12 }
                        }
                    }
                },
                onClick: (e, activeElements) => {
                    if (activeElements && activeElements.length > 0) {
                        const index = activeElements[0].index;
                        handleKYCCompletionClick(['Completed KYC', 'Incomplete KYC'][index]);
                    }
                }
            }
        });
        // Risk Rating Chart
        const riskCounts = { high: 0, medium: 0, low: 0, none: 0 };
        allCustomers.forEach(c => {
            const r = (c.risk_rating || '').toLowerCase();
            if (riskCounts[r] !== undefined) riskCounts[r]++;
            else riskCounts.none++;
        });
        if (charts.riskPie) charts.riskPie.destroy();
        charts.riskPie = new Chart(document.getElementById('chart-risk-pie'), {
            type: 'pie',
            data: {
                labels: ['High Risk', 'Medium Risk', 'Low Risk', 'Unassigned'],
                datasets: [{
                    data: [riskCounts.high, riskCounts.medium, riskCounts.low, riskCounts.none],
                    backgroundColor: ['#EE5D50', '#FBBF24', '#05CD99', '#E2E8F0'],
                    borderWidth: 2, borderColor: '#fff'
                }]
            },
            options: {
                maintainAspectRatio: false,
                animation: { animateScale: true, animateRotate: true, duration: 1500, easing: 'easeOutQuart' },
                plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } },
                onClick: (e, activeElements) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const ratingMap = ['high', 'medium', 'low', 'unassigned'];
                        handleRiskClick(ratingMap[index]);
                    }
                }
            }
        });

        // Priority Chart
        const priorityCounts = { high: 0, medium: 0, low: 0, none: 0 };
        allCustomers.forEach(c => {
            const p = (c.priority || '').toLowerCase();
            if (priorityCounts[p] !== undefined) priorityCounts[p]++;
            else priorityCounts.none++;
        });
        if (charts.priorityDoughnut) charts.priorityDoughnut.destroy();
        charts.priorityDoughnut = new Chart(document.getElementById('chart-priority-doughnut'), {
            type: 'doughnut',
            data: {
                labels: ['High Priority', 'Medium Priority', 'Low Priority', 'Unassigned'],
                datasets: [{
                    data: [priorityCounts.high, priorityCounts.medium, priorityCounts.low, priorityCounts.none],
                    backgroundColor: ['#8B5CF6', '#F472B6', '#38BDF8', '#E2E8F0'],
                    borderWidth: 2, borderColor: '#fff'
                }]
            },
            options: {
                maintainAspectRatio: false, cutout: '65%',
                animation: { animateScale: true, animateRotate: true, duration: 1500, easing: 'easeOutBounce' },
                plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } },
                onClick: (e, activeElements) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const priorityMap = ['high', 'medium', 'low', 'unassigned'];
                        handlePriorityClick(priorityMap[index]);
                    }
                }
            }
        });

        populateMonthDropdown('daily-month-filter', allCustomers.map(c => c.last_activity || c.created_at));
        populateMonthDropdown('submission-month-filter', allCustomers.map(c => c.last_upload_date));
        populateMonthDropdown('yield-month-filter', allCustomers.map(c => c.last_upload_date || c.created_at));
        window.updateDailyChart();
        window.updateSubmissionChart();
        window.updateDocumentYieldChart();
        // Onboarding trends now dynamic with period filter and clickable dots
        updateDashboardTrends();
    }
    window.updateDocumentYieldChart = () => {
        const period = document.getElementById('yield-period-filter').value;
        const monthFilter = document.getElementById('yield-month-filter').value;

        const buckets = {};

        allCustomers.forEach(c => {
            const baseDate = c.last_upload_date || c.created_at;
            if (!baseDate) return;

            if (period === 'daily' && monthFilter && !baseDate.startsWith(monthFilter)) return;

            const bucket = getBucket(baseDate, period);
            if (!bucket) return;

            if (!buckets[bucket]) {
                buckets[bucket] = { omang: 0, residence: 0, income: 0, users: [] };
            }

            let added = false;
            const step = c.lastStep;
            const status = c.kycStatus;
            if (step === 'omang' || step === 'proof_of_residence' || step === 'proof_of_income' || status === 'complete') {
                buckets[bucket].omang++;
                added = true;
            }
            if (step === 'proof_of_residence' || step === 'proof_of_income' || status === 'complete') {
                buckets[bucket].residence++;
                added = true;
            }
            if (step === 'proof_of_income' || status === 'complete') {
                buckets[bucket].income++;
                added = true;
            }

            if (added) buckets[bucket].users.push(c);
        });
        const sortedBuckets = Object.keys(buckets).sort();

        const dataOmang = sortedBuckets.map(b => buckets[b].omang);
        const dataResidence = sortedBuckets.map(b => buckets[b].residence);
        const dataIncome = sortedBuckets.map(b => buckets[b].income);
        if (charts.docYieldBar) charts.docYieldBar.destroy();
        charts.docYieldBar = new Chart(document.getElementById('chart-document-yield'), {
            type: 'bar',
            data: {
                labels: sortedBuckets,
                datasets: [
                    { label: 'Omang', data: dataOmang, backgroundColor: '#3b82f6', barPercentage: 0.8, categoryPercentage: 0.8 },
                    { label: 'Proof of Residence', data: dataResidence, backgroundColor: '#f59e0b', barPercentage: 0.8, categoryPercentage: 0.8 },
                    { label: 'Proof of Income', data: dataIncome, backgroundColor: '#10b981', barPercentage: 0.8, categoryPercentage: 0.8 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: false },
                    y: { stacked: false, beginAtZero: true, ticks: { precision: 0 } }
                },
                plugins: {
                    legend: { display: true, position: 'bottom' }
                },
                onClick: (e, activeElements) => {
                    if (activeElements.length > 0) {
                        const idx = activeElements[0].index;
                        const bucketKey = sortedBuckets[idx];
                        handleYieldClick(bucketKey, buckets[bucketKey].users);
                    }
                }
            }
        });
    };
    function handleYieldClick(bucketKey, usersInBucket) {
        currentYieldBucket = bucketKey;

        let furthestOmang = 0;
        let furthestRes = 0;
        let furthestIncome = 0;

        currentYieldUsers = usersInBucket.map(u => {
            let furthest = "No Files";
            if (u.kycStatus === 'complete' || u.lastStep === 'proof_of_income') { furthest = "Completed"; furthestIncome++; }
            else if (u.lastStep === 'proof_of_residence') { furthest = "Proof of Res"; furthestRes++; }
            else if (u.lastStep === 'omang') { furthest = "Omang Only"; furthestOmang++; }

            return { ...u, furthest };
        });
        document.getElementById('yield-overlay-title').innerText = `Progress for ${bucketKey}`;
        document.getElementById('yield-overlay-count').innerText = `${currentYieldUsers.length} Users Tracked`;

        if (charts.yieldFunnel) charts.yieldFunnel.destroy();
        charts.yieldFunnel = new Chart(document.getElementById('chart-yield-funnel'), {
            type: 'bar',
            data: {
                labels: ['Omang Only', 'Reached Proof of Res', 'Completed (Income)'],
                datasets: [{
                    label: 'Users at Furthest Step',
                    data: [furthestOmang, furthestRes, furthestIncome],
                    backgroundColor: ['#3b82f6', '#f59e0b', '#10b981'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } }
            }
        });

        const container = document.getElementById('yield-list-container');
        let html = `
                <table class="w-full text-left border-collapse min-w-[600px]">
                    <thead class="bg-gray-50 dark:bg-night-hover border-b border-gray-100 dark:border-night-border sticky top-0">
                        <tr>
                            <th class="p-3 text-xs font-semibold text-gray-500">Name</th>
                            <th class="p-3 text-xs font-semibold text-gray-500">Omang</th>
                            <th class="p-3 text-xs font-semibold text-gray-500">Furthest Step</th>
                            <th class="p-3 text-xs font-semibold text-gray-500">Files Uploaded</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50 dark:divide-night-border">
            `;
        currentYieldUsers.forEach(u => {
            let files = [];
            if (u.omang_file_url?.length > 5) files.push('Omang');
            if (u.utility_bill_url?.length > 5) files.push('Utility');
            if (u.confirmation_letter_url?.length > 5) files.push('Confirm');
            if (u.affidavit_url?.length > 5) files.push('Affidavit');
            if (u.payslip_url?.length > 5) files.push('Payslip');

            let stepColor = u.furthest === 'Completed' ? 'text-green-500' : (u.furthest === 'Proof of Res' ? 'text-yellow-500' : 'text-blue-500');
            html += `
                    <tr class="hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                        <td class="p-3 text-sm font-medium text-dark dark:text-white">${u.full_name}</td>
                        <td class="p-3 text-sm text-gray-500">${u.omang}</td>
                        <td class="p-3 text-sm font-bold ${stepColor}">${u.furthest}</td>
                        <td class="p-3 text-xs text-gray-400">${files.join(', ')}</td>
                    </tr>
                `;
        });
        html += '</tbody></table>';
        container.innerHTML = html;

        openModal('yield-chart-overlay');
    }
    window.closeYieldOverlay = () => closeModal('yield-chart-overlay');
    window.updateDailyChart = () => {
        const period = document.getElementById('daily-period-filter').value;
        const monthFilter = document.getElementById('daily-month-filter').value;

        const dailyUserCounts = {};

        allCustomers.forEach(c => {
            const baseDate = c.last_upload_date || c.last_activity || c.created_at;
            if (!baseDate) return;
            if (period === 'daily' && monthFilter && !baseDate.startsWith(monthFilter)) return;
            const bucket = getBucket(baseDate, period);
            if (bucket) {
                dailyUserCounts[bucket] = (dailyUserCounts[bucket] || 0) + 1;
            }
        });
        const sortedDates = Object.keys(dailyUserCounts).sort();
        const sortedCounts = sortedDates.map(d => dailyUserCounts[d]);
        if (charts.dailyBar) charts.dailyBar.destroy();
        charts.dailyBar = new Chart(document.getElementById('chart-daily-bar'), {
            type: 'bar',
            data: {
                labels: sortedDates,
                datasets: [{
                    label: 'Customers Active',
                    data: sortedCounts,
                    backgroundColor: '#2B3674',
                    borderRadius: 4,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 1000 },
                scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } },
                plugins: { legend: { display: false } },
                onClick: (e, activeElements) => {
                    if (activeElements.length > 0) {
                        handleDailyClick(sortedDates[activeElements[0].index]);
                    }
                }
            }
        });
    };
    window.updateSubmissionChart = () => {
        const selectedMonth = document.getElementById('submission-month-filter').value;
        if (!selectedMonth) return;
        const dailySubmissionCounts = {};

        allCustomers.forEach(c => {
            if (c.last_upload_date && c.last_upload_date.startsWith(selectedMonth)) {
                const dateKey = c.last_upload_date.split('T')[0];
                dailySubmissionCounts[dateKey] = (dailySubmissionCounts[dateKey] || 0) + 1;
            }
        });
        const sortedSubDates = Object.keys(dailySubmissionCounts).sort();
        const sortedSubCounts = sortedSubDates.map(d => dailySubmissionCounts[d]);
        if (charts.submissionBar) charts.submissionBar.destroy();
        charts.submissionBar = new Chart(document.getElementById('chart-submission-bar'), {
            type: 'bar',
            data: {
                labels: sortedSubDates,
                datasets: [{
                    label: 'Uploaded Files',
                    data: sortedSubCounts,
                    backgroundColor: '#3b82f6',
                    borderRadius: 4,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 1000 },
                scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } },
                plugins: { legend: { display: false } },
                onClick: (e, activeElements) => {
                    if (activeElements.length > 0) {
                        handleSubmissionClick(sortedSubDates[activeElements[0].index]);
                    }
                }
            }
        });
    };
    window.updateDashboardTrends = () => {
        const period = document.getElementById('dashboard-period-filter').value;
        const counts = {};
        allCustomers.forEach(c => {
            if (c.kycStatus === 'complete' && c.last_activity) {
                const bucket = getBucket(c.last_activity, period);
                if (bucket) {
                    counts[bucket] = (counts[bucket] || 0) + 1;
                }
            }
        });
        let sortedDates = Object.keys(counts).sort();
        if (sortedDates.length > 20) {
            sortedDates = sortedDates.slice(-20);
        }
        const sortedCounts = sortedDates.map(d => counts[d] || 0);
        const ctxMini = document.getElementById('chart-mini-line');
        if (ctxMini) {
            if (charts.miniLine) charts.miniLine.destroy();
            charts.miniLine = new Chart(ctxMini, {
                type: 'line',
                data: {
                    labels: sortedDates,
                    datasets: [{
                        label: 'Completed Onboardings',
                        data: sortedCounts,
                        borderColor: '#FFD100',
                        backgroundColor: 'rgba(255, 209, 0, 0.15)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 6,
                        pointBackgroundColor: '#FFD100',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            display: true,
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        y: {
                            display: true,
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        }
                    },
                    animation: { duration: 1500 },
                    onClick: (event, activeElements) => {
                        if (activeElements.length > 0) {
                            const index = activeElements[0].index;
                            const dateKey = sortedDates[index];
                            navTo('users');
                            const filterDateEl = document.getElementById('filter-date');
                            if (filterDateEl && dateKey.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                filterDateEl.value = dateKey;
                            } else {
                                filterDateEl.value = '';
                            }
                            currentPage = 1;
                            renderTable();
                        }
                    }
                }
            });
        }
    };
    function renderOverlayTable(data, containerId, useLatestDate = false) {
        const container = document.getElementById(containerId);
        if (data.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-400 py-10">No users found for this category.</p>';
            return;
        }
        const dateHeader = useLatestDate === 'submission' ? 'Submission Date' : (useLatestDate ? 'Latest Activity' : 'Date Info');
        let html = `
                <table class="w-full text-left border-collapse min-w-[600px]">
                    <thead class="bg-gray-50 dark:bg-night-hover border-b border-gray-100 dark:border-night-border sticky top-0">
                        <tr>
                            <th class="p-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Name</th>
                            <th class="p-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Omang</th>
                            <th class="p-3 text-xs font-semibold text-gray-500 dark:text-gray-400">PIP Status</th>
                            <th class="p-3 text-xs font-semibold text-gray-500 dark:text-gray-400">${dateHeader}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50 dark:divide-night-border">
            `;
        data.forEach(u => {
            let dateStr;
            if (useLatestDate === 'submission') {
                dateStr = u.last_upload_date;
            } else {
                dateStr = useLatestDate ? (u.latestDate || u.last_upload_date || u.created_at) : (u.created_at || u.last_upload_date);
            }

            let formattedDate = formatReadableDate(dateStr);
            let displayStatus = u.display_pip_status;
            html += `
                    <tr class="hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                        <td class="p-3 text-sm font-medium text-dark dark:text-white">${u.full_name}</td>
                        <td class="p-3 text-sm text-gray-500 dark:text-gray-400">${u.omang}</td>
                        <td class="p-3 text-sm">
                            <span class="${displayStatus !== 'None' && displayStatus !== 'Not Set' ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-600 dark:text-gray-400'}">${displayStatus}</span>
                        </td>
                        <td class="p-3 text-xs text-gray-400 dark:text-gray-500 font-mono">
                             ${formattedDate}
                        </td>
                    </tr>
                `;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    }
    function handlePipClick(key) {
        let matches = allCustomers.filter(c => c.display_pip_status === key);
        selectedPipStatusForDownload = key;

        document.getElementById('pip-overlay-title').innerText = `${key} Users`;
        document.getElementById('pip-overlay-count').innerText = `${matches.length} Records Found`;

        renderOverlayTable(matches, 'pip-list-container', true);
        openModal('pip-chart-overlay');
    }
    window.downloadPipList = () => {
        if (selectedPipStatusForDownload === null) return;
        Swal.showLoading();
        const data = allCustomers.filter(c => c.display_pip_status === selectedPipStatusForDownload);
        const filenameLabel = selectedPipStatusForDownload === '' ? 'Not_Set' : selectedPipStatusForDownload;
        const safeFilename = filenameLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        const worksheet = XLSX.utils.json_to_sheet(data.map(u => ({
            Name: u.full_name, Omang: u.omang, PIP_Status: selectedPipStatusForDownload, Latest_Activity: formatReadableDate(u.latestDate || u.created_at)
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, `Risk_List_${safeFilename}.xlsx`);
        Swal.close();
    };
    window.closePipOverlay = () => closeModal('pip-chart-overlay');
    function handleDailyClick(dateKey) {
        const period = document.getElementById('daily-period-filter').value;
        const matches = allCustomers.filter(c => {
            const baseDate = c.last_activity || c.created_at;
            if (!baseDate) return false;
            return getBucket(baseDate, period) === dateKey;
        });
        selectedDateForDownload = dateKey;

        document.getElementById('daily-overlay-title').innerText = `Activity: ${dateKey}`;
        document.getElementById('daily-overlay-count').innerText = `${matches.length} Unique Users Active`;

        const container = document.getElementById('daily-list-container');
        let html = `
                <table class="w-full text-left border-collapse min-w-[600px]">
                    <thead class="bg-gray-50 dark:bg-night-hover border-b border-gray-100 dark:border-night-border sticky top-0">
                        <tr>
                            <th class="p-3 text-xs font-semibold text-gray-500">Name</th>
                            <th class="p-3 text-xs font-semibold text-gray-500">Omang</th>
                            <th class="p-3 text-xs font-semibold text-gray-500">Last Action</th>
                            <th class="p-3 text-xs font-semibold text-gray-500">Date & Time</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50 dark:divide-night-border">
            `;
        matches.forEach(u => {
            const formattedDate = formatReadableDate(u.last_activity || u.created_at);
            html += `
                    <tr class="hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                        <td class="p-3 text-sm font-medium text-dark dark:text-white">${u.full_name}</td>
                        <td class="p-3 text-sm text-gray-500">${u.omang}</td>
                        <td class="p-3 text-sm text-primary font-bold uppercase">${u.last_action}</td>
                        <td class="p-3 text-xs text-gray-400 font-mono">${formattedDate}</td>
                    </tr>
                `;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
        openModal('daily-chart-overlay');
    }
    window.downloadDailyList = () => {
        if (!selectedDateForDownload) return;
        Swal.showLoading();
        const period = document.getElementById('daily-period-filter').value;
        const matches = allCustomers.filter(c => {
            const baseDate = c.last_activity || c.created_at;
            if (!baseDate) return false;
            return getBucket(baseDate, period) === selectedDateForDownload;
        });
        const worksheet = XLSX.utils.json_to_sheet(matches.map(u => {
            return {
                Name: u.full_name,
                Omang: u.omang,
                Last_Action_Details: `${formatReadableDate(u.last_activity || u.created_at)} - ${u.last_action}`
            };
        }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, `Customer_Activity_${selectedDateForDownload}.xlsx`);
        Swal.close();
    };
    window.closeDailyOverlay = () => closeModal('daily-chart-overlay');
    function handleSubmissionClick(dateKey) {
        const matches = allCustomers.filter(c => c.last_upload_date && c.last_upload_date.startsWith(dateKey));
        selectedSubmissionDateForDownload = dateKey;

        document.getElementById('submission-overlay-title').innerText = `Submissions: ${dateKey}`;
        document.getElementById('submission-overlay-count').innerText = `${matches.length} Users Uploaded`;

        renderOverlayTable(matches, 'submission-list-container', 'submission');
        openModal('submission-chart-overlay');
    }
    window.downloadSubmissionList = () => {
        if (!selectedSubmissionDateForDownload) return;
        Swal.showLoading();
        const data = allCustomers.filter(c => c.last_upload_date && c.last_upload_date.startsWith(selectedSubmissionDateForDownload));
        const worksheet = XLSX.utils.json_to_sheet(data.map(u => ({
            Name: u.full_name,
            Omang: u.omang,
            Last_Activity_Title: u.last_action,
            Submission_Date: formatReadableDate(u.last_upload_date)
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, `Submission_Activity_${selectedSubmissionDateForDownload}.xlsx`);
        Swal.close();
    };
    window.closeSubmissionOverlay = () => closeModal('submission-chart-overlay');
    function handleKYCCompletionClick(label) {
        let matches = [];
        let title = '';
        if (label === 'Completed KYC') {
            matches = allCustomers.filter(c => c.kycStatus === 'complete');
            title = 'Completed KYC Users';
            selectedKYCType = 'completed';
        } else {
            matches = allCustomers.filter(c => c.kycStatus === 'incomplete' || (c.lastStep && c.kycStatus !== 'complete'));
            title = 'Incomplete KYC Users';
            selectedKYCType = 'incomplete';
        }
        document.getElementById('kyc-overlay-title').innerText = title;
        document.getElementById('kyc-overlay-count').innerText = `${matches.length} Records Found`;

        const container = document.getElementById('kyc-list-container');
        let html = `
                <table class="w-full text-left border-collapse min-w-[600px]">
                    <thead class="bg-gray-50 dark:bg-night-hover border-b border-gray-100 dark:border-night-border sticky top-0">
                        <tr>
                            <th class="p-3 text-xs font-semibold text-gray-500">Name</th>
                            <th class="p-3 text-xs font-semibold text-gray-500">Omang</th>
                            <th class="p-3 text-xs font-semibold text-gray-500">KYC Status</th>
                            <th class="p-3 text-xs font-semibold text-gray-500">PIP Status</th>
                            <th class="p-3 text-xs font-semibold text-gray-500">Last Activity</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50 dark:divide-night-border">
            `;
        matches.forEach(u => {
            const kycStatus = u.isComplete ?
                `<span class="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-success text-xs font-medium">Completed</span>` :
                `<span class="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 text-xs font-medium">Incomplete</span>`;
            html += `
                    <tr class="hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                        <td class="p-3 text-sm font-medium text-dark dark:text-white">${u.full_name || 'N/A'}</td>
                        <td class="p-3 text-sm text-gray-500 dark:text-gray-400 font-mono">${u.omang}</td>
                        <td class="p-3">${kycStatus}</td>
                        <td class="p-3 text-sm">${u.display_pip_status}</td>
                        <td class="p-3 text-xs text-gray-400 font-mono">${formatReadableDate(u.latestDate)}</td>
                    </tr>
                `;
        });
        html += '</tbody></table>';
        container.innerHTML = html || '<p class="text-center text-gray-400 py-10">No records found.</p>';

        openModal('kyc-completion-overlay');
    }
    window.downloadKYCList = () => {
        if (!selectedKYCType) return;
        Swal.showLoading();
        let matches = [];
        let typeLabel = selectedKYCType === 'completed' ? 'Completed' : 'Incomplete';
        if (selectedKYCType === 'completed') {
            matches = allCustomers.filter(c => c.kycStatus === 'complete');
        } else {
            matches = allCustomers.filter(c => c.kycStatus === 'incomplete' || (c.lastStep && c.kycStatus !== 'complete'));
        }
        const csvData = matches.map(u => ({
            Name: u.full_name,
            Omang: u.omang,
            KYC_Status: typeLabel,
            PIP_Status: u.display_pip_status,
            Last_Activity: formatReadableDate(u.latestDate)
        }));
        downloadExcelHelper(`KYC_${typeLabel}_List.xlsx`, csvData);
        Swal.close();
    };
    window.downloadKYCCompletionCSV = () => {
        const incompleteC = allCustomers.filter(c => c.kycStatus === 'incomplete' || (c.lastStep && c.kycStatus !== 'complete')).length;
        const completeC = allCustomers.filter(c => c.kycStatus === 'complete').length;
        const data = [
            { Status: 'Completed KYC', Count: completeC },
            { Status: 'Incomplete KYC', Count: incompleteC }
        ];
        downloadExcelHelper('KYC_Completion_Distribution.xlsx', data);
    };
    let selectedRiskType = null;
    function handleRiskClick(risk) {
        selectedRiskType = risk;
        let matches = allCustomers.filter(c => {
            const r = (c.risk_rating || '').toLowerCase();
            if (risk === 'unassigned') return !r;
            return r === risk;
        });

        document.getElementById('risk-overlay-title').innerText = `${risk.charAt(0).toUpperCase() + risk.slice(1)} Risk Customers`;
        document.getElementById('risk-overlay-count').innerText = `${matches.length} Records Found`;

        const container = document.getElementById('risk-list-container');
        let html = `
                <table class="w-full text-left border-collapse min-w-[600px]">
                    <thead class="bg-gray-50 dark:bg-night-hover border-b border-gray-100 dark:border-night-border sticky top-0">
                        <tr>
                            <th class="p-3 text-xs font-semibold text-gray-500">Name</th>
                            <th class="p-3 text-xs font-semibold text-gray-500">Omang</th>
                            <th class="p-3 text-xs font-semibold text-gray-500">Risk Rating</th>
                            <th class="p-3 text-xs font-semibold text-gray-500">Last Activity</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50 dark:divide-night-border">
            `;
        matches.forEach(u => {
            const rClean = (u.risk_rating || 'Unassigned').toUpperCase();
            let rColor = 'text-gray-500 dark:text-gray-400';
            if (rClean === 'HIGH') rColor = 'text-red-500';
            else if (rClean === 'MEDIUM') rColor = 'text-yellow-500';
            else if (rClean === 'LOW') rColor = 'text-green-500';

            html += `
                    <tr class="hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                        <td class="p-3 text-sm font-medium text-dark dark:text-white">${u.full_name || 'N/A'}</td>
                        <td class="p-3 text-sm text-gray-500 dark:text-gray-400 font-mono">${u.omang}</td>
                        <td class="p-3 text-sm font-bold uppercase ${rColor}">${u.risk_rating || 'Unassigned'}</td>
                        <td class="p-3 text-xs text-gray-400 font-mono">${formatReadableDate(u.latestDate)}</td>
                    </tr>
                `;
        });
        html += '</tbody></table>';
        container.innerHTML = html || '<p class="text-center text-gray-400 py-10">No records found.</p>';

        openModal('risk-chart-overlay');
    }
    window.closeRiskOverlay = () => closeModal('risk-chart-overlay');
    window.downloadRiskList = () => {
        if (!selectedRiskType) return;
        const matches = allCustomers.filter(c => {
            const r = (c.risk_rating || '').toLowerCase();
            if (selectedRiskType === 'unassigned') return !r;
            return r === selectedRiskType;
        });
        const csvData = matches.map(u => ({
            Name: u.full_name,
            Omang: u.omang,
            Risk_Rating: u.risk_rating || 'Unassigned',
            Last_Activity: formatReadableDate(u.latestDate)
        }));
        downloadExcelHelper(`Risk_${selectedRiskType}_List.xlsx`, csvData);
    };
    window.downloadRiskSummaryCSV = () => {
        const riskCounts = { high: 0, medium: 0, low: 0, none: 0 };
        allCustomers.forEach(c => {
            const r = (c.risk_rating || '').toLowerCase();
            if (riskCounts[r] !== undefined) riskCounts[r]++;
            else riskCounts.none++;
        });
        const data = [
            { 'Risk Rating': 'High', Count: riskCounts.high },
            { 'Risk Rating': 'Medium', Count: riskCounts.medium },
            { 'Risk Rating': 'Low', Count: riskCounts.low },
            { 'Risk Rating': 'Unassigned', Count: riskCounts.none }
        ];
        downloadExcelHelper('Risk_Rating_Distribution.xlsx', data);
    };

    let selectedPriorityType = null;
    function handlePriorityClick(priority) {
        selectedPriorityType = priority;
        let matches = allCustomers.filter(c => {
            const p = (c.priority || '').toLowerCase();
            if (priority === 'unassigned') return !p;
            return p === priority;
        });

        document.getElementById('priority-overlay-title').innerText = `${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority Customers`;
        document.getElementById('priority-overlay-count').innerText = `${matches.length} Records Found`;

        const container = document.getElementById('priority-list-container');
        let html = `
                <table class="w-full text-left border-collapse min-w-[600px]">
                    <thead class="bg-gray-50 dark:bg-night-hover border-b border-gray-100 dark:border-night-border sticky top-0">
                        <tr>
                            <th class="p-3 text-xs font-semibold text-gray-500">Name</th>
                            <th class="p-3 text-xs font-semibold text-gray-500">Omang</th>
                            <th class="p-3 text-xs font-semibold text-gray-500">Priority</th>
                            <th class="p-3 text-xs font-semibold text-gray-500">Last Activity</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50 dark:divide-night-border">
            `;
        matches.forEach(u => {
            const pClean = (u.priority || 'Unassigned').toUpperCase();
            let pColor = 'text-gray-500 dark:text-gray-400';
            if (pClean === 'HIGH') pColor = 'text-indigo-500';
            else if (pClean === 'MEDIUM') pColor = 'text-purple-400';
            else if (pClean === 'LOW') pColor = 'text-blue-400';

            html += `
                    <tr class="hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                        <td class="p-3 text-sm font-medium text-dark dark:text-white">${u.full_name || 'N/A'}</td>
                        <td class="p-3 text-sm text-gray-500 dark:text-gray-400 font-mono">${u.omang}</td>
                        <td class="p-3 text-sm font-bold uppercase ${pColor}">${u.priority || 'Unassigned'}</td>
                        <td class="p-3 text-xs text-gray-400 font-mono">${formatReadableDate(u.latestDate)}</td>
                    </tr>
                `;
        });
        html += '</tbody></table>';
        container.innerHTML = html || '<p class="text-center text-gray-400 py-10">No records found.</p>';

        openModal('priority-chart-overlay');
    }
    window.closePriorityOverlay = () => closeModal('priority-chart-overlay');
    window.downloadPriorityList = () => {
        if (!selectedPriorityType) return;
        const matches = allCustomers.filter(c => {
            const p = (c.priority || '').toLowerCase();
            if (selectedPriorityType === 'unassigned') return !p;
            return p === selectedPriorityType;
        });
        const csvData = matches.map(u => ({
            Name: u.full_name,
            Omang: u.omang,
            Priority: u.priority || 'Unassigned',
            Last_Activity: formatReadableDate(u.latestDate)
        }));
        downloadExcelHelper(`Priority_${selectedPriorityType}_List.xlsx`, csvData);
    };
    window.downloadPrioritySummaryCSV = () => {
        const priorityCounts = { high: 0, medium: 0, low: 0, none: 0 };
        allCustomers.forEach(c => {
            const p = (c.priority || '').toLowerCase();
            if (priorityCounts[p] !== undefined) priorityCounts[p]++;
            else priorityCounts.none++;
        });
        const data = [
            { Priority: 'High', Count: priorityCounts.high },
            { Priority: 'Medium', Count: priorityCounts.medium },
            { Priority: 'Low', Count: priorityCounts.low },
            { Priority: 'Unassigned', Count: priorityCounts.none }
        ];
        downloadExcelHelper('Priority_Distribution.xlsx', data);
    };

    window.navToKYCFilter = (filterType) => {
        navTo('users');
        const filterEl = document.getElementById('filter-status');
        if (filterEl) {
            filterEl.value = filterType;
        }
        currentPage = 1;
        renderTable();
    };
    // --- 10. ADVANCED BI PLAYGROUND LOGIC ---
    window.processAdvancedBatch = () => {
        const name = document.getElementById('bi-batch-name').value.trim();
        const fileInput = document.getElementById('bi-excel-file');
        const file = fileInput.files[0];

        if (!name || !file) {
            Swal.fire('Error', 'Batch Name and Excel File is required', 'warning');
            return;
        }
        const btn = document.querySelector('#advancedUploadModal button[onclick="processAdvancedBatch()"]');
        const originalText = btn.innerText;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
        btn.disabled = true;
        Papa.parse(file, {
            header: true, skipEmptyLines: true,
            complete: (results) => {
                const omangs = results.data.map(r => r.omang || r.Omang).filter(Boolean);

                if (omangs.length === 0) {
                    Swal.fire('Error', 'No valid Omang numbers found in Excel. Check headers.', 'error');
                    btn.innerHTML = originalText; btn.disabled = false;
                    return;
                }
                const newBatch = {
                    id: 'batch_' + Date.now(),
                    name: name,
                    total: omangs.length,
                    omangs: omangs,
                    date: new Date().toISOString()
                };

                advancedBatches.push(newBatch);
                localStorage.setItem('letshego_advanced_batches', JSON.stringify(advancedBatches));

                updateBatchDropdown();

                // Auto-select the new batch
                document.getElementById('bi-main-pointer').value = newBatch.id;
                refreshAdvancedBI();
                closeModal('advancedUploadModal');
                Swal.fire('Success', `Batch "${name}" created with ${omangs.length} users.`, 'success');

                // Reset form
                document.getElementById('bi-batch-name').value = '';
                fileInput.value = '';
                btn.innerHTML = originalText; btn.disabled = false;
            }
        });
    };
    function updateBatchDropdown() {
        const select = document.getElementById('bi-main-pointer');
        const currentVal = select.value;

        select.innerHTML = '<option value="">Select a Batch Upload...</option>';
        advancedBatches.forEach(b => {
            select.innerHTML += `<option value="${b.id}">${b.name} (${b.total} Users)</option>`;
        });
        if (currentVal && advancedBatches.some(b => b.id === currentVal)) {
            select.value = currentVal;
        }
    }
    window.refreshAdvancedBI = () => {
        const batchId = document.getElementById('bi-main-pointer').value;
        const subPointer = document.getElementById('bi-sub-pointer').value;

        const ctx = document.getElementById('chart-advanced-bi');
        const tbody = document.getElementById('bi-table-body');
        const countEl = document.getElementById('bi-list-count');
        if (!batchId) {
            if (biChart) biChart.destroy();
            tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500">Please select a batch to view journey.</td></tr>';
            countEl.innerText = '0 Users';
            return;
        }
        const batch = advancedBatches.find(b => b.id === batchId);
        const batchOmangs = new Set(batch.omangs);
        // Filter real-time customers that are in this batch
        const batchCustomers = allCustomers.filter(c => batchOmangs.has(c.omang));

        // Map successes by date
        const successesByDate = {};
        batchCustomers.forEach(c => {
            let isSuccess = false;
            if (subPointer === 'completed') isSuccess = c.kycStatus === 'complete';
            else if (subPointer === 'submissions') isSuccess = !!c.lastStep;
            else if (subPointer === 'pip') isSuccess = c.display_pip_status !== 'None' && c.display_pip_status !== 'Not Set';
            if (isSuccess) {
                const date = (c.last_activity || c.created_at || new Date().toISOString()).split('T')[0];
                successesByDate[date] = (successesByDate[date] || 0) + 1;
            }
        });
        // Group by date for chart (last 14 days)
        const dates = Object.keys(successesByDate).sort().slice(-14);

        // If no successes yet, show today so graph isn't broken
        if (dates.length === 0) dates.push(new Date().toISOString().split('T')[0]);
        const successData = dates.map(d => successesByDate[d] || 0);
        const totalData = dates.map(d => batch.total); // Denominator
        // Render Chart
        if (biChart) biChart.destroy();
        biChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Conversion Volume',
                        data: successData,
                        backgroundColor: '#FFD100',
                        borderRadius: 4,
                        barPercentage: 0.6
                    },
                    {
                        label: 'Batch Volume',
                        data: totalData,
                        backgroundColor: document.documentElement.classList.contains('dark') ? '#3f3f46' : '#E2E8F0',
                        borderRadius: 4,
                        barPercentage: 0.6
                    }
                ]
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                scales: {
                    y: { beginAtZero: true, grid: { display: false } },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
        // Render Table
        tbody.innerHTML = '';
        if (batchCustomers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500">No users from this batch have interacted yet.</td></tr>';
        } else {
            batchCustomers.forEach(c => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors border-b border-gray-50 dark:border-night-border";

                let statusHtml = '';
                if (c.kycStatus === 'complete') statusHtml = '<span class="text-success font-semibold text-xs"><i class="fas fa-check-circle mr-1"></i>Completed</span>';
                else if (c.lastStep) statusHtml = '<span class="text-orange-500 font-semibold text-xs"><i class="fas fa-spinner fa-spin mr-1"></i>In Progress</span>';
                else statusHtml = '<span class="text-gray-500 font-semibold text-xs"><i class="fas fa-clock mr-1"></i>Pending</span>';
                let dateStr = formatReadableDate(c.last_activity);
                tr.innerHTML = `
                        <td class="p-3 text-dark dark:text-white font-medium">${c.full_name || 'Unknown'}</td>
                        <td class="p-3 text-gray-500 dark:text-gray-400 font-mono">${c.omang}</td>
                        <td class="p-3">${statusHtml}</td>
                        <td class="p-3 text-gray-400 dark:text-gray-500 text-xs">${dateStr} - ${c.last_action}</td>
                    `;
                tbody.appendChild(tr);
            });
        }
        countEl.innerText = `${batchCustomers.length} Users active`;
    };
    window.exportAdvancedBI = () => {
        const batchId = document.getElementById('bi-main-pointer').value;
        if (!batchId) {
            Swal.fire('Info', 'Select a batch first to export.', 'info');
            return;
        }
        Swal.showLoading();
        const batch = advancedBatches.find(b => b.id === batchId);
        const batchOmangs = new Set(batch.omangs);

        const dataToExport = allCustomers.filter(c => batchOmangs.has(c.omang)).map(c => ({
            Batch_Name: batch.name,
            Customer_Name: c.full_name,
            Omang: c.omang,
            Status: c.kycStatus === 'complete' ? 'Completed' : (c.lastStep ? 'Partial' : 'Pending'),
            Files_Submitted: c.fileCount,
            PIP_Risk: c.display_pip_status,
            Last_Activity: formatReadableDate(c.last_activity),
            Last_Action_Details: c.last_action
        }));
        if (dataToExport.length === 0) {
            Swal.close();
            Swal.fire('Info', 'No active users to export for this batch yet.', 'info');
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, `Journey_Report_${batch.name.replace(/\s+/g, '_')}.xlsx`);
        Swal.close();
    };
    // Loan Analytics JS
    let allJourneys = [];
    let loanCharts = {};

    function formatDurationReadable(seconds) {
        seconds = Number(seconds) || 0;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    }

    function isTerminalStage(stage) {
        if (!stage) return false;
        const s = stage.toString().toLowerCase();
        return /(agent|requested|completed|success|submitted|end|closed|appl|applied)/.test(s);
    }

    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe.toString().replace(/[&<>"'`=\/]/g, function (s) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' }[s]);
        });
    }

    function mapProductName(p) {
        const s = (p || '').toString().toLowerCase();
        if (s.includes('housing')) return 'Housing Loan';
        if (s.includes('personal')) return 'Personal Loan';
        if (s.includes('business') || s.includes('bussiness')) return 'Business Loan';
        return p || 'Other';
    }

    function updateLoanFilters(stageArray) {
        const sel = document.getElementById('loan-terminal-filter');
        if (!sel) return;
        const current = sel.value || 'all';
        sel.innerHTML = '<option value="all">All Stages</option>';
        stageArray.sort().forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s;
            sel.appendChild(opt);
        });
        if (stageArray.includes(current)) sel.value = current;
    }

    function initLoanListener() {
        try {
            onSnapshot(collection(db, 'loan_journeys'), (snapshot) => {
                allJourneys = [];
                const stages = new Set();
                snapshot.forEach(d => {
                    const data = d.data() || {};
                    const last_stage = (data.workflow && data.workflow.last_stage) ? data.workflow.last_stage : (data.last_stage || '');
                    const loan_product = (data.workflow && data.workflow.loan_product) ? data.workflow.loan_product : (data.loan_product || data.loan_product_name || data.product || '');
                    const whatsapp = (data.conversation && data.conversation.whatsapp_number) ? data.conversation.whatsapp_number : (data.whatsapp_number || data.whatsapp || '');
                    const start = (data.conversation && data.conversation.journey_start_time) ? data.conversation.journey_start_time : (data.journey_start_time || data.timestamp || data.start_time || '');
                    const duration_seconds = Number(data.duration_seconds || data.duration || 0);
                    const timestamp = data.timestamp || start || data.created_at || '';
                    allJourneys.push({ id: d.id, last_stage: last_stage, loan_product: loan_product, whatsapp: whatsapp, start: start, duration_seconds: duration_seconds, timestamp: timestamp, raw: data });
                    if (last_stage) stages.add(last_stage);
                });
                allJourneys.sort((a, b) => (new Date(b.timestamp || b.start).getTime() || 0) - (new Date(a.timestamp || a.start).getTime() || 0));
                updateLoanAnalytics();
                renderLoanTable();
                updateLoanFilters(Array.from(stages));
            });
        } catch (err) {
            console.error('Loan listener error', err);
        }
    }

    function updateLoanAnalytics() {
        const total = allJourneys.length;
        const totalSec = allJourneys.reduce((s, j) => s + (Number(j.duration_seconds) || 0), 0);
        const avgSec = total ? Math.round(totalSec / total) : 0;
        const terminalCount = allJourneys.filter(j => isTerminalStage(j.last_stage)).length;
        const conv = total ? Math.round((terminalCount / total) * 100) : 0;
        const elTotal = document.getElementById('loan-total-engagements');
        const elAvg = document.getElementById('loan-avg-duration');
        const elConv = document.getElementById('loan-flow-conversion');
        if (elTotal) elTotal.innerText = total.toLocaleString();
        if (elAvg) elAvg.innerText = formatDurationReadable(avgSec);
        if (elConv) elConv.innerText = conv + '%';
        updateLoanCharts();
    }

    function updateLoanCharts() {
        const total = allJourneys.length;
        const stageBuckets = {
            'Product menu viewed': 0,
            'About Product viewed': 0,
            'Requirements Checklist viewed': 0,
            'Enquiry submitted': 0,
            'Complaint submitted': 0,
            'Apply Now / Agent requested': 0,
            'Session exited without action': 0
        };
        const productCounts = {};
        const sentimentCounts = { Positive: 0, Neutral: 0, Negative: 0 };

        allJourneys.forEach(j => {
            const s = (j.last_stage || '').toString().toLowerCase();
            if (/apply|agent|requested|talk to agent|apply now|agent requested|agent_request/i.test(s)) {
                stageBuckets['Apply Now / Agent requested']++;
            } else if (/enquir|enquiry|inquiry|ask/i.test(s)) {
                stageBuckets['Enquiry submitted']++;
            } else if (/complaint/i.test(s)) {
                stageBuckets['Complaint submitted']++;
            } else if (/requirem|requirements|checklist|documents/i.test(s)) {
                stageBuckets['Requirements Checklist viewed']++;
            } else if (/about|intro|details|product/i.test(s)) {
                stageBuckets['About Product viewed']++;
            } else if (/menu|choices|main|product menu|product_menu|menu_view/i.test(s) || s.trim() === '') {
                stageBuckets['Product menu viewed']++;
            } else {
                stageBuckets['Session exited without action']++;
            }

            const cat = mapProductName(j.loan_product);
            productCounts[cat] = (productCounts[cat] || 0) + 1;

            const sentStr = normalizeSentimentStr(j.convo_sentiment || (j.raw && (j.raw.convo_sentiment || j.raw.sentiment)) || j.sentiment || '');
            sentimentCounts[sentStr] = (sentimentCounts[sentStr] || 0) + 1;
        });

        // Shared rich tooltip callback for chatbot charts
        const richTooltip = (unit) => ({
            backgroundColor: 'rgba(10,15,30,0.92)',
            titleColor: '#FFD100',
            bodyColor: '#e4e4e7',
            borderColor: 'rgba(255,209,0,0.35)',
            borderWidth: 1,
            padding: 14,
            cornerRadius: 12,
            displayColors: true,
            boxWidth: 10,
            boxHeight: 10,
            callbacks: {
                label: (ctx) => {
                    const val = ctx.raw || 0;
                    const ds = ctx.dataset.data;
                    const sum = ds.reduce((a, b) => a + b, 0);
                    const pct = sum ? ((val / sum) * 100).toFixed(1) : '0.0';
                    return ` ${val} ${unit || 'sessions'} (${pct}%)`;
                }
            }
        });

        const hoverCursor = (canvas) => ({
            onHover: (e, active) => { canvas.style.cursor = active && active.length ? 'pointer' : 'default'; }
        });

        // 1. Funnel
        if (loanCharts.funnel) try { loanCharts.funnel.destroy(); } catch (e) { }
        const funnelCtx = document.getElementById('loan-funnel-chart');
        if (funnelCtx) {
            const labels = Object.keys(stageBuckets);
            const data = Object.values(stageBuckets);
            const funnelColors = ['#3b82f6', '#60A5FA', '#F59E0B', '#06B6D4', '#EE5D50', '#10B981', '#A3A3A3'];
            const funnelHover = funnelColors.map(c => c + 'cc');
            loanCharts.funnel = new Chart(funnelCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: funnelColors,
                        hoverBackgroundColor: funnelColors,
                        borderRadius: 8,
                        borderSkipped: false,
                        hoverBorderWidth: 2,
                        hoverBorderColor: '#FFD100'
                    }]
                },
                options: {
                    indexAxis: 'y',
                    maintainAspectRatio: false,
                    animation: { duration: 1000, easing: 'easeOutQuart' },
                    scales: {
                        x: { beginAtZero: true, grid: { color: 'rgba(156,163,175,0.1)' }, ticks: { font: { size: 11 } } },
                        y: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#6b7280' } }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: richTooltip('sessions')
                    },
                    ...hoverCursor(funnelCtx),
                    onClick: (e, active) => { if (active && active.length) showLoanOverlay(labels[active[0].index]); }
                }
            });
        }

        // 2. Product
        if (loanCharts.productDonut) try { loanCharts.productDonut.destroy(); } catch (e) { }
        const pdCtx = document.getElementById('loan-product-doughnut');
        if (pdCtx) {
            const labels = Object.keys(productCounts);
            const data = Object.values(productCounts);
            loanCharts.productDonut = new Chart(pdCtx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#a78bfa', '#E5E7EB'],
                        hoverBackgroundColor: ['#2563eb', '#d97706', '#059669', '#7c3aed', '#D1D5DB'],
                        hoverOffset: 14,
                        borderWidth: 2,
                        hoverBorderWidth: 3,
                        borderColor: 'transparent',
                        hoverBorderColor: '#FFD100'
                    }]
                },
                options: {
                    maintainAspectRatio: false,
                    cutout: '65%',
                    animation: { animateRotate: true, animateScale: true, duration: 900, easing: 'easeOutBack' },
                    plugins: {
                        legend: { position: 'bottom', labels: { padding: 14, usePointStyle: true, pointStyleWidth: 10, font: { size: 11 } } },
                        tooltip: richTooltip('sessions')
                    },
                    ...hoverCursor(pdCtx),
                    onClick: (e, active) => { if (active && active.length) showLoanOverlay(labels[active[0].index], 'product'); }
                }
            });
        }

        // 3. Sentiment
        if (loanCharts.sentimentPie) try { loanCharts.sentimentPie.destroy(); } catch (e) { }
        const spCtx = document.getElementById('loan-sentiment-pie');
        if (spCtx) {
            const labels = Object.keys(sentimentCounts);
            const data = Object.values(sentimentCounts);
            loanCharts.sentimentPie = new Chart(spCtx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: ['#10B981', '#9CA3AF', '#EE5D50'],
                        hoverBackgroundColor: ['#059669', '#6B7280', '#dc2626'],
                        hoverOffset: 14,
                        borderWidth: 2,
                        hoverBorderWidth: 3,
                        borderColor: 'transparent',
                        hoverBorderColor: '#FFD100'
                    }]
                },
                options: {
                    maintainAspectRatio: false,
                    cutout: '65%',
                    animation: { animateRotate: true, animateScale: true, duration: 900, easing: 'easeOutBack' },
                    plugins: {
                        legend: { position: 'bottom', labels: { padding: 14, usePointStyle: true, pointStyleWidth: 10, font: { size: 11 } } },
                        tooltip: richTooltip('sessions')
                    },
                    ...hoverCursor(spCtx),
                    onClick: (e, active) => { if (active && active.length) showLoanOverlay(labels[active[0].index], 'sentiment'); }
                }
            });
        }
    }

    function normalizeSentimentStr(s) {
        s = (s || '').toString().toLowerCase();
        if (!s || s.trim() === '') return 'Neutral';
        if (/neutral|ntrl/.test(s)) return 'Neutral';
        if (/pos|positive|good|happy|satisfied|great|excellent/.test(s)) return 'Positive';
        if (/neg|negative|bad|angry|sad|unsatisfied|poor/.test(s)) return 'Negative';
        return 'Neutral';
    }

    function formatSessionDate(ts) {
        if (!ts) return 'Unknown';
        const d = new Date(ts);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).substring(2);
        return `${day}/${month}/${year}`;
    }

    function renderLoanTable() {
        const tbody = document.getElementById('loan-table-body');
        if (!tbody) return;
        const search = (document.getElementById('loan-search')?.value || '').trim().toLowerCase();
        const productFilter = (document.getElementById('loan-product-filter')?.value || 'all');
        const terminalFilter = (document.getElementById('loan-terminal-filter')?.value || 'all');
        tbody.innerHTML = '';
        const filtered = allJourneys.filter(j => {
            const searchStr = ((j.whatsapp || '') + (j.name || '') + (j.convo_title || '')).toString().toLowerCase();
            if (search && !searchStr.includes(search)) return false;
            if (productFilter && productFilter !== 'all') {
                if (mapProductName(j.loan_product).toLowerCase() !== productFilter.toLowerCase()) return false;
            }
            if (terminalFilter && terminalFilter !== 'all') {
                if ((j.last_stage || '') !== terminalFilter) return false;
            }
            return true;
        });
        filtered.forEach((j, i) => {
            const idx = i + 1;
            const raw = j.raw || {};
            const waNum = escapeHtml(j.whatsapp || 'Unknown');
            const dateStr = formatSessionDate(j.timestamp);

            const badgeText = escapeHtml(j.last_stage || 'N/A');
            const badgeClasses = getStageBadgeClass(j.last_stage);
            const surveysHtml = renderSurveyBadgesHtml(j);
            const html = `
                    <tr class="hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                        <td class="p-3 text-sm font-medium text-grey cursor-pointer" onclick="showJourneyDetails('${j.id}')">${idx}</td>
                        <td class="p-3 text-sm font-bold">
                            <a href="#" class="journey-link flex items-center gap-2 group" data-id="${j.id}" aria-label="Open profile for ${waNum}">
                                <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs flex-shrink-0"><i class="fab fa-whatsapp"></i></span>
                                <span class="text-primary group-hover:underline font-mono tracking-wide">${waNum}</span>
                            </a>
                        </td>
                        <td class="p-3 font-medium text-sm text-gray-500 dark:text-gray-400">${escapeHtml(mapProductName(j.loan_product))}</td>
                        <td class="p-3 text-sm"><span class="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeClasses}">${badgeText}</span></td>
                        <td class="p-3 text-sm hidden sm:table-cell text-gray-400">${formatDurationReadable(j.duration_seconds)}</td>
                        <td class="p-3 text-xs text-gray-400 hidden sm:table-cell">${formatReadableDate(j.timestamp)}</td>
                        <td class="p-3 text-sm">${surveysHtml}</td>
                        <td class="p-3 text-right">
                            <div class="flex justify-end gap-2">
                                <button onclick="showJourneyDetails('${j.id}')" class="px-4 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-black transition-all text-xs font-bold">View Profile</button>
                            </div>
                        </td>
                    </tr>`;
            tbody.insertAdjacentHTML('beforeend', html);
        });
    }

    function downloadLoanLogsExcel() {
        const rows = allJourneys.map(j => ({ WhatsApp_Number: j.whatsapp, Loan_Product: j.loan_product, Last_Stage: j.last_stage, Duration: formatDurationReadable(j.duration_seconds), Timestamp: formatReadableDate(j.timestamp) }));
        if (!rows || rows.length === 0) { Swal.fire('Info', 'No data to export.', 'info'); return; }
        downloadExcelHelper('Loan_Journeys.xlsx', rows);
    }

    function getStageBadgeClass(stage) {
        const s = (stage || '').toString().toLowerCase();
        if (/apply|agent|requested|talk to agent|apply now|agent requested|agent_request/i.test(s)) return 'bg-gradient-to-r from-green-50 to-green-100 text-green-800 ring-1 ring-green-200 dark:from-emerald-800 dark:to-emerald-900 dark:text-emerald-200';
        if (/enquir|enquiry|inquiry|ask/i.test(s)) return 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 ring-1 ring-blue-200 dark:from-sky-800 dark:to-sky-900 dark:text-sky-200';
        if (/complaint/i.test(s)) return 'bg-gradient-to-r from-red-50 to-red-100 text-red-800 ring-1 ring-red-200 dark:from-rose-800 dark:to-rose-900 dark:text-rose-200';
        if (/requirem|requirements|checklist|documents/i.test(s)) return 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-800 ring-1 ring-yellow-200 dark:from-amber-800 dark:to-amber-900 dark:text-amber-200';
        if (/about|intro|details|product/i.test(s)) return 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-800 ring-1 ring-slate-200 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-200';
        if (/menu|choices|main|product menu|product_menu|menu_view/i.test(s) || s.trim() === '') return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 ring-1 ring-gray-200 dark:from-zinc-700 dark:to-zinc-800 dark:text-gray-200';
        return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200 dark:bg-zinc-800 dark:text-gray-200';
    }

    function getSurveyCount(j) {
        const raw = j.raw || {};
        let count = 0;
        if (raw.survey_loan_q1 || raw.survey_loan_q2 || raw.survey_loan_q3) count++;
        if ((raw.conversation && (raw.conversation.survey_agent_q1 || raw.conversation.survey_agent_q2 || raw.conversation.survey_agent_q3)) || raw.survey_agent_q1 || raw.survey_agent_q2 || raw.survey_agent_q3) count++;
        return count;
    }

    function renderSurveyBadgesHtml(j) {
        const raw = j.raw || {};
        const parts = [];
        if (raw.survey_loan_q1 || raw.survey_loan_q2 || raw.survey_loan_q3) {
            parts.push(`<button data-survey-type="loan" data-id="${j.id}" class="survey-badge cursor-pointer inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-800 hover:bg-indigo-100 transition-colors"><i class='fas fa-clipboard-list'></i><span>Loan</span></button>`);
        }
        if ((raw.conversation && (raw.conversation.survey_agent_q1 || raw.conversation.survey_agent_q2 || raw.conversation.survey_agent_q3)) || raw.survey_agent_q1 || raw.survey_agent_q2 || raw.survey_agent_q3) {
            parts.push(`<button data-survey-type="agent" data-id="${j.id}" class="survey-badge cursor-pointer inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors"><i class='fas fa-user-check'></i><span>Agent</span></button>`);
        }
        if (parts.length === 0) return '<span class="text-xs text-gray-400">—</span>';
        return parts.join(' ');
    }

    function showSurveyModal(type, id) {
        const j = allJourneys.find(x => x.id === id);
        if (!j) return;
        const raw = j.raw || {};
        let html = '';
        // determine quiz date from common fields
        const quizDate = raw.survey_loan_completed_at || raw.survey_loan_timestamp || raw.survey_completed_at || raw.survey_timestamp || raw.timestamp || j.timestamp || '';
        const dateStr = formatReadableDate(quizDate);
        if (type === 'loan') {
            html += `<div class="text-xs text-gray-500 mb-2">Quiz date: ${dateStr || 'Unknown'}</div>`;
            html += `<h4 class="font-bold mb-2">Loan Survey</h4>`;
            html += `<div class="space-y-3">`;
            html += `<div><strong>Q1 - How easy was it to navigate the loan application menu?</strong><div class="mt-1">Answer: ${escapeHtml(raw.survey_loan_q1 || 'Not answered')}</div></div>`;
            html += `<div><strong>Q2 - Did you find the application requirements checklist clear and helpful?</strong><div class="mt-1">Answer: ${escapeHtml(raw.survey_loan_q2 || 'Not answered')}</div></div>`;
            html += `<div><strong>Q3 - Do you have any suggestions to make this process smoother?</strong><div class="mt-1">Answer: ${escapeHtml(raw.survey_loan_q3 || 'Not answered')}</div></div>`;
            html += `</div>`;
        } else if (type === 'agent') {
            const s = raw.conversation || raw;
            const agentQuizDate = (s && (s.survey_agent_completed_at || s.survey_agent_timestamp)) || raw.survey_agent_completed_at || raw.survey_agent_timestamp || raw.timestamp || j.timestamp || '';
            const agentDateStr = formatReadableDate(agentQuizDate);
            html += `<div class="text-xs text-gray-500 mb-2">Quiz date: ${agentDateStr || 'Unknown'}</div>`;
            html += `<h4 class="font-bold mb-2">Agent Survey</h4>`;
            html += `<div class="space-y-3">`;
            html += `<div><strong>Q1 - Satisfaction:</strong><div class="mt-1">Answer: ${escapeHtml(s.survey_agent_q1 || 'Not answered')}</div></div>`;
            html += `<div><strong>Q2 - Resolution:</strong><div class="mt-1">Answer: ${escapeHtml(s.survey_agent_q2 || 'Not answered')}</div></div>`;
            html += `<div><strong>Q3 - Comments:</strong><div class="mt-1">Answer: ${escapeHtml(s.survey_agent_q3 || 'Not answered')}</div></div>`;
            html += `</div>`;
        }
        const modal = document.getElementById('survey-modal');
        const body = document.getElementById('survey-modal-body');
        const title = document.getElementById('survey-modal-title');
        title.innerText = `${(type === 'loan') ? 'Loan Survey' : 'Agent Survey'} — ${j.whatsapp || id}`;
        body.innerHTML = html;
        openModal('survey-modal');
    }

    // Delegate survey badge clicks and name links to avoid inline onclick issues
    document.addEventListener('click', (e) => {
        const sb = e.target.closest && e.target.closest('.survey-badge');
        if (sb) {
            const type = sb.dataset.surveyType;
            const id = sb.dataset.id;
            if (type && id) {
                showSurveyModal(type, id);
                e.stopPropagation();
                e.preventDefault();
                return;
            }
        }
        const jl = e.target.closest && e.target.closest('.journey-link');
        if (jl) {
            const id = jl.dataset.id;
            if (id) {
                showJourneyDetails(id);
                e.preventDefault();
            }
        }
    });

    function showLoanOverlay(filterValue, filterType) {
        const container = document.getElementById('loan-list-container');
        const title = document.getElementById('loan-overlay-title');
        const countEl = document.getElementById('loan-overlay-count');
        if (!container) return;
        const type = filterType || 'stage';
        const label = filterValue || 'All';
        title.innerText = `Journeys — ${label}`;
        const normalizeSentimentStr = (s) => {
            s = (s || '').toString().toLowerCase();
            if (!s || s.trim() === '') return 'neutral';
            if (/neutral|ntrl/.test(s)) return 'neutral';
            if (/pos|positive|good|happy|satisfied|excellent/.test(s)) return 'positive';
            if (/neg|negative|bad|angry|sad|unsatisfied|poor/.test(s)) return 'negative';
            return 'neutral';
        };

        const filtered = allJourneys.filter(j => {
            if (!label || label === 'All') return true;
            if (type === 'product') {
                return mapProductName(j.loan_product) === label;
            }
            if (type === 'sentiment') {
                const s = normalizeSentimentStr(j.convo_sentiment || (j.raw && (j.raw.convo_sentiment || j.raw.sentiment)) || j.sentiment || '');
                return s.toString().toLowerCase() === label.toString().toLowerCase();
            }
            // default: stage
            if (label === 'Session exited without action') {
                const s = (j.last_stage || '').toString().toLowerCase();
                return !(/apply|agent|requested|enquir|enquiry|complaint|requirem|about|intro|menu|choices/i.test(s));
            }
            return (j.last_stage || '').toString().toLowerCase().includes(label.split(' ')[0].toString().toLowerCase());
        });
        countEl.innerText = `${filtered.length} Journeys`;
        container.innerHTML = '';
        if (filtered.length === 0) container.innerHTML = '<div class="p-6 text-center text-gray-500">No journeys for this selection yet.</div>';
        filtered.forEach(j => {
            const surveysHtml = renderSurveyBadgesHtml(j);
            const html = `
                    <div class="p-3 border-b border-gray-100 dark:border-night-border hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                        <div class="flex justify-between items-start">
                            <div>
                                <div class="text-sm font-medium"><a href="#" class="journey-link text-primary font-medium cursor-pointer" data-id="${j.id}">${escapeHtml(j.whatsapp)}</a></div>
                                <div class="text-xs text-gray-500">${escapeHtml(mapProductName(j.loan_product))} • ${formatDurationReadable(j.duration_seconds)}</div>
                                <div class="text-xs text-gray-400 mt-1">${formatReadableDate(j.timestamp)}</div>
                            </div>
                            <div class="text-right">
                                <div class="mb-2"><span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getStageBadgeClass(j.last_stage)}">${escapeHtml(j.last_stage || 'N/A')}</span></div>
                                <div class="text-sm">
                                    <button onclick="showJourneyDetails('${j.id}')" class="text-xs text-primary font-medium">View details</button>
                                    <button onclick="showChatLog('${j.id}')" class="text-xs text-gray-600 ml-3">View Chat Log</button>
                                </div>
                            </div>
                        </div>
                    </div>`;
            container.insertAdjacentHTML('beforeend', html);
        });
        openModal('loan-overlay');
    }

    function closeLoanOverlay() { closeModal('loan-overlay'); }

    function showJourneyDetails(id) {
        const j = allJourneys.find(x => x.id === id);
        if (!j) return;
        const content = document.getElementById('loan-journey-content');
        const titleEl = document.getElementById('loan-journey-title');
        if (!content || !titleEl) return;

        const userWhatsapp = j.whatsapp;
        const userJourneys = allJourneys.filter(x => x.whatsapp === userWhatsapp).sort((a, b) => b.timestamp - a.timestamp);
        const latestJ = userJourneys[0];

        // Calculate User Metrics
        const totalSessions = userJourneys.length;
        const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
        let assistantCalls = 0;

        userJourneys.forEach(uj => {
            const s = normalizeSentimentStr(uj.convo_sentiment || (uj.raw && (uj.raw.convo_sentiment || uj.raw.sentiment)) || uj.sentiment || '');
            sentimentCounts[s.toLowerCase()]++;
            if (isTerminalStage(uj.last_stage)) assistantCalls++;
        });

        const latestTitle = latestJ.convo_title || (latestJ.raw && latestJ.raw.convo_title) || 'General Enquiry Interaction';
        const latestSummary = latestJ.convo_summary || (latestJ.raw && latestJ.raw.convo_summary) || 'No summary available for the latest session.';

        titleEl.innerText = `User Profile`;
        document.getElementById('user-profile-subtitle').innerText = userWhatsapp;

        // Dominant sentiment
        const dominantSentiment = Object.entries(sentimentCounts).sort((a, b) => b[1] - a[1])[0];
        const sentimentLabel = dominantSentiment ? dominantSentiment[0] : 'neutral';
        const sentimentColorMap = { positive: 'text-emerald-500', neutral: 'text-gray-400', negative: 'text-red-500' };
        const sentimentIconMap = { positive: 'fa-smile', neutral: 'fa-meh', negative: 'fa-frown' };
        const sentimentColor = sentimentColorMap[sentimentLabel] || 'text-gray-400';
        const sentimentIcon = sentimentIconMap[sentimentLabel] || 'fa-meh';

        // Last product seen across all sessions
        const latestProduct = mapProductName(latestJ.loan_product) || 'General';
        const latestStage = latestJ.last_stage || 'N/A';
        const totalDuration = userJourneys.reduce((s, x) => s + (Number(x.duration_seconds) || 0), 0);

        content.innerHTML = `
                <div class="flex flex-col">

                    <!-- Profile Header Strip -->
                    <div class="flex items-center gap-4 px-6 py-5 border-b dark:border-night-border bg-gray-50/60 dark:bg-zinc-800/30">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center font-black text-black text-base flex-shrink-0 shadow-md" style="background:linear-gradient(135deg,#FFD100,#FFB84D)">
                            ${getInitials(userWhatsapp)}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><i class="fab fa-whatsapp"></i> WhatsApp</span>
                            </div>
                            <p class="font-mono font-bold text-dark dark:text-white text-base mt-0.5 truncate">${escapeHtml(userWhatsapp)}</p>
                        </div>
                        <div class="flex items-center gap-1 ${sentimentColor} text-sm">
                            <i class="fas ${sentimentIcon}"></i>
                            <span class="text-xs font-bold capitalize">${sentimentLabel}</span>
                        </div>
                    </div>

                    <!-- KPI Row -->
                    <div class="grid grid-cols-4 divide-x dark:divide-night-border border-b dark:border-night-border">
                        <div class="px-4 py-4 text-center">
                            <div class="text-[10px] uppercase font-bold text-grey tracking-wider mb-1">Sessions</div>
                            <div class="text-2xl font-black text-dark dark:text-white">${totalSessions}</div>
                        </div>
                        <div class="px-4 py-4 text-center">
                            <div class="text-[10px] uppercase font-bold text-grey tracking-wider mb-1">Total Time</div>
                            <div class="text-2xl font-black text-dark dark:text-white">${formatDurationReadable(totalDuration)}</div>
                        </div>
                        <div class="px-4 py-4 text-center">
                            <div class="text-[10px] uppercase font-bold text-grey tracking-wider mb-1">Agent Requests</div>
                            <div class="text-2xl font-black text-primary">${assistantCalls}</div>
                        </div>
                        <div class="px-4 py-4 text-center">
                            <div class="text-[10px] uppercase font-bold text-grey tracking-wider mb-1">Last Product</div>
                            <div class="text-sm font-black text-dark dark:text-white leading-tight mt-1">${escapeHtml(latestProduct)}</div>
                        </div>
                    </div>

                    <!-- Latest Session Summary -->
                    <div class="px-6 py-4 border-b dark:border-night-border">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[10px] font-bold text-grey uppercase tracking-widest">Latest Session Summary</span>
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStageBadgeClass(latestStage)}">${escapeHtml(latestStage)}</span>
                        </div>
                        <h4 class="text-sm font-bold text-dark dark:text-white mb-1">${escapeHtml(latestTitle)}</h4>
                        <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">${escapeHtml(latestSummary)}</p>
                    </div>

                    <!-- Session Selector -->
                    <div class="px-6 pt-4 pb-2">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-[10px] font-bold text-grey uppercase tracking-widest flex items-center gap-1.5"><i class="fas fa-history"></i> Sessions (${totalSessions})</span>
                            <div class="relative">
                                <select id="profile-session-dropdown" onchange="updateProfileSessionView()"
                                    class="appearance-none text-xs font-semibold bg-gray-100 dark:bg-zinc-800 dark:text-white pr-7 pl-3 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-primary outline-none cursor-pointer">
                                    ${userJourneys.map((uj, idx) => `<option value="${uj.id}">${idx === 0 ? '★ Latest — ' : ''}${formatSessionDate(uj.timestamp)} · ${escapeHtml(uj.convo_title || uj.last_stage || 'Enquiry')}</option>`).join('')}
                                </select>
                                <div class="pointer-events-none absolute inset-y-0 right-2 flex items-center text-grey">
                                    <i class="fas fa-chevron-down text-[10px]"></i>
                                </div>
                            </div>
                        </div>
                        <div id="profile-session-view" class="rounded-xl border dark:border-night-border bg-gray-50/50 dark:bg-zinc-800/20 overflow-hidden">
                            <!-- session details injected here -->
                        </div>
                    </div>

                    <!-- Close Footer -->
                    <div class="px-6 py-3 flex justify-end border-t dark:border-night-border mt-2">
                        <button onclick="closeModal('loan-journey-modal')" class="px-4 py-2 rounded-lg text-xs font-bold bg-gray-100 dark:bg-night-hover text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">Close</button>
                    </div>
                </div>
            `;

        openModal('loan-journey-modal');

        // Populate initial session view after DOM is ready
        setTimeout(() => {
            updateProfileSessionView();
        }, 80);
    }

    window.updateProfileSessionView = () => {
        const select = document.getElementById('profile-session-dropdown');
        const container = document.getElementById('profile-session-view');
        if (!select || !container) return;
        const sid = select.value;
        const j = allJourneys.find(x => x.id === sid);
        if (!j) return;

        const raw = j.raw || {};
        const surveysHtml = renderSurveyBadgesHtml(j);
        const sentiment = normalizeSentimentStr(j.convo_sentiment || raw.convo_sentiment || j.sentiment || raw.sentiment || '');
        const sentColorMap = { Positive: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', Neutral: 'bg-gray-100 text-gray-600 dark:bg-zinc-700 dark:text-gray-300', Negative: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
        const sentBadge = sentColorMap[sentiment] || sentColorMap['Neutral'];
        const product = escapeHtml(mapProductName(j.loan_product) || 'General');
        const transcript = escapeHtml(raw.full_transcript || raw.fullTranscript || '').replace(/\n/g, '<br>');
        const summary = escapeHtml(j.convo_summary || raw.convo_summary || '');

        container.innerHTML = `
                <div class="divide-y dark:divide-night-border">

                    <!-- Session Meta Row -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x dark:divide-night-border">
                        <div class="px-4 py-3">
                            <div class="text-[9px] uppercase font-bold text-grey tracking-wider mb-1">Date &amp; Time</div>
                            <div class="text-xs font-semibold dark:text-white">${formatReadableDate(j.timestamp)}</div>
                        </div>
                        <div class="px-4 py-3">
                            <div class="text-[9px] uppercase font-bold text-grey tracking-wider mb-1">Duration</div>
                            <div class="text-xs font-semibold dark:text-white">${formatDurationReadable(j.duration_seconds)}</div>
                        </div>
                        <div class="px-4 py-3">
                            <div class="text-[9px] uppercase font-bold text-grey tracking-wider mb-1">Last Stage</div>
                            <div class="mt-0.5"><span class="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStageBadgeClass(j.last_stage)}">${escapeHtml(j.last_stage || 'N/A')}</span></div>
                        </div>
                        <div class="px-4 py-3">
                            <div class="text-[9px] uppercase font-bold text-grey tracking-wider mb-1">Sentiment</div>
                            <div class="mt-0.5"><span class="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${sentBadge}">${sentiment.toUpperCase()}</span></div>
                        </div>
                    </div>

                    <!-- Product + Surveys Row -->
                    <div class="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                        <div class="flex items-center gap-2">
                            <span class="text-[9px] uppercase font-bold text-grey tracking-wider">Product:</span>
                            <span class="text-xs font-bold dark:text-white">${product}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            ${surveysHtml || '<span class="text-xs text-gray-400">No surveys</span>'}
                        </div>
                    </div>

                    ${summary ? `
                    <!-- Session Summary -->
                    <div class="px-4 py-3">
                        <div class="text-[9px] uppercase font-bold text-grey tracking-wider mb-1.5">Session Summary</div>
                        <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">${summary}</p>
                    </div>` : ''}

                    ${transcript ? `
                    <!-- Transcript -->
                    <div class="px-4 py-3">
                        <div class="text-[9px] uppercase font-bold text-grey tracking-wider mb-2">Conversation Transcript</div>
                        <div class="max-h-48 overflow-y-auto text-xs leading-relaxed text-gray-600 dark:text-gray-400 bg-white dark:bg-zinc-900/50 rounded-lg p-3 border dark:border-night-border">${transcript}</div>
                    </div>` : ''}

                    <!-- Actions -->
                    <div class="px-4 py-3 flex justify-end gap-2">
                        <button onclick="showChatLog('${j.id}')" class="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5"><i class="fas fa-comment-dots"></i> View Chat Log</button>
                    </div>
                </div>
            `;
    }
    // Ensure overlays are top-level so backdrop-blur isn't clipped by transformed ancestors
    (function moveModalsToBody() {
        try {
            const ids = ['loan-overlay', 'loan-journey-modal', 'survey-modal', 'chatlog-modal'];
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el && el.parentElement !== document.body) {
                    document.body.appendChild(el);
                }
            });
        } catch (e) { console.warn('modal move error', e); }
    })();
    // Toggle charts <-> live sessions view with slide-up arrival animation
    function animateInFromBottom(el) {
        return new Promise(resolve => {
            if (!el) return resolve();
            el.classList.remove('hidden');
            el.style.willChange = 'transform, opacity';
            el.style.transform = 'translateY(24px)';
            el.style.opacity = '0';
            el.style.transition = 'transform 520ms cubic-bezier(.2,.9,.2,1), opacity 420ms ease-out';
            requestAnimationFrame(() => {
                el.style.transform = 'translateY(0)';
                el.style.opacity = '1';
            });
            setTimeout(() => {
                el.style.transition = '';
                el.style.transform = '';
                el.style.opacity = '';
                el.style.willChange = '';
                resolve();
            }, 560);
        });
    }

    function animateOutToBottom(el) {
        return new Promise(resolve => {
            if (!el || el.classList.contains('hidden')) return resolve();
            el.style.willChange = 'transform, opacity';
            el.style.transform = 'translateY(0)';
            el.style.opacity = '1';
            el.style.transition = 'transform 420ms cubic-bezier(.2,.8,.2,1), opacity 360ms ease-in';
            requestAnimationFrame(() => {
                el.style.transform = 'translateY(24px)';
                el.style.opacity = '0';
            });
            setTimeout(() => {
                el.classList.add('hidden');
                el.style.transition = '';
                el.style.transform = '';
                el.style.opacity = '';
                el.style.willChange = '';
                resolve();
            }, 460);
        });
    }

    window.toggleAnalyticsView = async () => {
        const charts = document.getElementById('loan-analytics-charts');
        const live = document.getElementById('loan-analytics-live');
        const btn = document.getElementById('analytics-mode-toggle');
        if (!charts || !live || !btn) return;
        const showingCharts = !charts.classList.contains('hidden');
        if (showingCharts) {
            // charts -> out, live -> in
            animateOutToBottom(charts);
            await animateInFromBottom(live);
            btn.setAttribute('aria-pressed', 'true');
            btn.innerText = 'Show Charts';
            btn.classList.add('ring-4', 'ring-yellow-300', 'dark:ring-yellow-200');
        } else {
            // live -> out, charts -> in
            animateOutToBottom(live);
            await animateInFromBottom(charts);
            btn.setAttribute('aria-pressed', 'false');
            btn.innerText = 'Show Live Sessions';
            btn.classList.remove('ring-4', 'ring-yellow-300', 'dark:ring-yellow-200');
        }
        // Resize charts after toggle so they render correctly
        setTimeout(() => {
            try { if (loanCharts.funnel) loanCharts.funnel.resize(); } catch (e) { }
            try { if (loanCharts.productDonut) loanCharts.productDonut.resize(); } catch (e) { }
            try { if (loanCharts.sentimentPie) loanCharts.sentimentPie.resize(); } catch (e) { }
        }, 600);
    };
    // Utilities
    window.getInitials = (name) => {
        if (!name) return '?';
        const parts = name.split(' ');
        return parts.length === 1 ? parts[0].substring(0, 2).toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Chat log modal helper (Chatbot User Analytics only)
    window.showChatLog = (id) => {
        const j = allJourneys.find(x => x.id === id);
        if (!j) return;
        const raw = j.raw || {};
        const title = escapeHtml(raw.convo_title || j.convo_title || 'Conversation');
        const summary = escapeHtml(raw.convo_summary || j.convo_summary || '');
        const dateStr = formatReadableDate(raw.timestamp || j.timestamp || j.start || '');
        const transcript = raw.full_transcript || raw.fullTranscript || raw.full_transcript_text || '';

        const modal = document.getElementById('chatlog-modal');
        const body = document.getElementById('chatlog-modal-body');
        const heading = document.getElementById('chatlog-modal-title');
        if (!modal || !body || !heading) return;
        heading.innerText = `${title}${dateStr ? ' — ' + dateStr : ''}`;
        body.innerHTML = '';
        if (summary) body.innerHTML += `<div class="text-xs text-gray-500 mb-2">${summary}</div>`;
        body.innerHTML += `<pre class="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-zinc-800 p-3 rounded max-h-[60vh] overflow-y-auto">${escapeHtml(transcript || 'No transcript available')}</pre>`;
        openModal('chatlog-modal');
    };

    window.deleteUser = async (id) => {
        const result = await Swal.fire({
            title: 'Delete?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#EE5D50', confirmButtonText: 'Yes'
        });
        if (result.isConfirmed) await deleteDoc(doc(db, "customers", id));
    };
    window.logout = () => {
        document.getElementById('app-layout').classList.add('opacity-0');
        setTimeout(() => location.reload(), 500);
    };

    const closeKYCOverlay = () => closeModal('kyc-completion-overlay');

    // Expose to window
    window.navTo = navTo;
    window.renderTable = renderTable;
    window.processExcel = processExcel;
    window.exportToCSV = exportToCSV;
    window.editUser = editUser;
    window.uploadFile = uploadFile;
    window.saveUserChanges = saveUserChanges;
    window.changePage = changePage;

    window.downloadYieldList = downloadYieldList;
    window.closeYieldOverlay = closeYieldOverlay;
    window.downloadPipList = downloadPipList;
    window.closePipOverlay = closePipOverlay;

    window.downloadDailyList = downloadDailyList;
    window.closeDailyOverlay = closeDailyOverlay;
    window.downloadSubmissionList = downloadSubmissionList;
    window.closeSubmissionOverlay = closeSubmissionOverlay;
    window.toggleTheme = toggleTheme;
    window.switchImportTab = switchImportTab;
    window.addManualUser = addManualUser;
    window.deleteFile = deleteFile;
    window.updateFileName = updateFileName;

    window.updateDailyChart = updateDailyChart;
    window.updateSubmissionChart = updateSubmissionChart;
    window.updateDocumentYieldChart = updateDocumentYieldChart;
    window.downloadTrendsCSV = downloadTrendsCSV;
    window.downloadStatusCSV = downloadStatusCSV;
    window.downloadPipSummaryCSV = downloadPipSummaryCSV;
    window.downloadDailySummaryCSV = downloadDailySummaryCSV;
    window.downloadSubmissionSummaryCSV = downloadSubmissionSummaryCSV;
    window.downloadDocumentYieldCSV = downloadDocumentYieldCSV;

    window.processAdvancedBatch = processAdvancedBatch;
    window.refreshAdvancedBI = refreshAdvancedBI;
    window.exportAdvancedBI = exportAdvancedBI;
    window.navToKYCFilter = navToKYCFilter;
    window.downloadKYCCompletionCSV = downloadKYCCompletionCSV;
    window.downloadKYCList = downloadKYCList;
    window.closeKYCOverlay = closeKYCOverlay;
    window.downloadUserDocs = downloadUserDocs;
    window.downloadAllCustomersDocs = downloadAllCustomersDocs;
    window.exportAnalyticsPDF = exportAnalyticsPDF;
    window.updateDashboardTrends = updateDashboardTrends;
    window.initLoanListener = initLoanListener;
    window.downloadLoanLogsExcel = downloadLoanLogsExcel;
    window.renderLoanTable = renderLoanTable;
    window.updateLoanAnalytics = updateLoanAnalytics;
    window.updateLoanCharts = updateLoanCharts;
    window.showLoanOverlay = showLoanOverlay;
    window.closeLoanOverlay = closeLoanOverlay;
    window.showJourneyDetails = showJourneyDetails;
    window.getStageBadgeClass = getStageBadgeClass;

