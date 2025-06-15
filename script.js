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

    // --- DOM-ELEMENTE AUSWÄHLEN ---
    const heatingTempSlider = document.getElementById('heatingTemp');
    const heatingTempValue = document.getElementById('heatingTempValue');
    const officeSizeSelect = document.getElementById('officeSize');
    const heatingResultDiv = document.getElementById('heatingResult');

    const coolingLoadInput = document.getElementById('coolingLoad');
    const coolingTempSlider = document.getElementById('coolingTemp');
    const coolingTempValue = document.getElementById('coolingTempValue');
    const coolingResultDiv = document.getElementById('coolingResult');

    const homeofficeDaysSlider = document.getElementById('homeofficeDays');
    const homeofficeDaysValue = document.getElementById('homeofficeDaysValue');
    const homeofficeResultDiv = document.getElementById('homeofficeResult');

    // --- BERECHNUNGSFUNKTIONEN ---

    function calculateHeating() {
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

    function calculateHomeOffice() {
        const days = parseInt(homeofficeDaysSlider.value);
        const size = parseInt(officeSizeSelect.value);
        homeofficeDaysValue.textContent = days;

        if (days === 0) {
            homeofficeResultDiv.innerHTML = '<span>Bitte Tage für Homeoffice auswählen.</span>';
            return;
        }

        const baseKwhPerDay = (size * 70) / config.workDaysPerYear;
        const costPerDayFull = baseKwhPerDay * config.heatingCostPerKwh;
        const costPerDayReduced = costPerDayFull * (1 - ((21 - 16) * config.heatingSavingPerDegree));

        const yearlyCostFull = costPerDayFull * days * 52;
        const yearlyCostReduced = costPerDayReduced * days * 52;
        const yearlySavings = yearlyCostFull - yearlyCostReduced;

        homeofficeResultDiv.innerHTML = `
            <span class="small-info">Heizung an (21°C): <b class="text-danger">${formatCurrency(yearlyCostFull)}</b></span>
            <span class="small-info">Abgesenkt (16°C): <b class="text-success">${formatCurrency(yearlyCostReduced)}</b></span>
            <hr class="separator">
            <b>Ihre Ersparnis: <span class="text-success">${formatCurrency(yearlySavings)} / Jahr</span></b>
        `;
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
    }

    // --- EVENT LISTENERS ---
    if (heatingTempSlider) heatingTempSlider.addEventListener('input', calculateHeating);
    if (officeSizeSelect) officeSizeSelect.addEventListener('input', () => {
        calculateHeating();
        calculateHomeOffice();
    });

    if (coolingLoadInput) coolingLoadInput.addEventListener('input', calculateCooling);
    if (coolingTempSlider) coolingTempSlider.addEventListener('input', calculateCooling);

    if (homeofficeDaysSlider) homeofficeDaysSlider.addEventListener('input', calculateHomeOffice);

    // --- INITIALISIERUNG ---
    calculateHeating();
    calculateCooling();
    calculateHomeOffice();
});
