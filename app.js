const tariffs = [
  {
    id: "flat",
    name: "Flat $/kWh",
    description: "18.0¢/kWh all day",
    rm: "stable revenue, weak scarcity signal",
    fixedRate: 0.18,
    demandCharge: 0,
  },
  {
    id: "tou",
    name: "Time of use",
    description: "Revenue-neutral off / shoulder / peak prices",
    rm: "behavior signal with arbitrage exposure",
    offPeakRate: 0.095,
    shoulderMultiplier: 1.55,
    demandCharge: 0,
  },
  {
    id: "demand",
    name: "Demand charge",
    description: "Revenue-neutral energy plus $20/kW-month",
    rm: "capacity-cost signal, confusing for passive homes",
    fixedRate: 0.13,
    demandCharge: 20,
  },
];

const base = {
  monthlyBill: 164,
  peakKw: 3.107,
  monthlyKwh: 910,
};
const populationChartRevenueScaleMax = 190;

const endUseProfile = [
  { hour: 0, hvac: 1.297, waterHeating: 0.0384, lighting: 0.0467, appliances: 0.1133, plugOther: 0.2329, total: 1.7283 },
  { hour: 1, hvac: 1.1757, waterHeating: 0.0226, lighting: 0.042, appliances: 0.1017, plugOther: 0.2323, total: 1.5743 },
  { hour: 2, hvac: 1.0761, waterHeating: 0.0145, lighting: 0.0411, appliances: 0.1001, plugOther: 0.2303, total: 1.4622 },
  { hour: 3, hvac: 0.988, waterHeating: 0.0121, lighting: 0.0408, appliances: 0.0953, plugOther: 0.2322, total: 1.3685 },
  { hour: 4, hvac: 0.9054, waterHeating: 0.0126, lighting: 0.0401, appliances: 0.0933, plugOther: 0.2408, total: 1.2922 },
  { hour: 5, hvac: 0.8509, waterHeating: 0.0204, lighting: 0.0444, appliances: 0.1, plugOther: 0.2513, total: 1.2672 },
  { hour: 6, hvac: 0.9383, waterHeating: 0.0357, lighting: 0.0673, appliances: 0.1251, plugOther: 0.2536, total: 1.4217 },
  { hour: 7, hvac: 1.1322, waterHeating: 0.0519, lighting: 0.1062, appliances: 0.1662, plugOther: 0.2554, total: 1.7159 },
  { hour: 8, hvac: 1.3845, waterHeating: 0.0709, lighting: 0.1341, appliances: 0.1973, plugOther: 0.2753, total: 2.0688 },
  { hour: 9, hvac: 1.6339, waterHeating: 0.0797, lighting: 0.1423, appliances: 0.2142, plugOther: 0.2877, total: 2.3671 },
  { hour: 10, hvac: 1.8149, waterHeating: 0.0842, lighting: 0.1416, appliances: 0.2096, plugOther: 0.2874, total: 2.5489 },
  { hour: 11, hvac: 1.9298, waterHeating: 0.0836, lighting: 0.1328, appliances: 0.2071, plugOther: 0.2861, total: 2.6516 },
  { hour: 12, hvac: 2.0437, waterHeating: 0.0802, lighting: 0.1269, appliances: 0.2121, plugOther: 0.2871, total: 2.7628 },
  { hour: 13, hvac: 2.1487, waterHeating: 0.0777, lighting: 0.1252, appliances: 0.2034, plugOther: 0.2746, total: 2.842 },
  { hour: 14, hvac: 2.2338, waterHeating: 0.0709, lighting: 0.1276, appliances: 0.1936, plugOther: 0.2706, total: 2.9081 },
  { hour: 15, hvac: 2.2866, waterHeating: 0.0669, lighting: 0.1325, appliances: 0.198, plugOther: 0.2877, total: 2.9818 },
  { hour: 16, hvac: 2.3134, waterHeating: 0.0656, lighting: 0.1431, appliances: 0.2154, plugOther: 0.3182, total: 3.0635 },
  { hour: 17, hvac: 2.3005, waterHeating: 0.0739, lighting: 0.1591, appliances: 0.2348, plugOther: 0.3336, total: 3.107 },
  { hour: 18, hvac: 2.232, waterHeating: 0.0787, lighting: 0.1854, appliances: 0.2389, plugOther: 0.3201, total: 3.0578 },
  { hour: 19, hvac: 2.1078, waterHeating: 0.0786, lighting: 0.2329, appliances: 0.2127, plugOther: 0.3096, total: 2.9427 },
  { hour: 20, hvac: 1.9182, waterHeating: 0.0792, lighting: 0.2977, appliances: 0.2053, plugOther: 0.2944, total: 2.7948 },
  { hour: 21, hvac: 1.7483, waterHeating: 0.0823, lighting: 0.3336, appliances: 0.1981, plugOther: 0.2796, total: 2.642 },
  { hour: 22, hvac: 1.5828, waterHeating: 0.0794, lighting: 0.2037, appliances: 0.1704, plugOther: 0.2471, total: 2.2835 },
  { hour: 23, hvac: 1.4103, waterHeating: 0.0639, lighting: 0.0802, appliances: 0.1307, plugOther: 0.2351, total: 1.9202 },
];

const state = {
  mode: "controlled",
  focusTariff: "tou",
  spread: 2,
  battery: 10,
  thermostat: 3,
  demandCharge: 20,
  selectedCaseId: "elastic-both",
  population: [
    { id: "passive-none", homes: 20 },
    { id: "passive-thermostat", homes: 10 },
    { id: "passive-battery", homes: 5 },
    { id: "passive-both", homes: 10 },
    { id: "elastic-none", homes: 15 },
    { id: "elastic-thermostat", homes: 15 },
    { id: "elastic-battery", homes: 5 },
    { id: "elastic-both", homes: 20 },
  ],
};

const behaviorDefs = {
  passive: {
    name: "Passive / inelastic",
    shortName: "Passive",
    description: "Non-controlled load does not shift",
  },
  elastic: {
    name: "Somewhat elastic",
    shortName: "Elastic",
    description: "Non-controlled load shifts modestly",
  },
};

const deviceDefs = {
  none: {
    name: "No energy devices",
    shortName: "None",
    hasThermostat: false,
    hasBattery: false,
    color: "#64717b",
  },
  thermostat: {
    name: "Just thermostat",
    shortName: "Thermostat",
    hasThermostat: true,
    hasBattery: false,
    color: "#b36b00",
  },
  battery: {
    name: "Just battery",
    shortName: "Battery",
    hasThermostat: false,
    hasBattery: true,
    color: "#087f8c",
  },
  both: {
    name: "Thermostat + battery",
    shortName: "Both",
    hasThermostat: true,
    hasBattery: true,
    color: "#2e7d32",
  },
};

const populationCases = [
  { id: "passive-none", behavior: "passive", device: "none" },
  { id: "passive-thermostat", behavior: "passive", device: "thermostat" },
  { id: "passive-battery", behavior: "passive", device: "battery" },
  { id: "passive-both", behavior: "passive", device: "both" },
  { id: "elastic-none", behavior: "elastic", device: "none" },
  { id: "elastic-thermostat", behavior: "elastic", device: "thermostat" },
  { id: "elastic-battery", behavior: "elastic", device: "battery" },
  { id: "elastic-both", behavior: "elastic", device: "both" },
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const money1 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const money2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pct = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

const num = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function populationCaseById(id) {
  return populationCases.find((item) => item.id === id) || populationCases[0];
}

function populationHomes(id, overrides = state) {
  return Number(overrides.population.find((item) => item.id === id)?.homes ?? 0);
}

function populationTotal(overrides = state) {
  return overrides.population.reduce((sum, item) => sum + Number(item.homes || 0), 0);
}

function normalizedHomes(id, overrides = state) {
  const total = populationTotal(overrides) || 100;
  return (populationHomes(id, overrides) / total) * portfolioSize;
}

function caseLabel(caseDef) {
  return `${behaviorDefs[caseDef.behavior].shortName} / ${deviceDefs[caseDef.device].shortName}`;
}

function signedMoney(value) {
  if (Math.abs(value) < 0.5) return money.format(0);
  const formatted = money.format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function compactMoney(value) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1000000) {
    const scaled = abs / 1000000;
    const digits = scaled >= 10 ? 0 : 1;
    return `${sign}$${scaled.toFixed(digits)}M`;
  }
  if (abs >= 1000) {
    const scaled = abs / 1000;
    const digits = scaled >= 10 ? 0 : 1;
    return `${sign}$${scaled.toFixed(digits)}k`;
  }
  return money.format(value);
}

function compactPortfolioMoney(value) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(2)}M`;
  if (abs >= 1000) return `${sign}$${Math.round(abs / 1000)}k`;
  return money.format(value);
}

function signedCompactMoney(value) {
  if (Math.abs(value) < 1) return "$0";
  return `${value > 0 ? "+" : "-"}${compactMoney(Math.abs(value))}`;
}

function compactKwh(value) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}${Math.round(abs / 1000)}k`;
  return num.format(value);
}

const dailyBaselineKwh = endUseProfile.reduce(
  (sum, row) => sum + row.total,
  0,
);
const monthlyScale = base.monthlyKwh / dailyBaselineKwh;
const portfolioSize = 10000;
const capacityCostPerKwMonth = 20;
const optimizationConfig = {
  revenueRetentionMin: 0.95,
  filingNeutralTolerance: 0.005,
  maxPeakKw: 30000,
  touMin: 1,
  touMax: 5,
  touStep: 0.1,
  demandMin: 0,
  demandMax: 30,
  demandStep: 1,
};
const sourceDemandProfiles = Array.isArray(globalThis.buildingDemandProfiles)
  ? globalThis.buildingDemandProfiles
  : [];
const demandProfileEnsemble = (
  sourceDemandProfiles.length
    ? sourceDemandProfiles
    : [
        {
          id: "nlr-base",
          loads: endUseProfile.map((row) => row.total),
        },
      ]
).map((profile) => {
  const dailyKwh = profile.loads.reduce((sum, value) => sum + value, 0);
  const scale = dailyKwh > 0 ? dailyBaselineKwh / dailyKwh : 1;
  return {
    id: profile.id,
    loads: profile.loads.map((value) => value * scale),
  };
});
const filingBaselineHourlyLoads = endUseProfile.map((_, hour) =>
  demandProfileEnsemble.reduce(
    (sum, profile) => sum + (profile.loads[hour] ?? 0),
    0,
  ) / demandProfileEnsemble.length,
);
const filingBaselinePeakKw =
  demandProfileEnsemble.reduce(
    (sum, profile) => sum + Math.max(...profile.loads),
    0,
  ) / demandProfileEnsemble.length;
const averageDemandProfileFactors = endUseProfile.map((row, hour) =>
  row.total > 0 ? filingBaselineHourlyLoads[hour] / row.total : 1,
);

function tariffById(id) {
  return tariffs.find((tariff) => tariff.id === id) || tariffs[0];
}

function minimumTouPeakSpread() {
  return 1;
}

function effectiveTouSpread(overrides = state) {
  return Math.max(
    Number(overrides.spread ?? minimumTouPeakSpread()),
    minimumTouPeakSpread(),
  );
}

function touShoulderMultiplier(tariff, overrides = state) {
  const spread = effectiveTouSpread(overrides);
  const defaultShoulderRatio = tariff.shoulderMultiplier;
  const interpolatedRatio =
    1 + (spread - 1) * (defaultShoulderRatio - 1);
  return Math.min(spread, interpolatedRatio);
}

function touSignalStrength(overrides = state) {
  return clamp(effectiveTouSpread(overrides) - 1, 0, 1);
}

function touHighSpreadEffect(overrides = state) {
  return clamp((effectiveTouSpread(overrides) - 2) / 3, 0, 1);
}

function tariffResponseStrength(tariffId, overrides = state) {
  if (tariffId === "tou") return touSignalStrength(overrides);
  if (tariffId === "demand") {
    return clamp(
      calibratedTariff("demand", overrides).demandCharge / 20,
      0,
      1,
    );
  }
  return 0;
}

function smoothResponseStrength(value) {
  const bounded = clamp(value, 0, 1);
  return bounded * bounded * (3 - 2 * bounded);
}

function cents(value) {
  return `${(value * 100).toFixed(1)}¢`;
}

function baselinePeakKw() {
  return filingBaselinePeakKw;
}

function targetFlatRevenue() {
  return base.monthlyKwh * tariffById("flat").fixedRate;
}

function rawTouRateForHour(hour, tariff, overrides = state) {
  if (hour >= 16 && hour <= 21) {
    return tariff.offPeakRate * effectiveTouSpread(overrides);
  }
  if (hour >= 6 && hour <= 15) {
    return tariff.offPeakRate * touShoulderMultiplier(tariff, overrides);
  }
  return tariff.offPeakRate;
}

function calibratedTariff(tariffId, overrides = state) {
  const tariff = tariffById(tariffId);
  const targetRevenue = targetFlatRevenue();

  if (tariff.id === "tou") {
    const rawRevenue = filingBaselineHourlyLoads.reduce(
      (sum, load, hour) =>
        sum +
        load * monthlyScale * rawTouRateForHour(hour, tariff, overrides),
      0,
    );
    const factor = rawRevenue > 0 ? targetRevenue / rawRevenue : 1;
    return {
      ...tariff,
      offPeakRate: tariff.offPeakRate * factor,
      shoulderRate:
        tariff.offPeakRate * touShoulderMultiplier(tariff, overrides) * factor,
      peakRate: tariff.offPeakRate * effectiveTouSpread(overrides) * factor,
      calibrationFactor: factor,
    };
  }

  if (tariff.id === "demand") {
    const demandCharge = Number(overrides.demandCharge ?? tariff.demandCharge);
    const demandRevenue = demandCharge * baselinePeakKw();
    const fixedRate = Math.max(
      0.02,
      (targetRevenue - demandRevenue) / base.monthlyKwh,
    );
    return {
      ...tariff,
      demandCharge,
      fixedRate,
      calibrationFactor:
        tariff.fixedRate > 0 ? fixedRate / tariff.fixedRate : 1,
    };
  }

  return { ...tariff, calibrationFactor: 1 };
}

function rateForTariff(tariffId, hour, overrides = state) {
  const tariff = calibratedTariff(tariffId, overrides);
  if (tariff.id === "tou") {
    if (hour >= 16 && hour <= 21) {
      return tariff.peakRate;
    }
    if (hour >= 6 && hour <= 15) {
      return tariff.shoulderRate;
    }
    return tariff.offPeakRate;
  }
  return tariff.fixedRate;
}

function tariffDesignText(tariffId, overrides = state) {
  const tariff = calibratedTariff(tariffId, overrides);
  if (tariff.id === "tou") {
    return `${cents(tariff.offPeakRate)} off, ${cents(
      tariff.shoulderRate,
    )} shoulder, ${cents(tariff.peakRate)} peak`;
  }
  if (tariff.id === "demand") {
    return `${cents(tariff.fixedRate)} + $${tariff.demandCharge}/kW-mo`;
  }
  return `${cents(tariff.fixedRate)} all hours`;
}

function demandPeakHours(count = 3) {
  return [...endUseProfile]
    .sort((a, b) => b.total - a.total)
    .slice(0, count)
    .map((row) => row.hour)
    .sort((a, b) => a - b);
}

function scarcityHoursForTariff(tariffId) {
  if (tariffId === "demand") return new Set(demandPeakHours(4));
  if (tariffId === "tou") return new Set([16, 17, 18, 19, 20, 21]);
  return new Set();
}

function preResponseWeightsForTariff(tariffId) {
  if (tariffId === "demand") {
    return new Map([
      [12, 0.12],
      [13, 0.22],
      [14, 0.3],
      [15, 0.36],
    ]);
  }
  return new Map([
    [0, 0.12],
    [1, 0.11],
    [2, 0.09],
    [3, 0.07],
    [4, 0.07],
    [5, 0.1],
    [22, 0.24],
    [23, 0.2],
  ]);
}

function wholesaleCostForHour(hour) {
  if (hour >= 10 && hour <= 15) return 0.025;
  if (hour >= 16 && hour <= 21) return 0.16;
  if (hour >= 6 && hour <= 9) return 0.075;
  return 0.045;
}

function baseRows() {
  return endUseProfile.map((row) => ({
    hour: row.hour,
    homeLoad: row.total,
    gridImport: row.total,
    action: "inelastic",
  }));
}

function elasticOnlyResponse(overrides = state, tariffId = state.focusTariff) {
  const elasticFlex = clamp(Number(overrides.elasticShare ?? 35) / 100, 0, 1);
  const touEffect = tariffId === "tou" ? touSignalStrength(overrides) : 0;
  const spreadEffect = tariffId === "tou" ? touHighSpreadEffect(overrides) : 0;
  const demandEffect = clamp(
    calibratedTariff("demand", overrides).demandCharge / 20,
    0,
    1,
  );
  const peakHours = scarcityHoursForTariff(tariffId);
  const receivingWeights = preResponseWeightsForTariff(tariffId);
  const reductionShare =
    tariffId === "demand"
      ? 0.13 * demandEffect
      : (0.34 + 0.16 * spreadEffect) * touEffect;
  const reboundShare = tariffId === "tou" ? 1.04 : 0.92;
  const rows = baseRows();
  let shifted = 0;
  rows.forEach((row, index) => {
    if (!peakHours.has(row.hour)) return;
    const source = endUseProfile[index];
    const nonControlled =
      source.waterHeating +
      source.lighting +
      source.appliances +
      source.plugOther;
    const reduction = nonControlled * elasticFlex * reductionShare;
    row.homeLoad -= reduction;
    row.gridImport -= reduction;
    row.action =
      tariffId === "demand"
        ? "elastic peak clipping"
        : "elastic peak reduction";
    shifted += reduction;
  });
  rows.forEach((row) => {
    const weight = receivingWeights.get(row.hour);
    if (!weight) return;
    const addition = shifted * weight * reboundShare;
    row.homeLoad += addition;
    row.gridImport += addition;
    row.action = "elastic shift";
  });
  return { rows, shiftedKwh: shifted };
}

function priceSignalForHour(hour, overrides = state, tariffId = state.focusTariff) {
  return rateForTariff(tariffId, hour, overrides);
}

function hvacResponse(overrides = state, tariffId = state.focusTariff) {
  const adjustment = Number(overrides.thermostat ?? 3);
  const touEffect = tariffId === "tou" ? touSignalStrength(overrides) : 0;
  const spreadEffect = tariffId === "tou" ? touHighSpreadEffect(overrides) : 0;
  const thermostatFlex = clamp(adjustment / 6, 0, 1);
  const peakHours = scarcityHoursForTariff(tariffId);
  const preCoolWeights =
    tariffId === "demand"
      ? new Map([
          [12, 0.12],
          [13, 0.22],
          [14, 0.3],
          [15, 0.36],
        ])
      : new Map([
          [10, 0.2],
          [11, 0.2],
          [12, 0.18],
          [13, 0.16],
          [14, 0.14],
          [15, 0.12],
        ]);
  const demandEffect = clamp(
    calibratedTariff("demand", overrides).demandCharge / 22,
    0,
    1.15,
  );
  const peakReductionShare = clamp(
    tariffId === "flat"
      ? 0
      : thermostatFlex *
          (tariffId === "demand"
            ? 0.24 * demandEffect
            : (0.18 + 0.12 * spreadEffect) * touEffect),
    0,
    0.4,
  );

  let removedKwh = 0;
  const rows = endUseProfile.map((row) => {
    const price = priceSignalForHour(row.hour, overrides, tariffId);
    let optimizedHvac = row.hvac;
    let action = "baseline";
    if (peakHours.has(row.hour)) {
      const reduction = row.hvac * peakReductionShare;
      optimizedHvac -= reduction;
      removedKwh += reduction;
      action =
        tariffId === "demand" ? "highest-hour HVAC clip" : "peak setback";
    }
    return {
      hour: row.hour,
      price,
      baselineHvac: row.hvac,
      optimizedHvac,
      baselineTotal: row.total,
      optimizedTotal: row.total - row.hvac + optimizedHvac,
      action,
    };
  });

  const recapturedKwh =
    tariffId === "demand"
      ? removedKwh * 0.74
      : removedKwh * (1.08 + 0.14 * spreadEffect);
  const originalPeak = Math.max(...rows.map((row) => row.baselineTotal));
  let actualRecapturedKwh = 0;
  rows.forEach((row) => {
    const weight = preCoolWeights.get(row.hour);
    if (!weight) return;
    const added = recapturedKwh * weight;
    const headroomLimit = tariffId === "demand" ? 0.9 : 1;
    const headroom = Math.max(0, originalPeak * headroomLimit - row.optimizedTotal);
    const boundedAdded = Math.min(added, headroom);
    row.optimizedHvac += boundedAdded;
    row.optimizedTotal += boundedAdded;
    actualRecapturedKwh += boundedAdded;
    row.action = "pre-cool";
  });

  const baselineCost = rows.reduce(
    (sum, row) => sum + row.baselineHvac * row.price,
    0,
  );
  const optimizedCost = rows.reduce(
    (sum, row) => sum + row.optimizedHvac * row.price,
    0,
  );
  const baselineEnergy = rows.reduce(
    (sum, row) => sum + row.baselineHvac,
    0,
  );
  const optimizedEnergy = rows.reduce(
    (sum, row) => sum + row.optimizedHvac,
    0,
  );
  const baselinePeak = Math.max(...rows.map((row) => row.baselineTotal));
  const optimizedPeak = Math.max(...rows.map((row) => row.optimizedTotal));
  const totalBaselineCost = rows.reduce(
    (sum, row) => sum + row.baselineTotal * row.price,
    0,
  );
  const totalOptimizedCost = rows.reduce(
    (sum, row) => sum + row.optimizedTotal * row.price,
    0,
  );

  return {
    rows,
    removedKwh,
    recapturedKwh: actualRecapturedKwh,
    costSavings: baselineCost - optimizedCost,
    costSavingsShare:
      baselineCost > 0 ? (baselineCost - optimizedCost) / baselineCost : 0,
    totalCostSavingsShare:
      totalBaselineCost > 0
        ? (totalBaselineCost - totalOptimizedCost) / totalBaselineCost
        : 0,
    energyReduction: baselineEnergy - optimizedEnergy,
    energyReductionShare:
      baselineEnergy > 0
        ? (baselineEnergy - optimizedEnergy) / baselineEnergy
        : 0,
    peakReduction:
      baselinePeak > 0 ? (baselinePeak - optimizedPeak) / baselinePeak : 0,
  };
}

function batteryDispatchForLoad(loadRows, overrides = state, tariffId = state.focusTariff) {
  const capacity = Number(overrides.battery);
  const responseStrength = tariffResponseStrength(tariffId, overrides);
  const emptyRows = loadRows.map((row) => ({
    ...row,
    chargeKw: 0,
    dischargeKw: 0,
    socKwh: 0,
    socPct: 0,
    action: row.action || "no battery",
  }));

  if (
    capacity <= 0 ||
    tariffId === "flat" ||
    responseStrength <= 0
  ) {
    return {
      rows: emptyRows,
      costSavings: 0,
      costSavingsShare: 0,
      peakReduction: 0,
      peakWindowReduction: 0,
      chargedKwh: 0,
      dischargedKwh: 0,
      offPeakReboundKwh: 0,
    };
  }

  const efficiency = 0.9;
  const minSoc = capacity * 0.1;
  const maxSoc = capacity * 0.95;
  let soc = capacity * 0.35;
  const dispatchStrength = smoothResponseStrength(responseStrength);
  const powerLimit = clamp(capacity / 2.5, 1, 5) * dispatchStrength;
  const baselinePeak = Math.max(...loadRows.map((row) => row.gridImport));
  const chargeCeiling = baselinePeak * (1 - 0.18 * dispatchStrength);
  const targetReduction = tariffId === "demand" ? 0.5 : 0.42;
  const dischargeTarget = baselinePeak * (1 - targetReduction * dispatchStrength);
  const peakHours = scarcityHoursForTariff(tariffId);
  const chargeHours =
    tariffId === "demand"
      ? new Set([0, 1, 2, 3, 4, 5, 10, 11, 12, 13, 14])
      : new Set([0, 1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 15]);
  const maxPrice = Math.max(...loadRows.map((row) => row.price));
  let chargedKwh = 0;
  let dischargedKwh = 0;
  let offPeakReboundKwh = 0;

  const rows = loadRows.map((row) => {
    let gridImport = row.gridImport;
    let chargeKw = 0;
    let dischargeKw = 0;
    let action = row.action || "hold";

    if (chargeHours.has(row.hour) && soc < maxSoc) {
      const headroom = Math.max(0, chargeCeiling - gridImport);
      chargeKw = Math.min(powerLimit, headroom, (maxSoc - soc) / efficiency);
      if (chargeKw > 0) {
        soc += chargeKw * efficiency;
        gridImport += chargeKw;
        chargedKwh += chargeKw;
        offPeakReboundKwh += chargeKw;
        action = action === "baseline" ? "battery charge" : `${action} + charge`;
      }
    }

    if (peakHours.has(row.hour) && soc > minSoc) {
      const targetDriven = Math.max(0, gridImport - dischargeTarget);
      const priceDriven =
        tariffId !== "demand" && row.price === maxPrice
          ? gridImport * 0.28 * dispatchStrength
          : 0;
      dischargeKw = Math.min(
        powerLimit,
        soc - minSoc,
        gridImport,
        Math.max(targetDriven, priceDriven),
      );
      if (dischargeKw > 0) {
        soc -= dischargeKw;
        gridImport -= dischargeKw;
        dischargedKwh += dischargeKw;
        action = action === "baseline" ? "battery discharge" : `${action} + discharge`;
      }
    }

    return {
      ...row,
      gridImport,
      chargeKw,
      dischargeKw,
      socKwh: soc,
      socPct: soc / capacity,
      action,
    };
  });

  const baselineCost = loadRows.reduce(
    (sum, row) => sum + row.gridImport * row.price,
    0,
  );
  const optimizedCost = rows.reduce(
    (sum, row) => sum + row.gridImport * row.price,
    0,
  );
  const optimizedPeak = Math.max(...rows.map((row) => row.gridImport));
  const peakWindowRows = rows.filter((row) => peakHours.has(row.hour));
  const baselinePeakWindow = Math.max(
    ...peakWindowRows.map((row) => row.homeLoad),
  );
  const optimizedPeakWindow = Math.max(
    ...peakWindowRows.map((row) => row.gridImport),
  );
  const baselineBill = economicsForRows(loadRows, tariffId, overrides).revenue;
  const optimizedBill = economicsForRows(rows, tariffId, overrides).revenue;

  if (optimizedBill >= baselineBill - 0.01) {
    return {
      rows: emptyRows,
      costSavings: 0,
      costSavingsShare: 0,
      peakReduction: 0,
      peakWindowReduction: 0,
      chargedKwh: 0,
      dischargedKwh: 0,
      offPeakReboundKwh: 0,
    };
  }

  return {
    rows,
    costSavings: baselineCost - optimizedCost,
    costSavingsShare:
      baselineCost > 0 ? (baselineCost - optimizedCost) / baselineCost : 0,
    peakReduction:
      baselinePeak > 0 ? (baselinePeak - optimizedPeak) / baselinePeak : 0,
    peakWindowReduction:
      baselinePeakWindow > 0
        ? (baselinePeakWindow - optimizedPeakWindow) / baselinePeakWindow
        : 0,
    chargedKwh,
    dischargedKwh,
    offPeakReboundKwh,
  };
}

function batteryResponse(overrides = state, tariffId = state.focusTariff) {
  const thermal = hvacResponse(overrides, tariffId);
  const loadRows = thermal.rows.map((row) => ({
    hour: row.hour,
    price: row.price,
    baselineLoad: row.baselineTotal,
    homeLoad: row.optimizedTotal,
    gridImport: row.optimizedTotal,
    action: row.action === "baseline" ? "no battery" : row.action,
  }));

  return batteryDispatchForLoad(loadRows, overrides, tariffId);
}

function appendAction(action, addition) {
  if (!action || action === "baseline" || action === "inelastic") {
    return addition;
  }
  if (action.includes(addition)) return action;
  return `${action} + ${addition}`;
}

function coordinatedThermostatBatteryRows(
  rows,
  overrides = state,
  tariffId = state.focusTariff,
  behavior = "passive",
) {
  const responseStrength = smoothResponseStrength(
    tariffResponseStrength(tariffId, overrides),
  );
  if (responseStrength <= 0 || tariffId === "flat") return rows;

  const batteryEffect = clamp(Number(overrides.battery ?? 0) / 20, 0, 1);
  const thermostatFlex = clamp(Number(overrides.thermostat ?? 3) / 6, 0, 1);
  const elasticCoordination =
    behavior === "elastic" ? (tariffId === "tou" ? 0.1 : 0.05) : 0;
  const coordinationShare = clamp(
    responseStrength *
      (0.08 +
        0.08 * batteryEffect +
        0.05 * thermostatFlex +
        elasticCoordination),
    0,
    0.24,
  );
  const coordinatedRows = rows.map((row) => ({ ...row }));
  let rechargeNeed = 0;

  if (tariffId === "tou") {
    const peakHours = scarcityHoursForTariff(tariffId);
    coordinatedRows.forEach((row) => {
      if (!peakHours.has(row.hour)) return;
      const reduction = row.gridImport * coordinationShare;
      if (reduction <= 0) return;
      row.gridImport = Math.max(0, row.gridImport - reduction);
      row.homeLoad = Math.max(0, row.homeLoad - reduction * 0.3);
      row.dischargeKw = (row.dischargeKw || 0) + reduction * 0.7;
      row.action = appendAction(row.action, "coordinated peak shave");
      rechargeNeed += reduction * 0.82;
    });
  }

  if (tariffId === "demand") {
    const currentPeak = Math.max(...coordinatedRows.map((row) => row.gridImport));
    const targetPeak = currentPeak * (1 - coordinationShare);
    coordinatedRows.forEach((row) => {
      if (row.gridImport <= targetPeak) return;
      const reduction = row.gridImport - targetPeak;
      row.gridImport = targetPeak;
      row.homeLoad = Math.max(0, row.homeLoad - reduction * 0.25);
      row.dischargeKw = (row.dischargeKw || 0) + reduction * 0.75;
      row.action = appendAction(row.action, "coordinated peak shave");
      rechargeNeed += reduction * 0.72;
    });
  }

  if (rechargeNeed <= 0) return coordinatedRows;

  const rechargeHours =
    tariffId === "demand"
      ? [0, 1, 2, 3, 4, 5, 12, 13, 14]
      : [0, 1, 2, 3, 4, 5, 22, 23];
  const weights = rechargeHours.map((hour) => {
    const row = coordinatedRows.find((item) => item.hour === hour);
    if (!row) return 0;
    const price = rateForTariff(tariffId, hour, overrides);
    return 1 / Math.max(price, 0.01);
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const demandHeadroom =
    tariffId === "demand"
      ? Math.max(...coordinatedRows.map((row) => row.gridImport)) * 0.92
      : Infinity;

  rechargeHours.forEach((hour, index) => {
    const row = coordinatedRows.find((item) => item.hour === hour);
    if (!row) return;
    const plannedCharge = rechargeNeed * (weights[index] / totalWeight);
    const availableHeadroom = Math.max(0, demandHeadroom - row.gridImport);
    const charge =
      tariffId === "demand"
        ? Math.min(plannedCharge, availableHeadroom)
        : plannedCharge;
    if (charge <= 0) return;
    row.gridImport += charge;
    row.chargeKw = (row.chargeKw || 0) + charge;
    row.action = appendAction(row.action, "coordinated charge");
  });

  return coordinatedRows;
}

function homeRowsForCase(behavior, device, overrides = state, tariffId = state.focusTariff) {
  const deviceDef = deviceDefs[device];
  let rows = endUseProfile.map((row) => ({
    hour: row.hour,
    price: rateForTariff(tariffId, row.hour, overrides),
    baselineLoad: row.total,
    homeLoad: row.total,
    gridImport: row.total,
    action: "baseline",
  }));

  if (tariffId === "flat") return rows;
  if (tariffResponseStrength(tariffId, overrides) <= 0) return rows;

  if (behavior === "elastic") {
    const elasticRows = elasticOnlyResponse(overrides, tariffId).rows;
    rows = rows.map((row, index) => {
      const adjusted = elasticRows[index];
      const delta = adjusted.gridImport - row.gridImport;
      return {
        ...row,
        homeLoad: row.homeLoad + delta,
        gridImport: row.gridImport + delta,
        action: adjusted.action === "inelastic" ? row.action : adjusted.action,
      };
    });
  }

  if (deviceDef.hasThermostat) {
    const thermal = hvacResponse(overrides, tariffId).rows;
    rows = rows.map((row, index) => {
      const delta = thermal[index].optimizedTotal - thermal[index].baselineTotal;
      return {
        ...row,
        homeLoad: row.homeLoad + delta,
        gridImport: row.gridImport + delta,
        action:
          thermal[index].action === "baseline"
            ? row.action
            : row.action === "baseline"
              ? thermal[index].action
              : `${row.action} + ${thermal[index].action}`,
      };
    });
  }

  if (deviceDef.hasBattery) {
    const batteryRows = batteryDispatchForLoad(rows, overrides, tariffId).rows;
    if (deviceDef.hasThermostat) {
      return coordinatedThermostatBatteryRows(
        batteryRows,
        overrides,
        tariffId,
        behavior,
      );
    }
    return batteryRows;
  }

  return rows;
}

function economicsForRows(rows, tariffId, overrides = state) {
  const tariff = calibratedTariff(tariffId, overrides);
  const monthlyKwh = rows.reduce(
    (sum, row) => sum + row.gridImport * monthlyScale,
    0,
  );
  const revenueEnergy = rows.reduce(
    (sum, row) =>
      sum +
      row.gridImport * monthlyScale * rateForTariff(tariffId, row.hour, overrides),
    0,
  );
  const peakKw = Math.max(...rows.map((row) => row.gridImport));
  const demandRevenue = tariff.demandCharge * peakKw;
  const revenue = revenueEnergy + demandRevenue;
  const energyCost = rows.reduce(
    (sum, row) =>
      sum + row.gridImport * monthlyScale * wholesaleCostForHour(row.hour),
    0,
  );
  const capacityCost = peakKw * capacityCostPerKwMonth;
  return {
    monthlyKwh,
    peakKw,
    revenue,
    energyCost,
    capacityCost,
    totalCost: energyCost + capacityCost,
    grossMargin: revenue - energyCost - capacityCost,
  };
}

const caseRowsCache = new Map();

function caseRowsCacheKey(behavior, device, tariffId, overrides = state) {
  return [
    behavior,
    device,
    tariffId,
    Number(overrides.spread ?? state.spread).toFixed(3),
    Number(overrides.demandCharge ?? state.demandCharge).toFixed(3),
    Number(overrides.thermostat ?? state.thermostat).toFixed(3),
    Number(overrides.battery ?? state.battery).toFixed(3),
  ].join(";");
}

function cachedHomeRowsForCase(
  behavior,
  device,
  overrides = state,
  tariffId = state.focusTariff,
) {
  const cacheKey = caseRowsCacheKey(behavior, device, tariffId, overrides);
  const cached = caseRowsCache.get(cacheKey);
  if (cached) return cached;
  const rows = homeRowsForCase(behavior, device, overrides, tariffId);
  caseRowsCache.set(cacheKey, rows);
  return rows;
}

function profiledRowsForCase(
  behavior,
  device,
  overrides = state,
  tariffId = state.focusTariff,
) {
  const representativeRows = cachedHomeRowsForCase(
    behavior,
    device,
    overrides,
    tariffId,
  );
  return representativeRows.map((row) => {
    const factor = averageDemandProfileFactors[row.hour] || 1;
    return {
      ...row,
      baselineLoad: (row.baselineLoad ?? endUseProfile[row.hour].total) * factor,
      homeLoad: (row.homeLoad ?? endUseProfile[row.hour].total) * factor,
      gridImport: row.gridImport * factor,
      chargeKw: (row.chargeKw || 0) * factor,
      dischargeKw: (row.dischargeKw || 0) * factor,
      action: row.action === "baseline" ? "baseline" : "profile ensemble",
    };
  });
}

function economicsForProfileEnsemble(
  behavior,
  device,
  tariffId = state.focusTariff,
  overrides = state,
) {
  const representativeRows = cachedHomeRowsForCase(
    behavior,
    device,
    overrides,
    tariffId,
  );
  const tariff = calibratedTariff(tariffId, overrides);
  const totals = demandProfileEnsemble.reduce(
    (acc, profile) => {
      let monthlyKwh = 0;
      let revenueEnergy = 0;
      let energyCost = 0;
      let peakKw = 0;
      representativeRows.forEach((row) => {
        const baseLoad = endUseProfile[row.hour]?.total || row.baselineLoad || 1;
        const profileLoad = profile.loads[row.hour] ?? baseLoad;
        const factor = baseLoad > 0 ? profileLoad / baseLoad : 1;
        const gridImport = row.gridImport * factor;
        monthlyKwh += gridImport * monthlyScale;
        revenueEnergy +=
          gridImport * monthlyScale * rateForTariff(tariffId, row.hour, overrides);
        energyCost += gridImport * monthlyScale * wholesaleCostForHour(row.hour);
        peakKw = Math.max(peakKw, gridImport);
      });
      const demandRevenue = tariff.demandCharge * peakKw;
      const capacityCost = peakKw * capacityCostPerKwMonth;
      acc.monthlyKwh += monthlyKwh;
      acc.peakKw += peakKw;
      acc.revenue += revenueEnergy + demandRevenue;
      acc.energyCost += energyCost;
      acc.capacityCost += capacityCost;
      acc.totalCost += energyCost + capacityCost;
      acc.grossMargin += revenueEnergy + demandRevenue - energyCost - capacityCost;
      return acc;
    },
    {
      monthlyKwh: 0,
      peakKw: 0,
      revenue: 0,
      energyCost: 0,
      capacityCost: 0,
      totalCost: 0,
      grossMargin: 0,
    },
  );
  const count = demandProfileEnsemble.length || 1;
  Object.keys(totals).forEach((key) => {
    totals[key] /= count;
  });
  return totals;
}

function currentPortfolioMix(overrides = state) {
  const total = populationTotal(overrides) || 100;
  return populationCases.map((caseDef) => ({
    ...caseDef,
    label: caseLabel(caseDef),
    homes: (populationHomes(caseDef.id, overrides) / total) * portfolioSize,
  }));
}

const portfolioCache = new Map();

function portfolioCacheKey(tariffId, overrides = state) {
  const populationKey = overrides.population
    .map((item) => `${item.id}:${Number(item.homes || 0)}`)
    .join("|");
  return [
    tariffId,
    Number(overrides.spread ?? state.spread).toFixed(3),
    Number(overrides.demandCharge ?? state.demandCharge).toFixed(3),
    Number(overrides.thermostat ?? state.thermostat).toFixed(3),
    Number(overrides.battery ?? state.battery).toFixed(3),
    populationKey,
  ].join(";");
}

function portfolioEconomics(tariffId = state.focusTariff, overrides = state) {
  const cacheKey = portfolioCacheKey(tariffId, overrides);
  const cached = portfolioCache.get(cacheKey);
  if (cached) return cached;

  const components = currentPortfolioMix(overrides).map((component) => {
    const rows = profiledRowsForCase(
      component.behavior,
      component.device,
      overrides,
      tariffId,
    );
    const economics = economicsForProfileEnsemble(
      component.behavior,
      component.device,
      tariffId,
      overrides,
    );
    return { ...component, rows, economics };
  });
  const total = components.reduce(
    (acc, component) => {
      const weight = component.homes;
      acc.revenue += component.economics.revenue * weight;
      acc.energyCost += component.economics.energyCost * weight;
      acc.monthlyKwh += component.economics.monthlyKwh * weight;
      component.rows.forEach((row) => {
        acc.hourlyGrid[row.hour] += row.gridImport * weight;
      });
      return acc;
    },
    {
      revenue: 0,
      energyCost: 0,
      capacityCost: 0,
      totalCost: 0,
      grossMargin: 0,
      monthlyKwh: 0,
      peakKw: 0,
      hourlyGrid: Array.from({ length: 24 }, () => 0),
    },
  );
  total.peakKw = Math.max(...total.hourlyGrid);
  total.capacityCost = total.peakKw * capacityCostPerKwMonth;
  total.totalCost = total.energyCost + total.capacityCost;
  total.grossMargin = total.revenue - total.totalCost;
  const result = { tariff: tariffById(tariffId), components, total };
  portfolioCache.set(cacheKey, result);
  return result;
}

function rangeValues(min, max, step) {
  const count = Math.round((max - min) / step);
  return Array.from({ length: count + 1 }, (_, index) =>
    Number((min + index * step).toFixed(4)),
  );
}

function optimizerTariffId(kind) {
  return kind === "tou" ? "tou" : "demand";
}

function optimizerDecisionLabel(kind, value) {
  return kind === "tou"
    ? `${value.toFixed(2).replace(/0$/, "").replace(/\.0$/, ".0")}x spread`
    : `$${value.toFixed(value % 1 ? 1 : 0)}/kW-mo`;
}

function optimizerScenario(kind, value, overrides = state) {
  return {
    ...overrides,
    population: overrides.population.map((item) => ({ ...item })),
    spread: kind === "tou" ? value : overrides.spread,
    demandCharge: kind === "demand" ? value : overrides.demandCharge,
  };
}

function filingNeutralityFor(tariffId, overrides = state) {
  const flat = inelasticSameRateEconomics("flat", overrides);
  const candidate = inelasticSameRateEconomics(tariffId, overrides);
  const delta = candidate.revenue - flat.revenue;
  return {
    flatRevenue: flat.revenue,
    candidateRevenue: candidate.revenue,
    delta,
    deltaPct: flat.revenue > 0 ? delta / flat.revenue : 0,
  };
}

function tariffRateFields(tariffId, overrides = state) {
  const tariff = calibratedTariff(tariffId, overrides);
  return {
    fixedRate: tariff.fixedRate ?? "",
    offPeakRate: tariff.offPeakRate ?? "",
    shoulderRate: tariff.shoulderRate ?? "",
    peakRate: tariff.peakRate ?? "",
    demandCharge: tariff.demandCharge ?? 0,
  };
}

function optimizationValues(kind) {
  if (kind === "tou") {
    return rangeValues(
      optimizationConfig.touMin,
      optimizationConfig.touMax,
      optimizationConfig.touStep,
    );
  }
  return rangeValues(
    optimizationConfig.demandMin,
    optimizationConfig.demandMax,
    optimizationConfig.demandStep,
  );
}

function optimizationCandidate(kind, value, overrides = state, flatTotal = null) {
  const tariffId = optimizerTariffId(kind);
  const scenario = optimizerScenario(kind, value, overrides);
  const flat = flatTotal || portfolioEconomics("flat", overrides).total;
  const economics = portfolioEconomics(tariffId, scenario).total;
  const filing = filingNeutralityFor(tariffId, scenario);
  const revenueDelta = economics.revenue - flat.revenue;
  const avoidedCost = flat.totalCost - economics.totalCost;
  const marginDelta = economics.grossMargin - flat.grossMargin;
  const revenueRetention = flat.revenue > 0 ? economics.revenue / flat.revenue : 1;
  const peakReduction = flat.peakKw > 0 ? 1 - economics.peakKw / flat.peakKw : 0;
  const feasible =
    revenueRetention >= optimizationConfig.revenueRetentionMin &&
    Math.abs(filing.deltaPct) <= optimizationConfig.filingNeutralTolerance &&
    economics.peakKw <= optimizationConfig.maxPeakKw;
  return {
    kind,
    tariffId,
    value,
    scenario,
    rates: tariffRateFields(tariffId, scenario),
    economics,
    revenueDelta,
    avoidedCost,
    marginDelta,
    revenueRetention,
    peakReduction,
    filing,
    capacitySlackKw: optimizationConfig.maxPeakKw - economics.peakKw,
    feasible,
    objectiveValue: marginDelta,
  };
}

function optimizeTariff(kind, overrides = state) {
  const flatTotal = portfolioEconomics("flat", overrides).total;
  const candidates = optimizationValues(kind).map((value) =>
    optimizationCandidate(kind, value, overrides, flatTotal),
  );
  const feasibleCandidates = candidates.filter((candidate) => candidate.feasible);
  const best =
    feasibleCandidates.reduce(
      (winner, candidate) =>
        !winner || candidate.objectiveValue > winner.objectiveValue
          ? candidate
          : winner,
      null,
    ) || candidates[0];
  const currentValue =
    kind === "tou" ? effectiveTouSpread(overrides) : Number(overrides.demandCharge);
  const selected = optimizationCandidate(kind, currentValue, overrides, flatTotal);
  return {
    kind,
    tariffId: optimizerTariffId(kind),
    best,
    selected,
    candidates,
    feasibleCandidates,
    flatTotal,
  };
}

function allOptimizations(overrides = state) {
  return ["tou", "demand"].map((kind) => optimizeTariff(kind, overrides));
}

function inelasticSameRateEconomics(tariffId, overrides = state) {
  return economicsForProfileEnsemble("passive", "none", tariffId, overrides);
}

function economicsForCase(caseDef, tariffId = state.focusTariff, overrides = state) {
  return economicsForProfileEnsemble(
    caseDef.behavior,
    caseDef.device,
    tariffId,
    overrides,
  );
}

function caseStudyEconomics(tariffId = state.focusTariff, overrides = state) {
  const selected = portfolioEconomics(tariffId, overrides);
  const passivePerHome = inelasticSameRateEconomics(tariffId, overrides);
  const passiveTotal = {
    revenue: passivePerHome.revenue * portfolioSize,
    totalCost: passivePerHome.totalCost * portfolioSize,
    grossMargin: passivePerHome.grossMargin * portfolioSize,
    peakKw: passivePerHome.peakKw * portfolioSize,
  };
  const revenueDownHomes = selected.components.reduce((sum, component) => {
    return sum + (component.economics.revenue < passivePerHome.revenue ? component.homes : 0);
  }, 0);
  return {
    selected,
    passivePerHome,
    passiveTotal,
    revenueDownHomes,
    revenueDelta: selected.total.revenue - passiveTotal.revenue,
    avoidedCost: passiveTotal.totalCost - selected.total.totalCost,
    marginDelta: selected.total.grossMargin - passiveTotal.grossMargin,
    peakReduction:
      passiveTotal.peakKw > 0
        ? 1 - selected.total.peakKw / passiveTotal.peakKw
        : 0,
  };
}

function allPopulationOutcomes(overrides = state) {
  return tariffs.flatMap((tariff) =>
    populationCases.map((caseDef) => {
      const economics = economicsForCase(caseDef, tariff.id, overrides);
      const passive = inelasticSameRateEconomics(tariff.id, overrides);
      const homes = normalizedHomes(caseDef.id, overrides);
      return {
        caseDef,
        tariff,
        homes,
        economics,
        revenueDelta: economics.revenue - passive.revenue,
        avoidedCost: passive.totalCost - economics.totalCost,
        marginDelta: economics.grossMargin - passive.grossMargin,
      };
    }),
  );
}

function portfolioSummary(overrides = state) {
  const economics = portfolioEconomics(overrides.focusTariff, overrides);
  const flat = portfolioEconomics("flat", overrides);
  const revenue =
    flat.total.revenue > 0
      ? economics.total.revenue / flat.total.revenue
      : 1;
  const peak =
    flat.total.peakKw > 0
      ? 1 - economics.total.peakKw / flat.total.peakKw
      : 0;
  return {
    revenue,
    peak,
    leakage: 1 - revenue,
  };
}

function renderTable() {
  const tbody = document.getElementById("scenario-table");
  tbody.innerHTML = "";
  allPopulationOutcomes().forEach((result) => {
    const tr = document.createElement("tr");
    const segmentRevenue = result.homes * result.economics.revenue;
    const segmentCost = result.homes * result.economics.totalCost;
    const segmentMargin = result.homes * result.economics.grossMargin;
    tr.innerHTML = `
      <td>${behaviorDefs[result.caseDef.behavior].name}</td>
      <td>${deviceDefs[result.caseDef.device].name}</td>
      <td>${result.tariff.name}</td>
      <td>${num.format(result.homes)}</td>
      <td>${money1.format(result.economics.revenue)}</td>
      <td>${money1.format(result.economics.totalCost)}</td>
      <td>${money1.format(result.economics.grossMargin)}</td>
      <td>${money.format(segmentRevenue)}</td>
      <td>${money.format(segmentCost)}</td>
      <td>${money.format(segmentMargin)}</td>
      <td>${num.format(result.economics.monthlyKwh)}</td>
      <td>${num.format(result.economics.peakKw)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function groupedPopulationOutcomes() {
  return tariffs.map((tariff) => ({
    tariff,
    rows: populationCases.map((caseDef) => {
      const economics = economicsForCase(caseDef, tariff.id);
      const homes = normalizedHomes(caseDef.id);
      return {
        caseDef,
        economics,
        homes,
        segmentRevenue: homes * economics.revenue,
        segmentCost: homes * economics.totalCost,
        segmentMargin: homes * economics.grossMargin,
      };
    }),
  }));
}

function renderRateCards() {
  const container = document.getElementById("rate-cards");
  container.innerHTML = "";
  tariffs.forEach((tariff) => {
    const economics = portfolioEconomics(tariff.id);
    const study = caseStudyEconomics(tariff.id);
    const card = document.createElement("article");
    card.className = `rate-card${state.focusTariff === tariff.id ? " active" : ""}`;
    card.innerHTML = `
      <h3>${tariff.name}</h3>
      <p class="rate-design">${tariffDesignText(tariff.id)}</p>
      <div class="rate-metrics">
        <div class="rate-metric">
          <label>Revenue</label>
          <strong>${money.format(economics.total.revenue)}</strong>
        </div>
        <div class="rate-metric">
          <label>Utility cost</label>
          <strong>${money.format(economics.total.totalCost)}</strong>
        </div>
        <div class="rate-metric">
          <label>Revenue delta</label>
          <strong>${signedMoney(study.revenueDelta)}</strong>
        </div>
        <div class="rate-metric">
          <label>Cost avoided</label>
          <strong>${money.format(study.avoidedCost)}</strong>
        </div>
        <div class="rate-metric">
          <label>Gross margin</label>
          <strong>${money.format(economics.total.grossMargin)}</strong>
        </div>
        <div class="rate-metric">
          <label>Margin delta</label>
          <strong>${signedMoney(study.marginDelta)}</strong>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderOptimizer() {
  const container = document.getElementById("optimizer-cards");
  if (!container) return;
  const objectiveText =
    `Maximize monthly gross margin subject to realized revenue >= ${pct.format(
      optimizationConfig.revenueRetentionMin,
    )} of flat, portfolio peak <= ${num.format(
      optimizationConfig.maxPeakKw,
    )} kW, and filing-baseline revenue neutrality within ${pct.format(
      optimizationConfig.filingNeutralTolerance,
    )}. Candidate economics use ${num.format(
      demandProfileEnsemble.length,
    )} normalized demand profiles.`;

  container.innerHTML = allOptimizations()
    .map((result) => {
      const { best, selected } = result;
      const tariffName = tariffById(result.tariffId).name;
      const deltaToSelected = best.objectiveValue - selected.objectiveValue;
      const rateText = tariffDesignText(result.tariffId, best.scenario);
      const decisionKind =
        result.kind === "tou" ? "Peak/off-peak ratio" : "Demand charge";
      const searchRange =
        result.kind === "tou"
          ? `${optimizationConfig.touMin}x-${optimizationConfig.touMax}x`
          : `$${optimizationConfig.demandMin}-$${optimizationConfig.demandMax}/kW-mo`;
      const frontierRows = [...result.candidates]
        .sort((a, b) => b.objectiveValue - a.objectiveValue)
        .slice(0, 5)
        .map(
          (candidate) => `
            <tr class="${candidate.feasible ? "" : "infeasible"}">
              <td>${optimizerDecisionLabel(result.kind, candidate.value)}</td>
              <td>${signedCompactMoney(candidate.marginDelta)}</td>
              <td>${pct.format(candidate.revenueRetention)}</td>
              <td>${num.format(candidate.economics.peakKw)} kW</td>
            </tr>
          `,
        )
        .join("");
      return `
        <article class="optimizer-card">
          <div class="optimizer-card-head">
            <div>
              <h3>${tariffName} optimizer</h3>
              <p>${decisionKind}: ${searchRange}</p>
            </div>
            <span class="optimizer-badge">${best.feasible ? "Feasible optimum" : "No feasible point"}</span>
          </div>
          <div class="optimizer-decision">
            <strong>${optimizerDecisionLabel(result.kind, best.value)}</strong>
            <span>${rateText}</span>
          </div>
          <div class="optimizer-metrics">
            <div>
              <label>Objective</label>
              <strong>${signedCompactMoney(best.marginDelta)}</strong>
              <span>margin vs flat</span>
            </div>
            <div>
              <label>Revenue</label>
              <strong>${signedCompactMoney(best.revenueDelta)}</strong>
              <span>${pct.format(best.revenueRetention)} retained</span>
            </div>
            <div>
              <label>Cost avoided</label>
              <strong>${compactMoney(best.avoidedCost)}</strong>
              <span>${pct.format(best.peakReduction)} peak cut</span>
            </div>
            <div>
              <label>Capacity slack</label>
              <strong>${num.format(best.capacitySlackKw)} kW</strong>
              <span>${signedCompactMoney(deltaToSelected)} vs selected</span>
            </div>
          </div>
          <div class="optimizer-frontier">
            <div>
              <strong>Top frontier points</strong>
              <span>ranked by margin; gray rows violate a constraint</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Decision</th>
                  <th>Margin</th>
                  <th>Revenue</th>
                  <th>Peak</th>
                </tr>
              </thead>
              <tbody>${frontierRows}</tbody>
            </table>
          </div>
          <p class="optimizer-constraint">${objectiveText}</p>
          <button class="button" type="button" data-apply-optimized="${result.kind}">
            Apply optimized ${result.kind === "tou" ? "TOU" : "demand"} setting
          </button>
        </article>
      `;
    })
    .join("");
}

function chartPath(points, width, height, pad, yMax, yMin = 0) {
  return points
    .map((point, index) => {
      const x =
        pad.left +
        (point.x / 23) * (width - pad.left - pad.right);
      const y =
        height -
        pad.bottom -
        ((point.y - yMin) / (yMax - yMin)) *
          (height - pad.top - pad.bottom);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function adoptionPath(points, width, height, pad, yMax, yMin = 0) {
  return points
    .map((point, index) => {
      const x =
        pad.left +
        (point.x / 100) * (width - pad.left - pad.right);
      const y =
        height -
        pad.bottom -
        ((point.y - yMin) / (yMax - yMin)) *
          (height - pad.top - pad.bottom);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function renderCaseStudy() {
  const study = caseStudyEconomics(state.focusTariff);
  const tariff = tariffById(state.focusTariff);
  const kpis = [
    {
      label: "Revenue-down homes",
      value: `${num.format(study.revenueDownHomes)} / ${num.format(portfolioSize)}`,
    },
    {
      label: "Revenue change",
      value: signedMoney(study.revenueDelta),
      status: study.revenueDelta < 0 ? "negative" : "positive",
    },
    {
      label: "Cost avoided",
      value: money.format(study.avoidedCost),
      status: study.avoidedCost >= 0 ? "positive" : "negative",
    },
    {
      label: "Margin change",
      value: signedMoney(study.marginDelta),
      status: study.marginDelta >= 0 ? "positive" : "negative",
    },
  ];
  document.getElementById("case-kpis").innerHTML = kpis
    .map(
      (item) => `
        <div class="case-kpi ${item.status || ""}">
          <label>${item.label}</label>
          <strong>${item.value}</strong>
        </div>
      `,
    )
    .join("");
  document.getElementById("case-insight").textContent =
    `${tariff.name}: compared with the same rate applied to all-inelastic homes, ` +
    `${num.format(study.revenueDownHomes)} of ${num.format(portfolioSize)} homes pay less, revenue changes by ` +
    `${signedMoney(study.revenueDelta)}, utility cost changes by ${signedMoney(-study.avoidedCost)}, ` +
    `and gross margin changes by ${signedMoney(study.marginDelta)}.`;
}

function renderPopulationControls() {
  const container = document.getElementById("population-inputs");
  container.innerHTML = populationCases
    .map((caseDef) => {
      const behavior = behaviorDefs[caseDef.behavior];
      const device = deviceDefs[caseDef.device];
      return `
        <div class="population-card">
          <label for="pop-${caseDef.id}">${behavior.shortName} / ${device.shortName}</label>
          <span>${behavior.description}; ${device.name}</span>
          <input id="pop-${caseDef.id}" data-population="${caseDef.id}" type="number" min="0" max="100" step="1" value="${populationHomes(caseDef.id)}" />
        </div>
      `;
    })
    .join("");
  document.getElementById("population-total").textContent =
    `Current allocation-share total: ${num.format(populationTotal())}; normalized model denominator: ${num.format(portfolioSize)} homes`;
}

function renderPopulationChart() {
  const svg = document.getElementById("population-chart");
  const width = 1120;
  const height = 660;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const pad = { top: 68, right: 24, bottom: 138, left: 152 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const groupWidth = chartWidth / tariffs.length;
  const rowHeight = chartHeight / populationCases.length;
  const totalsY = pad.top + chartHeight + 16;
  const footerY = height - 12;
  const maxPerHomeRevenue = populationChartRevenueScaleMax;

  const rowLabels = populationCases
    .map((caseDef, index) => {
      const y = pad.top + index * rowHeight + rowHeight * 0.62;
      return `<text x="${pad.left - 12}" y="${y.toFixed(1)}" text-anchor="end" fill="#3f4a51" font-size="12" font-weight="760">${caseLabel(caseDef)}</text>`;
    })
    .join("");

  const bars = tariffs
    .map((tariff, tariffIndex) => {
      const groupX = pad.left + tariffIndex * groupWidth;
      const titleX = groupX + groupWidth / 2;
      const title = `<text x="${titleX.toFixed(1)}" y="40" text-anchor="middle" fill="#172026" font-size="15" font-weight="820">${tariff.name}</text>
        <text x="${titleX.toFixed(1)}" y="58" text-anchor="middle" fill="#64717b" font-size="11" font-weight="720">${tariffDesignText(tariff.id)}</text>`;
      const caseBars = populationCases
        .map((caseDef, caseIndex) => {
          const homes = normalizedHomes(caseDef.id);
          const economics = economicsForCase(caseDef, tariff.id);
          const barMaxWidth = groupWidth - 38;
          const revenueWidth = (economics.revenue / maxPerHomeRevenue) * barMaxWidth;
          const costWidth = (economics.totalCost / maxPerHomeRevenue) * barMaxWidth;
          const margin = economics.grossMargin;
          const marginWidth = (Math.max(margin, 0) / maxPerHomeRevenue) * barMaxWidth;
          const x = groupX + 12;
          const y = pad.top + caseIndex * rowHeight + 8;
          const barH = Math.max(8, (rowHeight - 15) / 2);
          const revenueY = y + 1;
          const stackY = y + barH + 5;
          const opacity = caseDef.behavior === "elastic" ? 0.88 : 0.56;
          const revenueLabel = money1.format(economics.revenue);
          const costLabel = money1.format(economics.totalCost);
          const marginLabel = money1.format(margin);
          const revenueLabelX = x + revenueWidth - 7;
          const costLabelX = x + costWidth - 7;
          const marginLabelInside = marginWidth >= 40;
          const marginLabelX = marginLabelInside
            ? x + costWidth + marginWidth / 2
            : x + costWidth + marginWidth + 5;
          const active =
            state.selectedCaseId === caseDef.id && state.focusTariff === tariff.id
              ? " active"
              : "";
          return `
            <g class="population-bar${active}" data-case="${caseDef.id}" data-tariff="${tariff.id}">
              <title>${caseLabel(caseDef)} ${tariff.name}: ${num.format(homes)} homes, revenue ${revenueLabel}, cost ${costLabel}, margin ${marginLabel} per meter</title>
              <rect x="${x.toFixed(1)}" y="${revenueY.toFixed(1)}" width="${revenueWidth.toFixed(1)}" height="${barH.toFixed(1)}" rx="5" fill="#3765a3" opacity="${caseDef.behavior === "elastic" ? 0.92 : 0.72}" stroke="transparent" />
              <rect x="${x.toFixed(1)}" y="${stackY.toFixed(1)}" width="${costWidth.toFixed(1)}" height="${barH.toFixed(1)}" rx="5" fill="#b13a2f" opacity="0.28" stroke="transparent" />
              <rect x="${(x + costWidth).toFixed(1)}" y="${stackY.toFixed(1)}" width="${marginWidth.toFixed(1)}" height="${barH.toFixed(1)}" rx="5" fill="#2e7d32" opacity="${opacity}" stroke="transparent" />
              <text x="${(x + 7).toFixed(1)}" y="${(revenueY + barH * 0.72).toFixed(1)}" fill="#fff" font-size="9" font-weight="820">${num.format(homes)} homes</text>
              <text x="${revenueLabelX.toFixed(1)}" y="${(revenueY + barH * 0.72).toFixed(1)}" text-anchor="end" fill="#fff" font-size="9" font-weight="820">${revenueLabel}</text>
              <text x="${costLabelX.toFixed(1)}" y="${(stackY + barH * 0.72).toFixed(1)}" text-anchor="end" fill="#7f2f29" font-size="9" font-weight="820">${costLabel}</text>
              <text x="${marginLabelX.toFixed(1)}" y="${(stackY + barH * 0.72).toFixed(1)}" text-anchor="${marginLabelInside ? "middle" : "start"}" fill="${marginLabelInside ? "#fff" : "#2e7d32"}" font-size="9" font-weight="820">${marginLabel}</text>
            </g>
          `;
        })
        .join("");
      const economics = portfolioEconomics(tariff.id).total;
      const summaryX = groupX + 12;
      const summaryWidth = groupWidth - 24;
      const metricWidth = summaryWidth / 4;
      const summary = `
        <g class="tariff-summary">
          <rect x="${summaryX.toFixed(1)}" y="${totalsY.toFixed(1)}" width="${summaryWidth.toFixed(1)}" height="76" rx="7" fill="#f6f8f9" stroke="#d7e0e5" />
          <text x="${(summaryX + 12).toFixed(1)}" y="${(totalsY + 18).toFixed(1)}" fill="#64717b" font-size="10" font-weight="820" text-transform="uppercase">Portfolio totals / month</text>
          <text x="${(summaryX + 12).toFixed(1)}" y="${(totalsY + 41).toFixed(1)}" fill="#64717b" font-size="9" font-weight="760">Total revenue</text>
          <text x="${(summaryX + 12).toFixed(1)}" y="${(totalsY + 62).toFixed(1)}" fill="#172026" font-size="14" font-weight="820">${compactPortfolioMoney(economics.revenue)}</text>
          <text x="${(summaryX + metricWidth + 12).toFixed(1)}" y="${(totalsY + 41).toFixed(1)}" fill="#64717b" font-size="9" font-weight="760">Total costs</text>
          <text x="${(summaryX + metricWidth + 12).toFixed(1)}" y="${(totalsY + 62).toFixed(1)}" fill="#172026" font-size="14" font-weight="820">${compactPortfolioMoney(economics.totalCost)}</text>
          <text x="${(summaryX + metricWidth * 2 + 12).toFixed(1)}" y="${(totalsY + 41).toFixed(1)}" fill="#64717b" font-size="9" font-weight="760">Total margin</text>
          <text x="${(summaryX + metricWidth * 2 + 12).toFixed(1)}" y="${(totalsY + 62).toFixed(1)}" fill="${economics.grossMargin >= 0 ? "#087f8c" : "#b13a2f"}" font-size="14" font-weight="820">${compactPortfolioMoney(economics.grossMargin)}</text>
          <text x="${(summaryX + metricWidth * 3 + 12).toFixed(1)}" y="${(totalsY + 41).toFixed(1)}" fill="#64717b" font-size="9" font-weight="760">Total kWh</text>
          <text x="${(summaryX + metricWidth * 3 + 12).toFixed(1)}" y="${(totalsY + 62).toFixed(1)}" fill="#172026" font-size="14" font-weight="820">${compactKwh(economics.monthlyKwh)}</text>
        </g>
      `;
      const divider =
        tariffIndex > 0
          ? `<line x1="${groupX.toFixed(1)}" x2="${groupX.toFixed(1)}" y1="${pad.top - 10}" y2="${totalsY + 76}" stroke="#d7e0e5" />`
          : "";
      return `${divider}${title}${caseBars}${summary}`;
    })
    .join("");

  svg.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="#fbfcfd" />
    <text x="12" y="20" fill="#3765a3" font-size="11" font-weight="800">Revenue</text>
    <line x1="68" y1="16" x2="102" y2="16" stroke="#3765a3" stroke-width="6" opacity="0.86" />
    <text x="120" y="20" fill="#b13a2f" font-size="11" font-weight="800">Cost</text>
    <line x1="154" y1="16" x2="188" y2="16" stroke="#b13a2f" stroke-width="6" opacity="0.28" />
    <text x="206" y="20" fill="#2e7d32" font-size="11" font-weight="800">Margin</text>
    <line x1="254" y1="16" x2="288" y2="16" stroke="#2e7d32" stroke-width="6" opacity="0.78" />
    ${rowLabels}
    ${bars}
    <text x="${pad.left}" y="${footerY}" fill="#64717b" font-size="11" font-weight="720">Fixed $0-${money.format(populationChartRevenueScaleMax)} / meter scale; monthly values update with selected rate controls.</text>
  `;

  svg.querySelectorAll(".population-bar").forEach((bar) => {
    bar.addEventListener("click", () => {
      state.selectedCaseId = bar.dataset.case;
      state.focusTariff = bar.dataset.tariff;
      document
        .querySelectorAll("[data-tariff]")
        .forEach((el) =>
          el.classList.toggle("active", el.dataset.tariff === state.focusTariff),
        );
      render();
    });
  });
}

function scarcityRects(width, height, pad, chartWidth, tariffId, opacity = 0.45) {
  return [...scarcityHoursForTariff(tariffId)]
    .map((hour) => {
      const x = pad.left + (hour / 23) * chartWidth;
      const w = (0.88 / 23) * chartWidth;
      return `<rect x="${x.toFixed(1)}" y="${pad.top}" width="${w.toFixed(1)}" height="${height - pad.top - pad.bottom}" fill="#ffe8e4" opacity="${opacity}" />`;
    })
    .join("");
}

function scarcityLabel(tariffId, width, pad, chartWidth, y) {
  const hours = [...scarcityHoursForTariff(tariffId)];
  if (!hours.length) return "";
  const center = hours.reduce((sum, hour) => sum + hour, 0) / hours.length;
  const text =
    tariffId === "demand" ? "highest-load hours" : "TOU peak window";
  return `<text x="${(pad.left + (center / 23) * chartWidth).toFixed(1)}" y="${y}" text-anchor="middle" fill="#b13a2f" font-size="12" font-weight="780">${text}</text>`;
}

function renderSelectedCaseDetail() {
  const caseDef = populationCaseById(state.selectedCaseId);
  const rows = homeRowsForCase(caseDef.behavior, caseDef.device, state, state.focusTariff);
  const baselineRows = baseRows().map((row) => ({
    ...row,
    price: rateForTariff(state.focusTariff, row.hour),
    baselineLoad: row.homeLoad,
  }));
  const economics = economicsForRows(rows, state.focusTariff);
  const passive = inelasticSameRateEconomics(state.focusTariff);
  const homes = normalizedHomes(caseDef.id);
  const width = 960;
  const height = 340;
  const pad = { top: 30, right: 34, bottom: 44, left: 58 };
  const yMax =
    Math.max(
      ...rows.map((row, index) =>
        Math.max(row.gridImport, baselineRows[index].gridImport),
      ),
    ) + 0.45;
  const maxPrice = Math.max(...rows.map((row) => row.price));
  const baseline = baselineRows.map((row) => ({ x: row.hour, y: row.gridImport }));
  const optimized = rows.map((row) => ({ x: row.hour, y: row.gridImport }));
  const price = rows.map((row) => ({
    x: row.hour,
    y: maxPrice > 0 ? (row.price / maxPrice) * yMax : 0,
  }));
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;

  document.getElementById("selected-case-copy").textContent =
    `${caseLabel(caseDef)} under ${tariffById(state.focusTariff).name}: ${num.format(homes)} homes in the ${num.format(portfolioSize)}-home modeled portfolio. ` +
    `The line chart shows baseline home load versus optimized grid import after elastic behavior, thermostat control, and/or battery dispatch.`;
  document.getElementById("case-load-chart").innerHTML = `
    ${gridLines(width, height, pad, false, yMax)}
    ${scarcityRects(width, height, pad, chartWidth, state.focusTariff, 0.45)}
    <path d="${chartPath(price, width, height, pad, yMax)}" fill="none" stroke="#b13a2f" stroke-width="2.3" stroke-dasharray="7 6" stroke-linecap="round" />
    <path d="${chartPath(baseline, width, height, pad, yMax)}" fill="none" stroke="#64717b" stroke-width="2.8" stroke-linecap="round" />
    <path d="${chartPath(optimized, width, height, pad, yMax)}" fill="none" stroke="#087f8c" stroke-width="3.2" stroke-linecap="round" />
    ${scarcityLabel(state.focusTariff, width, pad, chartWidth, pad.top + 18)}
    ${axisLabels(width, height, pad, "Hour", "kW / price index")}
  `;

  const revenueDelta = economics.revenue - passive.revenue;
  const avoidedCost = passive.totalCost - economics.totalCost;
  const marginDelta = economics.grossMargin - passive.grossMargin;
  document.getElementById("selected-case-metrics").innerHTML = `
    <div class="mini-metric">
      <label>Population</label>
      <strong>${num.format(homes)} homes</strong>
    </div>
    <div class="mini-metric">
      <label>Revenue / home</label>
      <strong>${money.format(economics.revenue)}</strong>
    </div>
    <div class="mini-metric">
      <label>Revenue vs inelastic</label>
      <strong>${signedMoney(revenueDelta)}</strong>
    </div>
    <div class="mini-metric">
      <label>Cost avoided / home</label>
      <strong>${money.format(avoidedCost)}</strong>
    </div>
    <div class="mini-metric">
      <label>Margin vs inelastic</label>
      <strong>${signedMoney(marginDelta)}</strong>
    </div>
    <div class="mini-metric">
      <label>Peak / home</label>
      <strong>${num.format(economics.peakKw)} kW</strong>
    </div>
  `;
}

function renderLoadChart() {
  const svg = document.getElementById("load-chart");
  const width = 640;
  const height = 320;
  const pad = { top: 26, right: 24, bottom: 44, left: 54 };
  const yMax = Math.max(...endUseProfile.map((d) => d.total)) + 0.45;
  const categories = [
    { key: "hvac", color: "#3765a3" },
    { key: "appliances", color: "#2e7d32" },
    { key: "waterHeating", color: "#087f8c" },
    { key: "lighting", color: "#b36b00" },
    { key: "plugOther", color: "#64717b" },
  ];
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const step = chartWidth / endUseProfile.length;
  const barWidth = Math.max(8, step * 0.64);
  const total = endUseProfile.map((d) => ({ x: d.hour, y: d.total }));

  const bars = endUseProfile
    .map((row, index) => {
      let yCursor = height - pad.bottom;
      const x = pad.left + index * step + (step - barWidth) / 2;
      return categories
        .map((category) => {
          const value = row[category.key];
          const barHeight = (value / yMax) * chartHeight;
          yCursor -= barHeight;
          return `<rect x="${x.toFixed(1)}" y="${yCursor.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" fill="${category.color}" opacity="0.88" />`;
        })
        .join("");
    })
    .join("");

  svg.innerHTML = `
    ${gridLines(width, height, pad, false, yMax)}
    <rect x="${pad.left + (16 / 23) * chartWidth}" y="${pad.top}" width="${(4 / 23) * chartWidth}" height="${chartHeight}" fill="#ffe8e4" opacity="0.52" />
    ${bars}
    <path d="${chartPath(total, width, height, pad, yMax)}" fill="none" stroke="#172026" stroke-width="2.5" stroke-linecap="round" />
    <text x="${pad.left + (18 / 23) * chartWidth}" y="${pad.top + 16}" text-anchor="middle" fill="#b13a2f" font-size="11" font-weight="760">TOU peak window</text>
    ${axisLabels(width, height, pad, "Hour", "kW")}
  `;
}

function renderHvacChart() {
  const svg = document.getElementById("hvac-chart");
  const width = 960;
  const height = 320;
  const pad = { top: 28, right: 34, bottom: 44, left: 58 };
  const response = hvacResponse(state, state.focusTariff);
  const yMax =
    Math.max(
      ...response.rows.map((row) =>
        Math.max(row.baselineHvac, row.optimizedHvac),
      ),
    ) + 0.35;
  const maxPrice = Math.max(...response.rows.map((row) => row.price));
  const pricePoints = response.rows.map((row) => ({
    x: row.hour,
    y: (row.price / maxPrice) * yMax,
  }));
  const baseline = response.rows.map((row) => ({
    x: row.hour,
    y: row.baselineHvac,
  }));
  const optimized = response.rows.map((row) => ({
    x: row.hour,
    y: row.optimizedHvac,
  }));
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;

  svg.innerHTML = `
    ${gridLines(width, height, pad, false, yMax)}
    ${scarcityRects(width, height, pad, chartWidth, state.focusTariff, 0.5)}
    <path d="${chartPath(pricePoints, width, height, pad, yMax)}" fill="none" stroke="#b13a2f" stroke-width="2.4" stroke-dasharray="7 6" stroke-linecap="round" />
    <path d="${chartPath(baseline, width, height, pad, yMax)}" fill="none" stroke="#3765a3" stroke-width="3" stroke-linecap="round" />
    <path d="${chartPath(optimized, width, height, pad, yMax)}" fill="none" stroke="#b36b00" stroke-width="3" stroke-linecap="round" />
    ${state.focusTariff === "flat" ? "" : `<text x="${pad.left + (13.5 / 23) * chartWidth}" y="${pad.top + 18}" text-anchor="middle" fill="#b36b00" font-size="12" font-weight="780">pre-cool</text>`}
    ${scarcityLabel(state.focusTariff, width, pad, chartWidth, pad.top + 18)}
    ${axisLabels(width, height, pad, "Hour", "HVAC kW")}
  `;

  document.getElementById("hvac-cost-savings").textContent = money2.format(
    response.costSavings,
  );
  document.getElementById("hvac-shifted").textContent = `${num.format(
    response.removedKwh,
  )} kWh`;
  document.getElementById("hvac-energy-cut").textContent = pct.format(
    response.energyReductionShare,
  );
  document.getElementById("hvac-peak-cut").textContent = pct.format(
    response.peakReduction,
  );
}

function renderBatteryChart() {
  const svg = document.getElementById("battery-chart");
  const width = 960;
  const height = 340;
  const pad = { top: 28, right: 34, bottom: 44, left: 58 };
  const response = batteryResponse(state, state.focusTariff);
  const yMax =
    Math.max(
      ...response.rows.map((row) =>
        Math.max(row.homeLoad, row.gridImport),
      ),
    ) + 0.45;
  const maxPrice = Math.max(...response.rows.map((row) => row.price));
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const homeLoad = response.rows.map((row) => ({
    x: row.hour,
    y: row.homeLoad,
  }));
  const gridImport = response.rows.map((row) => ({
    x: row.hour,
    y: row.gridImport,
  }));
  const soc = response.rows.map((row) => ({
    x: row.hour,
    y: row.socPct * yMax,
  }));
  const price = response.rows.map((row) => ({
    x: row.hour,
    y: (row.price / maxPrice) * yMax,
  }));
  const step = chartWidth / response.rows.length;
  const barWidth = Math.max(8, step * 0.62);
  const actionBars = response.rows
    .map((row, index) => {
      const magnitude = row.chargeKw || row.dischargeKw;
      if (magnitude <= 0) return "";
      const x = pad.left + index * step + (step - barWidth) / 2;
      const barHeight = (magnitude / yMax) * chartHeight;
      const y =
        row.chargeKw > 0
          ? height - pad.bottom - barHeight
          : height - pad.bottom - (row.gridImport / yMax) * chartHeight;
      const fill = row.chargeKw > 0 ? "#2e7d32" : "#087f8c";
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" fill="${fill}" opacity="0.16" />`;
    })
    .join("");

  svg.innerHTML = `
    ${gridLines(width, height, pad, false, yMax)}
    ${scarcityRects(width, height, pad, chartWidth, state.focusTariff, 0.48)}
    ${actionBars}
    <path d="${chartPath(price, width, height, pad, yMax)}" fill="none" stroke="#b13a2f" stroke-width="2.3" stroke-dasharray="7 6" stroke-linecap="round" />
    <path d="${chartPath(homeLoad, width, height, pad, yMax)}" fill="none" stroke="#3765a3" stroke-width="3" stroke-linecap="round" />
    <path d="${chartPath(gridImport, width, height, pad, yMax)}" fill="none" stroke="#2e7d32" stroke-width="3" stroke-linecap="round" />
    <path d="${chartPath(soc, width, height, pad, yMax)}" fill="none" stroke="#087f8c" stroke-width="2.8" stroke-linecap="round" />
    ${state.focusTariff === "flat" ? "" : `<text x="${pad.left + (3 / 23) * chartWidth}" y="${pad.top + 18}" text-anchor="middle" fill="#2e7d32" font-size="12" font-weight="780">charge</text>`}
    ${scarcityLabel(state.focusTariff, width, pad, chartWidth, pad.top + 18)}
    ${axisLabels(width, height, pad, "Hour", "kW / normalized SOC")}
  `;

  document.getElementById("battery-cost-savings").textContent =
    money2.format(response.costSavings);
  document.getElementById("battery-peak-cut").textContent = pct.format(
    response.peakWindowReduction,
  );
  document.getElementById("battery-charge").textContent = `${num.format(
    response.chargedKwh,
  )} kWh`;
  document.getElementById("battery-rebound").textContent = `${num.format(
    response.offPeakReboundKwh,
  )} kWh`;
}

function renderAdoptionChart() {
  const svg = document.getElementById("adoption-chart");
  const width = 640;
  const height = 320;
  const pad = { top: 34, right: 24, bottom: 64, left: 78 };
  const data = tariffs.map((tariff) => ({
    tariff,
    economics: portfolioEconomics(tariff.id),
    study: caseStudyEconomics(tariff.id),
  }));
  const maxValue = Math.max(
      ...data.flatMap((item) => [
        item.economics.total.revenue,
        Math.max(0, item.economics.total.grossMargin),
      ]),
    );
  const yMax = Math.ceil((maxValue * 1.12) / 2500) * 2500;
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const groupWidth = chartWidth / data.length;
  const axisDollar = (value) => compactMoney(value);
  const yFor = (value) =>
    height - pad.bottom - (value / yMax) * chartHeight;
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((fraction) => {
      const value = yMax * fraction;
      const y = yFor(value);
      return `
        <line x1="${pad.left}" x2="${width - pad.right}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#d9e0e4" />
        <text x="${pad.left - 12}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#64717b" font-size="11" font-weight="700">${axisDollar(value)}</text>
      `;
    })
    .join("");
  const bars = data
    .map((item, index) => {
      const groupStart = pad.left + index * groupWidth;
      const x0 = groupStart + groupWidth * 0.25;
      const barWidth = groupWidth * 0.18;
      const gap = 10;
      const revenueHeight =
        (item.economics.total.revenue / yMax) * chartHeight;
      const marginHeight =
        (Math.max(0, item.economics.total.grossMargin) / yMax) * chartHeight;
      const revenueY = yFor(item.economics.total.revenue);
      const marginY = yFor(Math.max(0, item.economics.total.grossMargin));
      const marginX = x0 + barWidth + gap;
      const labelX = groupStart + groupWidth / 2;
      const marginPositive = item.study.marginDelta >= 0;
      return `
        <text x="${labelX.toFixed(1)}" y="16" text-anchor="middle" fill="${marginPositive ? "#2e7d32" : "#b13a2f"}" font-size="11" font-weight="820">${signedMoney(item.study.marginDelta)}</text>
        <rect x="${x0.toFixed(1)}" y="${revenueY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${revenueHeight.toFixed(1)}" fill="#b13a2f" opacity="0.78" />
        <rect x="${marginX.toFixed(1)}" y="${marginY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${marginHeight.toFixed(1)}" fill="#087f8c" opacity="0.82" />
        <text x="${(x0 + barWidth / 2).toFixed(1)}" y="${(revenueY - 6).toFixed(1)}" text-anchor="middle" fill="#b13a2f" font-size="10" font-weight="760">${axisDollar(item.economics.total.revenue)}</text>
        <text x="${(marginX + barWidth / 2).toFixed(1)}" y="${(marginY - 6).toFixed(1)}" text-anchor="middle" fill="#087f8c" font-size="10" font-weight="760">${axisDollar(item.economics.total.grossMargin)}</text>
        <text x="${labelX.toFixed(1)}" y="${height - 34}" text-anchor="middle" fill="#172026" font-size="12" font-weight="820">${item.tariff.name}</text>
        <text x="${labelX.toFixed(1)}" y="${height - 18}" text-anchor="middle" fill="#64717b" font-size="10" font-weight="720">margin delta ${signedMoney(item.study.marginDelta)}</text>
      `;
    })
    .join("");
  svg.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="#fbfcfd" />
    ${grid}
    <line x1="${pad.left}" x2="${width - pad.right}" y1="${height - pad.bottom}" y2="${height - pad.bottom}" stroke="#aab6bd" />
    <line x1="${pad.left}" x2="${pad.left}" y1="${pad.top}" y2="${height - pad.bottom}" stroke="#aab6bd" />
    <text x="${pad.left}" y="${height - 8}" fill="#64717b" font-size="11" font-weight="720">$ per ${num.format(portfolioSize)} homes, monthly</text>
    ${bars}
  `;
}

function sensitivityRows(kind, overrides = state) {
  const xValues =
    kind === "tou"
      ? Array.from(
          { length: Math.floor((5 - minimumTouPeakSpread()) / 0.1) + 1 },
          (_, index) => minimumTouPeakSpread() + index * 0.1,
        )
      : Array.from({ length: 31 }, (_, index) => index);
  const tariffId = kind === "tou" ? "tou" : "demand";
  const flat = portfolioEconomics("flat", overrides).total;
  return xValues.map((x) => {
    const scenario =
      kind === "tou"
        ? { ...overrides, spread: x }
        : { ...overrides, demandCharge: x };
    const economics = portfolioEconomics(tariffId, scenario).total;
    return {
      x,
      revenueDelta: economics.revenue - flat.revenue,
      marginDelta: economics.grossMargin - flat.grossMargin,
      peakKw: economics.peakKw,
    };
  });
}

function renderSensitivityChart(kind) {
  const svg = document.getElementById(
    kind === "tou" ? "tou-sensitivity-chart" : "demand-sensitivity-chart",
  );
  const metrics = document.getElementById(
    kind === "tou" ? "tou-sensitivity-metrics" : "demand-sensitivity-metrics",
  );
  const width = 640;
  const height = 320;
  const pad = { top: 28, right: 28, bottom: 54, left: 76 };
  const rows = sensitivityRows(kind);
  const xMin = rows[0].x;
  const xMax = rows[rows.length - 1].x;
  const maxAbs = Math.max(
    500,
    ...rows.flatMap((row) => [
      Math.abs(row.revenueDelta),
      Math.abs(row.marginDelta),
    ]),
  );
  const yMax = Math.ceil((maxAbs * 1.12) / 250) * 250;
  const yMin = -yMax;
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const xFor = (value) =>
    pad.left + ((value - xMin) / (xMax - xMin)) * chartWidth;
  const yFor = (value) =>
    pad.top + ((yMax - value) / (yMax - yMin)) * chartHeight;
  const pathFor = (key) =>
    rows
      .map((row, index) => {
        const x = xFor(row.x);
        const y = yFor(row[key]);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  const axisDollar = (value) => {
    if (Math.abs(value) < 1) return "$0";
    const prefix = value > 0 ? "+" : "-";
    const magnitude = Math.abs(value);
    return `${prefix}$${Math.round(magnitude / 100) / 10}k`;
  };
  const spreadLabel = (value) =>
    Number.isInteger(value)
      ? value.toFixed(1)
      : value.toFixed(2).replace(/0$/, "");
  const xLabel = (value) =>
    kind === "tou" ? `${spreadLabel(value)}x` : `$${Math.round(value)}`;
  const currentX =
    kind === "tou" ? effectiveTouSpread(state) : Number(state.demandCharge);
  const current =
    rows.reduce((closest, row) =>
      Math.abs(row.x - currentX) < Math.abs(closest.x - currentX)
        ? row
        : closest,
    );
  const currentScreenX = xFor(current.x);
  const grid = [-1, -0.5, 0, 0.5, 1]
    .map((fraction) => {
      const value = yMax * fraction;
      const y = yFor(value);
      return `
        <line x1="${pad.left}" x2="${width - pad.right}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${value === 0 ? "#aab6bd" : "#d9e0e4"}" stroke-width="${value === 0 ? "1.4" : "1"}" />
        <text x="${pad.left - 12}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#64717b" font-size="11" font-weight="700">${axisDollar(value)}</text>
      `;
    })
    .join("");
  const xTicks = rows
    .filter((row, index) =>
      kind === "tou" ? index % 3 === 0 || index === rows.length - 1 : index % 3 === 0,
    )
    .map((row) => {
      const x = xFor(row.x);
      return `
        <line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${height - pad.bottom}" y2="${height - pad.bottom + 5}" stroke="#aab6bd" />
        <text x="${x.toFixed(1)}" y="${height - 28}" text-anchor="middle" fill="#64717b" font-size="10" font-weight="700">${xLabel(row.x)}</text>
      `;
    })
    .join("");

  svg.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="#fbfcfd" />
    ${grid}
    <line x1="${pad.left}" x2="${width - pad.right}" y1="${height - pad.bottom}" y2="${height - pad.bottom}" stroke="#aab6bd" />
    <line x1="${pad.left}" x2="${pad.left}" y1="${pad.top}" y2="${height - pad.bottom}" stroke="#aab6bd" />
    ${xTicks}
    <path d="${pathFor("revenueDelta")}" fill="none" stroke="#b13a2f" stroke-width="3" stroke-linecap="round" />
    <path d="${pathFor("marginDelta")}" fill="none" stroke="#087f8c" stroke-width="3" stroke-linecap="round" />
    <line x1="${currentScreenX.toFixed(1)}" x2="${currentScreenX.toFixed(1)}" y1="${pad.top}" y2="${height - pad.bottom}" stroke="#172026" stroke-width="1.4" stroke-dasharray="5 5" />
    <circle cx="${currentScreenX.toFixed(1)}" cy="${yFor(current.revenueDelta).toFixed(1)}" r="4.5" fill="#b13a2f" stroke="#fff" stroke-width="2" />
    <circle cx="${currentScreenX.toFixed(1)}" cy="${yFor(current.marginDelta).toFixed(1)}" r="4.5" fill="#087f8c" stroke="#fff" stroke-width="2" />
    <text x="${currentScreenX.toFixed(1)}" y="${pad.top + 13}" text-anchor="middle" fill="#172026" font-size="10" font-weight="820">current</text>
    <text x="${pad.left}" y="${height - 8}" fill="#64717b" font-size="11" font-weight="720">${kind === "tou" ? "peak/off-peak spread" : "$/kW-month demand charge"}; deltas vs flat fixed-rate baseline</text>
    <text x="${width - pad.right - 92}" y="${pad.top + 15}" fill="#b13a2f" font-size="11" font-weight="820">Revenue</text>
    <text x="${width - pad.right - 92}" y="${pad.top + 32}" fill="#087f8c" font-size="11" font-weight="820">Gross margin</text>
  `;

  metrics.innerHTML = `
    <div class="mini-metric">
      <label>Current setting</label>
      <strong>${xLabel(current.x)}</strong>
    </div>
    <div class="mini-metric">
      <label>Revenue vs flat</label>
      <strong>${signedMoney(current.revenueDelta)}</strong>
    </div>
    <div class="mini-metric">
      <label>Margin vs flat</label>
      <strong>${signedMoney(current.marginDelta)}</strong>
    </div>
    <div class="mini-metric">
      <label>Portfolio peak</label>
      <strong>${num.format(current.peakKw)} kW</strong>
    </div>
  `;
}

function renderSensitivityCharts() {
  renderSensitivityChart("tou");
  renderSensitivityChart("demand");
}

function gridLines(width, height, pad, percentScale = false, yMax = 8) {
  let html = "";
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + i * ((height - pad.top - pad.bottom) / 4);
    const label = percentScale
      ? `${Math.round((1 - i / 4) * 100)}%`
      : `${((1 - i / 4) * yMax).toFixed(1)} kW`;
    html += `<line x1="${pad.left}" x2="${width - pad.right}" y1="${y}" y2="${y}" stroke="#d9e0e4" />
      <text x="${pad.left - 10}" y="${y + 4}" text-anchor="end" fill="#64717b" font-size="11">${label}</text>`;
  }
  return html;
}

function axisLabels(width, height, pad, xLabel, yLabel) {
  return `
    <line x1="${pad.left}" x2="${width - pad.right}" y1="${height - pad.bottom}" y2="${height - pad.bottom}" stroke="#aab6bd" />
    <line x1="${pad.left}" x2="${pad.left}" y1="${pad.top}" y2="${height - pad.bottom}" stroke="#aab6bd" />
    <text x="${width / 2}" y="${height - 12}" text-anchor="middle" fill="#64717b" font-size="12" font-weight="700">${xLabel}</text>
    <text x="16" y="${height / 2}" text-anchor="middle" fill="#64717b" font-size="12" font-weight="700" transform="rotate(-90, 16, ${height / 2})">${yLabel}</text>
  `;
}

function renderSummary() {
  const economics = portfolioEconomics(state.focusTariff);
  const flatPassive = inelasticSameRateEconomics("flat", state);
  const study = caseStudyEconomics(state.focusTariff);
  const delta = economics.total.revenue - flatPassive.revenue * portfolioSize;
  document.getElementById("summary-revenue-dollars").textContent =
    money.format(economics.total.revenue);
  document.getElementById("summary-revenue-note").textContent = `${money.format(
    Math.abs(delta),
  )} ${delta >= 0 ? "above" : "below"} passive flat baseline`;
  document.getElementById("summary-margin").textContent = money.format(
    economics.total.grossMargin,
  );
  document.getElementById("summary-margin-delta").textContent = signedMoney(
    study.marginDelta,
  );
  document.getElementById("summary-revenue-down-homes").textContent =
    `${num.format(study.revenueDownHomes)} / ${num.format(portfolioSize)}`;
  document.getElementById("summary-cost").textContent = money.format(
    economics.total.totalCost,
  );
  document.getElementById("summary-peak-kw").textContent = `${num.format(
    economics.total.peakKw,
  )} kW`;
  document.getElementById("summary-rate").textContent =
    economics.tariff.name;
}

function toCsv(rows) {
  const escape = (value) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return rows.map((row) => row.map(escape).join(",")).join("\n");
}

function scenarioCsv() {
  const rows = [
    [
      "model_layer",
      "rate_plan_focus",
      "tou_peak_spread",
      "thermostat_adjustment_f",
      "battery_kwh",
      "demand_charge_per_kw_month",
      "behavior",
      "device_case",
      "homes_in_modeled_portfolio",
      "tariff",
      "monthly_revenue_contribution",
      "monthly_cost_contribution",
      "monthly_margin_contribution",
      "revenue_per_home",
      "cost_per_home",
      "margin_per_home",
      "monthly_kwh_per_home",
      "revenue_delta_vs_inelastic_same_rate",
      "cost_avoided_vs_inelastic_same_rate",
      "margin_delta_vs_inelastic_same_rate",
      "peak_kw",
    ],
    ...allPopulationOutcomes().map((result) => [
      state.mode,
      state.focusTariff,
      state.spread,
      state.thermostat,
      state.battery,
      state.demandCharge,
      behaviorDefs[result.caseDef.behavior].name,
      deviceDefs[result.caseDef.device].name,
      result.homes.toFixed(2),
      result.tariff.name,
      (result.homes * result.economics.revenue).toFixed(2),
      (result.homes * result.economics.totalCost).toFixed(2),
      (result.homes * result.economics.grossMargin).toFixed(2),
      result.economics.revenue.toFixed(2),
      result.economics.totalCost.toFixed(2),
      result.economics.grossMargin.toFixed(2),
      result.economics.monthlyKwh.toFixed(2),
      result.revenueDelta.toFixed(2),
      result.avoidedCost.toFixed(2),
      result.marginDelta.toFixed(2),
      result.economics.peakKw.toFixed(3),
    ]),
  ];
  return toCsv(rows);
}

function optimizationCsv() {
  const rows = [
    [
      "model_layer",
      "objective",
      "realized_revenue_retention_min",
      "filing_neutrality_tolerance",
      "capacity_limit_kw",
      "demand_profile_count",
      "tariff",
      "candidate_value",
      "candidate_label",
      "rank_by_margin",
      "feasible",
      "fixed_rate_per_kwh",
      "off_peak_rate_per_kwh",
      "shoulder_rate_per_kwh",
      "peak_rate_per_kwh",
      "demand_charge_per_kw_month",
      "monthly_revenue",
      "monthly_total_cost",
      "monthly_margin",
      "revenue_delta_vs_flat",
      "cost_avoided_vs_flat",
      "margin_delta_vs_flat",
      "realized_revenue_retention",
      "filing_revenue_delta_pct",
      "capacity_slack_kw",
      "portfolio_peak_kw",
      "monthly_kwh",
    ],
  ];
  allOptimizations().forEach((result) => {
    const ranked = [...result.candidates].sort(
      (a, b) => b.objectiveValue - a.objectiveValue,
    );
    ranked.forEach((candidate, index) => {
      rows.push([
        state.mode,
        "maximize_margin_subject_to_revenue_defense",
        optimizationConfig.revenueRetentionMin,
        optimizationConfig.filingNeutralTolerance,
        optimizationConfig.maxPeakKw,
        demandProfileEnsemble.length,
        tariffById(candidate.tariffId).name,
        candidate.value,
        optimizerDecisionLabel(candidate.kind, candidate.value),
        index + 1,
        candidate.feasible,
        candidate.rates.fixedRate,
        candidate.rates.offPeakRate,
        candidate.rates.shoulderRate,
        candidate.rates.peakRate,
        candidate.rates.demandCharge,
        candidate.economics.revenue.toFixed(2),
        candidate.economics.totalCost.toFixed(2),
        candidate.economics.grossMargin.toFixed(2),
        candidate.revenueDelta.toFixed(2),
        candidate.avoidedCost.toFixed(2),
        candidate.marginDelta.toFixed(2),
        candidate.revenueRetention.toFixed(4),
        candidate.filing.deltaPct.toFixed(4),
        candidate.capacitySlackKw.toFixed(3),
        candidate.economics.peakKw.toFixed(3),
        candidate.economics.monthlyKwh.toFixed(2),
      ]);
    });
  });
  return toCsv(rows);
}

function loadCsv() {
  const rows = [
    [
      "source",
      "profile_day",
      "hour",
      "hvac_kw",
      "water_heating_kw",
      "lighting_kw",
      "appliances_kw",
      "plug_other_kw",
      "total_kw",
    ],
    ...endUseProfile.map((row) => [
      "NLR/OEDI EULP 2021 ResStock AMY2018 IL single-family detached",
      "2018-06-30",
      row.hour,
      row.hvac,
      row.waterHeating,
      row.lighting,
      row.appliances,
      row.plugOther,
      row.total,
    ]),
  ];
  return toCsv(rows);
}

function hvacCsv() {
  const response = hvacResponse(state, state.focusTariff);
  const rows = [
    [
      "model_layer",
      "rate_plan_focus",
      "tou_peak_spread",
      "thermostat_adjustment_f",
      "demand_charge_per_kw_month",
      "profile_day",
      "hour",
      "price_signal_per_kwh",
      "baseline_hvac_kw",
      "optimized_hvac_kw",
      "baseline_total_kw",
      "optimized_total_kw",
      "action",
    ],
    ...response.rows.map((row) => [
      state.mode,
      state.focusTariff,
      state.spread,
      state.thermostat,
      state.demandCharge,
      "2018-06-30",
      row.hour,
      row.price.toFixed(4),
      row.baselineHvac.toFixed(4),
      row.optimizedHvac.toFixed(4),
      row.baselineTotal.toFixed(4),
      row.optimizedTotal.toFixed(4),
      row.action,
    ]),
  ];
  return toCsv(rows);
}

function batteryCsv() {
  const response = batteryResponse(state, state.focusTariff);
  const rows = [
    [
      "model_layer",
      "rate_plan_focus",
      "tou_peak_spread",
      "battery_kwh",
      "demand_charge_per_kw_month",
      "profile_day",
      "hour",
      "price_signal_per_kwh",
      "home_load_kw",
      "grid_import_kw",
      "charge_kw",
      "discharge_kw",
      "soc_kwh",
      "soc_pct",
      "action",
    ],
    ...response.rows.map((row) => [
      state.mode,
      state.focusTariff,
      state.spread,
      state.battery,
      state.demandCharge,
      "2018-06-30",
      row.hour,
      row.price.toFixed(4),
      row.homeLoad.toFixed(4),
      row.gridImport.toFixed(4),
      row.chargeKw.toFixed(4),
      row.dischargeKw.toFixed(4),
      row.socKwh.toFixed(4),
      row.socPct.toFixed(4),
      row.action,
    ]),
  ];
  return toCsv(rows);
}

function download(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function render() {
  state.spread = effectiveTouSpread(state);
  const spreadText = Number(state.spread).toFixed(2).replace(/\.00$/, ".0");
  document.getElementById("spread-value").textContent = spreadText;
  document.getElementById("spread").value = state.spread;
  document.getElementById("matrix-spread-value").textContent = spreadText;
  document.getElementById("matrix-spread").value = state.spread;
  document.getElementById("battery-value").textContent = state.battery;
  document.getElementById("battery").value = state.battery;
  document.getElementById("demand-charge-value").textContent =
    state.demandCharge;
  document.getElementById("demand-charge").value = state.demandCharge;
  document.getElementById("matrix-demand-charge-value").textContent =
    state.demandCharge;
  document.getElementById("matrix-demand-ratio-value").textContent = (
    Number(state.demandCharge) / 20
  ).toFixed(2);
  document.getElementById("matrix-demand-charge").value =
    state.demandCharge;
  document.getElementById("thermostat").value = state.thermostat;
  renderPopulationControls();
  renderSummary();
  renderCaseStudy();
  renderRateCards();
  renderOptimizer();
  renderSensitivityCharts();
  renderPopulationChart();
  renderSelectedCaseDetail();
  renderTable();
  renderLoadChart();
  renderHvacChart();
  renderBatteryChart();
  renderAdoptionChart();
}

document.querySelectorAll("[data-tariff]").forEach((button) => {
  button.addEventListener("click", () => {
    state.focusTariff = button.dataset.tariff;
    document
      .querySelectorAll("[data-tariff]")
      .forEach((el) => el.classList.toggle("active", el === button));
    render();
  });
});

document.getElementById("spread").addEventListener("input", (event) => {
  state.spread = Number(event.target.value);
  render();
});

document.getElementById("demand-charge").addEventListener("input", (event) => {
  state.demandCharge = Number(event.target.value);
  render();
});

document.getElementById("matrix-spread").addEventListener("input", (event) => {
  state.spread = Number(event.target.value);
  render();
});

document.getElementById("matrix-demand-charge").addEventListener("input", (event) => {
  state.demandCharge = Number(event.target.value);
  render();
});

document.getElementById("optimizer-cards").addEventListener("click", (event) => {
  const button = event.target.closest("[data-apply-optimized]");
  if (!button) return;
  const kind = button.dataset.applyOptimized;
  const optimized = optimizeTariff(kind, state).best;
  if (kind === "tou") {
    state.spread = optimized.value;
  } else {
    state.demandCharge = Math.round(optimized.value);
  }
  state.focusTariff = optimized.tariffId;
  document
    .querySelectorAll("[data-tariff]")
    .forEach((el) =>
      el.classList.toggle("active", el.dataset.tariff === state.focusTariff),
    );
  render();
});

document.getElementById("battery").addEventListener("input", (event) => {
  state.battery = Number(event.target.value);
  render();
});

document.getElementById("thermostat").addEventListener("change", (event) => {
  state.thermostat = Number(event.target.value);
  render();
});

document.getElementById("population-inputs").addEventListener("input", (event) => {
  const input = event.target.closest("[data-population]");
  if (!input) return;
  const bucket = state.population.find((item) => item.id === input.dataset.population);
  if (!bucket) return;
  bucket.homes = clamp(Number(input.value), 0, 100);
  render();
});

document
  .querySelectorAll("details.collapsible-section:not([data-persistent])")
  .forEach((detail) => {
    detail.addEventListener("toggle", () => {
      if (!detail.open) return;
      document
        .querySelectorAll("details.collapsible-section:not([data-persistent])")
        .forEach((other) => {
          if (other !== detail) other.open = false;
        });
    });
  });

document
  .getElementById("download-scenarios")
  .addEventListener("click", () => {
    download("utility_rm_scenario_results.csv", scenarioCsv());
  });

document
  .getElementById("download-optimization")
  .addEventListener("click", () => {
    download("utility_rm_tariff_optimization.csv", optimizationCsv());
  });

document.getElementById("download-load").addEventListener("click", () => {
  download("utility_rm_load_profile.csv", loadCsv());
});

document.getElementById("download-hvac").addEventListener("click", () => {
  download("utility_rm_hvac_response.csv", hvacCsv());
});

document.getElementById("download-battery").addEventListener("click", () => {
  download("utility_rm_battery_response.csv", batteryCsv());
});

render();
