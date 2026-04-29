/**
 * PLAYA Y ESTACIONAMIENTO - JS Principal
 * Manejo de UI, LocalStorage y Lógica de Negocio
 */

// --- 1. ESTADO Y LOCALSTORAGE ---
const STORAGE_KEY = 'lavadero_app_data';

const defaultData = {
    settings: {
        prices: { auto: 2000, camioneta: 2500, moto: 1000 },
        showLogoBackground: true
    },
    users: [
        { id: 1, name: "Dueño Principal", role: "jefe" },
        { id: 2, name: "Empleado 1", role: "empleado" }
    ],
    records: {} // Formato: { "YYYY-MM-DD": [ {id, entryTime, exitTime, type, plate, total, createdBy, shift} ] }
};

let appData = {};
let currentUser = null;
let currentViewDate = getTodayStr();
let currentShift = getInitialShift();

// --- 2. ELEMENTOS DEL DOM ---
// Vistas
const views = {
    login: document.getElementById('viewLogin'),
    planilla: document.getElementById('viewPlanilla'),
    historial: document.getElementById('viewHistorial'),
    config: document.getElementById('viewConfig')
};

// Navegación
const header = document.getElementById('mainHeader');
const navUserName = document.getElementById('navUserName');
const navUserRole = document.getElementById('navUserRole');
const btnLogout = document.getElementById('btnLogout');
const navTabs = document.querySelectorAll('.nav-tab');
const navSettings = document.getElementById('navSettings');

// Planilla
const displayDate = document.getElementById('displayDate');
const btnShiftManana = document.getElementById('btnShiftManana');
const btnShiftTarde = document.getElementById('btnShiftTarde');
const addRecordForm = document.getElementById('addRecordForm');
const recordPlate = document.getElementById('recordPlate');
const recordType = document.getElementById('recordType');
const recordTotal = document.getElementById('recordTotal');
const recordsTableBody = document.getElementById('recordsTableBody');
const emptyTableState = document.getElementById('emptyTableState');
const historyWarning = document.getElementById('historyWarning');
const historyWarningText = document.getElementById('historyWarningText');
const addRecordContainer = document.getElementById('addRecordContainer');

// Totales
const countAutos = document.getElementById('countAutos');
const countCamionetas = document.getElementById('countCamionetas');
const countMotos = document.getElementById('countMotos');
const totalDayAmount = document.getElementById('totalDayAmount');

// Modal
const recordModal = document.getElementById('recordModal');
const btnCloseModalX = document.getElementById('btnCloseModalX');
const btnSetExit = document.getElementById('btnSetExit');
const btnDeleteRecord = document.getElementById('btnDeleteRecord');
let selectedRecordId = null;

// Configuración
const configPricesForm = document.getElementById('configPricesForm');
const cfgPriceAuto = document.getElementById('cfgPriceAuto');
const cfgPriceCamioneta = document.getElementById('cfgPriceCamioneta');
const cfgPriceMoto = document.getElementById('cfgPriceMoto');
const configUsersList = document.getElementById('configUsersList');
const configAddUserForm = document.getElementById('configAddUserForm');
const cfgToggleLogo = document.getElementById('cfgToggleLogo');
const bgLogo = document.getElementById('bgLogo');

// Historial
const historyMonthSelect = document.getElementById('historyMonthSelect');
const historyCalendarGrid = document.getElementById('historyCalendarGrid');


// --- 3. FUNCIONES AUXILIARES ---
function getTodayStr() {
    const today = new Date();
    // Ajustar por timezone local
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
    return localISOTime;
}

function getInitialShift() {
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 14) ? 'manana' : 'tarde';
}

function formatTime(date) {
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const toastIcon = document.getElementById('toastIcon');
    
    toastMsg.textContent = msg;
    if (type === 'success') {
        toastIcon.className = 'fa-solid fa-circle-check text-green-400 mr-2';
    } else if (type === 'error') {
        toastIcon.className = 'fa-solid fa-circle-exclamation text-red-400 mr-2';
    }
    
    toast.classList.remove('opacity-0', 'translate-y-20');
    
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-20');
    }, 3000);
}

// --- 4. INICIALIZACIÓN Y PERSISTENCIA ---
function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        appData = JSON.parse(saved);
        // Migración simple si faltan campos
        if (!appData.settings) appData.settings = defaultData.settings;
        if (!appData.users) appData.users = defaultData.users;
        if (!appData.records) appData.records = {};
    } else {
        appData = JSON.parse(JSON.stringify(defaultData));
        saveData();
    }
    applySettings();
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function applySettings() {
    if (appData.settings.showLogoBackground) {
        bgLogo.classList.remove('hidden');
        setTimeout(() => bgLogo.classList.remove('opacity-0'), 50);
        bgLogo.classList.add('opacity-5');
    } else {
        bgLogo.classList.add('opacity-0');
        setTimeout(() => bgLogo.classList.add('hidden'), 500);
    }
}

// --- 5. LÓGICA DE VISTAS Y NAVEGACIÓN ---
function switchView(viewName) {
    // Ocultar todas
    Object.values(views).forEach(v => v.classList.add('hidden'));
    
    // Mostrar solicitada
    if (views[viewName]) {
        views[viewName].classList.remove('hidden');
    }

    // Actualizar tabs
    navTabs.forEach(tab => {
        if (tab.dataset.target === `view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`) {
            tab.classList.add('active', 'border-white', 'text-white');
            tab.classList.remove('border-transparent', 'text-blue-200');
        } else {
            tab.classList.remove('active', 'border-white', 'text-white');
            tab.classList.add('border-transparent', 'text-blue-200');
        }
    });

    // Tareas específicas de cada vista
    if (viewName === 'planilla') {
        renderPlanilla();
    } else if (viewName === 'config') {
        renderConfig();
    } else if (viewName === 'historial') {
        renderHistorialMonths();
        renderHistorialCalendar();
    }
}

// --- 6. LÓGICA DE LOGIN ---
function initLogin() {
    const select = document.getElementById('loginUserSelect');
    select.innerHTML = '<option value="">-- Seleccione Usuario --</option>';
    appData.users.forEach(u => {
        select.innerHTML += `<option value="${u.id}">${u.name} (${u.role})</option>`;
    });

    document.getElementById('loginForm').onsubmit = (e) => {
        e.preventDefault();
        const userId = parseInt(select.value);
        if (!userId) {
            showToast('Seleccione un usuario', 'error');
            return;
        }

        const user = appData.users.find(u => u.id === userId);
        if (user) {
            login(user);
        }
    };
}

function login(user) {
    currentUser = user;
    navUserName.textContent = user.name;
    navUserRole.textContent = user.role;
    header.classList.remove('hidden');
    
    if (user.role === 'jefe') {
        navSettings.classList.remove('hidden');
    } else {
        navSettings.classList.add('hidden');
    }
    
    // Resetear al día de hoy al loguear
    currentViewDate = getTodayStr();
    currentShift = getInitialShift();

    switchView('planilla');
    showToast(`Bienvenido, ${user.name}`);
}

btnLogout.addEventListener('click', () => {
    currentUser = null;
    header.classList.add('hidden');
    switchView('login');
});

// --- 7. PLANILLA DIARIA ---
function getRecordsForDate(date) {
    if (!appData.records[date]) {
        appData.records[date] = [];
    }
    return appData.records[date];
}

function updateShiftButtons() {
    if (currentShift === 'manana') {
        btnShiftManana.classList.replace('text-gray-500', 'text-blue-700');
        btnShiftManana.classList.replace('hover:text-gray-700', 'bg-white');
        btnShiftManana.classList.add('shadow');
        
        btnShiftTarde.classList.replace('text-blue-700', 'text-gray-500');
        btnShiftTarde.classList.replace('bg-white', 'hover:text-gray-700');
        btnShiftTarde.classList.remove('shadow');
    } else {
        btnShiftTarde.classList.replace('text-gray-500', 'text-blue-700');
        btnShiftTarde.classList.replace('hover:text-gray-700', 'bg-white');
        btnShiftTarde.classList.add('shadow');
        
        btnShiftManana.classList.replace('text-blue-700', 'text-gray-500');
        btnShiftManana.classList.replace('bg-white', 'hover:text-gray-700');
        btnShiftManana.classList.remove('shadow');
    }
}

function renderPlanilla() {
    const isToday = currentViewDate === getTodayStr();
    
    // Configurar título y warnings
    const dateObj = new Date(currentViewDate + 'T12:00:00'); // Evitar salto de día por timezone
    displayDate.textContent = dateObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    
    if (!isToday) {
        historyWarning.classList.remove('hidden');
        historyWarningText.textContent = `Viendo el registro del ${dateObj.toLocaleDateString('es-AR')}.`;
        
        // Empleados no pueden editar historial
        if (currentUser.role === 'empleado') {
            addRecordContainer.classList.add('hidden');
        } else {
            addRecordContainer.classList.remove('hidden');
        }
    } else {
        historyWarning.classList.add('hidden');
        addRecordContainer.classList.remove('hidden');
    }

    updateShiftButtons();
    
    const allRecords = getRecordsForDate(currentViewDate);
    const shiftRecords = allRecords.filter(r => r.shift === currentShift);
    
    recordsTableBody.innerHTML = '';
    
    let totals = { auto: 0, camioneta: 0, moto: 0, amount: 0 };
    
    if (shiftRecords.length === 0) {
        emptyTableState.classList.remove('hidden');
        emptyTableState.classList.add('flex');
    } else {
        emptyTableState.classList.add('hidden');
        emptyTableState.classList.remove('flex');
        
        shiftRecords.forEach((record, index) => {
            totals[record.type]++;
            totals.amount += parseFloat(record.total);
            
            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-50 cursor-pointer transition-colors";
            tr.onclick = () => openRecordModal(record.id);
            
            // Icono según tipo
            let icon = 'fa-car';
            if (record.type === 'moto') icon = 'fa-motorcycle';
            else if (record.type === 'camioneta') icon = 'fa-truck-pickup';

            const exitText = record.exitTime ? `<span class="text-xs font-semibold bg-gray-200 text-gray-700 px-2 py-1 rounded">${record.exitTime}</span>` : `<span class="text-gray-300">-</span>`;
            const opacityClass = record.exitTime ? 'opacity-60' : ''; // Atenuar si ya salió

            tr.innerHTML = `
                <td class="px-3 py-3 whitespace-nowrap text-xs text-gray-400 ${opacityClass}">${index + 1}</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 ${opacityClass}">${record.entryTime}</td>
                <td class="px-3 py-3 whitespace-nowrap ${opacityClass}">
                    <div class="flex items-center">
                        <i class="fa-solid ${icon} text-gray-400 w-5 text-center mr-2"></i>
                        <div>
                            <div class="text-sm font-bold text-gray-800 uppercase tracking-wide">${record.plate}</div>
                            <div class="text-[10px] text-gray-500 capitalize">${record.type} • ${record.createdBy}</div>
                        </div>
                    </div>
                </td>
                <td class="px-3 py-3 whitespace-nowrap text-right text-sm font-semibold text-gray-700 ${opacityClass}">$${record.total}</td>
                <td class="px-3 py-3 whitespace-nowrap text-center ${opacityClass}">${exitText}</td>
            `;
            recordsTableBody.appendChild(tr);
        });
    }

    // Actualizar Footer
    countAutos.textContent = totals.auto;
    countCamionetas.textContent = totals.camioneta;
    countMotos.textContent = totals.moto;
    totalDayAmount.textContent = `$${totals.amount}`;
}

// Interacciones en Planilla
recordType.addEventListener('change', () => {
    const type = recordType.value;
    recordTotal.value = appData.settings.prices[type];
});

addRecordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newRecord = {
        id: generateId(),
        entryTime: formatTime(new Date()),
        exitTime: "",
        type: recordType.value,
        plate: recordPlate.value.trim(),
        total: recordTotal.value,
        createdBy: currentUser.name,
        shift: currentShift
    };

    getRecordsForDate(currentViewDate).push(newRecord);
    saveData();
    
    // Reset form partial
    recordPlate.value = '';
    recordPlate.focus();
    
    renderPlanilla();
    showToast('Vehículo registrado');
});

btnShiftManana.addEventListener('click', () => {
    currentShift = 'manana';
    renderPlanilla();
});

btnShiftTarde.addEventListener('click', () => {
    currentShift = 'tarde';
    renderPlanilla();
});

// --- 8. MODAL DE REGISTRO ---
function openRecordModal(id) {
    const records = getRecordsForDate(currentViewDate);
    const record = records.find(r => r.id === id);
    if (!record) return;

    selectedRecordId = id;
    
    document.getElementById('modPlate').textContent = record.plate;
    document.getElementById('modType').textContent = record.type;
    document.getElementById('modEntry').textContent = record.entryTime;
    document.getElementById('modTotal').textContent = `$${record.total}`;
    document.getElementById('modUser').textContent = record.createdBy;

    if (record.exitTime) {
        btnSetExit.classList.add('hidden');
    } else {
        btnSetExit.classList.remove('hidden');
        // Si el empleado no es jefe y es un día histórico, no puede marcar salida
        if (currentUser.role === 'empleado' && currentViewDate !== getTodayStr()) {
             btnSetExit.classList.add('hidden');
        }
    }

    if (currentUser.role === 'jefe') {
        btnDeleteRecord.classList.remove('hidden');
    } else {
        btnDeleteRecord.classList.add('hidden');
    }

    recordModal.classList.remove('hidden');
    // For trigger animation
    setTimeout(() => {
        recordModal.classList.remove('opacity-0');
        recordModal.classList.add('opacity-100');
        document.getElementById('recordModalContent').classList.remove('scale-95');
    }, 10);
}

function closeRecordModal() {
    recordModal.classList.remove('opacity-100');
    recordModal.classList.add('opacity-0');
    document.getElementById('recordModalContent').classList.add('scale-95');
    setTimeout(() => {
        recordModal.classList.add('hidden');
        selectedRecordId = null;
    }, 300);
}

btnCloseModalX.addEventListener('click', closeRecordModal);
recordModal.addEventListener('click', (e) => {
    if (e.target === recordModal) closeRecordModal();
});

btnSetExit.addEventListener('click', () => {
    const records = getRecordsForDate(currentViewDate);
    const record = records.find(r => r.id === selectedRecordId);
    if (record) {
        record.exitTime = formatTime(new Date());
        saveData();
        renderPlanilla();
        closeRecordModal();
        showToast('Salida registrada');
    }
});

btnDeleteRecord.addEventListener('click', () => {
    if (confirm('¿Estás seguro de eliminar este registro?')) {
        appData.records[currentViewDate] = appData.records[currentViewDate].filter(r => r.id !== selectedRecordId);
        saveData();
        renderPlanilla();
        closeRecordModal();
        showToast('Registro eliminado', 'success');
    }
});

// --- 9. CONFIGURACIÓN ---
function renderConfig() {
    // Cargar Precios
    cfgPriceAuto.value = appData.settings.prices.auto;
    cfgPriceCamioneta.value = appData.settings.prices.camioneta;
    cfgPriceMoto.value = appData.settings.prices.moto;

    // Cargar visual
    cfgToggleLogo.checked = appData.settings.showLogoBackground;

    // Cargar Usuarios
    configUsersList.innerHTML = '';
    appData.users.forEach(u => {
        const li = document.createElement('li');
        li.className = "px-4 py-3 flex justify-between items-center";
        
        let icon = u.role === 'jefe' ? '<i class="fa-solid fa-user-tie text-blue-800 w-5"></i>' : '<i class="fa-solid fa-user text-gray-500 w-5"></i>';
        
        li.innerHTML = `
            <div class="flex items-center">
                ${icon}
                <span class="ml-2 text-sm font-medium text-gray-800">${u.name}</span>
                <span class="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 capitalize">${u.role}</span>
            </div>
        `;
        
        if (appData.users.length > 1) {
            const btnDel = document.createElement('button');
            btnDel.className = "text-red-400 hover:text-red-600 transition-colors";
            btnDel.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
            btnDel.onclick = () => deleteUser(u.id);
            li.appendChild(btnDel);
        }
        
        configUsersList.appendChild(li);
    });
}

configPricesForm.addEventListener('submit', (e) => {
    e.preventDefault();
    appData.settings.prices.auto = parseInt(cfgPriceAuto.value);
    appData.settings.prices.camioneta = parseInt(cfgPriceCamioneta.value);
    appData.settings.prices.moto = parseInt(cfgPriceMoto.value);
    saveData();
    showToast('Precios actualizados');
    // Actualizar precio en formulario si está en la vista
    recordTotal.value = appData.settings.prices[recordType.value];
});

cfgToggleLogo.addEventListener('change', () => {
    appData.settings.showLogoBackground = cfgToggleLogo.checked;
    saveData();
    applySettings();
});

configAddUserForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('cfgNewUserName');
    const roleInput = document.getElementById('cfgNewUserRole');
    
    const newUser = {
        id: Date.now(),
        name: nameInput.value.trim(),
        role: roleInput.value
    };
    
    appData.users.push(newUser);
    saveData();
    nameInput.value = '';
    renderConfig();
    showToast('Usuario agregado');
});

function deleteUser(id) {
    if (confirm('¿Eliminar este usuario?')) {
        appData.users = appData.users.filter(u => u.id !== id);
        saveData();
        renderConfig();
        showToast('Usuario eliminado');
    }
}

// --- 10. HISTORIAL ---
function getMonthKey(dateStr) {
    return dateStr.substring(0, 7); // YYYY-MM
}

function renderHistorialMonths() {
    const monthsSet = new Set();
    monthsSet.add(getMonthKey(getTodayStr())); // Siempre mostrar el mes actual
    
    Object.keys(appData.records).forEach(date => {
        monthsSet.add(getMonthKey(date));
    });
    
    const sortedMonths = Array.from(monthsSet).sort().reverse();
    
    historyMonthSelect.innerHTML = '';
    sortedMonths.forEach(m => {
        const [year, month] = m.split('-');
        const dateObj = new Date(year, month - 1);
        const name = dateObj.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
        historyMonthSelect.innerHTML += `<option value="${m}" class="capitalize">${name}</option>`;
    });
}

function renderHistorialCalendar() {
    const selectedMonthKey = historyMonthSelect.value;
    if (!selectedMonthKey) return;
    
    const [year, month] = selectedMonthKey.split('-');
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    historyCalendarGrid.innerHTML = '';
    
    // Espacios vacíos hasta el primer día de la semana (0 = Dom, 6 = Sáb)
    for (let i = 0; i < firstDay.getDay(); i++) {
        historyCalendarGrid.innerHTML += `<div class="bg-white p-2 min-h-[80px]"></div>`;
    }
    
    // Días del mes
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const currentLoopDate = `${year}-${month}-${d.toString().padStart(2, '0')}`;
        const records = appData.records[currentLoopDate] || [];
        const count = records.length;
        
        let colorClass = 'bg-gray-100';
        let ringClass = '';
        
        if (count > 100) { colorClass = 'bg-green-100 border-green-300'; ringClass = 'ring-1 ring-green-400'; }
        else if (count >= 50) { colorClass = 'bg-orange-100 border-orange-300'; ringClass = 'ring-1 ring-orange-400'; }
        else if (count > 0) { colorClass = 'bg-red-100 border-red-300'; ringClass = 'ring-1 ring-red-400'; }
        else { colorClass = 'bg-white'; }
        
        const isTodayStr = currentLoopDate === getTodayStr() ? 'font-bold text-blue-600' : 'text-gray-700';
        const isTodayBorder = currentLoopDate === getTodayStr() ? 'border-2 border-blue-500' : 'border border-transparent';
        
        const dayDiv = document.createElement('div');
        dayDiv.className = `bg-white p-1 sm:p-2 min-h-[60px] sm:min-h-[80px] flex flex-col items-center justify-start cursor-pointer hover:bg-gray-50 transition-colors border-r border-b border-gray-100 ${isTodayBorder}`;
        
        dayDiv.innerHTML = `
            <span class="text-sm ${isTodayStr} mb-1">${d}</span>
            ${count > 0 ? `<div class="w-6 h-6 sm:w-8 sm:h-8 rounded-full ${colorClass} ${ringClass} flex items-center justify-center text-[10px] sm:text-xs font-bold text-gray-800 shadow-sm">${count}</div>` : ''}
        `;
        
        dayDiv.onclick = () => {
            currentViewDate = currentLoopDate;
            currentShift = 'manana'; // reset shift to morning
            switchView('planilla');
        };
        
        historyCalendarGrid.appendChild(dayDiv);
    }
}

historyMonthSelect.addEventListener('change', renderHistorialCalendar);

// --- 11. INICIO DE LA APLICACIÓN ---
navTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        const target = e.currentTarget.dataset.target;
        switchView(target.replace('view', '').toLowerCase());
    });
});

window.addEventListener('DOMContentLoaded', () => {
    loadData();
    initLogin();
    
    // Set initial total value based on initial selection
    recordTotal.value = appData.settings.prices[recordType.value];
});
