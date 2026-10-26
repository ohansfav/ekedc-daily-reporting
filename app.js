const DISTRICTS = [
  'Agbara',
  'Ajah',
  'Ajele',
  'Apapa',
  'Festac',
  'Ibeju',
  'Ijora',
  'Island',
  'Lekki',
  'Mushin',
  'Ojo',
  'Orile'
];

const DISTRICT_CASHIERS = {
  Agbara: ['Augustine Oyathelemhi', 'Otun Fausat'],
  Ajah: ['Taiwo Noimot'],
  Ajele: ['Taiwo Akintoye', 'Mary Agbim'],
  Apapa: ['Ojulari Waheed', 'Ikudehinbo Oluwatosin'],
  Festac: ['Onileowo Victoria', 'Oluwaseyi Ajayi'],
  Ibeju: ['Okiji Olubunmi Jacob'],
  Ijora: ['Adebari Temitayo', 'Ibeto Catherine'],
  Island: ['Olukoya Olanrewaju', 'Aromire Olasumbo (Azizat)'],
  Lekki: ['Kareem Idowu'],
  Mushin: ['Caroline Francis', 'Siyanbola Abosede'],
  Ojo: ['Oke James', 'Tosin Onadele'],
  Orile: ['Shodeke Oluwabanke']
};

const STORAGE_KEYS = {
  settings: 'ekedp_settings',
  auth: 'ekedp_auth',
  currentUser: 'ekedp_current_user'
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
  currentUser: localStorage.getItem(STORAGE_KEYS.currentUser) || 'staff',
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
const submissionSuccess = document.getElementById('submissionSuccess');
const editReportModal = document.getElementById('editReportModal');
const editReportForm = document.getElementById('editReportForm');
const editDistrict = document.getElementById('editDistrict');
const exportWeeklyBtn = document.getElementById('exportWeeklyBtn');
const reportSearch = document.getElementById('reportSearch');
const reportDistrictFilter = document.getElementById('reportDistrictFilter');
const reportDateFilter = document.getElementById('reportDateFilter');
const dailyExportDate = document.getElementById('dailyExportDate');
const exportSelectedDayBtn = document.getElementById('exportSelectedDayBtn');
const activityChart = document.getElementById('activityChart');

function initializeDistricts() {
  if (!districtSelect) return;

  DISTRICTS.forEach((district) => {
    const option = document.createElement('option');
    option.value = district;
    option.textContent = district;
    districtSelect.appendChild(option);

    const filterOption = option.cloneNode(true);
    reportDistrictFilter.appendChild(filterOption);
  });

  districtSelect.addEventListener('change', refreshCashierSuggestions);
  refreshCashierSuggestions();
}

function getCashierNamesForDistrict(district) {
  const districtNames = DISTRICT_CASHIERS[district] || [];
  const savedNames = state.submittedReports
    .filter((report) => report.district === district && report.cashierName)
    .map((report) => report.cashierName.trim())
    .filter(Boolean);

  return [...new Set([...districtNames, ...savedNames])].sort((first, second) => first.localeCompare(second));
}

function refreshCashierSuggestions() {
  const selectedDistrict = districtSelect ? districtSelect.value : '';
  const cashierSelect = document.getElementById('cashierName');

  if (!cashierSelect) return;

  const allowedNames = getCashierNamesForDistrict(selectedDistrict);
  cashierSelect.innerHTML = '<option value="">Select cashier</option>';

  allowedNames.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    cashierSelect.appendChild(option);
  });

  if (selectedDistrict && !allowedNames.includes(cashierSelect.value.trim())) {
    cashierSelect.value = '';
  }
}

function refreshEditCashierSuggestions() {
  const selectedDistrict = editDistrict ? editDistrict.value : '';
  const cashierSelect = document.getElementById('editCashierName');

  if (!cashierSelect) return;

  const allowedNames = getCashierNamesForDistrict(selectedDistrict);
  cashierSelect.innerHTML = '<option value="">Select cashier</option>';

  allowedNames.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    cashierSelect.appendChild(option);
  });

  if (selectedDistrict && !allowedNames.includes(cashierSelect.value.trim())) {
    cashierSelect.value = '';
  }
}

function validateDistrictCashierSelection(selectedDistrict, cashierName) {
  if (!selectedDistrict) return 'Please choose a district first.';

  const allowedNames = getCashierNamesForDistrict(selectedDistrict);
  if (!allowedNames.length) return 'No cashier name is assigned for this district yet.';

  if (!allowedNames.includes(cashierName.trim())) {
    return `Please choose a cashier from ${selectedDistrict}.`;
  }

  return '';
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
  const isAdminView = state.isAdminLoggedIn;

  if (loginSection) loginSection.classList.toggle('hidden', isAuth || isAdminView);
  if (dashboardSection) dashboardSection.classList.toggle('hidden', !isAuth || isAdminView);
  if (adminSection) adminSection.classList.toggle('hidden', !isAdminView);
  if (logoutBtn) logoutBtn.classList.toggle('hidden', !isAuth && !isAdminView);
  if (toggleAdminBtn) toggleAdminBtn.textContent = isAdminView ? 'Back to Staff' : 'Admin Console';
}

function renderReportsTable() {
  const tbody = document.getElementById('reportsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const searchText = reportSearch.value.trim().toLocaleLowerCase();
  const districtValue = reportDistrictFilter.value;
  const dateValue = reportDateFilter.value;
  const filteredReports = state.submittedReports
    .filter((report) => {
      const searchableText = `${report.cashierName || ''} ${report.remarks || ''}`.toLocaleLowerCase();
      return (!searchText || searchableText.includes(searchText))
        && (!districtValue || report.district === districtValue)
        && (!dateValue || report.date === dateValue);
    })
    .sort((first, second) => `${second.date || ''} ${second.timeReceived || ''}`
      .localeCompare(`${first.date || ''} ${first.timeReceived || ''}`));

  const reportCount = document.getElementById('reportResultsCount');
  if (reportCount) {
    reportCount.textContent = `${filteredReports.length} ${filteredReports.length === 1 ? 'report' : 'reports'}`
      + (filteredReports.length !== state.submittedReports.length
        ? ` shown · ${state.submittedReports.length} total`
        : '');
  }

  if (!filteredReports.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 14;
    cell.className = 'empty-table-message';
    cell.textContent = state.submittedReports.length
      ? 'No reports match these filters.'
      : 'No reports have been submitted yet.';
    row.appendChild(cell);
    tbody.appendChild(row);
    refreshDailyExportDates();
    return;
  }

  filteredReports.forEach((report) => {
    const row = document.createElement('tr');
    const labels = [
      'Date',
      'Cashier Name',
      'District',
      'Cashier Type',
      'Report Received?',
      'Time Received',
      'On Time?',
      'No. of Transactions',
      'Total Collected (₦)',
      'of which NKCG (₦)',
      'Commission Earned (₦)',
      'Closing Wallet Balance (₦)',
      'Wallet Zeroized?',
      'Submitted By',
      'Integrity',
      'Remarks'
    ];
    const nkcgAmount = Number(report.nkcgAmount || 0);
    const commissionEarned = Number(report.commissionEarned || 0);
      const values = [
      report.date,
      report.cashierName,
      report.district,
      report.cashierType,
      report.reportReceivedDate ? 'Yes' : 'No',
      report.timeReceived || '—',
      report.onTime || '—',
      report.transactions,
      `₦${formatCurrency(report.totalSales)}`,
      `₦${formatCurrency(nkcgAmount)}`,
      `₦${formatCurrency(commissionEarned)}`,
      `₦${formatCurrency(report.walletBalance)}`,
      report.walletZeroized || 'No',
      report.submittedBy || 'Unknown',
      getReportIntegrityBadge(report),
      report.remarks || '—'
    ];
    values.forEach((value, index) => {
      const cell = document.createElement('td');
      cell.textContent = String(value ?? '');
      cell.dataset.label = labels[index];
      if (index === 6) {
        cell.className = report.onTime === 'On Time' ? 'report-status on-time' : 'report-status late';
      }
      row.appendChild(cell);
    });

    const actionCell = document.createElement('td');
    actionCell.dataset.label = 'Action';
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'table-action-btn edit-report-btn';
    editButton.textContent = 'Review / edit';
    editButton.setAttribute('aria-label', `Review and edit report for ${report.cashierName || 'cashier'}`);
    editButton.addEventListener('click', () => openEditReportModal(Number(report.id)));
    actionCell.appendChild(editButton);
    row.appendChild(actionCell);
    tbody.appendChild(row);
  });

  refreshDailyExportDates();
}

function refreshDailyExportDates() {
  const selectedDate = dailyExportDate.value;
  const dates = [...new Set(state.submittedReports.map((report) => report.date).filter(Boolean))]
    .sort((first, second) => second.localeCompare(first));
  dailyExportDate.replaceChildren(new Option('Choose a date', ''));

  dates.forEach((date) => {
    dailyExportDate.add(new Option(date, date));
  });
  dailyExportDate.value = dates.includes(selectedDate) ? selectedDate : '';
  exportSelectedDayBtn.disabled = !dailyExportDate.value;
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
  renderActivityChart();
}

function renderActivityChart() {
  if (!activityChart) return;

  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return {
      key,
      label: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date),
      count: 0
    };
  });
  const dayByKey = new Map(days.map((day) => [day.key, day]));

  state.submittedReports.forEach((report) => {
    const day = dayByKey.get(report.date);
    if (day) day.count += 1;
  });

  const maxCount = Math.max(...days.map((day) => day.count), 1);
  activityChart.replaceChildren();
  activityChart.setAttribute(
    'aria-label',
    `Report activity over the last seven days: ${days.map((day) => `${day.label}, ${day.count}`).join('; ')}`
  );

  days.forEach((day) => {
    const column = document.createElement('div');
    column.className = 'activity-chart-column';

    const value = document.createElement('span');
    value.className = 'activity-chart-value';
    value.textContent = String(day.count);

    const track = document.createElement('div');
    track.className = 'activity-chart-track';
    track.setAttribute('aria-hidden', 'true');

    const bar = document.createElement('div');
    bar.className = `activity-chart-bar${day.count ? '' : ' is-empty'}`;
    bar.style.height = `${Math.max((day.count / maxCount) * 100, day.count ? 12 : 4)}%`;
    track.appendChild(bar);

    const label = document.createElement('span');
    label.className = 'activity-chart-label';
    label.textContent = day.label;

    column.append(value, track, label);
    activityChart.appendChild(column);
  });
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function canonicalizeReportForHash(report) {
  const payload = {
    date: report.date || '',
    district: report.district || '',
    cashierName: report.cashierName || '',
    cashierType: report.cashierType || '',
    transactions: Number(report.transactions || 0),
    totalSales: Number(report.totalSales || 0),
    walletBalance: Number(report.walletBalance || 0),
    walletZeroized: report.walletZeroized || 'No',
    reportReceivedDate: report.reportReceivedDate || '',
    timeReceived: report.timeReceived || '',
    onTime: report.onTime || 'Late',
    remarks: report.remarks || '',
    submittedBy: report.submittedBy || 'unknown'
  };

  return JSON.stringify(payload, Object.keys(payload).sort());
}

async function computeReportHash(report) {
  const input = canonicalizeReportForHash(report);
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function getReportIntegrityBadge(report) {
  if (!report || !report.reportHash) return 'Unverified';
  return 'Verified';
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
    cashierType: document.getElementById('previewCashierType').value,
    walletZeroized: document.getElementById('previewWalletZeroized').value,
    remarks: document.getElementById('previewRemarks').value.trim(),
    reportReceivedDate: reportReceivedDateInput ? reportReceivedDateInput.value : getCurrentDateString(),
    timeReceived: timeReceivedInput ? timeReceivedInput.value : getCurrentTimeString(),
    onTime: timingBadge ? timingBadge.textContent : 'Pending',
    submittedBy: state.currentUser || 'staff'
  };

  if (cashierTypeField) cashierTypeField.value = previewValues.cashierType;
  if (walletZeroizedField) walletZeroizedField.value = previewValues.walletZeroized;
  if (remarksField) remarksField.value = previewValues.remarks;

  const previewItems = [
    ['Date', previewValues.date],
    ['District', previewValues.district],
    ['Cashier', previewValues.cashierName],
    ['Cashier type', previewValues.cashierType],
    ['Transactions', previewValues.transactions],
    ['Total collection', `₦${formatCurrency(previewValues.totalSales)}`],
    ['Closing wallet balance', `₦${formatCurrency(previewValues.walletBalance)}`],
    ['Wallet zeroized', previewValues.walletZeroized],
    ['Report received', previewValues.reportReceivedDate],
    ['Time received', previewValues.timeReceived],
    ['On time', previewValues.onTime],
    ['Remarks', previewValues.remarks || '—']
  ];
  previewContent.replaceChildren();
  previewItems.forEach(([label, value]) => {
    const item = document.createElement('div');
    const itemLabel = document.createElement('span');
    itemLabel.textContent = label;
    const itemValue = document.createElement('strong');
    itemValue.textContent = String(value);
    item.append(itemLabel, itemValue);
    previewContent.appendChild(item);
  });

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

function buildDailyExportRows(records) {
  return records.map((report) => ({
    Date: report.date,
    'Cashier Name': report.cashierName,
    District: report.district,
    'Cashier Type': report.cashierType,
    'Submitted By': report.submittedBy || 'Unknown',
    'Report Received?': report.reportReceivedDate ? 'Yes' : 'No',
    'Time Received': report.timeReceived || '',
    'On Time?': report.onTime || 'Late',
    'Integrity': getReportIntegrityBadge(report),
    'No. of Transactions': Number(report.transactions || 0),
    'Total Collected (₦)': Number(report.totalSales || 0),
    'of which NKCG (₦)': Number(report.nkcgAmount || 0),
    'Commission Earned (₦)': Number(report.commissionEarned || 0),
    'Closing Wallet Balance (₦)': Number(report.walletBalance || 0),
    'Wallet Zeroized?': report.walletZeroized || 'No',
    Remarks: report.remarks || ''
  }));
}

function createDailyLogSheet(rows, titleDate = '') {
  const headers = [
    'Date',
    'Cashier Name',
    'District',
    'Cashier Type',
    'Submitted By',
    'Report Received?',
    'Time Received',
    'On Time?',
    'Integrity',
    'No. of Transactions',
    'Total Collected (₦)',
    'of which NKCG (₦)',
    'Commission Earned (₦)',
    'Closing Wallet Balance (₦)',
    'Wallet Zeroized?',
    'Remarks'
  ];

  const sheetData = [
    ['Daily Cashier Report Log'],
    ['One row per cashier per day, copied from the 6pm WhatsApp reports. Pale gold cells: fill in. White cells: automatic.'],
    [],
    headers,
    ...rows.map((row) => [
      row.Date,
      row['Cashier Name'],
      row.District,
      row['Cashier Type'],
      row['Submitted By'],
      row['Report Received?'],
      row['Time Received'],
      row['On Time?'],
      row.Integrity,
      row['No. of Transactions'],
      row['Total Collected (₦)'],
      row['of which NKCG (₦)'],
      row['Commission Earned (₦)'],
      row['Closing Wallet Balance (₦)'],
      row['Wallet Zeroized?'],
      row.Remarks
    ])
  ];

  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 15 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 15 } }
  ];

  const titleStyle = {
    font: { bold: true, color: { rgb: 'FFFFFFFF' }, sz: 18 },
    fill: { fgColor: { rgb: '1F2D5C' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  };
  const subtitleStyle = {
    font: { italic: true, color: { rgb: '1F1F1F' }, sz: 10 },
    fill: { fgColor: { rgb: 'EAEAEA' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  };
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
    fill: { fgColor: { rgb: '1F3C88' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    }
  };

  for (let col = 0; col <= 15; col += 1) {
    const headerCell = sheet[XLSX.utils.encode_cell({ r: 3, c: col })];
    if (headerCell) headerCell.s = headerStyle;
    const rowCell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
    if (rowCell) rowCell.s = titleStyle;
    const subCell = sheet[XLSX.utils.encode_cell({ r: 1, c: col })];
    if (subCell) subCell.s = subtitleStyle;
  }

  sheet['!cols'] = Array.from({ length: 16 }, (_, index) => ({
    wch: index === 0 || index === 3 || index === 4 || index === 5 || index === 6 || index === 7 || index === 8 || index === 9 || index === 10 || index === 11 || index === 12 || index === 13 || index === 14 || index === 15 ? 18 : 15
  }));

  if (titleDate) {
    const titleRow = sheetData[0][0] ? sheetData[0][0] : '';
    sheet['A1'] = { t: 's', v: titleRow };
  }

  return sheet;
}

function exportDailyGroup(dateValue) {
  const records = state.submittedReports.filter((report) => report.date === dateValue);
  if (!records.length) return;

  const exportRows = buildDailyExportRows(records);

  const workbook = XLSX.utils.book_new();
  const sheet = createDailyLogSheet(exportRows, dateValue);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Daily Log');
  XLSX.writeFile(workbook, `ekedp_${dateValue}_cashier_report.xlsx`);
  showToast(`Exported ${records.length} report(s) for ${dateValue}.`);
}

function exportWeeklyReport() {
  if (!state.submittedReports.length) {
    showToast('No data available for weekly export.');
    return;
  }

  const groupedByWeek = state.submittedReports.reduce((accumulator, report) => {
    const weekKey = getWeekKey(report.date || '');
    if (!weekKey || weekKey === 'Unknown Week') return accumulator;
    if (!accumulator[weekKey]) accumulator[weekKey] = [];
    accumulator[weekKey].push(report);
    return accumulator;
  }, {});

  const sortedWeeks = Object.keys(groupedByWeek).sort((first, second) => second.localeCompare(first));
  const workbook = XLSX.utils.book_new();

  sortedWeeks.forEach((weekKey) => {
    const rows = buildDailyExportRows(groupedByWeek[weekKey]);
    const sheet = createDailyLogSheet(rows, weekKey);
    XLSX.utils.book_append_sheet(workbook, sheet, `Week ${weekKey}`);
  });

  const weeklySummary = sortedWeeks.map((weekKey) => ({
    Week: weekKey,
    Reports_Submitted: groupedByWeek[weekKey].length,
    Total_Collection: groupedByWeek[weekKey].reduce((sum, item) => sum + Number(item.totalSales || 0), 0),
    On_Time: groupedByWeek[weekKey].filter((item) => item.onTime === 'On Time').length,
    Late: groupedByWeek[weekKey].filter((item) => item.onTime !== 'On Time').length
  }));

  const summarySheet = XLSX.utils.json_to_sheet(weeklySummary);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Weekly Summary');
  XLSX.writeFile(workbook, 'ekedp_weekly_reports.xlsx');
  showToast(`Weekly export generated for ${sortedWeeks.length} week(s).`);
}

function exportDailyReport() {
  if (!state.submittedReports.length) {
    showToast('No data available for daily export.');
    return;
  }

  const groupedByDate = state.submittedReports.reduce((accumulator, report) => {
    const dateKey = report.date || 'Unknown Date';
    if (!accumulator[dateKey]) accumulator[dateKey] = [];
    accumulator[dateKey].push(report);
    return accumulator;
  }, {});

  const workbook = XLSX.utils.book_new();
  const sortedDates = Object.keys(groupedByDate).sort((first, second) => second.localeCompare(first));
  const primaryDate = sortedDates[0] || '';
  const primaryRows = buildDailyExportRows(groupedByDate[primaryDate] || []);

  const dailyLogSheet = createDailyLogSheet(primaryRows, primaryDate);
  XLSX.utils.book_append_sheet(workbook, dailyLogSheet, 'Daily Log');

  const dailySummary = sortedDates.map((dateKey) => ({
    Date: dateKey,
    Reports_Submitted: groupedByDate[dateKey].length,
    Total_Collection: groupedByDate[dateKey].reduce((sum, item) => sum + Number(item.totalSales || 0), 0),
    On_Time: groupedByDate[dateKey].filter((item) => item.onTime === 'On Time').length,
    Late: groupedByDate[dateKey].filter((item) => item.onTime !== 'On Time').length
  }));

  const summarySheet = XLSX.utils.json_to_sheet(dailySummary);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Daily Summary');
  XLSX.writeFile(workbook, 'ekedp_daily_reports.xlsx');
  showToast('Daily report export generated successfully.');
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
  refreshEditCashierSuggestions();
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

  const selectedDistrict = document.getElementById('editDistrict').value;
  const cashierName = document.getElementById('editCashierName').value.trim();
  const cashierError = validateDistrictCashierSelection(selectedDistrict, cashierName);
  if (cashierError) {
    showToast(cashierError);
    return;
  }

  const updatedReport = {
    ...state.submittedReports[index],
    date: document.getElementById('editReportDate').value,
    district: selectedDistrict,
    cashierName,
    cashierType: document.getElementById('editCashierType').value,
    transactions: Number(document.getElementById('editTransactions').value || 0),
    totalSales: Number(document.getElementById('editTotalSales').value || 0),
    walletBalance: Number(document.getElementById('editWalletBalance').value || 0),
    walletZeroized: document.getElementById('editWalletZeroized').value,
    reportReceivedDate: document.getElementById('editReportReceivedDate').value,
    timeReceived: document.getElementById('editTimeReceived').value,
    onTime: document.getElementById('editOnTimeStatus').value,
    remarks: document.getElementById('editRemarks').value.trim(),
    submittedBy: state.submittedReports[index].submittedBy || 'unknown',
    lastEditedBy: state.currentUser || 'admin',
    editedAt: new Date().toISOString()
  };

  try {
    updatedReport.reportHash = await computeReportHash(updatedReport);
    await updateReportInDb(updatedReport);
    state.submittedReports[index] = updatedReport;
    renderReportsTable();
    updateSummaryCards();
    editReportModal.classList.add('hidden');
    editReportForm.reset();
    showToast('Reviewed report saved successfully.');
  } catch (error) {
    console.error('updateReportInDb error:', error);
    showToast('Unable to update report. Please try again.');
  }
}

async function submitReport() {
  const payload = buildPreviewData();

  const cashierError = validateDistrictCashierSelection(payload.district, payload.cashierName);
  if (cashierError) {
    showToast(cashierError);
    return;
  }

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
    remarks: payload.remarks,
    submittedBy: payload.submittedBy || state.currentUser || 'staff',
    createdAt: new Date().toISOString(),
    lastEditedBy: null,
    editedAt: null
  };

  try {
    record.reportHash = await computeReportHash(record);
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
    localStorage.setItem(STORAGE_KEYS.currentUser, username);
    state.currentUser = username;
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
  adminModal.classList.add('hidden');
  showToast('You have signed out.');
});

toggleAdminBtn.addEventListener('click', () => {
  if (state.isAdminLoggedIn) {
    state.isAdminLoggedIn = false;
    setUserState();
    return;
  }

  adminModal.classList.remove('hidden');
  document.getElementById('adminPassword').focus();
});

adminLoginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const adminPassword = document.getElementById('adminPassword').value.trim();

  if (adminPassword === 'admin123') {
    state.isAdminLoggedIn = true;
    adminModal.classList.add('hidden');
    setUserState();
    showToast('Admin access granted.');
  } else {
    showToast('Invalid admin password.');
  }

  adminLoginForm.reset();
});

document.getElementById('cancelAdminLoginBtn').addEventListener('click', () => {
  adminModal.classList.add('hidden');
  adminLoginForm.reset();
});

adminModal.addEventListener('click', (event) => {
  if (event.target === adminModal) {
    adminModal.classList.add('hidden');
    adminLoginForm.reset();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !adminModal.classList.contains('hidden')) {
    adminModal.classList.add('hidden');
    adminLoginForm.reset();
  }
});

document.getElementById('closeAdminPanel').addEventListener('click', () => {
  state.isAdminLoggedIn = false;
  setUserState();
});

document.querySelectorAll('.admin-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.admin-nav a').forEach((navLink) => {
      navLink.classList.toggle('active', navLink === link);
    });
  });
});

document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  if (!cutoffTimeInput.value) {
    showToast('Choose a cutoff time before saving.');
    cutoffTimeInput.focus();
    return;
  }

  state.settings.cutoffTime = cutoffTimeInput.value;
  saveSettings();
  setCurrentReportMeta();
  showToast(`Daily cutoff saved as ${formatTime(state.settings.cutoffTime)}.`);
});

reportSearch.addEventListener('input', renderReportsTable);
reportDistrictFilter.addEventListener('change', renderReportsTable);
reportDateFilter.addEventListener('change', renderReportsTable);

document.getElementById('clearReportFiltersBtn').addEventListener('click', () => {
  reportSearch.value = '';
  reportDistrictFilter.value = '';
  reportDateFilter.value = '';
  renderReportsTable();
});

districtSelect.addEventListener('change', refreshCashierSuggestions);
editDistrict.addEventListener('change', refreshEditCashierSuggestions);

dailyExportDate.addEventListener('change', () => {
  exportSelectedDayBtn.disabled = !dailyExportDate.value;
});

exportSelectedDayBtn.addEventListener('click', () => {
  if (dailyExportDate.value) exportDailyGroup(dailyExportDate.value);
});

document.getElementById('previewBtn').addEventListener('click', () => {
  if (!reportForm.checkValidity()) {
    reportForm.reportValidity();
    return;
  }

  document.getElementById('previewCashierType').value = document.getElementById('cashierType').value || 'Main Cashier';
  document.getElementById('previewWalletZeroized').value = document.getElementById('walletZeroized').value || 'No';
  document.getElementById('previewRemarks').value = document.getElementById('remarks').value;
  buildPreviewData();
  previewModal.classList.remove('hidden');
});

document.getElementById('cancelPreviewBtn').addEventListener('click', () => {
  previewModal.classList.add('hidden');
});

['previewCashierType', 'previewWalletZeroized', 'previewRemarks'].forEach((id) => {
  document.getElementById(id).addEventListener('input', buildPreviewData);
  document.getElementById(id).addEventListener('change', buildPreviewData);
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
  exportDailyReport();
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
