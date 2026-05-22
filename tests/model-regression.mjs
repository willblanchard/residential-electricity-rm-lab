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
    optimizationConfig,
    portfolioEconomics,
    optimizeTariff,
    optimizationCsv,
  };`,
  context,
);
const model = context.globalThis.__model;

assert.equal(model.demandProfileEnsemble.length, 100);

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

for (const kind of ["tou", "demand"]) {
  const result = model.optimizeTariff(kind, model.state);
  assert.ok(result.best.feasible, `${kind} optimizer should find a feasible point`);
  assert.ok(
    result.best.revenueRetention >= model.optimizationConfig.revenueRetentionMin,
    `${kind} optimizer should satisfy revenue retention`,
  );
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

const optimizationCsv = model.optimizationCsv();
assert.equal(optimizationCsv.split("\n").length, 1 + 41 + 31);
assert.match(optimizationCsv, /capacity_limit_kw,demand_profile_count/);

const forbiddenLegacyNames = [
  "function scenarioFor",
  "function renderMatrix",
  "const segments",
];
for (const name of forbiddenLegacyNames) {
  assert.equal(appSource.includes(name), false, `${name} should stay removed`);
}
