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
        heatingHoursPerDay: 8,
        coolingHoursPerDay: 10,
    };

    // --- DOM-ELEMENTE AUSWÄHLEN ---
    // Modul 1: Heizen
    const heatingTempSlider = document.getElementById('heatingTemp');
    const heatingTempValue = document.getElementById('heatingTempValue');
    const officeSizeSelect = document.getElementById('officeSize');
    const heatingResultDiv = document.getElementById('heatingResult');

    // Modul 2: Kühlen
    const coolingLoadInput = document.getElementById('coolingLoad');
    const coolingTempSlider = document.getElementById('coolingTemp');
    const coolingTempValue = document.getElementById('coolingTempValue');
    const coolingResultDiv = document.getElementById('coolingResult');

    // Modul 3: Homeoffice
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

        // Annahme: Heizbedarf pro m² (sehr vereinfacht)
        // z.B. 70 kWh/m²/Jahr für ein durchschnittlich saniertes Bürogebäude
        const baseYearlyKwh = size * 70;
        const baseCost = baseYearlyKwh * config.heatingCostPerKwh;

        const tempDifference = temp - config.baseHeatingTemp;
        const costDifference = baseCost * tempDifference * config.heatingSavingPerDegree;

        heatingTempValue.textContent = temp.toFixed(1);

        if (costDifference > 0) {
            heatingResultDiv.innerHTML = `Mehrkosten: <span class="text-danger">+${formatCurrency(costDifference)} / Jahr</span>`;
        } else if (costDifference < 0) {
            heatingResultDiv.innerHTML = `Ersparnis: <span class="text-success">${formatCurrency(costDifference)} / Jahr</span>`;
        } else {
            heatingResultDiv.innerHTML = 'Keine Abweichung';
        }
    }

    function calculateCooling() {
        const load = parseFloat(coolingLoadInput.value);
        const temp = parseInt(coolingTempSlider.value);

        if (isNaN(load) || load <= 0) {
            coolingResultDiv.innerHTML = 'Bitte gültige Wärmelast > 0 angeben.';
            return;
        }

        // Vereinfachte Annahme: Je kälter, desto mehr Energie wird benötigt
        const tempFactor = 1 + (config.baseCoolingTemp - temp) * 0.1; // 10% mehr Energie pro Grad unter 24°C
        
        const kwhPerHour = (load / config.coolingEER) * tempFactor;
        const costPerHour = kwhPerHour * config.electricityCostPerKwh;
        const costPerDay = costPerHour * config.coolingHoursPerDay;
        const costPerYear = costPerDay * config.workDaysPerYear;

        coolingTempValue.textContent = temp;
        coolingResultDiv.innerHTML = `<span class="text-danger">${formatCurrency(costPerDay)} / Tag</span> <br> <small>(${formatCurrency(costPerYear)} / Jahr)</small>`;
    }

    function calculateHomeOffice() {
        const days = parseInt(homeofficeDaysSlider.value);
        const size = parseInt(officeSizeSelect.value); // Nutzen Bürogröße aus Modul 1
        
        homeofficeDaysValue.textContent = days;

        if (days === 0) {
            homeofficeResultDiv.innerHTML = 'Keine Tage im Homeoffice ausgewählt.';
            heatingOnBtn.classList.add('active');
            heatingOffBtn.classList.remove('active');
            isHeatingReduced = false;
            return;
        }

        const baseKwhPerDay = (size * 70) / config.workDaysPerYear;
        const costPerDayFull = baseKwhPerDay * config.heatingCostPerKwh;
        
        // Annahme: Absenkung auf 16°C spart ca. 30% gegenüber 21°C
        const costPerDayReduced = costPerDayFull * (1 - (5 * config.heatingSavingPerDegree));
        
        const yearlySavings = (costPerDayFull - costPerDayReduced) * days * (52); // 52 Wochen

        if (isHeatingReduced) {
            homeofficeResultDiv.innerHTML = `Ersparnis: <span class="text-success">+${formatCurrency(yearlySavings)} / Jahr</span>`;
        } else {
            homeofficeResultDiv.innerHTML = `Mögliche Ersparnis: <span class="text-danger">${formatCurrency(yearlySavings)} / Jahr</span> <br><small>(Klicken Sie auf "Heizung abgesenkt")</small>`;
        }
    }


    // --- HILFSFUNKTIONEN ---
    function formatCurrency(value) {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
    }

    // --- EVENT LISTENERS ---
    heatingTempSlider.addEventListener('input', calculateHeating);
    officeSizeSelect.addEventListener('input', () => {
        calculateHeating();
        calculateHomeOffice(); // Neuberechnung, da Größe sich ändert
    });

    coolingLoadInput.addEventListener('input', calculateCooling);
    coolingTempSlider.addEventListener('input', calculateCooling);

    homeofficeDaysSlider.addEventListener('input', calculateHomeOffice);
    heatingOnBtn.addEventListener('click', () => {
        isHeatingReduced = false;
        heatingOnBtn.classList.add('active');
        heatingOffBtn.classList.remove('active');
        calculateHomeOffice();
    });
    heatingOffBtn.addEventListener('click', () => {
        isHeatingReduced = true;
        heatingOffBtn.classList.add('active');
        heatingOnBtn.classList.remove('active');
        calculateHomeOffice();
    });

    // --- INITIALISIERUNG ---
    // Alle Berechnungen beim Laden der Seite einmal ausführen
    calculateHeating();
    calculateCooling();
    calculateHomeOffice();
});
