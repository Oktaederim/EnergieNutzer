document.addEventListener('DOMContentLoaded', () => {

    // --- GRUNDEINSTELLUNGEN & KONSTANTEN ---
    const config = {
        heatingCostPerKwh: 0.12, 
        electricityCostPerKwh: 0.35,
        heatingSavingPerDegree: 0.06, 
        baseHeatingTemp: 20,
        baseCoolingTemp: 24,
        coolingEER: 3.0,
        workDaysPerYear: 220,
    };

    // NEU: Konstanten für Standby-Verbrauch
    const devicePower = {
        pc_2_monitors:  { on: 150, standby: 5, off: 1 },
        pc_1_monitor:   { on: 110, standby: 4, off: 1 },
        laptop_monitor: { on: 70,  standby: 3, off: 1 },
        laptop:         { on: 45,  standby: 2, off: 0.5 }
    };

    // --- DOM-ELEMENTE AUSWÄHLEN ---
    // Modul 1
    const heatingTempSlider = document.getElementById('heatingTemp');
    const heatingTempValue = document.getElementById('heatingTempValue');
    const officeSizeSelect = document.getElementById('officeSize');
    const heatingResultDiv = document.getElementById('heatingResult');
    // Modul 2
    const coolingLoadInput = document.getElementById('coolingLoad');
    const coolingTempSlider = document.getElementById('coolingTemp');
    const coolingTempValue = document.getElementById('coolingTempValue');
    const coolingResultDiv = document.getElementById('coolingResult');
    // Modul 3
    const daySelector = document.getElementById('day-selector');
    const absenceResultDiv = document.getElementById('absenceResult');
    // Modul 4
    const deviceSetupSelect = document.getElementById('deviceSetup');
    const shutdownBehaviorGroup = document.getElementById('shutdown-behavior');
    const standbyResultDiv = document.getElementById('standbyResult');

    // --- BERECHNUNGSFUNKTIONEN ---

    function calculateHeating() {
        // Diese Funktion bleibt unverändert
        const temp = parseFloat(heatingTempSlider.value);
        const size = parseInt(officeSizeSelect.value);
        const baseYearlyKwh = size * 70;
        const baseCost = baseYearlyKwh * config.heatingCostPerKwh;
        const tempDifference = temp - config.baseHeatingTemp;
        const costDifference = baseCost * tempDifference * config.heatingSavingPerDegree;

        heatingTempValue.textContent = temp.toFixed(1);

        if (costDifference > 0.01) {
            heatingResultDiv.innerHTML = `<span class="text-danger">Mehrkosten: +${formatCurrency(costDifference)} / Jahr</span>`;
        } else if (costDifference < -0.01) {
            heatingResultDiv.innerHTML = `<span class="text-success">Ersparnis: ${formatCurrency(Math.abs(costDifference))} / Jahr</span>`;
        } else {
            heatingResultDiv.innerHTML = '<span>Keine wesentliche Abweichung</span>';
        }
    }

    function calculateCooling() {
        // Diese Funktion bleibt unverändert
        const load = parseFloat(coolingLoadInput.value);
        const selectedTemp = parseInt(coolingTempSlider.value);
        coolingTempValue.textContent = selectedTemp;

        if (isNaN(load) || load <= 0) {
            coolingResultDiv.innerHTML = '<span>Bitte gültige Wärmelast > 0 angeben.</span>';
            return;
        }

        const getYearlyCost = (temp) => {
            const tempFactor = 1 + (config.baseCoolingTemp - temp) * 0.1;
            const kwhPerHour = (load / config.coolingEER) * tempFactor;
            const costPerDay = kwhPerHour * 10;
            return costPerDay * config.workDaysPerYear;
        };

        const costForSelectedTemp = getYearlyCost(selectedTemp);
        const costForBaseTemp = getYearlyCost(config.baseCoolingTemp);
        let displayHtml = '';

        if (selectedTemp < config.baseCoolingTemp) {
            const potentialSaving = costForSelectedTemp - costForBaseTemp;
            displayHtml = `
                <span class="text-danger">Kosten: ${formatCurrency(costForSelectedTemp)} / Jahr</span>
                <span class="small-info text-success">Mögliche Ersparnis: +${formatCurrency(potentialSaving)} / Jahr (bei ${config.baseCoolingTemp}°C)</span>`;
        } else if (selectedTemp > config.baseCoolingTemp) {
            const realizedSaving = costForBaseTemp - costForSelectedTemp;
            displayHtml = `
                <span class="text-success">Kosten: ${formatCurrency(costForSelectedTemp)} / Jahr</span>
                <span class="small-info text-success">Ihre Ersparnis: ${formatCurrency(realizedSaving)} / Jahr (ggü. ${config.baseCoolingTemp}°C)</span>`;
        } else {
            displayHtml = `
                <span class="text-neutral">Kosten: ${formatCurrency(costForSelectedTemp)} / Jahr</span>
                <span class="small-info">Dies ist die empfohlene Referenz-Temperatur.</span>`;
        }
        coolingResultDiv.innerHTML = displayHtml;
    }
    
    function calculateAbsence() {
        const activeBtn = daySelector.querySelector('.active');
        if (!activeBtn) return;
        
        const days = parseInt(activeBtn.dataset.days);
        const size = parseInt(officeSizeSelect.value);

        if (days === 0) {
            absenceResultDiv.innerHTML = '<span>Bitte Tage auswählen.</span>';
            return;
        }

        const baseKwhPerDay = (size * 70) / config.workDaysPerYear;
        const costPerDayFull = baseKwhPerDay * config.heatingCostPerKwh;
        const costPerDayReduced = costPerDayFull * (1 - ((21 - 16) * config.heatingSavingPerDegree));

        const yearlyCostFull = costPerDayFull * days * 52;
        const yearlyCostReduced = costPerDayReduced * days * 52;
        const yearlySavings = yearlyCostFull - yearlyCostReduced;

        absenceResultDiv.innerHTML = `
            <span class="small-info">Heizung an (21°C): <b class="text-danger">${formatCurrency(yearlyCostFull)}</b></span>
            <span class="small-info">Abgesenkt (16°C): <b class="text-success">${formatCurrency(yearlyCostReduced)}</b></span>
            <hr class="separator">
            <b>Ihre Ersparnis: <span class="text-success">${formatCurrency(yearlySavings)} / Jahr</span></b>
        `;
    }

    function calculateStandby() {
        const device = deviceSetupSelect.value;
        const behavior = shutdownBehaviorGroup.querySelector('.active').dataset.behavior;
        const power = devicePower[device];

        // Stunden pro Tag: 8h Arbeit, 1h Pause, 15h "Nacht"
        const dailyHours = { work: 8, pause: 1, night: 15 };

        const getConsumptionKwh = (b) => {
            let wh = 0;
            if (b === 'standby_only') {
                wh = (dailyHours.work * power.on) + ((dailyHours.pause + dailyHours.night) * power.standby);
            } else if (b === 'shutdown_evening') {
                wh = (dailyHours.work * power.on) + (dailyHours.pause * power.standby) + (dailyHours.night * power.off);
            } else { // shutdown_breaks
                wh = (dailyHours.work * power.on) + ((dailyHours.pause + dailyHours.night) * power.off);
            }
            return (wh / 1000) * config.workDaysPerYear; // kWh pro Jahr
        };

        const costForBehavior = getConsumptionKwh(behavior) * config.electricityCostPerKwh;
        const costForBestBehavior = getConsumptionKwh('shutdown_breaks') * config.electricityCostPerKwh;
        const potentialSaving = costForBehavior - costForBestBehavior;
        
        standbyResultDiv.innerHTML = `
            <span class="small-info">Ihre jährl. Kosten: <b class="text-danger">${formatCurrency(costForBehavior)}</b></span>
            <hr class="separator">
            <b>Mögliche Ersparnis: <span class="text-success">${formatCurrency(potentialSaving)} / Jahr</span></b>
        `;
    }

    // --- HILFSFUNKTIONEN ---
    function formatCurrency(value) {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
    }

    // --- EVENT LISTENERS ---
    // Module 1 & 3
    officeSizeSelect.addEventListener('input', () => {
        calculateHeating();
        calculateAbsence();
    });
    heatingTempSlider.addEventListener('input', calculateHeating);

    // Modul 2
    coolingLoadInput.addEventListener('input', calculateCooling);
    coolingTempSlider.addEventListener('input', calculateCooling);
    
    // Modul 3
    daySelector.addEventListener('click', (e) => {
        if (e.target.classList.contains('day-btn')) {
            daySelector.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            calculateAbsence();
        }
    });

    // Modul 4
    deviceSetupSelect.addEventListener('input', calculateStandby);
    shutdownBehaviorGroup.addEventListener('click', (e) => {
        if (e.target.classList.contains('behavior-btn')) {
            shutdownBehaviorGroup.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            calculateStandby();
        }
    });

    // --- INITIALISIERUNG ---
    function init() {
        calculateHeating();
        calculateCooling();
        calculateAbsence();
        calculateStandby();
    }
    init();
});
