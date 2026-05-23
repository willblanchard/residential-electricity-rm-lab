import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const profilesSource = fs.readFileSync("profiles.js", "utf8");
const profileJson = profilesSource.match(
  /window\.buildingDemandProfiles = (.*);/s,
)?.[1];
assert.ok(profileJson, "profiles.js should expose buildingDemandProfiles");

const appSource = fs.readFileSync("app.js", "utf8");
const modelSource = appSource.split("function download")[0];
const context = {
  console,
  globalThis: {
    buildingDemandProfiles: JSON.parse(profileJson),
  },
};
context.window = context.globalThis;
vm.createContext(context);
vm.runInContext(
  `${modelSource}
  globalThis.__model = {
    demandProfileEnsemble,
	    state,
	    populationCases,
	    optimizationConfig,
	    nathanLpCalibration,
	    economicsForCase,
	    portfolioEconomics,
	    homeRowsForCase,
	    batteryDispatchForLoad,
	    batteryDispatchEconomics,
	    optimizeTariff,
	    optimizationCsv,
  };`,
  context,
);
const model = context.globalThis.__model;

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
assert.equal(
  demandOptimization.feasibleCandidates.length,
  0,
  "demand optimizer should expose that no candidate clears capacity and filing neutrality",
);
assert.equal(
  demandOptimization.best.feasible,
  false,
  "demand optimizer fallback should remain marked as a constraint violation",
);
assert.ok(
  demandOptimization.best.objectiveValue > demandOptimization.candidates[0].objectiveValue,
  "demand optimizer fallback should still choose the best available frontier point",
);

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
