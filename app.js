// app.js

// --- Predefined EV Database ---
const APP_PIN = "1923"; // Varsayılan Giriş Şifresi
const evDatabase = [
    { id: 'ev1', name: 'Togg T10X V2 (Uzun Menzil)', capacity: 88.5, efficiency: 5.9 },
    { id: 'ev2', name: 'Togg T10X V1 (Standart Menzil)', capacity: 52.4, efficiency: 6.0 },
    { id: 'ev3', name: 'Tesla Model Y Long Range', capacity: 75.0, efficiency: 6.3 },
    { id: 'ev4', name: 'Tesla Model Y Performance', capacity: 75.0, efficiency: 5.8 },
    { id: 'ev5', name: 'Renault Megane E-Tech', capacity: 60.0, efficiency: 6.2 },
    { id: 'ev6', name: 'Citroen e-C3 Aircross', capacity: 44.0, efficiency: 5.8 },
    { id: 'ev11', name: 'Citroen e-C3', capacity: 44.0, efficiency: 6.0 },
    { id: 'ev12', name: 'Citroen e-C3 Aircross Uzun Menzil', capacity: 54.0, efficiency: 6.0 },
    { id: 'ev13', name: 'Kia EV3 Standart', capacity: 58.3, efficiency: 6.6 },
    { id: 'ev14', name: 'Kia EV3 Long Range', capacity: 81.4, efficiency: 6.1 },
    { id: 'ev7', name: 'Hyundai Ioniq 5 (72.6 kWh)', capacity: 72.6, efficiency: 5.9 },
    { id: 'ev8', name: 'MG4 Electric (Luxury)', capacity: 64.0, efficiency: 6.0 },
    { id: 'ev9', name: 'BYD Atto 3', capacity: 60.4, efficiency: 6.4 },
    { id: 'ev10', name: 'Dacia Spring', capacity: 26.8, efficiency: 7.1 }
];

// --- State Management ---
let vehicles = JSON.parse(localStorage.getItem('vehicles')) || [
    { id: 'ev6', name: 'Citroen e-C3 Aircross', capacity: 44, efficiency: 5.8 }
];
let activeVehicleId = localStorage.getItem('activeVehicleId') || 'ev6';
let chargingSession = JSON.parse(localStorage.getItem('chargingSession')) || null;
let parkingData = JSON.parse(localStorage.getItem('parkingData')) || null;

// Selectors
const screens = document.querySelectorAll('.screen');
const navItems = document.querySelectorAll('.nav-item');
const toastEl = document.getElementById('toast');
const btnLogin = document.getElementById('btnLogin');
const loginPin = document.getElementById('loginPin');
const loginError = document.getElementById('loginError');

// --- Initialization ---
function init() {
    if (!checkAuth()) return; // Şifre girilmediyse ekranı yükleme
    
    setupNavigation();
    populateVehicleSelect();
    renderVehicles();
    updateActiveVehicleUI();
    loadParkingData();
    
    // Check if charging
    if (chargingSession) {
        startChargingLoop();
    } else {
        updateHomeStatic();
    }

    // Setup event listeners
    document.getElementById('headerVehicleSelect').addEventListener('change', (e) => {
        activeVehicleId = e.target.value;
        localStorage.setItem('activeVehicleId', activeVehicleId);
        renderVehicles();
        updateActiveVehicleUI();
        showToast("Aktif araç değiştirildi.");
    });

    document.getElementById('btnAddVehicle').addEventListener('click', () => {
        document.getElementById('addVehicleForm').classList.remove('hidden');
        document.getElementById('presetVehicleSelect').value = "";
        document.getElementById('customVehicleFields').classList.add('hidden');
    });
    
    document.getElementById('presetVehicleSelect').addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'custom') {
            document.getElementById('customVehicleFields').classList.remove('hidden');
        } else {
            document.getElementById('customVehicleFields').classList.add('hidden');
        }
    });

    document.getElementById('btnCancelNewVehicle').addEventListener('click', () => {
        document.getElementById('addVehicleForm').classList.add('hidden');
    });

    document.getElementById('btnSaveNewVehicle').addEventListener('click', saveNewVehicle);
    
    // Charging Form
    const inputCurrent = document.getElementById('inputCurrentBat');
    const inputTarget = document.getElementById('inputTargetBat');
    const inputPower = document.getElementById('inputPowerKw');
    
    [inputCurrent, inputTarget, inputPower].forEach(el => {
        el.addEventListener('input', updateChargingEstimation);
    });

    document.getElementById('btnStartChargeFromForm').addEventListener('click', () => {
        startCharge(
            parseFloat(inputCurrent.value),
            parseFloat(inputTarget.value),
            parseFloat(inputPower.value)
        );
    });
    
    document.getElementById('btnStartChargeHome').addEventListener('click', () => {
        // Switch to charging screen to set params
        switchTab('chargingScreen');
    });

    document.getElementById('btnStopCharge').addEventListener('click', stopCharge);
    
    const btnStopChargeHome = document.getElementById('btnStopChargeHome');
    if (btnStopChargeHome) btnStopChargeHome.addEventListener('click', stopCharge);

    // Parking Form
    document.getElementById('btnSaveParkLocation').addEventListener('click', saveParkingLocation);
    document.getElementById('btnNavigateToPark').addEventListener('click', navigateToPark);
    document.getElementById('btnOpenMapHome').addEventListener('click', navigateToPark);
    
    // Load simulation consent
    if (localStorage.getItem('simulationConsent') === 'true') {
        document.getElementById('checkSimulationConsent').checked = true;
    }
}

// --- AUTHENTICATION ---
function checkAuth() {
    const savedPin = localStorage.getItem('app_auth_pin');
    if (savedPin === APP_PIN) {
        // Zaten giriş yapılmış
        document.getElementById('homeScreen').classList.add('active');
        if(document.getElementById('authScreen')) document.getElementById('authScreen').classList.remove('active');
        document.getElementById('bottomNav').classList.remove('hidden');
        document.getElementById('appHeader').style.display = 'flex';
        return true;
    } else {
        // Giriş Yapılmamış
        if(document.getElementById('authScreen')) document.getElementById('authScreen').classList.add('active');
        document.getElementById('homeScreen').classList.remove('active');
        document.getElementById('bottomNav').classList.add('hidden');
        document.getElementById('appHeader').style.display = 'none';
        
        btnLogin.addEventListener('click', handleLogin);
        loginPin.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
        return false;
    }
}

function handleLogin() {
    const pin = loginPin.value.trim();
    if (pin === APP_PIN) {
        localStorage.setItem('app_auth_pin', pin);
        loginError.classList.add('hidden');
        
        // Ekranları değiştirip init'i başlat
        document.getElementById('authScreen').classList.remove('active');
        document.getElementById('homeScreen').classList.add('active');
        document.getElementById('bottomNav').classList.remove('hidden');
        document.getElementById('appHeader').style.display = 'flex';
        
        init(); // Uygulamayı başlat
        showToast("Giriş başarılı!");
    } else {
        loginError.classList.remove('hidden');
        loginPin.value = '';
    }
}

// --- Navigation ---
function setupNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            switchTab(target);
        });
    });
}

function switchTab(targetId) {
    // Update nav icons
    navItems.forEach(item => {
        item.classList.remove('active');
        const icon = item.querySelector('i');
        if (item.getAttribute('data-target') === targetId) {
            item.classList.add('active');
            if (!icon.classList.contains('ph-fill')) icon.classList.add('ph-fill');
        } else {
            icon.classList.remove('ph-fill');
        }
    });

    // Update screens
    screens.forEach(screen => {
        if (screen.id === targetId) {
            screen.classList.add('active');
            if (targetId === 'parkingScreen') {
                initMap();
            }
        } else {
            screen.classList.remove('active');
        }
    });
}

// --- Vehicles ---
function getActiveVehicle() {
    return vehicles.find(v => v.id === activeVehicleId) || vehicles[0];
}

function updateActiveVehicleUI() {
    const v = getActiveVehicle();
    document.getElementById('headerVehicleSelect').value = v.id;
    document.getElementById('activeVehicleSpecs').innerText = `${v.capacity} kWh Batarya`;
    
    if(!chargingSession) {
        updateHomeStatic();
    }
}

function populateVehicleSelect() {
    const select = document.getElementById('presetVehicleSelect');
    // Remove old preset options (keep the first and last manually defined options)
    Array.from(select.options).forEach(opt => {
        if (opt.value !== "" && opt.value !== "custom") select.removeChild(opt);
    });
    
    // Insert presets before 'custom'
    const customOpt = select.querySelector('option[value="custom"]');
    evDatabase.forEach(ev => {
        const option = document.createElement('option');
        option.value = ev.id;
        option.text = `${ev.name} (${ev.capacity} kWh)`;
        select.insertBefore(option, customOpt);
    });
}

function renderVehicles() {
    const container = document.getElementById('vehiclesListContainer');
    container.innerHTML = '';
    
    const headerSelect = document.getElementById('headerVehicleSelect');
    headerSelect.innerHTML = '';
    
    vehicles.forEach(v => {
        // Add to header select
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.text = v.name;
        headerSelect.appendChild(opt);

        // Render in vehicles page
        const div = document.createElement('div');
        div.className = `vehicle-item ${v.id === activeVehicleId ? 'active' : ''}`;
        div.innerHTML = `
            <div class="vehicle-item-info" style="flex:1;">
                <h3>${v.name}</h3>
                <p>${v.capacity} kWh Batarya</p>
            </div>
            <div style="display:flex; align-items:center; gap: 15px;">
                ${v.id === activeVehicleId ? '<i class="ph-fill ph-check-circle text-green" style="font-size: 1.5rem"></i>' : ''}
                <button class="delete-veh-btn" style="background:transparent; border:none; color: #ff4d4d; font-size:1.5rem; cursor:pointer;"><i class="ph ph-trash"></i></button>
            </div>
        `;
        
        // Make the item clickable to set active
        div.querySelector('.vehicle-item-info').addEventListener('click', () => {
            activeVehicleId = v.id;
            localStorage.setItem('activeVehicleId', activeVehicleId);
            renderVehicles();
            updateActiveVehicleUI();
            showToast("Aktif araç değiştirildi.");
        });

        // Delete button logic
        div.querySelector('.delete-veh-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (vehicles.length === 1) {
                showToast("En az bir araç bulunmalıdır!");
                return;
            }
            if (chargingSession && chargingSession.vehicleId === v.id) {
                showToast("Bu araç şu anda şarj ediliyor, silinemez!");
                return;
            }
            vehicles = vehicles.filter(veh => veh.id !== v.id);
            if (activeVehicleId === v.id) {
                activeVehicleId = vehicles[0].id;
                localStorage.setItem('activeVehicleId', activeVehicleId);
            }
            localStorage.setItem('vehicles', JSON.stringify(vehicles));
            renderVehicles();
            updateActiveVehicleUI();
            showToast("Araç silindi.");
        });
        
        container.appendChild(div);
    });
    
    headerSelect.value = activeVehicleId;
}

function saveNewVehicle() {
    const selectVal = document.getElementById('presetVehicleSelect').value;
    
    let newVeh = null;
    
    if (!selectVal) {
        showToast("Lütfen bir araç seçin.");
        return;
    }
    
    if (selectVal === 'custom') {
        const name = document.getElementById('newVehName').value;
        const cap = parseFloat(document.getElementById('newVehCap').value);
        const eff = 6.0; // Manuel eklemelerde varsayılan ortalama verimlilik (Kullanıcıdan gizledik)
        
        if(!name || isNaN(cap)) {
            showToast("Lütfen tüm alanları doldurun.");
            return;
        }
        
        newVeh = {
            id: Date.now().toString(),
            name, capacity: cap, efficiency: eff
        };
    } else {
        const preset = evDatabase.find(ev => ev.id === selectVal);
        if (preset) {
            newVeh = { ...preset, id: Date.now().toString() }; // Generate unique ID so user can have multiple of same car
        }
    }
    
    if (newVeh) {
        vehicles.push(newVeh);
        localStorage.setItem('vehicles', JSON.stringify(vehicles));
        renderVehicles();
        document.getElementById('addVehicleForm').classList.add('hidden');
        showToast("Araç eklendi.");
    }
}

// --- Charging Logic ---
function calculateChargingStats(current, target, capacity, power, efficiency) {
    let energy1 = 0; // energy up to 80%
    let energy2 = 0; // energy above 80%
    
    if (current < 80) {
        let target1 = Math.min(target, 80);
        energy1 = capacity * ((target1 - current) / 100);
    }
    
    if (target > 80) {
        let start2 = Math.max(current, 80);
        energy2 = capacity * ((target - start2) / 100);
    }
    
    // DC şarjda (> 22 kW) %80 sonrası şarj hızı büyük ölçüde düşer (örn: %40'ına düşer)
    let power2 = power > 22 ? power * 0.4 : power; 
    
    let time1 = energy1 / power;
    let time2 = energy2 / power2;
    let totalTime = time1 + time2;
    let gainedKm = (energy1 + energy2) * efficiency;
    
    return { totalTime, gainedKm, energy1, power2, time1 };
}

function updateChargingEstimation() {
    const current = parseFloat(document.getElementById('inputCurrentBat').value);
    const target = parseFloat(document.getElementById('inputTargetBat').value);
    const power = parseFloat(document.getElementById('inputPowerKw').value);
    
    if (isNaN(current) || isNaN(target) || isNaN(power) || current >= target) {
        document.getElementById('calcTimeResult').innerText = '--';
        document.getElementById('calcRangeResult').innerText = '+0 km';
        return;
    }
    
    const v = getActiveVehicle();
    const stats = calculateChargingStats(current, target, v.capacity, power, v.efficiency);
    
    document.getElementById('calcTimeResult').innerText = formatHours(stats.totalTime);
    document.getElementById('calcRangeResult').innerText = `+${Math.round(stats.gainedKm)} km`;
}

function startCharge(startPercent, targetPercent, power) {
    if (isNaN(startPercent) || isNaN(targetPercent) || isNaN(power) || startPercent >= targetPercent) {
        showToast("Geçerli değerler giriniz.");
        return;
    }
    
    // Check consent
    const hasConsent = document.getElementById('checkSimulationConsent').checked;
    if (!hasConsent) {
        showToast("Lütfen uygulamanın tahmini çalıştığını onaylayın.");
        return;
    }
    localStorage.setItem('simulationConsent', 'true');
    
    chargingSession = {
        startTime: Date.now(),
        startPercent,
        targetPercent,
        power,
        vehicleId: activeVehicleId
    };
    
    localStorage.setItem('chargingSession', JSON.stringify(chargingSession));
    showToast("Şarj işlemi başlatıldı!");
    
    document.getElementById('btnStartChargeFromForm').classList.add('hidden');
    document.getElementById('btnStopCharge').classList.remove('hidden');
    
    switchTab('homeScreen');
    startChargingLoop();
}

function stopCharge() {
    chargingSession = null;
    localStorage.removeItem('chargingSession');
    clearInterval(window.chargingInterval);
    showToast("Şarj işlemi durduruldu.");
    
    document.getElementById('btnStartChargeFromForm').classList.remove('hidden');
    document.getElementById('btnStopCharge').classList.add('hidden');
    document.getElementById('activeChargingCard').classList.add('hidden');
    document.getElementById('btnStartChargeHome').classList.remove('hidden');
    
    const btnStopChargeHome = document.getElementById('btnStopChargeHome');
    if (btnStopChargeHome) btnStopChargeHome.classList.add('hidden');
    
    const chargingResultCard = document.getElementById('chargingResultCard');
    if (chargingResultCard) chargingResultCard.classList.remove('hidden');
    
    updateHomeStatic();
}

function startChargingLoop() {
    document.getElementById('btnStartChargeFromForm').classList.add('hidden');
    document.getElementById('btnStopCharge').classList.remove('hidden');
    document.getElementById('btnStartChargeHome').classList.add('hidden');
    document.getElementById('activeChargingCard').classList.remove('hidden');
    
    const btnStopChargeHome = document.getElementById('btnStopChargeHome');
    if (btnStopChargeHome) btnStopChargeHome.classList.remove('hidden');
    
    const chargingResultCard = document.getElementById('chargingResultCard');
    if (chargingResultCard) chargingResultCard.classList.add('hidden');
    
    document.querySelector('.battery-container').classList.add('is-charging');
    
    updateChargingState();
    window.chargingInterval = setInterval(updateChargingState, 5000); // Her 5 saniyede bir güncelle
}

function updateChargingState() {
    if (!chargingSession) return;
    
    const v = vehicles.find(vh => vh.id === chargingSession.vehicleId) || getActiveVehicle();
    const passedHours = (Date.now() - chargingSession.startTime) / (1000 * 60 * 60);
    
    const stats = calculateChargingStats(chargingSession.startPercent, chargingSession.targetPercent, v.capacity, chargingSession.power, v.efficiency);
    
    let addedEnergy = 0;
    if (passedHours <= stats.time1) {
        addedEnergy = passedHours * chargingSession.power;
    } else {
        addedEnergy = stats.energy1 + (passedHours - stats.time1) * stats.power2;
    }
    
    let currentPercent = chargingSession.startPercent + (addedEnergy / v.capacity) * 100;
    
    if (currentPercent >= chargingSession.targetPercent) {
        currentPercent = chargingSession.targetPercent;
        stopCharge();
        showToast("Şarj tamamlandı!");
        if (Notification.permission === 'granted') {
            new Notification('Şarj Tamamlandı', { body: 'Aracınız hedeflenen şarj seviyesine ulaştı.' });
        }
    }
    
    // Kalan süreyi hesapla
    const remainingStats = calculateChargingStats(currentPercent, chargingSession.targetPercent, v.capacity, chargingSession.power, v.efficiency);
    const remainingHours = remainingStats.totalTime;
    
    const gainedKm = (v.capacity * ((currentPercent - chargingSession.startPercent)/100)) * v.efficiency;
    const targetGainedKm = stats.gainedKm;
    
    // Update Home Screen Battery
    document.getElementById('homeBatteryPercent').innerText = `%${Math.floor(currentPercent)}`;
    document.getElementById('batteryFill').style.height = `${currentPercent}%`;
    document.getElementById('homeRemainingTime').innerText = formatHours(remainingHours);
    document.getElementById('homeTargetPercent').innerText = `%${chargingSession.targetPercent}`;
    document.getElementById('homeGainedRange').innerHTML = `+${Math.round(targetGainedKm)} <small>km</small>`;
    
    // AC/DC Power Display Logic (<=22 kW is usually AC, >22 is DC)
    const powerType = chargingSession.power <= 22 ? 'AC' : 'DC';
    document.getElementById('homePowerDisplay').innerText = `${powerType} • ${chargingSession.power} kW`;
    
    // Status Indicator
    const indicator = document.getElementById('homeStatusIndicator');
    if(indicator) {
        indicator.classList.remove('offline');
        indicator.innerHTML = '<i class="ph-fill ph-lightning"></i> Şarj Oluyor';
    }
    
    // Update Smart Card
    document.getElementById('liveStartPercent').innerText = `%${Math.floor(currentPercent)}`;
    document.getElementById('liveTargetPercent').innerText = `%${chargingSession.targetPercent}`;
    document.getElementById('liveRemainingTime').innerText = formatHours(remainingHours);
    document.getElementById('liveGainedKm').innerText = Math.round(gainedKm);
    
    const progressPercent = Math.min(100, (currentPercent - chargingSession.startPercent) / (chargingSession.targetPercent - chargingSession.startPercent) * 100);
    document.getElementById('liveProgressBar').style.width = `${progressPercent}%`;
    document.querySelector('.progress-icon').style.left = `${progressPercent}%`;
}

function updateHomeStatic() {
    const v = getActiveVehicle();
    // Dummy static values for when not charging
    document.getElementById('homeBatteryPercent').innerText = `%--`;
    document.getElementById('batteryFill').style.height = `0%`;
    document.getElementById('homeRemainingTime').innerText = `--`;
    document.getElementById('homeTargetPercent').innerText = `%--`;
    document.getElementById('homeGainedRange').innerHTML = `-- <small>km</small>`;
    document.getElementById('homePowerDisplay').innerText = `-- kW`;
    
    // Status Indicator
    const indicator = document.getElementById('homeStatusIndicator');
    if(indicator) {
        indicator.classList.add('offline');
        indicator.innerHTML = '<i class="ph-fill ph-lightning"></i> Şarj Bekleniyor';
    }
    
    document.querySelector('.battery-container').classList.remove('is-charging');
    
    updateChargingEstimation();
}

function formatHours(decimalHours) {
    if (decimalHours <= 0) return '0dk';
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    if (h === 0) return `${m}dk`;
    if (m === 0) return `${h}s`;
    return `${h}s ${m}dk`;
}

// --- Parking & Map ---
let mapInstance;
let markerInstance;

function initMap() {
    if (mapInstance) {
        setTimeout(() => mapInstance.invalidateSize(), 200); // Leaflet render fix for hidden divs
        return;
    }
    
    const defaultCoords = [41.0082, 28.9784]; // Istanbul
    
    mapInstance = L.map('mapView').setView(defaultCoords, 13);
    
    // Light mode / Colorful map tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(mapInstance);
    
    markerInstance = L.marker(defaultCoords, { draggable: false }).addTo(mapInstance);
    
    // Request actual location if available
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const coords = [pos.coords.latitude, pos.coords.longitude];
            mapInstance.setView(coords, 15);
            markerInstance.setLatLng(coords);
        }, () => {});
    }
}

function saveParkingLocation() {
    const note = document.getElementById('inputParkNote').value;
    
    const currentCoords = markerInstance ? markerInstance.getLatLng() : { lat: 41.0082, lng: 28.9784 };
    
    parkingData = {
        title: note || 'Kayıtlı Konum',
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('tr-TR'),
        coords: { lat: currentCoords.lat, lng: currentCoords.lng }
    };
    
    localStorage.setItem('parkingData', JSON.stringify(parkingData));
    showToast("Park konumu kaydedildi.");
    loadParkingData();
}

function navigateToPark() {
    if (parkingData && parkingData.coords) {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${parkingData.coords.lat},${parkingData.coords.lng}`;
        window.open(url, '_blank');
    } else {
        showToast("Lütfen önce bir park konumu kaydedin.");
    }
}

function loadParkingData() {
    if (parkingData) {
        document.getElementById('lastParkTitle').innerText = parkingData.title;
        
        const isToday = parkingData.date === new Date().toLocaleDateString('tr-TR');
        document.getElementById('lastParkTime').innerText = isToday ? `Bugün ${parkingData.time}` : `${parkingData.date} ${parkingData.time}`;
    }
}

// --- Utils ---
function showToast(msg) {
    toastEl.innerText = msg;
    toastEl.classList.add('show');
    setTimeout(() => {
        toastEl.classList.remove('show');
    }, 3000);
}

// Request Notification Permission
if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
}

// Initialize App
document.addEventListener('DOMContentLoaded', init);
