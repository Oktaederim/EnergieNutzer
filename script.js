document.addEventListener('DOMContentLoaded', () => {

    const config = {
        heatingCostPerKwh: 0.12, 
        electricityCostPerKwh: 0.35,
        heatingSavingPerDegree: 0.06, 
        workDaysPerYear: 220,
        co2FactorGas: 0.2,
        co2FactorStrom: 0.35,
        defaults: {
            officeSize: 25,
            heatingTemp: 20,
            coolingLoad: 3,
            coolingTemp: 24,
            absenceDays: 0,
            pc: 0,
            laptop: 1,
            monitor: 1,
            behavior: 'shutdown_evening'
        }
    };
    
    const devicePower = {
        pc: { on: 120, standby: 4, off: 1 },
        laptop: { on: 45, standby: 2, off: 0.5 },
        monitor: { on: 25, standby: 0.5, off: 0.3 }
    };

    const resetBtn = document.getElementById('resetBtn');
    // Modul 1
    const heatingOfficeSizeSelector = document.getElementById('heating-office-size-selector');
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
    const absenceOfficeSizeSelector = document.getElementById('absence-office-size-selector');
    const daySelector = document.getElementById('day-selector');
    const absenceResultDiv = document.getElementById('absenceResult');
    // Modul 4
    const pcQuantitySelector = document.getElementById('pc-quantity-selector');
    const laptopQuantitySelector = document.getElementById('laptop-quantity-selector');
    const monitorQuantitySelector = document.getElementById('monitor-quantity-selector');
    const shutdownBehaviorGroup = document.getElementById('shutdown-behavior');
    const standbyResultDiv = document.getElementById('standbyResult');

    function formatCurrency(value) {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
    }
    
    function setActiveButton(groupElement, dataAttribute, value) {
        groupElement.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset[dataAttribute] == value) btn.classList.add('active');
        });
    }

    function calculateHeating() {
        const temp = parseFloat(heatingTempSlider.value);
        heatingTempValue.textContent = temp.toFixed(1);
        const size = parseInt(heatingOfficeSizeSelector.querySelector('.active').dataset.size);
        const yearlyKwh = size * 70;
        
        const costForSelectedTemp = yearlyKwh * (1 + (temp - config.defaults.heatingTemp) * config.heatingSavingPerDegree) * config.heatingCostPerKwh;
        const co2ForSelectedTemp = yearlyKwh * (1 + (temp - config.defaults.heatingTemp) * config.heatingSavingPerDegree) * config.co2FactorGas;
        
        let diffHtml = '';
        if (temp !== config.defaults.heatingTemp) {
            const costForBaseTemp = yearlyKwh * config.heatingCostPerKwh;
            const costDifference = costForSelectedTemp - costForBaseTemp;

            if (costDifference > 0) {
                diffHtml = `<span class="difference text-danger">(+${formatCurrency(costDifference)})</span>`;
            } else {
                diffHtml = `<span class="difference text-success">(${formatCurrency(costDifference)})</span>`;
            }
        }
        
        heatingResultDiv.innerHTML = `<div><span class="main-value">${formatCurrency(costForSelectedTemp)} ${diffHtml}</span><span class="sub-value">CO₂: ${co2ForSelectedTemp.toFixed(0)} kg / Jahr</span></div>`;
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
        
        let diffHtml = '';
        if (selectedTemp !== config.defaults.coolingTemp) {
            const kwhForBaseTemp = getYearlyKwh(config.defaults.coolingTemp, load);
            const costForBaseTemp = kwhForBaseTemp * config.electricityCostPerKwh;
            const costDifference = costForSelectedTemp - costForBaseTemp;
            
            if (costDifference > 0) {
                diffHtml = `<span class="difference text-danger">(+${formatCurrency(costDifference)})</span>`;
            } else {
                diffHtml = `<span class="difference text-success">(${formatCurrency(costDifference)})</span>`;
            }
        }
        coolingResultDiv.innerHTML = `<div><span class="main-value">${formatCurrency(costForSelectedTemp)} ${diffHtml}</span><span class="sub-value">CO₂: ${co2ForSelectedTemp.toFixed(0)} kg / Jahr</span></div>`;
    }

    function calculateAbsence() {
        const days = parseInt(daySelector.querySelector('.active').dataset.days);
        const size = parseInt(absenceOfficeSizeSelector.querySelector('.active').dataset.size);

        if (days === 0) {
            absenceResultDiv.innerHTML = '<span class="text-neutral">Keine Abwesenheitstage ausgewählt.</span>';
            return;
        }

        const baseKwhPerDay = (size * 70) / config.workDaysPerYear;
        const kwhSavingPerDay = baseKwhPerDay * ((20 - 15) * config.heatingSavingPerDegree);
        const yearlyKwhSavings = kwhSavingPerDay * days * 52;
        
        const costSavings = yearlyKwhSavings * config.heatingCostPerKwh;
        const co2Savings = yearlyKwhSavings * config.co2FactorGas;

        absenceResultDiv.innerHTML = `<div class="text-success"><span class="main-value">${formatCurrency(costSavings)} / Jahr</span><span class="sub-value">CO₂-Reduktion: ${co2Savings.toFixed(0)} kg / Jahr</span></div>`;
    }

    function calculateStandby() {
        const quantities = {
            pc: parseInt(pcQuantitySelector.querySelector('.active').dataset.quantity),
            laptop: parseInt(laptopQuantitySelector.querySelector('.active').dataset.quantity),
            monitor: parseInt(monitorQuantitySelector.querySelector('.active').dataset.quantity)
        };
        const behavior = shutdownBehaviorGroup.querySelector('.active').dataset.behavior;
        
        const getYearlyKwh = (beh) => {
            let totalWh = 0;
            const dailyHours = { work: 8, pause: 1, night: 15 };
            for (const device in quantities) {
                const qty = quantities[device];
                if (qty > 0) {
                    const power = devicePower[device];
                    let wh = 0;
                    if (beh === 'standby_only') wh = (dailyHours.work * power.on) + ((dailyHours.pause + dailyHours.night) * power.standby);
                    else if (beh === 'shutdown_evening') wh = (dailyHours.work * power.on) + (dailyHours.pause * power.standby) + (dailyHours.night * power.off);
                    else wh = (dailyHours.work * power.on) + ((dailyHours.pause + dailyHours.night) * power.off);
                    totalWh += wh * qty;
                }
            }
            return (totalWh / 1000) * config.workDaysPerYear;
        };

        const kwhForBehavior = getYearlyKwh(behavior);
        const costForBehavior = kwhForBehavior * config.electricityCostPerKwh;
        const co2ForBehavior = kwhForBehavior * config.co2FactorStrom;
        
        let diffHtml = '';
        if (behavior !== 'shutdown_breaks') {
            const kwhForBestBehavior = getYearlyKwh('shutdown_breaks');
            const costSaving = (kwhForBehavior - kwhForBestBehavior) * config.electricityCostPerKwh;
            if (costSaving > 0) {
                 diffHtml = `<span class="difference text-success">(Sparpotenzial: ${formatCurrency(costSaving)})</span>`;
            }
        }
        
        standbyResultDiv.innerHTML = `<div><span class="main-value">${formatCurrency(costForBehavior)} ${diffHtml}</span><span class="sub-value">CO₂: ${co2ForBehavior.toFixed(0)} kg / Jahr</span></div>`;
    }
    
    function syncOfficeSizeSelectors(newSize) {
        setActiveButton(heatingOfficeSizeSelector, 'size', newSize);
        setActiveButton(absenceOfficeSizeSelector, 'size', newSize);
    }
    
    function resetToDefaults() {
        heatingTempSlider.value = config.defaults.heatingTemp;
        coolingLoadSlider.value = config.defaults.coolingLoad;
        coolingTempSlider.value = config.defaults.coolingTemp;
        
        syncOfficeSizeSelectors(config.defaults.officeSize);
        setActiveButton(daySelector, 'days', config.defaults.absenceDays);
        
        setActiveButton(pcQuantitySelector, 'quantity', config.defaults.pc);
        setActiveButton(laptopQuantitySelector, 'quantity', config.defaults.laptop);
        setActiveButton(monitorQuantitySelector, 'quantity', config.defaults.monitor);
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
    
    heatingOfficeSizeSelector.addEventListener('click', (e) => {
        if (e.target.classList.contains('size-btn')) {
            const newSize = e.target.dataset.size;
            syncOfficeSizeSelectors(newSize);
            calculateHeating();
            calculateAbsence();
        }
    });
    absenceOfficeSizeSelector.addEventListener('click', (e) => {
         if (e.target.classList.contains('size-btn')) {
            const newSize = e.target.dataset.size;
            syncOfficeSizeSelectors(newSize);
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
    
    pcQuantitySelector.addEventListener('click', (e) => { if(e.target.classList.contains('quantity-btn')) { setActiveButton(pcQuantitySelector, 'quantity', e.target.dataset.quantity); calculateStandby(); }});
    laptopQuantitySelector.addEventListener('click', (e) => { if(e.target.classList.contains('quantity-btn')) { setActiveButton(laptopQuantitySelector, 'quantity', e.target.dataset.quantity); calculateStandby(); }});
    monitorQuantitySelector.addEventListener('click', (e) => { if(e.target.classList.contains('quantity-btn')) { setActiveButton(monitorQuantitySelector, 'quantity', e.target.dataset.quantity); calculateStandby(); }});
    shutdownBehaviorGroup.addEventListener('click', (e) => { if (e.target.classList.contains('behavior-btn')) { setActiveButton(shutdownBehaviorGroup, 'behavior', e.target.dataset.behavior); calculateStandby(); }});

    resetToDefaults();
});
