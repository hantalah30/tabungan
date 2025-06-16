document.addEventListener('DOMContentLoaded', () => {
    // --- KONFIGURASI & STATE ---
    const TARGET_SAVINGS = 50000000;
    const firebaseConfig = {apiKey: "AIzaSyBA0AZrgr01JDU4dglrRY7UrRtniKRoyW0",
    authDomain: "tabungan-nikah-kita.firebaseapp.com",
    projectId: "tabungan-nikah-kita",
    storageBucket: "tabungan-nikah-kita.firebasestorage.app",
    messagingSenderId: "505862394176",
    appId: "1:505862394176:web:eb3e0cea768f875f186aa5",
    measurementId: "G-Z2T5R4TR9F"};
    let allTransactions = [];
    let contributionChart = null; // Diubah dari expenseChart
    
    // --- INISIALISASI ---
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const transactionsCollection = db.collection('transactions');
    initApp();

    function initApp() {
        setupEventListeners();
        loadTheme();
        loadSavedName();
        transactionsCollection.orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            allTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateAllUI();
        });
    }

    // --- RENDER & UI UPDATE ---
    function updateAllUI() {
        renderHomePage();
        renderTransactionPage();
        renderAnalysisPage(); // Fungsi ini sekarang memiliki logika baru
    }

    function renderHomePage() {
        const balance = allTransactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
        const income = allTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = allTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const progress = Math.min((balance / TARGET_SAVINGS) * 100, 100);

        document.getElementById('home-progress').innerHTML = `
            <div style="display: flex; justify-content: space-between; font-weight: 600;">
                <span>${formatToRupiah(balance)}</span>
                <span>dari ${formatToRupiah(TARGET_SAVINGS)}</span>
            </div>
            <div class="progress-bar-container" style="margin-top: 10px;">
                <div class="progress-bar" style="width: ${progress}%;"></div>
            </div>
            <p style="text-align:center; font-weight:700; margin-top:10px;">${progress.toFixed(2)}% Tercapai</p>`;

        document.getElementById('home-summary').innerHTML = `
            <h4>Ringkasan Cepat</h4>
            <div style="display:flex; justify-content: space-around; text-align:center; margin-top: 15px;">
                <div><span style="font-size:0.9em; color:var(--text-color-secondary);">Total Tabungan</span><br><strong class="income">${formatToRupiah(income)}</strong></div>
                <div><span style="font-size:0.9em; color:var(--text-color-secondary);">Total Ditarik</span><br><strong class="expense">${formatToRupiah(expense)}</strong></div>
            </div>`;
    }

    function renderTransactionPage() {
        const listEl = document.getElementById('transaction-list');
        listEl.innerHTML = '';
        if (allTransactions.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color:var(--text-color-secondary);">Belum ada transaksi.</p>';
            return;
        }
        allTransactions.forEach(t => {
            const item = document.createElement('li');
            item.className = 'transaction-item';
            const icon = t.type === 'income' ? '💰' : '💸';
            item.innerHTML = `
                <div class="category-icon">${icon}</div>
                <div class="details">
                    <span class="description">${t.description}</span>
                    <span class="meta">${t.name} • ${formatDate(t.createdAt)}</span>
                </div>
                <div class="amount ${t.type}">${t.type === 'income' ? '+' : '-'}${formatToRupiah(t.amount)}</div>
                <div class="transaction-actions">
                    <button class="action-btn edit-btn" data-id="${t.id}">✏️</button>
                    <button class="action-btn delete-btn" data-id="${t.id}">🗑️</button>
                </div>`;
            listEl.appendChild(item);
        });
    }

    // --- FUNGSI ANALISIS BARU ---
    function renderAnalysisPage() {
        // Mengelompokkan total tabungan (income) per orang
        const contributionData = allTransactions
            .filter(t => t.type === 'income')
            .reduce((acc, t) => {
                acc[t.name] = (acc[t.name] || 0) + t.amount;
                return acc;
            }, {});

        const ctx = document.getElementById('expense-chart').getContext('2d');
        const chartData = {
            labels: Object.keys(contributionData),
            datasets: [{
                label: 'Total Kontribusi',
                data: Object.values(contributionData),
                backgroundColor: ['#f06292', '#64b5f6', '#81c784', '#ffd54f'],
                borderColor: 'var(--card-bg-color)',
                borderWidth: 2
            }]
        };
        
        if (contributionChart) contributionChart.destroy(); // Hapus chart lama
        contributionChart = new Chart(ctx, { // Buat chart baru
            type: 'pie', // Tipe chart bisa 'pie' atau 'doughnut'
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top', labels: { color: 'var(--text-color)' } },
                    title: { display: true, text: 'Total Uang yang Ditabung per Orang', color: 'var(--text-color)', font: { size: 16 } }
                }
            }
        });
    }

    // --- EVENT LISTENERS SETUP ---
    function setupEventListeners() {
        // (Tidak ada perubahan di fungsi ini, salin dari kode sebelumnya)
        document.querySelector('.bottom-nav').addEventListener('click', e => {
            const navBtn = e.target.closest('.nav-btn');
            if (navBtn) switchPage(navBtn.dataset.page);
        });
        document.getElementById('add-transaction-btn').addEventListener('click', () => openModal());
        document.getElementById('close-modal-btn').addEventListener('click', closeModal);
        document.getElementById('form-modal').addEventListener('click', e => { if (e.target.id === 'form-modal') closeModal(); });
        document.getElementById('transaction-form').addEventListener('submit', handleFormSubmit);
        document.getElementById('transaction-list').addEventListener('click', e => {
            const btn = e.target.closest('.action-btn');
            if (!btn) return;
            const id = btn.dataset.id;
            if (btn.classList.contains('edit-btn')) {
                const tx = allTransactions.find(t => t.id === id);
                if(tx) openModal(tx);
            }
            if (btn.classList.contains('delete-btn')) deleteTransaction(id);
        });
        document.getElementById('theme-toggle').addEventListener('change', toggleTheme);
    }
    
    // --- FUNGSI-FUNGSI LOGIKA ---
    function switchPage(pageId) {
        // (Tidak ada perubahan di fungsi ini, salin dari kode sebelumnya)
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${pageId}`).classList.add('active');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.nav-btn[data-page="${pageId}"]`).classList.add('active');
    }

    function openModal(transaction = null) {
        // (Tidak ada perubahan di fungsi ini, salin dari kode sebelumnya)
        const form = document.getElementById('transaction-form');
        form.reset();
        document.getElementById('modal-title').textContent = transaction ? 'Edit Transaksi' : 'Tambah Transaksi';
        if (transaction) {
            document.getElementById('transaction-id').value = transaction.id;
            document.getElementById('name').value = transaction.name;
            document.getElementById('description').value = transaction.description;
            document.getElementById('amount').value = transaction.amount;
            document.getElementById('type').value = transaction.type;
        } else {
            document.getElementById('transaction-id').value = '';
            document.getElementById('name').value = localStorage.getItem('savedName') || '';
        }
        document.getElementById('form-modal').classList.add('active');
    }
    
    function closeModal() {
        // (Tidak ada perubahan di fungsi ini, salin dari kode sebelumnya)
        document.getElementById('form-modal').classList.remove('active');
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('transaction-id').value;
        // Data yang disimpan sekarang lebih simpel
        const transactionData = {
            name: document.getElementById('name').value,
            description: document.getElementById('description').value,
            amount: parseFloat(document.getElementById('amount').value),
            type: document.getElementById('type').value
        };

        if (id) { // Update
            transactionsCollection.doc(id).update(transactionData)
                .then(() => { showToast('Berhasil diperbarui!', 'success'); closeModal(); })
                .catch(err => showToast(`Error: ${err.message}`, 'error'));
        } else { // Create
            transactionData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            transactionsCollection.add(transactionData)
                .then(() => { showToast('Berhasil disimpan!', 'success'); closeModal(); })
                .catch(err => showToast(`Error: ${err.message}`, 'error'));
        }
    }
    
    function deleteTransaction(id) {
        // (Tidak ada perubahan di fungsi ini, salin dari kode sebelumnya)
        if (confirm('Yakin ingin menghapus transaksi ini?')) {
            transactionsCollection.doc(id).delete()
                .then(() => showToast('Transaksi dihapus.', 'success'))
                .catch(err => showToast(`Error: ${err.message}`, 'error'));
        }
    }

    // --- UTILITAS & FITUR LAINNYA ---
    // (Semua fungsi di bawah ini tidak ada perubahan, salin dari kode sebelumnya)
    function toggleTheme(e) {
        const theme = e.target.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }
    function loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.getElementById('theme-toggle').checked = savedTheme === 'dark';
    }
    function loadSavedName() {
        document.getElementById('name').addEventListener('input', e => {
            localStorage.setItem('savedName', e.target.value);
        });
    }
    const formatToRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
    const formatDate = (timestamp) => timestamp ? new Date(timestamp.seconds * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '';
    const showToast = (message, type = '') => {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    };
});