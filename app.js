// app.js - Letshego e-KYC Enterprise Management System 2026
import { firebaseConfig, ADMIN_AUTH } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Initialize Firebase Services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Global State
let allCustomers = [];
let chartBar, chartPie;
let selectedExportData = []; 
let selectedExportDate = ""; 

/**
 * 1. AUTHENTICATION LOGIC
 */
window.attemptLogin = () => {
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value.trim();

    if (u === ADMIN_AUTH.username && p === ADMIN_AUTH.password) {
        sessionStorage.setItem("letshego_session", "active");
        Swal.fire({
            title: 'Identity Verified',
            text: 'Accessing Secure Vault...',
            icon: 'success',
            showConfirmButton: false,
            timer: 1000
        }).then(() => {
            location.reload(); 
        });
    } else {
        Swal.fire('Login Failed', 'Unauthorized credentials provided.', 'error');
    }
};

window.logout = () => {
    sessionStorage.removeItem("letshego_session");
    location.reload();
};

/**
 * 2. DASHBOARD INITIALIZATION & LIVE SYNC
 */
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem("letshego_session") === "active") {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'flex';
        startLiveSync();
    }
});

function startLiveSync() {
    onSnapshot(collection(db, "customers"), (snapshot) => {
        allCustomers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // --- FEATURE: LIST NEWEST ENTRIES FIRST ---
        allCustomers.sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA;
        });

        renderUI(allCustomers);
    });
}

function renderUI(data) {
    renderStats(data);
    renderTable(data);
    renderAnalytics(data);
}

/**
 * 3. INTERACTIVE ANALYTICS (Clickable & Chronological)
 */
function renderAnalytics(data) {
    const ctxBar = document.getElementById('barChart').getContext('2d');
    const ctxPie = document.getElementById('pieChart').getContext('2d');

    if (chartBar) chartBar.destroy();
    if (chartPie) chartPie.destroy();

    // --- BAR CHART: DAILY ACTIVITY (Actual Dates) ---
    const dateGroups = {};
    data.forEach(user => {
        if (user.created_at) {
            let d = new Date(user.created_at).toLocaleDateString('en-GB'); 
            dateGroups[d] = (dateGroups[d] || 0) + 1;
        }
    });

    const sortedLabels = Object.keys(dateGroups).sort((a, b) => {
        return new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-'));
    });
    const dailyData = sortedLabels.map(label => dateGroups[label]);

    chartBar = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: sortedLabels,
            datasets: [{
                label: 'Submissions',
                data: dailyData,
                backgroundColor: '#FFD100', 
                borderRadius: 5,
                barThickness: 30
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    const date = sortedLabels[idx];
                    
                    const filtered = allCustomers.filter(u => {
                        return u.created_at && new Date(u.created_at).toLocaleDateString('en-GB') === date;
                    });
                    
                    // Prepare for Daily CSV Download
                    selectedExportData = filtered;
                    selectedExportDate = date;
                    
                    const dlBtn = document.getElementById('btn-daily-export');
                    if(dlBtn) {
                        dlBtn.style.display = 'block';
                        dlBtn.innerHTML = `<i class="fas fa-file-export"></i> Download ${date} Report`;
                    }

                    showSection('dashboard');
                    renderTable(filtered);
                }
            }
        }
    });

    // --- PIE CHART: DOCUMENT TYPES ---
    const docCounts = {
        'Omang': data.filter(c => c.omang_file_url).length,
        'Payslip': data.filter(c => c.payslip_url).length,
        'Utility': data.filter(c => c.utility_bill_url).length,
        'Letter': data.filter(c => c.confirmation_letter_url).length,
        'Affidavit': data.filter(c => c.affidavit_url).length
    };

    chartPie = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: Object.keys(docCounts),
            datasets: [{
                data: Object.values(docCounts),
                backgroundColor: ['#FFD100', '#05CD99', '#2B3674', '#FF5B5B', '#A3AED0'],
                borderWidth: 0
            }]
        },
        options: {
            maintainAspectRatio: false,
            cutout: '70%'
        }
    });
}

/**
 * 4. TABLE VIEW (The Techy Visual Vault)
 */
function renderTable(data) {
    const tbody = document.querySelector('#customerTable tbody');
    if ($.fn.DataTable.isDataTable('#customerTable')) {
        $('#customerTable').DataTable().destroy();
    }
    
    tbody.innerHTML = '';

    data.forEach(user => {
        // --- 2026 VISUAL VAULT UPGRADE (No Emojis) ---
        let vaultHTML = '<div class="vault-container" style="display:flex; gap:5px; flex-wrap:wrap;">';
        
        if (user.omang_file_url) 
            vaultHTML += `<a href="${user.omang_file_url}" target="_blank" class="file-chip chip-omang" title="Omang Card"><i class="fas fa-flag"></i> Omang</a>`;
        
        if (user.payslip_url) 
            vaultHTML += `<a href="${user.payslip_url}" target="_blank" class="file-chip chip-pay" title="Payslip"><i class="fas fa-money-bill-wave"></i> Slip</a>`;
        
        if (user.utility_bill_url) 
            vaultHTML += `<a href="${user.utility_bill_url}" target="_blank" class="file-chip chip-util" title="Utility Bill"><i class="fas fa-bolt"></i> Bill</a>`;
            
        if (user.confirmation_letter_url) 
            vaultHTML += `<a href="${user.confirmation_letter_url}" target="_blank" class="file-chip chip-confirm" title="Letter"><i class="fas fa-file-signature"></i> Letter</a>`;

        if (user.affidavit_url) 
            vaultHTML += `<a href="${user.affidavit_url}" target="_blank" class="file-chip chip-aff" title="Affidavit"><i class="fas fa-gavel"></i> Oath</a>`;

        vaultHTML += '</div>';

        const lastActivity = user.created_at ? new Date(user.created_at).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : 'N/A';

        const row = `
            <tr>
                <td style="font-weight:bold;">${user.id.replace('ID', '')}</td>
                <td>${user.full_name || "New Client"}</td>
                <td><span class="badge ${user.pip_status && user.pip_status !== 'None' ? 'badge-red' : 'badge-green'}">${user.pip_status || 'None'}</span></td>
                <td>${vaultHTML}</td> 
                <td><strong>${lastActivity}</strong></td>
                <td>
                    <div style="display:flex; gap:5px;">
                        <button onclick="window.openEditModal('${user.id}')" class="btn-edit"><i class="fas fa-pen"></i></button>
                        <button onclick="window.deleteCustomer('${user.id}')" class="btn-delete"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });

    $('#customerTable').DataTable({
        pageLength: 8,
        responsive: true,
        order: [], // Keeps our newest-first JS sort
        language: { search: "", searchPlaceholder: "Quick search name or ID..." }
    });
}

/**
 * 5. REFRESH & EXPORT LOGIC
 */
window.refreshTable = () => {
    selectedExportData = [];
    document.getElementById('btn-daily-export').style.display = 'none';
    renderTable(allCustomers);
    Swal.fire({ title: 'Syncing...', icon: 'info', timer: 800, showConfirmButton: false });
};

window.exportToExcel = () => {
    const csv = Papa.unparse(allCustomers);
    downloadFile(csv, "Letshego_KYC_Master.csv");
};

window.exportDailyCSV = () => {
    if (selectedExportData.length === 0) return;
    
    // FORMAT: Date on first line, followed by data
    const csvData = Papa.unparse(selectedExportData);
    const finalContent = `REPORT FOR DATE: ${selectedExportDate}\nGENERATED: ${new Date().toLocaleString()}\n\n${csvData}`;
    
    downloadFile(finalContent, `Letshego_Report_${selectedExportDate.replaceAll('/', '-')}.csv`);
};

function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    link.click();
}

/**
 * 6. DATA MANIPULATION (Edit / Delete / Upload)
 */
window.deleteCustomer = (id) => {
    Swal.fire({
        title: 'Confirm Deletion',
        text: "Removing this record will delete all associated document links.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EE5D50',
        confirmButtonText: 'Delete Record'
    }).then(async (result) => {
        if (result.isConfirmed) await deleteDoc(doc(db, "customers", id));
    });
};

window.openEditModal = (id) => {
    const user = allCustomers.find(u => u.id === id);
    document.getElementById('edit-doc-id').value = id;
    document.getElementById('edit-name').value = user.full_name || '';
    document.getElementById('edit-pip').value = user.pip_status || 'None';
    document.getElementById('editModal').style.display = 'block';
};

window.saveCustomerChanges = async () => {
    const id = document.getElementById('edit-doc-id').value;
    await updateDoc(doc(db, "customers", id), {
        full_name: document.getElementById('edit-name').value,
        pip_status: document.getElementById('edit-pip').value,
        created_at: new Date().toISOString() // Updates 'Last Activity'
    });
    window.closeModal('editModal');
    Swal.fire('Updated', 'Customer profile synchronized.', 'success');
};

window.uploadFileManually = async (targetField, inputId) => {
    const id = document.getElementById('edit-doc-id').value;
    const file = document.getElementById(inputId).files[0];
    if (!file) return Swal.fire('Wait', 'Please select a file first.', 'warning');

    Swal.fire({ title: 'Uploading...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const fileRef = ref(storage, `admin_manual/${id}/${targetField}_${Date.now()}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        
        await updateDoc(doc(db, "customers", id), { 
            [targetField]: url,
            created_at: new Date().toISOString() 
        });
        Swal.fire('Success', 'File linked to profile.', 'success');
    } catch (e) {
        Swal.fire('Error', 'Storage upload failed.', 'error');
    }
};

/**
 * 7. UTILS & NAVIGATION
 */
function renderStats(data) {
    document.getElementById('total-users').innerText = data.length;
    document.getElementById('pip-alerts').innerText = data.filter(c => c.pip_status && c.pip_status !== 'None').length;
}

window.showSection = (sectionName) => {
    const views = ['dashboard', 'analytics'];
    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if(el) el.style.display = v === sectionName ? 'block' : 'none';
    });
    // Remove active class from menu
    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
    // We assume the caller handles the 'active' class on sidebar based on current HTML
};

window.openBulkUpload = () => document.getElementById('bulkModal').style.display = 'block';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

window.processCSV = () => {
    const file = document.getElementById('csv-file').files[0];
    if (!file) return;
    Papa.parse(file, {
        header: true,
        complete: async (results) => {
            for (const row of results.data) {
                if (row.omang) {
                    await setDoc(doc(db, "customers", "ID" + row.omang), {
                        full_name: row.name || row.full_name,
                        pip_status: "None",
                        created_at: new Date().toISOString() 
                    }, { merge: true });
                }
            }
            Swal.fire('Import Success', 'Database pre-populated.', 'success');
            window.closeModal('bulkModal');
        }
    });
};