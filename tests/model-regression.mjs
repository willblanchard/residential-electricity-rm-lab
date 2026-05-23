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
  demandPassiveBoth.grossMargin < 0,
  "passive thermostat+battery should reach negative margin at the high demand charge",
);
assert.ok(
  demandElasticBoth.grossMargin < 0,
  "elastic thermostat+battery should reach negative margin at the high demand charge",
);

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
assert.ok(
  demandOptimization.feasibleCandidates.length > 0,
  "demand optimizer should allow customer bill savings instead of imposing a revenue retention floor",
);
assert.ok(
  demandOptimization.best.feasible,
  "demand optimizer should find a capacity- and filing-feasible point",
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
