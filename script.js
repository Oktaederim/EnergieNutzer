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
            absenceSetbackTemp: 15,
            pc: 0,
            laptop: 0,
            monitor: 0,
            behavior: 'shutdown_evening'
        }
    };
    
    const devicePower = {
        pc: { on: 120, standby: 4 },
        laptop: { on: 45, standby: 2 },
        monitor: { on: 25, standby: 0.5 }
    };

    // --- DOM-ELEMENTE ---
    const resetBtn = document.getElementById('resetBtn');
    const heatingOfficeSizeSelector = document.getElementById('heating-office-size-selector');
    const heatingTempSlider = document.getElementById('heatingTemp');
    const heatingTempValue = document.getElementById('heatingTempValue');
    const heatingResultDiv = document.getElementById('heatingResult');
    const coolingLoadSlider = document.getElementById('coolingLoad');
    const coolingLoadValue = document.getElementById('coolingLoadValue');
    const coolingTempSlider = document.getElementById('coolingTemp');
    const coolingTempValue = document.getElementById('coolingTempValue');
    const coolingResultDiv = document.getElementById('coolingResult');
    const absenceOfficeSizeSelector = document.getElementById('absence-office-size-selector');
    const daySelector = document.getElementById('day-selector');
    const absenceSetbackTempSlider = document.getElementById('absenceSetbackTemp');
    const absenceSetbackTempValue = document.getElementById('absenceSetbackTempValue');
    const absenceResultDiv = document.getElementById('absenceResult');
    const pcQuantitySelector = document.getElementById('pc-quantity-selector');
    const laptopQuantitySelector = document.getElementById('laptop-quantity-selector');
    const monitorQuantitySelector = document.getElementById('monitor-quantity-selector');
    const shutdownBehaviorGroup = document.getElementById('shutdown-behavior');
    const standbyResultDiv = document.getElementById('standbyResult');

    // --- HILFSFUNKTIONEN ---
    function formatCurrency(value) {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
    }
    
    function setActiveButton(groupElement, dataAttribute, value) {
        if (!groupElement) return;
        groupElement.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset[dataAttribute] == value) btn.classList.add('active');
        });
    }

    // --- BERECHNUNGSFUNKTIONEN ---
    function calculateHeating() {
        const temp = parseFloat(heatingTempSlider.value);
        heatingTempValue.textContent = temp.toFixed(1);
        const size = parseInt(heatingOfficeSizeSelector.querySelector('.active').dataset.size);
        const yearlyKwh = size * 70;
        
        const kwhForSelectedTemp = yearlyKwh * (1 + (temp - config.defaults.heatingTemp) * config.heatingSavingPerDegree);
        const costForSelectedTemp = kwhForSelectedTemp * config.heatingCostPerKwh;
        const co2ForSelectedTemp = kwhForSelectedTemp * config.co2FactorGas;
        
        let diffHtml = '';
        if (Math.abs(temp - config.defaults.heatingTemp) > 0.1) {
            const kwhForBaseTemp = yearlyKwh;
            const kwhDifference = kwhForSelectedTemp - kwhForBaseTemp;
            const costDifference = kwhDifference * config.heatingCostPerKwh;
            const co2Difference = kwhDifference * config.co2FactorGas;
            const sign = costDifference > 0 ? '+' : '';
            const diffClass = costDifference > 0 ? 'text-danger' : 'text-success';
            diffHtml = `<span class="difference ${diffClass}">(${sign}${formatCurrency(costDifference)} / ${sign}${co2Difference.toFixed(0)} kg)</span>`;
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
            const kwhDifference = kwhForSelectedTemp - kwhForBaseTemp;
            const costDifference = kwhDifference * config.electricityCostPerKwh;
            const co2Difference = kwhDifference * config.co2FactorStrom;
            const sign = costDifference > 0 ? '+' : '';
            const diffClass = costDifference > 0 ? 'text-danger' : 'text-success';
            diffHtml = `<span class="difference ${diffClass}">(${sign}${formatCurrency(costDifference)} / ${sign}${co2Difference.toFixed(0)} kg)</span>`;
        }
        coolingResultDiv.innerHTML = `<div><span class="main-value">${formatCurrency(costForSelectedTemp)} ${diffHtml}</span><span class="sub-value">CO₂: ${co2ForSelectedTemp.toFixed(0)} kg / Jahr</span></div>`;
    }

    function calculateAbsence() {
        const days = parseInt(daySelector.querySelector('.active').dataset.days);
        const size = parseInt(absenceOfficeSizeSelector.querySelector('.active').dataset.size);
        const setbackTemp = parseInt(absenceSetbackTempSlider.value);
        absenceSetbackTempValue.textContent = setbackTemp;

        if (days === 0) {
            absenceResultDiv.innerHTML = '<span class="text-neutral">Keine Abwesenheitstage ausgewählt.</span>';
            return;
        }

        const tempDifference = 20 - setbackTemp;
        if (tempDifference <= 0) {
            absenceResultDiv.innerHTML = '<span class="text-neutral">Absenktemperatur muss unter 20°C sein.</span>';
            return;
        }

        const baseKwhPerDay = (size * 70) / config.workDaysPerYear;
        const kwhSavingPerDay = baseKwhPerDay * (tempDifference * config.heatingSavingPerDegree);
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
        
        if (quantities.pc === 0 && quantities.laptop === 0 && quantities.monitor === 0) {
            standbyResultDiv.innerHTML = '<span class="text-neutral">Keine Geräte ausgewählt.</span>';
            return;
        }

        const getYearlyKwh = (beh) => {
            let totalWh = 0;
            const dailyHours = { work: 9, night: 15 };
            for (const device in quantities) {
                const qty = quantities[device];
                if (qty > 0) {
                    const power = devicePower[device];
                    let wh = 0;
                    if (beh === 'standby_only') wh = (dailyHours.work * power.on) + (dailyHours.night * power.standby);
                    else wh = (dailyHours.work * power.on);
                    totalWh += wh * qty;
                }
            }
            return (totalWh / 1000) * config.workDaysPerYear;
        };

        const kwhForBehavior = getYearlyKwh(behavior);
        const costForBehavior = kwhForBehavior * config.electricityCostPerKwh;
        const co2ForBehavior = kwhForBehavior * config.co2FactorStrom;
        
        let savingsHtml = `<div class="text-success sub-value" style="margin-top:0.5rem">Vorbildlich! Geringster Verbrauch.</div>`;
        if (behavior === 'standby_only') {
            const kwhForBestBehavior = getYearlyKwh('shutdown_evening');
            const kwhSaving = kwhForBehavior - kwhForBestBehavior;
            const costSaving = kwhSaving * config.electricityCostPerKwh;
            const co2Saving = kwhSaving * config.co2FactorStrom;
            savingsHtml = `<div class="text-success sub-value" style="margin-top:0.5rem">Ersparnis durch Abschalten: ${formatCurrency(costSaving)} / ${co2Saving.toFixed(0)} kg CO₂</div>`;
        }
        
        standbyResultDiv.innerHTML = `<div><span class="main-value">${formatCurrency(costForBehavior)} / Jahr</span><span class="sub-value">CO₂: ${co2ForBehavior.toFixed(0)} kg / Jahr</span></div>${savingsHtml}`;
    }
    
    function syncOfficeSizeSelectors(newSize) {
        setActiveButton(heatingOfficeSizeSelector, 'size', newSize);
        setActiveButton(absenceOfficeSizeSelector, 'size', newSize);
    }
    
    function resetToDefaults() {
        syncOfficeSizeSelectors(config.defaults.officeSize);
        heatingTempSlider.value = config.defaults.heatingTemp;
        coolingLoadSlider.value = config.defaults.coolingLoad;
        coolingTempSlider.value = config.defaults.coolingTemp;
        
        setActiveButton(daySelector, 'days', config.defaults.absenceDays);
        absenceSetbackTempSlider.value = config.defaults.absenceSetbackTemp;
        
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
            syncOfficeSizeSelectors(e.target.dataset.size);
            calculateHeating();
            calculateAbsence();
        }
    });
    absenceOfficeSizeSelector.addEventListener('click', (e) => {
         if (e.target.classList.contains('size-btn')) {
            syncOfficeSizeSelectors(e.target.dataset.size);
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
    absenceSetbackTempSlider.addEventListener('input', calculateAbsence);
    
    [pcQuantitySelector, laptopQuantitySelector, monitorQuantitySelector].forEach(selector => {
        selector.addEventListener('click', (e) => {
            if (e.target.classList.contains('quantity-btn')) {
                setActiveButton(selector, 'quantity', e.target.dataset.quantity);
                calculateStandby();
            }
        });
    });
    
    shutdownBehaviorGroup.addEventListener('click', (e) => { 
        if (e.target.classList.contains('behavior-btn')) { 
            setActiveButton(shutdownBehaviorGroup, 'behavior', e.target.dataset.behavior); 
            calculateStandby(); 
        }
    });

    resetToDefaults();
});
