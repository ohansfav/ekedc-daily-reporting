const DISTRICTS = [
  'Ajah',
  'Ajele',
  'Agbara',
  'Apapa',
  'Festac',
  'Ibeju',
  'Ijora',
  'Ikate',
  'Lekki',
  'orile',
  'Island',
  'Mushin',
  'Ojo'
];

const STORAGE_KEYS = {
  settings: 'ekedp_settings',
  auth: 'ekedp_auth'
};

const DB_NAME = 'ekedp_reports_db';
const DB_VERSION = 1;
const REPORT_STORE = 'daily_reports';

const defaultSettings = {
  cutoffTime: '10:00'
};

const state = {
  isLoggedIn: false,
  isAdminLoggedIn: false,
  submittedReports: [],
  settings: JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || JSON.stringify(defaultSettings))
};

const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const adminSection = document.getElementById('adminSection');
const toggleAdminBtn = document.getElementById('toggleAdmin');
const logoutBtn = document.getElementById('logoutBtn');
const previewModal = document.getElementById('previewModal');
const adminModal = document.getElementById('adminModal');
const reportForm = document.getElementById('reportForm');
const loginForm = document.getElementById('loginForm');
const adminLoginForm = document.getElementById('adminLoginForm');
const toast = document.getElementById('toast');
const splashScreen = document.getElementById('splashScreen');

const districtSelect = document.getElementById('district');
const reportDateInput = document.getElementById('reportDate');
const reportReceivedDateInput = document.getElementById('reportReceivedDate');
const timeReceivedInput = document.getElementById('timeReceived');
const cutoffDisplay = document.getElementById('cutoffDisplay');
const cutoffTimeInput = document.getElementById('cutoffTimeInput');
const timingBadge = document.getElementById('timingBadge');
const onTimeText = document.getElementById('onTimeText');
const receivedDateText = document.getElementById('receivedDateText');
const receivedTimeText = document.getElementById('receivedTimeText');
const previewContent = document.getElementById('previewContent');
const adminCashierType = document.getElementById('adminCashierType');
const adminWalletZeroized = document.getElementById('adminWalletZeroized');
const adminRemarks = document.getElementById('adminRemarks');
const submissionSuccess = document.getElementById('submissionSuccess');
const dailyReportGroups = document.getElementById('dailyReportGroups');
const editReportModal = document.getElementById('editReportModal');
const editReportForm = document.getElementById('editReportForm');
const editDistrict = document.getElementById('editDistrict');
const exportWeeklyBtn = document.getElementById('exportWeeklyBtn');

function initializeDistricts() {
  if (!districtSelect) return;

  DISTRICTS.forEach((district) => {
    const option = document.createElement('option');
    option.value = district;
    option.textContent = district;
    districtSelect.appendChild(option);
  });
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(REPORT_STORE)) {
        const store = db.createObjectStore(REPORT_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('cashierName', 'cashierName', { unique: false });
        store.createIndex('district', 'district', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open EKEDP database.'));
  });
}

async function loadReportsFromDb() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REPORT_STORE, 'readonly');
    const store = transaction.objectStore(REPORT_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error('Failed to load saved reports.'));
  });
}

async function saveReportToDb(report) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REPORT_STORE, 'readwrite');
    const store = transaction.objectStore(REPORT_STORE);
    const request = store.add(report);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to save report.'));
  });
}

async function updateReportInDb(report) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REPORT_STORE, 'readwrite');
    const store = transaction.objectStore(REPORT_STORE);
    const request = store.put(report);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to update report.'));
  });
}

function getWeekKey(dateString) {
  if (!dateString) return 'Unknown Week';

  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);

  const year = monday.getFullYear();
  const start = new Date(year, 0, 1);
  const offset = ((monday - start) / 86400000) + ((start.getDay() === 0 ? 1 : 8 - start.getDay()) || 0);
  const weekNumber = Math.ceil((offset + 1) / 7);

  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

function buildWeeklyGroups(records) {
  const groups = {};

  records.forEach((report) => {
    const weekKey = getWeekKey(report.date);
    if (!groups[weekKey]) groups[weekKey] = [];
    groups[weekKey].push(report);
  });

  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

function getCurrentDateString() {
  return new Date().toISOString().split('T')[0];
}

function getCurrentTimeString() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function setCurrentReportMeta() {
  const today = getCurrentDateString();
  const now = getCurrentTimeString();

  if (reportDateInput) reportDateInput.value = today;
  if (reportReceivedDateInput) reportReceivedDateInput.value = today;
  if (timeReceivedInput) timeReceivedInput.value = now;
  if (receivedDateText) receivedDateText.textContent = today;
  if (receivedTimeText) receivedTimeText.textContent = now;
  if (cutoffDisplay) cutoffDisplay.textContent = formatTime(state.settings.cutoffTime);
  if (cutoffTimeInput) cutoffTimeInput.value = state.settings.cutoffTime;
  if (timingBadge && onTimeText) evaluateSubmissionTiming();
}

function formatTime(timeValue) {
  if (!timeValue) return '10:00 AM';
  const [hours, minutes] = timeValue.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const convertedHours = hours % 12 || 12;
  return `${convertedHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

function evaluateSubmissionTiming() {
  if (!timingBadge || !onTimeText) return;

  const receivedTime = timeReceivedInput ? (timeReceivedInput.value || getCurrentTimeString()) : getCurrentTimeString();
  const cutoff = state.settings.cutoffTime || '10:00';
  const currentMs = convertTimeToMinutes(receivedTime);
  const cutoffMs = convertTimeToMinutes(cutoff);

  let statusText = 'Late';
  let statusClass = 'late';

  if (currentMs <= cutoffMs) {
    statusText = 'On Time';
    statusClass = 'on-time';
  }

  timingBadge.textContent = statusText;
  timingBadge.className = `status-highlight ${statusClass}`;
  onTimeText.textContent = statusText;
}

function convertTimeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

function setUserState() {
  const isAuth = localStorage.getItem(STORAGE_KEYS.auth) === 'authenticated';
  state.isLoggedIn = isAuth;

  if (loginSection) loginSection.classList.toggle('hidden', isAuth);
  if (dashboardSection) dashboardSection.classList.toggle('hidden', !isAuth);
  if (logoutBtn) logoutBtn.classList.toggle('hidden', !isAuth);
  if (toggleAdminBtn) toggleAdminBtn.textContent = state.isAdminLoggedIn ? 'Admin View Open' : 'Switch to Admin';
}

function renderReportsTable() {
  const tbody = document.getElementById('reportsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!state.submittedReports.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="13" style="text-align:center; color: var(--muted); padding: 18px;">No reports submitted yet.</td>
      </tr>
    `;
    if (dailyReportGroups) dailyReportGroups.innerHTML = '';
    return;
  }

  state.submittedReports.forEach((report) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${report.date}</td>
      <td>${report.district}</td>
      <td>${report.cashierName}</td>
      <td>${report.cashierType}</td>
      <td>${report.transactions}</td>
      <td>₦${formatCurrency(report.totalSales)}</td>
      <td>₦${formatCurrency(report.walletBalance)}</td>
      <td>${report.walletZeroized}</td>
      <td>${report.reportReceivedDate}</td>
      <td>${report.timeReceived}</td>
      <td>${report.onTime}</td>
      <td>${report.remarks || '—'}</td>
      <td>
        <button class="table-action-btn edit-report-btn" data-id="${report.id}">Edit</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  tbody.querySelectorAll('.edit-report-btn').forEach((button) => {
    button.addEventListener('click', () => openEditReportModal(Number(button.dataset.id)));
  });

  renderDailyGroups();
}

function renderDailyGroups() {
  if (!dailyReportGroups) return;

  const groups = state.submittedReports.reduce((acc, report) => {
    const key = report.date || 'Unknown date';
    if (!acc[key]) acc[key] = [];
    acc[key].push(report);
    return acc;
  }, {});

  const entries = Object.entries(groups).sort((a, b) => new Date(b[0]) - new Date(a[0]));

  if (!entries.length) {
    dailyReportGroups.innerHTML = '';
    return;
  }

  dailyReportGroups.innerHTML = entries.map(([date, reports]) => `
    <div class="day-group-card">
      <div class="day-group-header">
        <h4>${date}</h4>
        <button class="secondary-btn export-day-btn" data-date="${date}">Export this day</button>
      </div>
      <div class="day-group-body">
        <table class="day-group-table">
          <thead>
            <tr>
              <th>Cashier</th>
              <th>District</th>
              <th>Transactions</th>
              <th>Total</th>
              <th>Wallet</th>
              <th>Zeroized</th>
              <th>Time</th>
              <th>On Time</th>
              <th>Remarks</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${reports.map((report) => `
              <tr>
                <td>${report.cashierName}</td>
                <td>${report.district}</td>
                <td>${report.transactions}</td>
                <td>₦${formatCurrency(report.totalSales)}</td>
                <td>₦${formatCurrency(report.walletBalance)}</td>
                <td>${report.walletZeroized}</td>
                <td>${report.timeReceived}</td>
                <td>${report.onTime}</td>
                <td>${report.remarks || '—'}</td>
                <td><button class="table-action-btn edit-report-btn" data-id="${report.id}">Edit</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `).join('');

  dailyReportGroups.querySelectorAll('.export-day-btn').forEach((button) => {
    button.addEventListener('click', () => exportDailyGroup(button.dataset.date));
  });

  dailyReportGroups.querySelectorAll('.edit-report-btn').forEach((button) => {
    button.addEventListener('click', () => openEditReportModal(Number(button.dataset.id)));
  });
}

function updateSummaryCards() {
  const totalReports = state.submittedReports.length;
  const onTimeReports = state.submittedReports.filter((report) => report.onTime === 'On Time').length;
  const lateReports = totalReports - onTimeReports;
  const totalCollection = state.submittedReports.reduce((sum, current) => sum + Number(current.totalSales || 0), 0);

  document.getElementById('totalReports').textContent = String(totalReports);
  document.getElementById('onTimeReports').textContent = String(onTimeReports);
  document.getElementById('lateReports').textContent = String(lateReports);
  document.getElementById('totalCollection').textContent = `₦${formatCurrency(totalCollection)}`;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function buildPreviewData() {
  const cashierTypeField = document.getElementById('cashierType');
  const walletZeroizedField = document.getElementById('walletZeroized');
  const remarksField = document.getElementById('remarks');

  const previewValues = {
    date: reportDateInput ? reportDateInput.value : '',
    district: districtSelect ? districtSelect.value : '',
    cashierName: document.getElementById('cashierName') ? document.getElementById('cashierName').value : '',
    transactions: document.getElementById('transactions') ? document.getElementById('transactions').value : '',
    totalSales: document.getElementById('totalSales') ? document.getElementById('totalSales').value : '',
    walletBalance: document.getElementById('walletBalance') ? document.getElementById('walletBalance').value : '',
    reportReceivedDate: reportReceivedDateInput ? reportReceivedDateInput.value : getCurrentDateString(),
    timeReceived: timeReceivedInput ? timeReceivedInput.value : getCurrentTimeString(),
    onTime: timingBadge ? timingBadge.textContent : 'Pending'
  };

  previewContent.innerHTML = `
    <div><span>Date</span><strong>${previewValues.date}</strong></div>
    <div><span>District</span><strong>${previewValues.district}</strong></div>
    <div><span>Cashier</span><strong>${previewValues.cashierName}</strong></div>
    <div><span>Transactions</span><strong>${previewValues.transactions}</strong></div>
    <div><span>Total Collection</span><strong>₦${formatCurrency(previewValues.totalSales)}</strong></div>
    <div><span>Closing Wallet Balance</span><strong>₦${formatCurrency(previewValues.walletBalance)}</strong></div>
    <div><span>Report Received</span><strong>${previewValues.reportReceivedDate}</strong></div>
    <div><span>Time Received</span><strong>${previewValues.timeReceived}</strong></div>
    <div><span>On Time</span><strong>${previewValues.onTime}</strong></div>
  `;

  return previewValues;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => toast.classList.add('hidden'), 2600);
}

function exportWorkbook(data, fileName = 'ekedp_cashier_reports.xlsx', sheetName = 'EKEDP_Cashier_Reports') {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

function exportDailyGroup(dateValue) {
  const records = state.submittedReports.filter((report) => report.date === dateValue);
  if (!records.length) return;

  exportWorkbook(records, `ekedp_${dateValue}_cashier_reports.xlsx`, `Daily_${dateValue}`);
  showToast(`Exported ${records.length} report(s) for ${dateValue}.`);
}

function exportWeeklyReport() {
  if (!state.submittedReports.length) {
    showToast('No data available for weekly export.');
    return;
  }

  const weeklyGroups = buildWeeklyGroups(state.submittedReports);
  const workbook = XLSX.utils.book_new();

  weeklyGroups.forEach(([weekKey, records]) => {
    const sheet = XLSX.utils.json_to_sheet(records);
    XLSX.utils.book_append_sheet(workbook, sheet, weekKey);
  });

  const weeklySummary = weeklyGroups.map(([weekKey, records]) => ({
    week: weekKey,
    reports: records.length,
    totalCollection: records.reduce((sum, item) => sum + Number(item.totalSales || 0), 0),
    onTime: records.filter((item) => item.onTime === 'On Time').length,
    late: records.filter((item) => item.onTime !== 'On Time').length
  }));

  const summarySheet = XLSX.utils.json_to_sheet(weeklySummary);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Weekly_Summary');
  XLSX.writeFile(workbook, 'ekedp_weekly_report.xlsx');
  showToast('Weekly report export generated successfully.');
}

function populateEditDistrictOptions() {
  if (!editDistrict) return;

  editDistrict.innerHTML = ['<option value="">Select district</option>']
    .concat(DISTRICTS.map((district) => `<option value="${district}">${district}</option>`))
    .join('');
}

function openEditReportModal(reportId) {
  const report = state.submittedReports.find((item) => item.id === reportId);
  if (!report || !editReportModal || !editReportForm) return;

  populateEditDistrictOptions();
  document.getElementById('editReportDate').value = report.date || '';
  document.getElementById('editDistrict').value = report.district || '';
  document.getElementById('editCashierName').value = report.cashierName || '';
  document.getElementById('editCashierType').value = report.cashierType || 'Main Cashier';
  document.getElementById('editTransactions').value = report.transactions || 0;
  document.getElementById('editTotalSales').value = report.totalSales || 0;
  document.getElementById('editWalletBalance').value = report.walletBalance || 0;
  document.getElementById('editWalletZeroized').value = report.walletZeroized || 'No';
  document.getElementById('editReportReceivedDate').value = report.reportReceivedDate || report.date || '';
  document.getElementById('editTimeReceived').value = report.timeReceived || '09:00';
  document.getElementById('editOnTimeStatus').value = report.onTime || 'On Time';
  document.getElementById('editRemarks').value = report.remarks || '';
  editReportForm.dataset.reportId = String(reportId);
  editReportModal.classList.remove('hidden');
}

async function saveEditedReport(event) {
  event.preventDefault();
  if (!editReportForm || !editReportForm.dataset.reportId) return;

  const id = Number(editReportForm.dataset.reportId);
  const index = state.submittedReports.findIndex((report) => report.id === id);
  if (index === -1) return;

  const updatedReport = {
    ...state.submittedReports[index],
    date: document.getElementById('editReportDate').value,
    district: document.getElementById('editDistrict').value,
    cashierName: document.getElementById('editCashierName').value.trim(),
    cashierType: document.getElementById('editCashierType').value,
    transactions: Number(document.getElementById('editTransactions').value || 0),
    totalSales: Number(document.getElementById('editTotalSales').value || 0),
    walletBalance: Number(document.getElementById('editWalletBalance').value || 0),
    walletZeroized: document.getElementById('editWalletZeroized').value,
    reportReceivedDate: document.getElementById('editReportReceivedDate').value,
    timeReceived: document.getElementById('editTimeReceived').value,
    onTime: document.getElementById('editOnTimeStatus').value,
    remarks: document.getElementById('editRemarks').value.trim()
  };

  try {
    await updateReportInDb(updatedReport);
    state.submittedReports[index] = updatedReport;
    renderReportsTable();
    updateSummaryCards();
    editReportModal.classList.add('hidden');
    editReportForm.reset();
    showToast('Submitted report updated successfully.');
  } catch (error) {
    console.error('updateReportInDb error:', error);
    showToast('Unable to update report. Please try again.');
  }
}

async function submitReport() {
  const payload = buildPreviewData();

  const cashierTypeField = document.getElementById('cashierType');
  const walletZeroizedField = document.getElementById('walletZeroized');

  if (cashierTypeField) cashierTypeField.value = payload.cashierType;
  if (walletZeroizedField) walletZeroizedField.value = payload.walletZeroized;

  const record = {
    date: payload.date,
    district: payload.district,
    cashierName: payload.cashierName,
    cashierType: payload.cashierType,
    transactions: Number(payload.transactions),
    totalSales: Number(payload.totalSales),
    walletBalance: Number(payload.walletBalance),
    walletZeroized: payload.walletZeroized,
    reportReceivedDate: payload.reportReceivedDate,
    timeReceived: payload.timeReceived,
    onTime: payload.onTime,
    remarks: payload.remarks
  };

  try {
    const savedId = await saveReportToDb(record);
    record.id = savedId;
    state.submittedReports.push(record);
    renderReportsTable();
    updateSummaryCards();
    previewModal.classList.add('hidden');
    reportForm.reset();
    setCurrentReportMeta();
    document.getElementById('confirmCheckOne').checked = false;
    document.getElementById('confirmCheckTwo').checked = false;
    document.getElementById('confirmSubmitBtn').disabled = true;

    if (submissionSuccess) {
      submissionSuccess.classList.remove('hidden');
      setTimeout(() => {
        submissionSuccess.classList.add('hidden');
      }, 2400);
    }

    showToast('Daily report submitted successfully.');
  } catch (error) {
    console.error('saveReportToDb error:', error);
    showToast('Unable to save report. Please try again.');
  }
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (username === 'admin' && password === 'admin') {
    localStorage.setItem(STORAGE_KEYS.auth, 'authenticated');
    state.isLoggedIn = true;
    setUserState();
    showToast('Sign in successful.');
  } else {
    showToast('Invalid staff credentials.');
  }
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEYS.auth);
  state.isLoggedIn = false;
  state.isAdminLoggedIn = false;
  setUserState();
  adminSection.classList.add('hidden');
  adminModal.classList.add('hidden');
  showToast('You have signed out.');
});

toggleAdminBtn.addEventListener('click', () => {
  if (state.isAdminLoggedIn) {
    adminSection.classList.toggle('hidden');
    return;
  }

  adminModal.classList.remove('hidden');
});

adminLoginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const adminPassword = document.getElementById('adminPassword').value.trim();

  if (adminPassword === 'admin123') {
    state.isAdminLoggedIn = true;
    adminModal.classList.add('hidden');
    adminSection.classList.remove('hidden');
    toggleAdminBtn.textContent = 'Admin View Open';
    showToast('Admin access granted.');
  } else {
    showToast('Invalid admin password.');
  }

  adminLoginForm.reset();
});

document.getElementById('closeAdminPanel').addEventListener('click', () => {
  adminSection.classList.add('hidden');
  state.isAdminLoggedIn = false;
  toggleAdminBtn.textContent = 'Switch to Admin';
});

cutoffTimeInput.addEventListener('change', (event) => {
  state.settings.cutoffTime = event.target.value || '10:00';
  saveSettings();
  evaluateSubmissionTiming();
});

document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  state.settings.cutoffTime = cutoffTimeInput.value || '10:00';
  saveSettings();
  evaluateSubmissionTiming();
  showToast('Admin settings saved.');
});

document.getElementById('previewBtn').addEventListener('click', () => {
  if (!reportForm.checkValidity()) {
    reportForm.reportValidity();
    return;
  }

  const cashierTypeField = document.getElementById('cashierType');
  const walletZeroizedField = document.getElementById('walletZeroized');
  const remarksField = document.getElementById('remarks');

  if (cashierTypeField) cashierTypeField.value = adminCashierType.value || cashierTypeField.value || 'Main Cashier';
  if (walletZeroizedField) walletZeroizedField.value = adminWalletZeroized.value || walletZeroizedField.value || 'No';
  if (remarksField) remarksField.value = adminRemarks.value || remarksField.value || 'No remarks';

  buildPreviewData();
  previewModal.classList.remove('hidden');
});

document.getElementById('applyAdminReviewBtn').addEventListener('click', () => {
  const cashierTypeField = document.getElementById('cashierType');
  const walletZeroizedField = document.getElementById('walletZeroized');
  const remarksField = document.getElementById('remarks');

  if (cashierTypeField) cashierTypeField.value = adminCashierType.value;
  if (walletZeroizedField) walletZeroizedField.value = adminWalletZeroized.value;
  if (remarksField) remarksField.value = adminRemarks.value;
  showToast('Admin review details applied.');
});

document.getElementById('cancelPreviewBtn').addEventListener('click', () => {
  previewModal.classList.add('hidden');
});

document.getElementById('confirmCheckOne').addEventListener('change', updateConfirmSubmitButton);
document.getElementById('confirmCheckTwo').addEventListener('change', updateConfirmSubmitButton);

function updateConfirmSubmitButton() {
  const confirmOne = document.getElementById('confirmCheckOne').checked;
  const confirmTwo = document.getElementById('confirmCheckTwo').checked;
  document.getElementById('confirmSubmitBtn').disabled = !(confirmOne && confirmTwo);
}

document.getElementById('confirmSubmitBtn').addEventListener('click', () => {
  submitReport();
});

document.getElementById('exportAllBtn').addEventListener('click', () => {
  if (!state.submittedReports.length) {
    showToast('No reports available to export.');
    return;
  }

  const dateGrouped = state.submittedReports.reduce((acc, report) => {
    const dateKey = report.date || 'Unknown Date';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(report);
    return acc;
  }, {});

  const workbook = XLSX.utils.book_new();

  Object.entries(dateGrouped).forEach(([dateKey, reports]) => {
    const sheet = XLSX.utils.json_to_sheet(reports);
    XLSX.utils.book_append_sheet(workbook, sheet, `Daily_${dateKey}`);
  });

  const weeklyGrouped = buildWeeklyGroups(state.submittedReports);
  if (weeklyGrouped.length) {
    const weeklySummary = weeklyGrouped.map(([weekKey, records]) => ({
      week: weekKey,
      reports: records.length,
      totalCollection: records.reduce((sum, item) => sum + Number(item.totalSales || 0), 0),
      onTime: records.filter((item) => item.onTime === 'On Time').length,
      late: records.filter((item) => item.onTime !== 'On Time').length
    }));

    const weeklySheet = XLSX.utils.json_to_sheet(weeklySummary);
    XLSX.utils.book_append_sheet(workbook, weeklySheet, 'Weekly_Summary');
  }

  XLSX.writeFile(workbook, 'ekedp_all_daily_reports.xlsx');
  showToast('Grouped daily and weekly Excel export created.');
});

if (exportWeeklyBtn) {
  exportWeeklyBtn.addEventListener('click', exportWeeklyReport);
}

if (editReportForm) {
  editReportForm.addEventListener('submit', saveEditedReport);
}

if (document.getElementById('cancelEditReportBtn')) {
  document.getElementById('cancelEditReportBtn').addEventListener('click', () => {
    if (editReportModal) editReportModal.classList.add('hidden');
    editReportForm.reset();
  });
}

function initSplashScreen() {
  if (!splashScreen) return;

  const hideSplash = () => {
    splashScreen.classList.add('hidden');
    setTimeout(() => {
      splashScreen.remove();
    }, 120);
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    hideSplash();
    return;
  }

  window.addEventListener('load', hideSplash, { once: true });
  setTimeout(hideSplash, 2600);
}

async function initializeDatabaseAndReports() {
  try {
    state.submittedReports = await loadReportsFromDb();
    renderReportsTable();
    updateSummaryCards();
  } catch (error) {
    console.error('database init failed:', error);
    state.submittedReports = [];
    renderReportsTable();
    updateSummaryCards();
  }
}

initializeDistricts();
setCurrentReportMeta();
setUserState();
initializeDatabaseAndReports();
initSplashScreen();
