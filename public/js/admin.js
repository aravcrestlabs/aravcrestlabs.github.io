document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------
    // Configuration & Auth Check
    // ----------------------------------------
    const ADMIN_SECRET_KEY = 'adminSecret';
    // Use the global BASE_PATH injected by the layout, or fallback to root if undefined
    const BASE_PATH = window.BASE_PATH || '/';
    const API_URL = window.GEMCREST_CONFIG?.serverUrl || 'https://uigmdykavqllplgdxtxs.supabase.co/functions/v1/licensing';

    // Get admin secret from localStorage
    const secret = localStorage.getItem(ADMIN_SECRET_KEY);

    // Check authentication immediately
    if (!secret) {
        window.location.href = BASE_PATH + 'admin/login/';
        return;
    }

    // Initialize Data
    console.log('Initializing Admin Dashboard...');
    console.log('DEBUG: API_URL =', API_URL);
    console.log('DEBUG: Secret from localStorage =', secret ? '(set, length: ' + secret.length + ')' : '(NOT SET)');
    // fetchLicenses and fetchSettings are called at the bottom of this function
    // ----------------------------------------
    // State
    // ----------------------------------------
    let licenses = [];

    // ----------------------------------------
    // Elements
    // ----------------------------------------
    const tableBody = document.getElementById('license-table-body');
    const searchInput = document.getElementById('search-input');
    const refreshBtn = document.getElementById('refresh-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const createBtn = document.getElementById('create-btn');
    const createModal = document.getElementById('create-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const createForm = document.getElementById('create-form');

    // Stats Elements
    const statTotal = document.getElementById('stat-total');
    const statActive = document.getElementById('stat-active');
    const statDevices = document.getElementById('stat-devices');
    const statRevoked = document.getElementById('stat-revoked');

    // ----------------------------------------
    // API Functions
    // ----------------------------------------
    const headers = {
        'Content-Type': 'application/json',
        'x-admin-secret': secret
    };

    /**
     * API ENDPOINTS (Based on Supabase Function index.ts):
     * - /licenses (POST with x-admin-secret)
     * - /create-license (POST with x-admin-secret)
     * - /revoke-license (POST with x-admin-secret)
     * - /reset-machine (POST with code) -> Admin Reset
     */
    async function fetchLicenses() {
        try {
            renderLoading();
            // Note: index.ts expects the last part of url path to be the action name
            console.log('DEBUG: Fetching licenses from:', `${API_URL}/licenses`);
            console.log('DEBUG: Using headers:', JSON.stringify(headers));
            const res = await fetch(`${API_URL}/licenses`, {
                method: 'POST',
                headers
            });

            console.log('DEBUG: Response status:', res.status);
            if (res.status === 401) {
                alert('Invalid Admin Secret Key. Please login again.');
                handleLogout();
                return;
            }

            const data = await res.json();
            console.log('API Response:', data);

            // index.ts returns { licenses: [...] }
            licenses = data.licenses || [];

            renderTable(licenses);
            updateStats();
        } catch (err) {
            console.error(err);
            tableBody.innerHTML = `<tr><td colspan="6" style="padding:3rem;text-align:center;color:red;">CONNECTION ERROR: ${err.message}<br>Ensure Backend is Running at ${API_URL}</td></tr>`;
        }
    }

    async function createLicense(name, email) {
        const randomHex = () => Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, '0');
        const code = `JEWELRY-${randomHex()}-${randomHex()}`;

        try {
            const res = await fetch(`${API_URL}/create-license`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ code, name, email })
            });

            if (!res.ok) throw new Error('Creation failed');

            const data = await res.json();
            alert(`License Created: ${data.code || code}`);
            closeModal();
            fetchLicenses();
        } catch (err) {
            console.error(err);
            alert('Failed to create license');
        }
    }

    async function revokeLicense(code) {
        if (!confirm('Are you sure you want to REVOKE this license?')) return;
        try {
            await fetch(`${API_URL}/revoke-license`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ code })
            });
            fetchLicenses();
        } catch (err) {
            alert('Failed to revoke');
        }
    }

    async function resetMachine(code, currentMachineId) {
        if (!currentMachineId) {
            alert("No machine active properly.");
            return;
        }
        if (!confirm('Unlink Machine ID? This forces deactivation.')) return;
        try {
            const res = await fetch(`${API_URL}/reset-machine`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ code, machineId: currentMachineId })
            });

            if (!res.ok) throw new Error('Failed to deactivate');
            fetchLicenses();
            alert('Machine Unlinked');
        } catch (err) {
            console.error(err);
            alert('Failed to reset machine');
        }
    }

    // ----------------------------------------
    // Rendering
    // ----------------------------------------
    function renderLoading() {
        tableBody.innerHTML = `<tr><td colspan="6" style="padding:3rem;text-align:center;">Loading Data...</td></tr>`;
    }

    function renderTable(data) {
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="padding:3rem;text-align:center;color:#666;">No Licenses Found</td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(l => {
            // Data Mapping (Supabase/Postgres = snake_case)
            const machineId = l.machine_id || l.machineId;
            const createdAt = l.created_at || l.createdAt;
            const status = l.status || 'unknown';

            return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 1rem; font-weight: bold; border-right: 1px solid #eee;">${l.code}</td>
                <td style="padding: 1rem; border-right: 1px solid #eee;">
                    <div style="font-weight:bold;">${l.name || 'Unknown'}</div>
                    <div style="font-size:0.8rem;opacity:0.6;">${l.email || '-'}</div>
                </td>
                <td style="padding: 1rem; border-right: 1px solid #eee;">
                    <span style="padding: 2px 6px; font-size: 0.75rem; font-weight: bold; background: ${status === 'active' ? '#e6ffe6; color: green;' : '#ffe6e6; color: red;'} border: 1px solid currentColor;">
                        ${status.toUpperCase()}
                    </span>
                </td>
                <td style="padding: 1rem; border-right: 1px solid #eee;">
                    ${machineId ? `<div style="font-size:0.8rem; font-family:monospace;">${machineId}</div>` : '<span style="opacity:0.3;">-</span>'}
                </td>
                <td style="padding: 1rem; border-right: 1px solid #eee; font-size: 0.8rem;">
                    ${createdAt ? new Date(createdAt).toLocaleDateString() : '-'}
                </td>
                <td style="padding: 1rem;">
                    ${status === 'active' ? `
                        <div style="display:flex; gap:0.5rem;">
                            <!-- <button onclick="window.adminActions.resend('${l.code}')" title="Resend Email" style="cursor:pointer; padding:4px; opacity:0.5;">📧</button> -->
                            <button onclick="window.adminActions.reset('${l.code}', '${machineId || ''}')" title="Reset Machine" style="cursor:pointer; padding:4px;">🔓</button>
                            <button onclick="window.adminActions.revoke('${l.code}')" title="Revoke" style="cursor:pointer; padding:4px; color:red;">🗑️</button>
                        </div>
                    ` : '<span style="opacity:0.5;">Revoked</span>'}
                </td>
            </tr>
            `;
        }).join('');
    }

    function updateStats() {
        statTotal.textContent = licenses.length;
        statActive.textContent = licenses.filter(l => l.status === 'active').length;
        statRevoked.textContent = licenses.filter(l => l.status === 'revoked').length;
        statDevices.textContent = licenses.filter(l => l.machine_id || l.machineId).length;
    }

    // ----------------------------------------
    // Global Actions
    // ----------------------------------------
    window.adminActions = {
        reset: resetMachine,
        revoke: revokeLicense
    };

    // ----------------------------------------
    // Interactions
    // ----------------------------------------
    function handleLogout() {
        localStorage.removeItem('adminSecret');
        window.location.href = BASE_PATH + 'admin/login/';
    }

    logoutBtn.addEventListener('click', handleLogout);

    refreshBtn.addEventListener('click', () => {
        refreshBtn.querySelector('span').textContent = '...';
        fetchLicenses().then(() => {
            refreshBtn.querySelector('span').textContent = '↻ SYNC';
        });
    });

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = licenses.filter(l =>
            l.code.toLowerCase().includes(term) ||
            (l.name && l.name.toLowerCase().includes(term)) ||
            (l.email && l.email.toLowerCase().includes(term))
        );
        renderTable(filtered);
    });

    // Modal
    function openModal() {
        createModal.classList.remove('hidden');
    }

    function closeModal() {
        createModal.classList.add('hidden');
        document.getElementById('new-name').value = '';
        document.getElementById('new-email').value = '';
    }

    createBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);

    createForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('new-name').value;
        const email = document.getElementById('new-email').value;
        createLicense(name, email);
    });

    // ----------------------------------------
    // Settings Logic
    // ----------------------------------------
    const settingsForm = document.getElementById('settings-form');
    const settingPriceInput = document.getElementById('setting-price');
    const settingsMsg = document.getElementById('settings-msg');

    async function fetchSettings() {
        try {
            const res = await fetch(`${API_URL}/get-settings`, {
                method: 'POST', // public endpoint but likely expects POST based on logic
                headers
            });
            const data = await res.json();
            if (data.price) {
                settingPriceInput.value = data.price;
            }
        } catch (err) {
            console.error('Failed to fetch settings', err);
        }
    }

    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const price = settingPriceInput.value;
        settingsMsg.textContent = 'Updating...';
        settingsMsg.style.color = 'black';

        try {
            const res = await fetch(`${API_URL}/update-settings`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ price })
            });

            if (res.ok) {
                settingsMsg.textContent = 'Saved!';
                settingsMsg.style.color = 'green';
                setTimeout(() => settingsMsg.textContent = '', 2000);
            } else {
                throw new Error('Update failed');
            }
        } catch (err) {
            settingsMsg.textContent = 'Error';
            settingsMsg.style.color = 'red';
        }
    });

    // Init
    fetchLicenses();
    fetchSettings();
});
