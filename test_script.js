
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
            const u = document.getElementById('username').value.trim();
            const p = document.getElementById('password').value.trim();
            if ((u === ADMIN_AUTH.username && p === ADMIN_AUTH.password) || (u === SUPER_ADMIN_AUTH.username && p === SUPER_ADMIN_AUTH.password)) {
                currentUserRole = (u === SUPER_ADMIN_AUTH.username) ? 'super_admin' : 'admin';
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
                    initDataListener();

                    // Super Admin Profile Visuals (gold avatar + diamond indicator)
                    if (currentUserRole === 'super_admin') {
                        const avatar = document.getElementById('profile-avatar');
                        const nameEl = document.getElementById('profile-name');
                        const statusEl = document.getElementById('profile-status');
                        avatar.src = 'https://ui-avatars.com/api/?name=Super+Admin&background=FFD700&color=000000';
                        nameEl.innerText = 'Super Admin';
                        statusEl.innerHTML = '<i class="fas fa-gem mr-1"></i>SUPER ADMIN';
                        statusEl.className = 'text-xs text-amber-500 font-medium';
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
                text: `Gathering and zipping ${docsToDownload.length} document(s). Please wait...`,
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                const zip = new JSZip();

                await Promise.all(docsToDownload.map(async (doc) => {
                    let response;
                    try {
                        // Attempt direct fetch
                        response = await fetch(doc.url);
                        if (!response.ok) throw new Error("Direct fetch failed");
                    } catch (err) {
                        // If CORS blocks the request, fallback to a public CORS proxy
                        console.warn(`Direct fetch failed for ${doc.prefix}. Trying CORS proxy...`);
                        const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(doc.url);
                        response = await fetch(proxyUrl);
                        if (!response.ok) throw new Error("Proxy fetch failed");
                    }

                    const blob = await response.blob();

                    let ext = '';
                    if (blob.type === 'image/jpeg') ext = '.jpg';
                    else if (blob.type === 'image/png') ext = '.png';
                    else if (blob.type === 'application/pdf') ext = '.pdf';

                    const filename = `${doc.prefix}${ext}`;
                    zip.file(filename, blob);
                }));

                const content = await zip.generateAsync({ type: "blob" });

                const downloadUrl = URL.createObjectURL(content);
                const a = document.createElement("a");
                a.href = downloadUrl;
                const safeUserName = (user.full_name || 'User').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                a.download = `Letshego_${safeUserName}_Documents.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(downloadUrl);

                Swal.close();
                Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, icon: 'success', title: 'ZIP downloaded successfully!' });
            } catch (error) {
                console.error("ZIP creation failed completely:", error);

                Swal.fire({
                    title: 'ZIP Error',
                    text: 'Unable to bundle files due to network restrictions. Opening files sequentially.',
                    icon: 'warning'
                });

                // Final fallback if even the proxy fails 
                docsToDownload.forEach((doc, index) => {
                    setTimeout(() => {
                        const a = document.createElement('a');
                        a.href = doc.url;
                        a.target = '_blank';
                        a.download = doc.prefix;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }, index * 1000);
                });
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
                'advanced': 'Advanced BI Playground'
            };
            document.getElementById('page-title').innerText = titles[page];
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
                tr.className = "hover:bg-gray-50 dark:hover:bg-night-hover transition-colors group border-b border-gray-50 dark:border-night-border hover:-translate-y-[1px]";

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
                if (c.risk_rating === 'HIGH') riskBadge = `<span class="bg-red-100 dark:bg-red-900/40 text-danger border border-red-200 dark:border-red-800 px-2 py-1 rounded text-[10px] font-bold shadow-sm">${c.risk_rating}</span>`;
                else if (c.risk_rating === 'MEDIUM') riskBadge = `<span class="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 border border-yellow-200 dark:border-yellow-800 px-2 py-1 rounded text-[10px] font-bold shadow-sm">${c.risk_rating}</span>`;
                else if (c.risk_rating === 'LOW') riskBadge = `<span class="bg-green-100 dark:bg-green-900/40 text-success border border-green-200 dark:border-green-800 px-2 py-1 rounded text-[10px] font-bold shadow-sm">${c.risk_rating}</span>`;
                else riskBadge = `<span class="bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-1 rounded text-[10px] font-bold shadow-sm">${c.risk_rating || 'N/A'}</span>`;

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
                    <td class="p-4 text-sm font-medium text-gray-700 dark:text-gray-300">${c.priority || 'N/A'}</td>
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

            const updates = {
                full_name: newName,
                pip_status: newStatus,
                source_of_wealth: newWealth,
                contact_details: newContact,
                payout_date: newPayout,
                years_since_payout: newYears,
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
                    const workbook = XLSX.read(data, {type: 'array'});
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

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
                }
            });
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
        // Utilities
        window.getInitials = (name) => {
            if (!name) return '?';
            const parts = name.split(' ');
            return parts.length === 1 ? parts[0].substring(0, 2).toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
        window.exportAnalyticsPDF = exportAnalyticsPDF;
        window.updateDashboardTrends = updateDashboardTrends;
    