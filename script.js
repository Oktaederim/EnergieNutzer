document.addEventListener('DOMContentLoaded', () => {

    // --- GRUNDEINSTELLUNGEN & KONSTANTEN ---
    const config = {
        heatingCostPerKwh: 0.12, 
        electricityCostPerKwh: 0.35,
        heatingSavingPerDegree: 0.06, 
        workDaysPerYear: 220,
        // NEU: TU-Dortmund Standardwerte
        defaults: {
            heatingTemp: 20,
            coolingTemp: 24,
            absenceDays: 2,
            device: 'laptop_monitor',
            behavior: 'shutdown_evening'
        }
    };
    
    const devicePower = {
        pc_2_monitors:  { on: 150, standby: 5, off: 1 },
        pc_1_monitor:   { on: 110, standby: 4, off: 1 },
        laptop_monitor: { on: 70,  standby: 3, off: 1 },
        laptop:         { on: 45,  standby: 2, off: 0.5 }
    };

    // --- DOM-ELEMENTE ---
    const resetBtn = document.getElementById('resetBtn');
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
        const temp = parseFloat(heatingTempSlider.value);
        heatingTempValue.textContent = temp.toFixed(1);
        
        // NEU: Neutrale Anzeige bei Standardwert
        if (temp === config.defaults.heatingTemp) {
            heatingResultDiv.innerHTML = `<span class="text-neutral">Dies ist die TU-Vorgabe.</span>`;
            return;
        }

        const size = parseInt(officeSizeSelect.value);
        const baseYearlyKwh = size * 70;
        const baseCost = baseYearlyKwh * config.heatingCostPerKwh;
        const tempDifference = temp - config.defaults.heatingTemp;
        const costDifference = baseCost * tempDifference * config.heatingSavingPerDegree;

        if (costDifference > 0.01) {
            heatingResultDiv.innerHTML = `<span class="text-danger">Mehrkosten: +${formatCurrency(costDifference)} / Jahr</span>`;
        } else if (costDifference < -0.01) {
            heatingResultDiv.innerHTML = `<span class="text-success">Ersparnis: ${formatCurrency(Math.abs(costDifference))} / Jahr</span>`;
        }
    }

    function calculateCooling() {
        const selectedTemp = parseInt(coolingTempSlider.value);
        coolingTempValue.textContent = selectedTemp;

        // NEU: Neutrale Anzeige bei Standardwert
        if (selectedTemp === config.defaults.coolingTemp) {
            const costForBaseTemp = getCoolingCost(config.defaults.coolingTemp);
            coolingResultDiv.innerHTML = `
                <span class="text-neutral">Kosten (Referenz): ${formatCurrency(costForBaseTemp)} / Jahr</span>
                <span class="small-info">Dies ist die aktuelle ITMC-Vorgabe.</span>`;
            return;
        }

        const costForSelectedTemp = getCoolingCost(selectedTemp);
        const costForBaseTemp = getCoolingCost(config.defaults.coolingTemp);
        let displayHtml = '';

        if (selectedTemp < config.defaults.coolingTemp) {
            const potentialSaving = costForSelectedTemp - costForBaseTemp;
            displayHtml = `
                <span class="text-danger">Kosten: ${formatCurrency(costForSelectedTemp)} / Jahr</span>
                <span class="small-info text-success">Mögliche Ersparnis: +${formatCurrency(potentialSaving)} / Jahr (bei ${config.defaults.coolingTemp}°C)</span>`;
        } else { // selectedTemp > config.defaults.coolingTemp
            const realizedSaving = costForBaseTemp - costForSelectedTemp;
            displayHtml = `
                <span class="text-success">Kosten: ${formatCurrency(costForSelectedTemp)} / Jahr</span>
                <span class="small-info text-success">Ihre Ersparnis: ${formatCurrency(realizedSaving)} / Jahr (ggü. ${config.defaults.coolingTemp}°C)</span>`;
        }
        coolingResultDiv.innerHTML = displayHtml;
    }

    function calculateAbsence() {
        const activeBtn = daySelector.querySelector('.active');
        if (!activeBtn) return;
        
        const days = parseInt(activeBtn.dataset.days);
        const size = parseInt(officeSizeSelect.value);

        if (days === 0) {
            absenceResultDiv.innerHTML = '<span>Keine Abwesenheitstage ausgewählt.</span>';
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
        
        const costForBehavior = getStandbyCost(device, behavior);

        // NEU: Neutrale Anzeige bei Standardverhalten
        if(behavior === config.defaults.behavior) {
            standbyResultDiv.innerHTML = `
                <span class="small-info text-neutral">Jährl. Kosten (Standard): <b>${formatCurrency(costForBehavior)}</b></span>
                 <span class="small-info">Vergleichen Sie mit anderen Verhaltensweisen.</span>`;
            return;
        }
        
        const costForBestBehavior = getStandbyCost(device, 'shutdown_breaks');
        const potentialSaving = costForBehavior - costForBestBehavior;
        
        standbyResultDiv.innerHTML = `
            <span class="small-info">Ihre jährl. Kosten: <b class="text-danger">${formatCurrency(costForBehavior)}</b></span>
            <hr class="separator">
            <b>Mögliche Ersparnis: <span class="text-success">${formatCurrency(potentialSaving)} / Jahr</span></b>
        `;
    }

    // --- HILFSFUNKTIONEN ---
    function getCoolingCost(temp) {
        const load = parseFloat(coolingLoadInput.value) || 3;
        const tempFactor = 1 + (config.defaults.coolingTemp - temp) * 0.1;
        const kwhPerHour = (load / config.coolingEER) * tempFactor;
        const costPerDay = kwhPerHour * 10;
        return costPerDay * config.workDaysPerYear;
    }
    
    function getStandbyCost(device, behavior) {
        const power = devicePower[device];
        const dailyHours = { work: 8, pause: 1, night: 15 };
        let wh = 0;
        if (behavior === 'standby_only') {
            wh = (dailyHours.work * power.on) + ((dailyHours.pause + dailyHours.night) * power.standby);
        } else if (behavior === 'shutdown_evening') {
            wh = (dailyHours.work * power.on) + (dailyHours.pause * power.standby) + (dailyHours.night * power.off);
        } else { // shutdown_breaks
            wh = (dailyHours.work * power.on) + ((dailyHours.pause + dailyHours.night) * power.off);
        }
        const yearlyKwh = (wh / 1000) * config.workDaysPerYear;
        return yearlyKwh * config.electricityCostPerKwh;
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
    }

    function setActiveButton(groupElement, dataAttribute, value) {
        const buttons = groupElement.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset[dataAttribute] == value) {
                btn.classList.add('active');
            }
        });
    }

    // --- STEUERUNGSFUNKTIONEN ---
    function resetToDefaults() {
        heatingTempSlider.value = config.defaults.heatingTemp;
        coolingTempSlider.value = config.defaults.coolingTemp;
        deviceSetupSelect.value = config.defaults.device;
        
        setActiveButton(daySelector, 'days', config.defaults.absenceDays);
        setActiveButton(shutdownBehaviorGroup, 'behavior', config.defaults.behavior);

        runAllCalculations();
    }

    function runAllCalculations() {
        calculateHeating();
        calculateCooling();
        calculateAbsence();
        calculateStandby();
    }

    // --- EVENT LISTENERS ---
    resetBtn.addEventListener('click', resetToDefaults);
    officeSizeSelect.addEventListener('input', () => { calculateHeating(); calculateAbsence(); });
    heatingTempSlider.addEventListener('input', calculateHeating);
    coolingLoadInput.addEventListener('input', calculateCooling);
    coolingTempSlider.addEventListener('input', calculateCooling);
    daySelector.addEventListener('click', (e) => {
        if (e.target.classList.contains('day-btn')) {
            setActiveButton(daySelector, 'days', e.target.dataset.days);
            calculateAbsence();
        }
    });
    deviceSetupSelect.addEventListener('input', calculateStandby);
    shutdownBehaviorGroup.addEventListener('click', (e) => {
        if (e.target.classList.contains('behavior-btn')) {
            setActiveButton(shutdownBehaviorGroup, 'behavior', e.target.dataset.behavior);
            calculateStandby();
        }
    });

    // --- INITIALISIERUNG ---
    resetToDefaults();
});
