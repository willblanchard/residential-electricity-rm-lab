import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const profilesSource = fs.readFileSync("profiles.js", "utf8");
const profileJson = profilesSource.match(
  /window\.buildingDemandProfiles = (.*);/s,
)?.[1];
assert.ok(profileJson, "profiles.js should expose buildingDemandProfiles");

const appSource = fs.readFileSync("app.js", "utf8");
const context = {
  console,
  document: {
    getElementById() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  },
  globalThis: {
    buildingDemandProfiles: JSON.parse(profileJson),
  },
};
context.window = context.globalThis;
vm.createContext(context);
vm.runInContext(appSource, context);
const model = context.window.utilitySingleRateModel;

assert.equal(model.demandProfileEnsemble.length, 100);
assert.equal(model.nathanLpCalibration.buildingCount, 100);
assert.equal(model.nathanLpCalibration.capacityKwPer100Homes, 272);
assert.equal(model.nathanLpCalibration.wtpResponseEnabled, false);

const edge = {
  ...model.state,
  spread: 1,
  demandCharge: 0,
  population: model.state.population.map((item) => ({ ...item })),
};
const flat = model.portfolioEconomics("flat", edge).total;
for (const tariffId of ["tou", "demand"]) {
  const economics = model.portfolioEconomics(tariffId, edge).total;
  for (const key of ["revenue", "totalCost", "grossMargin", "monthlyKwh", "peakKw"]) {
    assert.equal(
      Number((economics[key] - flat[key]).toFixed(6)),
      0,
      `${tariffId} ${key} should match flat at the no-signal boundary`,
    );
  }
}

const highDemand = {
  ...model.state,
  spread: 1.5,
  demandCharge: 30,
  battery: 10,
  thermostat: 3,
  population: model.state.population.map((item) => ({ ...item })),
};
const caseById = (id) => model.populationCases.find((item) => item.id === id);
const demandNoDevice = model.economicsForCase(
  caseById("passive-none"),
  "demand",
  highDemand,
);
const demandBattery = model.economicsForCase(
  caseById("passive-battery"),
  "demand",
  highDemand,
);
const demandPassiveBoth = model.economicsForCase(
  caseById("passive-both"),
  "demand",
  highDemand,
);
const demandElasticBoth = model.economicsForCase(
  caseById("elastic-both"),
  "demand",
  highDemand,
);
assert.ok(
  demandBattery.peakKw < demandNoDevice.peakKw * 0.85,
  "demand-charge battery dispatch should materially lower billable peak",
);
assert.ok(
  demandPassiveBoth.peakKw < demandNoDevice.peakKw * 0.9,
  "passive thermostat+battery should compose thermostat response with battery peak shaving",
);
assert.ok(
  demandElasticBoth.peakKw < demandNoDevice.peakKw * 0.9,
  "elastic thermostat+battery should compose elastic, thermostat, and battery response",
);

const mildTou = {
  ...model.state,
  spread: 1.25,
  demandCharge: 20,
  battery: 10,
  thermostat: 3,
  population: model.state.population.map((item) => ({ ...item })),
};
const mildBatteryRows = model.homeRowsForCase(
  "passive",
  "battery",
  mildTou,
  "tou",
);
assert.ok(
  model.batteryDispatchEconomics("tou", mildTou).dispatchFactor <= 0,
  "battery should require TOU spread to clear efficiency and wear",
);
assert.equal(
  mildBatteryRows.some((row) => row.chargeKw > 0 || row.dischargeKw > 0),
  false,
  "battery should stay idle below the arbitrage hurdle",
);
const mildThermostatRows = model.homeRowsForCase(
  "passive",
  "thermostat",
  mildTou,
  "tou",
);
assert.ok(
  mildThermostatRows.some((row) => row.action !== "baseline"),
  "thermostat response should remain available below the battery arbitrage hurdle",
);

const thermostatSweep = Array.from({ length: 15 }, (_, index) => {
  const spread = Number((1 + index * 0.1).toFixed(1));
  return model.hvacResponse(
    {
      ...model.state,
      spread,
      battery: 0,
      thermostat: 3,
      population: model.state.population.map((item) => ({ ...item })),
    },
    "tou",
  ).removedKwh;
});
const thermostatIncrements = thermostatSweep
  .slice(1)
  .map((value, index) => value - thermostatSweep[index]);
assert.ok(
  thermostatIncrements.every((increment) => increment > 0),
  "thermostat response should increase smoothly as TOU spread rises",
);
const largestThermostatAcceleration = Math.max(
  ...thermostatIncrements.slice(1).map((increment, index) =>
    Math.abs(increment - thermostatIncrements[index]),
  ),
);
assert.ok(
  largestThermostatAcceleration < 0.02,
  "thermostat response should not contain a hard spread threshold",
);

const assertRowsMatch = (actual, expected, label) => {
  assert.equal(actual.length, expected.length, `${label} row count`);
  actual.forEach((row, index) => {
    for (const key of ["homeLoad", "gridImport", "capacityGridImport", "chargeKw", "dischargeKw"]) {
      assert.equal(
        Number((row[key] - expected[index][key]).toFixed(8)),
        0,
        `${label} ${key} hour ${row.hour}`,
      );
    }
    assert.equal(
      row.action.includes("coordinated"),
      false,
      `${label} should not use a special coordinated action`,
    );
  });
};

const activeScenarios = [
  { tariffId: "tou", overrides: { ...model.state, spread: 2.2, demandCharge: 20 } },
  { tariffId: "demand", overrides: { ...model.state, spread: 2, demandCharge: 30 } },
];
for (const { tariffId, overrides } of activeScenarios) {
  const scenario = {
    ...overrides,
    battery: 10,
    thermostat: 3,
    population: model.state.population.map((item) => ({ ...item })),
  };
  for (const behavior of ["passive", "elastic"]) {
    const thermostatRows = model.homeRowsForCase(
      behavior,
      "thermostat",
      scenario,
      tariffId,
    );
    const composedRows = model.batteryDispatchForLoad(
      thermostatRows,
      scenario,
      tariffId,
    ).rows;
    const bothRows = model.homeRowsForCase(behavior, "both", scenario, tariffId);
    assertRowsMatch(
      bothRows,
      composedRows,
      `${tariffId} ${behavior} thermostat+battery composition`,
    );
  }
}

for (const kind of ["tou"]) {
  const result = model.optimizeTariff(kind, model.state);
  assert.ok(result.best.feasible, `${kind} optimizer should find a feasible point`);
  assert.ok(
    result.best.economics.peakKw <= model.optimizationConfig.maxPeakKw,
    `${kind} optimizer should satisfy peak capacity screen`,
  );
  assert.ok(
    Math.abs(result.best.filing.deltaPct) <=
      model.optimizationConfig.filingNeutralTolerance,
    `${kind} optimizer should satisfy filing neutrality tolerance`,
  );
}

const demandOptimization = model.optimizeTariff("demand", model.state);
const filingNeutralDemandCandidates = demandOptimization.candidates.filter(
  (candidate) =>
    Math.abs(candidate.filing.deltaPct) <=
    model.optimizationConfig.filingNeutralTolerance,
);
assert.ok(
  filingNeutralDemandCandidates.some((candidate) => candidate.revenueRetention < 1),
  "demand optimizer should allow customer bill savings instead of imposing a revenue retention floor",
);
if (demandOptimization.feasibleCandidates.length > 0) {
  assert.ok(
    demandOptimization.best.feasible,
    "demand optimizer should prefer a capacity- and filing-feasible point when one exists",
  );
} else {
  assert.ok(
    filingNeutralDemandCandidates.every(
      (candidate) =>
        candidate.economics.peakKw > model.optimizationConfig.maxPeakKw,
    ),
    "demand optimizer should only report no feasible point when filing-neutral candidates miss the capacity screen",
  );
  assert.equal(
    demandOptimization.best.feasible,
    false,
    "demand optimizer fallback should remain marked as a constraint violation",
  );
}

const optimizationCsv = model.optimizationCsv();
assert.equal(optimizationCsv.split("\n").length, 1 + 41 + 51);
assert.match(
  optimizationCsv,
  /capacity_limit_kw,capacity_limit_kw_per_100_homes,(phase3_wtp_status,phase3_)?wtp_reference_price,demand_profile_count,calibration_source/,
);

const forbiddenLegacyNames = [
  "function scenarioFor",
  "function renderMatrix",
  "const segments",
];
for (const name of forbiddenLegacyNames) {
  assert.equal(appSource.includes(name), false, `${name} should stay removed`);
}

const phase2Source = fs.readFileSync("phase2.js", "utf8");
const phase2ModelSource = phase2Source.slice(
  0,
  phase2Source.indexOf('\ndocument.getElementById("phase2-menu")'),
);
vm.runInContext(
  `${phase2ModelSource}
  globalThis.__phase2Model = {
    state,
    evaluateRequiredPlan,
    evaluateOptionalMenu,
  };`,
  context,
);
const phase2 = context.globalThis.__phase2Model;
const singleRatePoint = (kind, x) =>
  model.sensitivityRows(kind, model.state).find((row) => row.x === x);
assert.equal(
  Math.round(phase2.evaluateRequiredPlan("tou", { ...phase2.state, spread: 2 }).marginDelta),
  Math.round(singleRatePoint("tou", 2).marginDelta),
  "phase2 Required TOU should reuse the single-price TOU margin curve",
);
assert.equal(
  Math.round(
    phase2.evaluateRequiredPlan("demand", { ...phase2.state, demandCharge: 20 }).marginDelta,
  ),
  Math.round(singleRatePoint("demand", 20).marginDelta),
  "phase2 Required demand should reuse the single-price demand margin curve",
);

const phase2RequiredTou = phase2.evaluateRequiredPlan("tou", {
  ...phase2.state,
  spread: 2,
});
assert.equal(
  Math.round(phase2RequiredTou.baselineRevenue),
  Math.round(model.portfolioEconomics("flat", model.state).total.revenue),
  "phase2 required plans should use the single-price flat baseline",
);

const optionalTouNoSignal = phase2.evaluateOptionalMenu("tou", {
  ...phase2.state,
  spread: 1,
});
const optionalTouCurrent = phase2.evaluateOptionalMenu("tou", {
  ...phase2.state,
  spread: 2,
});
assert.equal(
  Math.round(optionalTouNoSignal.switchHomes),
  0,
  "optional TOU should have no switchers when the shared model has no TOU savings",
);
assert.ok(
  optionalTouCurrent.switchHomes > optionalTouNoSignal.switchHomes,
  "optional plan adoption should be recalculated from modeled savings at each price point",
);

assert.equal(
  phase2Source.includes("single-rate-reference-frame"),
  false,
  "phase2 should not depend on a hidden reference iframe",
);
assert.equal(
  phase2Source.includes("evaluateRequiredPlanFallback"),
  false,
  "phase2 should fail closed instead of falling back to the opt-in proxy for required plans",
);
for (const stalePhase2Proxy of [
  "segment.savings",
  "segment.avoided",
  "demandEnergyRate",
  "demandPlanOutcome",
  "demandResponseStrength",
  "demandPeakAfterResponse",
]) {
  assert.equal(
    phase2Source.includes(stalePhase2Proxy),
    false,
    `${stalePhase2Proxy} should stay out of phase2 economics`,
  );
}
