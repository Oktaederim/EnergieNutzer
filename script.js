document.addEventListener('DOMContentLoaded', () => {

    // --- GRUNDEINSTELLUNGEN & KONSTANTEN ---
    const config = {
        heatingCostPerKwh: 0.12, // 12 ct/kWh für Heizen
        electricityCostPerKwh: 0.35, // 35 ct/kWh für Strom (Kühlung)
        heatingSavingPerDegree: 0.06, // 6% Einsparung pro Grad
        baseHeatingTemp: 20, // Referenztemperatur für Heizkosten
        baseCoolingTemp: 24, // Referenztemperatur für Kühlkosten
        coolingEER: 3.0, // Energy Efficiency Ratio für Klimaanlagen (realistischer Durchschnitt)
        workDaysPerYear: 220, // Arbeitstage pro Jahr
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
    const heatingOnBtn = document.getElementById('heatingOnBtn');
    const heatingOffBtn = document.getElementById('heatingOffBtn');
    const homeofficeResultDiv = document.getElementById('homeofficeResult');

    let isHeatingReduced = false;

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

    // ### KOMPLETT ÜBERARBEITETE FUNKTION FÜR DIE KÜHLUNG ###
    function calculateCooling() {
        const load = parseFloat(coolingLoadInput.value);
        const selectedTemp = parseInt(coolingTempSlider.value);

        if (isNaN(load) || load <= 0) {
            coolingResultDiv.innerHTML = '<span>Bitte gültige Wärmelast > 0 angeben.</span>';
            return;
        }

        // Funktion zur Berechnung der Jahreskosten für eine gegebene Temperatur
        const getYearlyCost = (temp) => {
            const tempFactor = 1 + (config.baseCoolingTemp - temp) * 0.1; // 10% mehr Energie pro Grad unter 24°C
            const kwhPerHour = (load / config.coolingEER) * tempFactor;
            const costPerDay = kwhPerHour * 10; // Annahme 10h Laufzeit/Tag
            return costPerDay * config.workDaysPerYear;
        };

        const costForSelectedTemp = getYearlyCost(selectedTemp);
        const costForBaseTemp = getYearlyCost(config.baseCoolingTemp);
        
        let displayHtml = `<span class="text-danger">Kosten: ${formatCurrency(costForSelectedTemp)} / Jahr</span>`;

        // Zeige die mögliche Ersparnis an, wenn kälter als die Basis-Temperatur gekühlt wird
        if (selectedTemp < config.baseCoolingTemp) {
            const potentialSaving = costForSelectedTemp - costForBaseTemp;
            if (potentialSaving > 0) {
                displayHtml += `<span class="small-info text-success">Mögliche Ersparnis: +${formatCurrency(potentialSaving)} / Jahr (bei ${config.baseCoolingTemp}°C)</span>`;
            }
        } 
        // Zeige die realisierte Ersparnis an, wenn wärmer als die Basis-Temperatur gekühlt wird
        else if (selectedTemp > config.baseCoolingTemp) {
             const realizedSaving = getYearlyCost(selectedTemp - 1) - costForSelectedTemp; // Ersparnis pro Grad
             displayHtml = `<span class="text-success">Kosten: ${formatCurrency(costForSelectedTemp)} / Jahr</span><span class="small-info text-success">Sie sparen bereits Geld!</span>`;
        }

        coolingTempValue.textContent = selectedTemp;
        coolingResultDiv.innerHTML = displayHtml;
    }

    function calculateHomeOffice() {
        const days = parseInt(homeofficeDaysSlider.value);
        const size = parseInt(officeSizeSelect.value);
        
        homeofficeDaysValue.textContent = days;

        if (days === 0) {
            homeofficeResultDiv.innerHTML = '<span>Keine Tage im Homeoffice ausgewählt.</span>';
            heatingOnBtn.classList.add('active');
            heatingOffBtn.classList.remove('active');
            isHeatingReduced = false;
            return;
        }

        const baseKwhPerDay = (size * 70) / config.workDaysPerYear;
        const costPerDayFull = baseKwhPerDay * config.heatingCostPerKwh;
        const costPerDayReduced = costPerDayFull * (1 - ((21 - 16) * config.heatingSavingPerDegree));
        const dailySavings = costPerDayFull - costPerDayReduced;
        const yearlySavings = dailySavings * days * 52;

        if (isHeatingReduced) {
            homeofficeResultDiv.innerHTML = `<span class="text-success">Ersparnis: +${formatCurrency(yearlySavings)} / Jahr</span>`;
        } else {
            homeofficeResultDiv.innerHTML = `<span>Mögliche Ersparnis:</span><span class="small-info text-danger">${formatCurrency(yearlySavings)} / Jahr (durch Absenkung)</span>`;
        }
    }

    // --- HILFSFUNKTIONEN ---
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
    if (heatingOnBtn) heatingOnBtn.addEventListener('click', () => {
        isHeatingReduced = false;
        heatingOnBtn.classList.add('active');
        heatingOffBtn.classList.remove('active');
        calculateHomeOffice();
    });
    if (heatingOffBtn) heatingOffBtn.addEventListener('click', () => {
        isHeatingReduced = true;
        heatingOffBtn.classList.add('active');
        heatingOnBtn.classList.remove('active');
        calculateHomeOffice();
    });

    // --- INITIALISIERUNG ---
    calculateHeating();
    calculateCooling();
    calculateHomeOffice();
});
