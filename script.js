document.addEventListener('DOMContentLoaded', () => {

    const config = {
        heatingCostPerKwh: 0.12, 
        electricityCostPerKwh: 0.35,
        heatingSavingPerDegree: 0.06, 
        workDaysPerYear: 220,
        co2FactorGas: 0.2,      // kg CO₂ pro kWh Erdgas
        co2FactorStrom: 0.35,   // kg CO₂ pro kWh dt. Strommix (vereinfacht)
        defaults: {
            officeSize: 25,
            heatingTemp: 20,
            coolingLoad: 3,
            coolingTemp: 24,
            absenceDays: 0,
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

    const resetBtn = document.getElementById('resetBtn');
    // Modul 1
    const officeSizeSelector = document.getElementById('office-size-selector');
    const heatingTempSlider = document.getElementById('heatingTemp');
    const heatingTempValue = document.getElementById('heatingTempValue');
    const heatingResultDiv = document.getElementById('heatingResult');
    // Modul 2
    const coolingLoadSlider = document.getElementById('coolingLoad');
    const coolingLoadValue = document.getElementById('coolingLoadValue');
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

    function calculateHeating() {
        const temp = parseFloat(heatingTempSlider.value);
        heatingTempValue.textContent = temp.toFixed(1);
        const size = parseInt(officeSizeSelector.querySelector('.active').dataset.size);
        const yearlyKwh = size * 70;

        if (temp === config.defaults.heatingTemp) {
            const baseCost = yearlyKwh * config.heatingCostPerKwh;
            const baseCo2 = yearlyKwh * config.co2FactorGas;
            heatingResultDiv.innerHTML = `<div class="text-neutral"><span class="main-value">Kosten: ${formatCurrency(baseCost)} / Jahr</span><span class="sub-value">CO₂: ${baseCo2.toFixed(0)} kg / Jahr</span></div>`;
            return;
        }

        const tempDifference = temp - config.defaults.heatingTemp;
        const kwhDifference = yearlyKwh * tempDifference * config.heatingSavingPerDegree;
        const costDifference = kwhDifference * config.heatingCostPerKwh;
        const co2Difference = kwhDifference * config.co2FactorGas;
        
        if (costDifference > 0) {
            heatingResultDiv.innerHTML = `<div class="text-danger"><span class="main-value">Mehrkosten: +${formatCurrency(costDifference)}</span><span class="sub-value">Mehr-CO₂: +${co2Difference.toFixed(0)} kg</span></div>`;
        } else {
            heatingResultDiv.innerHTML = `<div class="text-success"><span class="main-value">Ersparnis: ${formatCurrency(Math.abs(costDifference))}</span><span class="sub-value">CO₂-Ersparnis: ${Math.abs(co2Difference).toFixed(0)} kg</span></div>`;
        }
    }

    function calculateCooling() {
        const selectedTemp = parseInt(coolingTempSlider.value);
        const load = parseFloat(coolingLoadSlider.value);
        coolingTempValue.textContent = selectedTemp;
        coolingLoadValue.textContent = load.toFixed(1);

        const getYearlyKwh = (temp, currentLoad) => {
            const tempFactor = 1 + (config.defaults.coolingTemp - temp) * 0.1;
            const kwhPerHour = (currentLoad / 3.0) * tempFactor;
            return kwhPerHour * 10 * config.workDaysPerYear;
        };

        const kwhForSelectedTemp = getYearlyKwh(selectedTemp, load);
        const costForSelectedTemp = kwhForSelectedTemp * config.electricityCostPerKwh;
        const co2ForSelectedTemp = kwhForSelectedTemp * config.co2FactorStrom;

        if (selectedTemp === config.defaults.coolingTemp) {
            coolingResultDiv.innerHTML = `<div class="text-neutral"><span class="main-value">Kosten: ${formatCurrency(costForSelectedTemp)} / Jahr</span><span class="sub-value">CO₂: ${co2ForSelectedTemp.toFixed(0)} kg / Jahr</span></div>`;
            return;
        }

        const kwhForBaseTemp = getYearlyKwh(config.defaults.coolingTemp, load);
        
        if (selectedTemp < config.defaults.coolingTemp) {
            const kwhDiff = kwhForSelectedTemp - kwhForBaseTemp;
            coolingResultDiv.innerHTML = `<div class="text-danger"><span class="main-value">Kosten: ${formatCurrency(costForSelectedTemp)}</span><span class="sub-value">CO₂: ${co2ForSelectedTemp.toFixed(0)} kg</span></div><div class="text-success sub-value" style="margin-top: 0.5rem">Mögliche Ersparnis: ${formatCurrency(kwhDiff * config.electricityCostPerKwh)} (${(kwhDiff * config.co2FactorStrom).toFixed(0)} kg CO₂)</div>`;
        } else {
            const kwhDiff = kwhForBaseTemp - kwhForSelectedTemp;
            coolingResultDiv.innerHTML = `<div class="text-success"><span class="main-value">Kosten: ${formatCurrency(costForSelectedTemp)}</span><span class="sub-value">CO₂: ${co2ForSelectedTemp.toFixed(0)} kg</span></div><div class="text-success sub-value" style="margin-top: 0.5rem">Ihre Ersparnis: ${formatCurrency(kwhDiff * config.electricityCostPerKwh)} (${(kwhDiff * config.co2FactorStrom).toFixed(0)} kg CO₂)</div>`;
        }
    }

    function calculateAbsence() {
        const days = parseInt(daySelector.querySelector('.active').dataset.days);
        const size = parseInt(officeSizeSelector.querySelector('.active').dataset.size);

        if (days === 0) {
            absenceResultDiv.innerHTML = '<span class="text-neutral">Keine Abwesenheitstage ausgewählt.</span>';
            return;
        }

        const baseKwhPerDay = (size * 70) / config.workDaysPerYear;
        const kwhSavingPerDay = baseKwhPerDay * ((20 - 15) * config.heatingSavingPerDegree);
        const yearlyKwhSavings = kwhSavingPerDay * days * 52;
        
        const costSavings = yearlyKwhSavings * config.heatingCostPerKwh;
        const co2Savings = yearlyKwhSavings * config.co2FactorGas;

        absenceResultDiv.innerHTML = `<div class="text-success"><span class="main-value">Ersparnis: ${formatCurrency(costSavings)} / Jahr</span><span class="sub-value">CO₂-Reduktion: ${co2Savings.toFixed(0)} kg / Jahr</span></div>`;
    }

    function calculateStandby() {
        const device = deviceSetupSelect.value;
        const behavior = shutdownBehaviorGroup.querySelector('.active').dataset.behavior;
        
        const getYearlyKwh = (dev, beh) => {
            const power = devicePower[dev];
            const dailyHours = { work: 8, pause: 1, night: 15 };
            let wh = 0;
            if (beh === 'standby_only') wh = (dailyHours.work * power.on) + ((dailyHours.pause + dailyHours.night) * power.standby);
            else if (beh === 'shutdown_evening') wh = (dailyHours.work * power.on) + (dailyHours.pause * power.standby) + (dailyHours.night * power.off);
            else wh = (dailyHours.work * power.on) + ((dailyHours.pause + dailyHours.night) * power.off);
            return (wh / 1000) * config.workDaysPerYear;
        };

        const kwhForBehavior = getYearlyKwh(device, behavior);
        const costForBehavior = kwhForBehavior * config.electricityCostPerKwh;
        const co2ForBehavior = kwhForBehavior * config.co2FactorStrom;

        if (behavior === 'shutdown_breaks') {
            standbyResultDiv.innerHTML = `<div class="text-success"><span class="main-value">Kosten: ${formatCurrency(costForBehavior)}</span><span class="sub-value">CO₂: ${co2ForBehavior.toFixed(0)} kg</span></div><div class="sub-value text-success" style="margin-top:0.5rem">Vorbildlich! Geringster Verbrauch.</div>`;
            return;
        }

        const kwhForBestBehavior = getYearlyKwh(device, 'shutdown_breaks');
        const kwhSaving = kwhForBehavior - kwhForBestBehavior;
        const costSaving = kwhSaving * config.electricityCostPerKwh;
        const co2Saving = kwhSaving * config.co2FactorStrom;
        
        standbyResultDiv.innerHTML = `<div class="text-danger"><span class="main-value">Ihre Kosten: ${formatCurrency(costForBehavior)}</span><span class="sub-value">CO₂: ${co2ForBehavior.toFixed(0)} kg</span></div><div class="text-success sub-value" style="margin-top:0.5rem">Mögliche Ersparnis: ${formatCurrency(costSaving)} (${co2Saving.toFixed(0)} kg CO₂)</div>`;
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
    }
    
    function setActiveButton(groupElement, dataAttribute, value) {
        groupElement.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset[dataAttribute] == value) btn.classList.add('active');
        });
    }

    function resetToDefaults() {
        heatingTempSlider.value = config.defaults.heatingTemp;
        coolingLoadSlider.value = config.defaults.coolingLoad;
        coolingTempSlider.value = config.defaults.coolingTemp;
        deviceSetupSelect.value = config.defaults.device;
        
        setActiveButton(officeSizeSelector, 'size', config.defaults.officeSize);
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

    resetBtn.addEventListener('click', resetToDefaults);
    officeSizeSelector.addEventListener('click', (e) => {
        if (e.target.classList.contains('size-btn')) {
            setActiveButton(officeSizeSelector, 'size', e.target.dataset.size);
            calculateHeating();
            calculateAbsence();
        }
    });
    heatingTempSlider.addEventListener('input', calculateHeating);
    coolingLoadSlider.addEventListener('input', calculateCooling);
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

    resetToDefaults();
});
