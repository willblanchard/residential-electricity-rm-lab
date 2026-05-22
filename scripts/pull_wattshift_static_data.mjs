#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const dataDir = resolve(root, "data");

const defaultZips = [
  "95313", // PG&E / Modesto
  "94701", // PG&E / Berkeley
  "92401", // SoCal Edison
  "91911", // SDG&E
  "11002", // Con Edison
  "20817", // Pepco
  "48103", // DTE
  "60601", // ComEd
];

const args = new Map(
  process.argv.slice(2).flatMap((arg, index, all) => {
    if (!arg.startsWith("--")) return [];
    const [key, inlineValue] = arg.slice(2).split("=");
    const next = all[index + 1];
    const value = inlineValue ?? (next && !next.startsWith("--") ? next : "true");
    return [[key, value]];
  }),
);

const baseUrl = (args.get("base-url") || process.env.WATTSHIFT_BASE_URL || "https://api.wattshift.com/v1").replace(/\/$/, "");
const zips = (args.get("zips") || defaultZips.join(","))
  .split(",")
  .map((zip) => zip.trim())
  .filter(Boolean);
const maxRatePlans = Number(args.get("max-rate-plans") || process.env.WATTSHIFT_MAX_RATE_PLANS || 12);
const billYear = Number(args.get("bill-year") || "2026");
const billMonth = Number(args.get("bill-month") || "7");
const effectiveOnDate = Math.floor(new Date(`${billYear}-${String(billMonth).padStart(2, "0")}-15T12:00:00Z`).getTime() / 1000);

async function readStdin() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return text.trim();
}

const apiKey = args.has("stdin-key")
  ? await readStdin()
  : process.env.WATTSHIFT_API_KEY;

if (!apiKey) {
  console.error("Missing API key. Set WATTSHIFT_API_KEY or pass --stdin-key and pipe the key on stdin.");
  process.exit(1);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
}

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ws-api-key": apiKey,
    },
    body: JSON.stringify(body ?? {}),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      (typeof data === "string" ? data.slice(0, 300) : `HTTP ${response.status}`);
    throw new Error(`${path} failed: ${message}`);
  }
  return data;
}

function flattenRatePlans(zip, response) {
  const utilities = Array.isArray(response) ? response : [response];
  return utilities.flatMap((utility) =>
    (utility.ratePlans || []).map((ratePlan) => ({
      zip,
      utilityId: utility.utilityId || "",
      utilityName: utility.utilityName || "",
      ratePlanId: ratePlan.id || ratePlan.ratePlanId || "",
      rateID: ratePlan.rateID || "",
      udId: ratePlan.udId || "",
      ratePlanName:
        ratePlan.ratePlanName ||
        ratePlan.name ||
        ratePlan.ratePlanDisplayName ||
        "",
      supportedType: ratePlan.supportedType || "",
    })),
  );
}

function pickRepresentativeRatePlans(ratePlans) {
  const seen = new Set();
  const targetNames = [
    /E-TOU-C/i,
    /E-TOU-B/i,
    /E-ELEC/i,
    /TOU-D PRIME/i,
    /TOU-DR/i,
    /SC-1.*Time-of-Use/i,
    /R-TOU-P/i,
    /Hourly Pricing/i,
    /Time of Day/i,
    /Time of Use/i,
    /TOU/i,
    /peak/i,
  ];

  function score(plan) {
    const name = plan.ratePlanName || "";
    const targetIndex = targetNames.findIndex((pattern) => pattern.test(name));
    const targetScore = targetIndex === -1 ? 50 : targetIndex;
    const supportedScore = plan.supportedType === "optimizable" ? 0 : 20;
    const evPenalty = /\bEV\b|Electric Vehicle/i.test(name) ? 10 : 0;
    return supportedScore + targetScore + evPenalty;
  }

  const byZip = new Map();
  for (const plan of ratePlans.filter((candidate) => candidate.ratePlanId)) {
    if (!byZip.has(plan.zip)) byZip.set(plan.zip, []);
    byZip.get(plan.zip).push(plan);
  }

  const selected = [];
  for (const zip of zips) {
    const best = (byZip.get(zip) || []).sort((a, b) => score(a) - score(b))[0];
    if (best && !seen.has(best.ratePlanId)) {
      selected.push(best);
      seen.add(best.ratePlanId);
    }
  }

  const fill = ratePlans
    .filter((plan) => plan.ratePlanId && !seen.has(plan.ratePlanId))
    .sort((a, b) => score(a) - score(b));
  for (const plan of fill) {
    if (selected.length >= maxRatePlans) break;
    selected.push(plan);
    seen.add(plan.ratePlanId);
  }

  return selected.slice(0, maxRatePlans);
}

async function loadBuildingProfiles() {
  const text = await readFile(resolve(dataDir, "building_demand_models_hourly.csv"), "utf8");
  const lines = text.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith(",,,"));
  const headerIndex = lines.findIndex((line) => line.startsWith("Building ID,"));
  const rows = lines.slice(headerIndex + 1).map((line) => {
    const parts = line.split(",");
    const values = parts.slice(1, 25).map(Number);
    const peakKw = Math.max(...values);
    return {
      buildingId: parts[0],
      hourlyKw: values,
      dailyKwh: values.reduce((sum, value) => sum + value, 0),
      peakKw,
      peakHour: values.indexOf(peakKw),
    };
  });
  rows.sort((a, b) => a.peakKw - b.peakKw);
  return [
    { segment: "low_peak", ...rows[0] },
    { segment: "median_peak", ...rows[Math.floor(rows.length / 2)] },
    { segment: "high_peak", ...rows[rows.length - 1] },
  ];
}

function usageForProfile(profile) {
  return [
    profile.hourlyKw.flatMap((kw) =>
      Array.from({ length: 4 }, () => Number((kw * 0.25).toFixed(6))),
    ),
  ];
}

function summarizeBillResponse(data) {
  const candidates = [
    data?.totalCost,
    data?.bill,
    data?.cost,
    data?.totalBill,
    data?.billTotal,
    data?.baselineCost,
    data?.ratePlanCost,
  ];
  const numeric = candidates.find((value) => Number.isFinite(Number(value)));
  return {
    totalCost: numeric === undefined ? "" : Number(numeric),
    rawKeys: data && typeof data === "object" ? Object.keys(data).join("|") : "",
  };
}

function priceRows(ratePlan, signal) {
  const hourly = signal?.hourlyData || signal?.data || [];
  if (!Array.isArray(hourly)) return [];
  return hourly.map((row, index) => ({
    ratePlanId: ratePlan.ratePlanId,
    utilityName: ratePlan.utilityName,
    ratePlanName: ratePlan.ratePlanName,
    interval: index,
    startTime: row.startTime || row.start || "",
    endTime: row.endTime || row.end || "",
    price: row.price ?? row.import ?? "",
  }));
}

await mkdir(dataDir, { recursive: true });

console.log(`Pulling WattShift data from ${baseUrl}`);
console.log(`ZIPs: ${zips.join(", ")}`);

const utilityRaw = {};
let allRatePlans = [];

for (const zip of zips) {
  try {
    const response = await post("/utility/get", {
      zipcode: zip,
      detailLevel: "minimal",
      pageSize: 50,
      effectiveOnDate,
    });
    utilityRaw[zip] = response;
    const plans = flattenRatePlans(zip, response);
    allRatePlans = allRatePlans.concat(plans);
    console.log(`- ${zip}: ${plans.length} rate plan(s)`);
  } catch (error) {
    utilityRaw[zip] = { error: error.message };
    console.log(`- ${zip}: ${error.message}`);
  }
}

const selectedRatePlans = pickRepresentativeRatePlans(allRatePlans);
console.log(`Selected ${selectedRatePlans.length} rate plan(s) for price/bill pulls`);

const start = new Date(Date.UTC(billYear, billMonth - 1, 15, 0, 0, 0));
const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
const priceSignals = [];
const priceSignalRaw = {};

for (const plan of selectedRatePlans) {
  try {
    const signal = await post(`/homes/price_signal/rate_plan/${encodeURIComponent(plan.ratePlanId)}`, {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });
    priceSignalRaw[plan.ratePlanId] = signal;
    priceSignals.push(...priceRows(plan, signal));
    console.log(`- price signal ${plan.ratePlanId}: ${priceRows(plan, signal).length} row(s)`);
  } catch (error) {
    priceSignalRaw[plan.ratePlanId] = { error: error.message, ratePlan: plan };
    console.log(`- price signal ${plan.ratePlanId}: ${error.message}`);
  }
}

const profiles = await loadBuildingProfiles();
const billRows = [];
const billRaw = {};

for (const plan of selectedRatePlans.slice(0, Math.min(6, selectedRatePlans.length))) {
  for (const profile of profiles) {
    try {
      const payload = {
        usage: usageForProfile(profile),
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        debug: false,
      };
      const result = await post(
        `/homes/bill/period/rateplan/${encodeURIComponent(plan.ratePlanId)}`,
        payload,
      );
      const summary = summarizeBillResponse(result);
      billRaw[`${plan.ratePlanId}:${profile.buildingId}`] = result;
      billRows.push({
        ratePlanId: plan.ratePlanId,
        utilityName: plan.utilityName,
        ratePlanName: plan.ratePlanName,
        buildingId: profile.buildingId,
        segment: profile.segment,
        dailyKwh: profile.dailyKwh,
        peakKw: profile.peakKw,
        peakHour: profile.peakHour,
        billCost: summary.totalCost,
        rawKeys: summary.rawKeys,
      });
      console.log(`- bill ${plan.ratePlanId} / ${profile.segment}: ${summary.totalCost || "ok"}`);
    } catch (error) {
      billRaw[`${plan.ratePlanId}:${profile.buildingId}`] = {
        error: error.message,
        ratePlan: plan,
        profile: profile.buildingId,
      };
      billRows.push({
        ratePlanId: plan.ratePlanId,
        utilityName: plan.utilityName,
        ratePlanName: plan.ratePlanName,
        buildingId: profile.buildingId,
        segment: profile.segment,
        dailyKwh: profile.dailyKwh,
        peakKw: profile.peakKw,
        peakHour: profile.peakHour,
        billCost: "",
        rawKeys: `ERROR: ${error.message}`,
      });
      console.log(`- bill ${plan.ratePlanId} / ${profile.segment}: ${error.message}`);
    }
  }
}

await writeFile(resolve(dataDir, "wattshift_utility_raw.json"), JSON.stringify(utilityRaw, null, 2));
await writeFile(resolve(dataDir, "wattshift_price_signals_raw.json"), JSON.stringify(priceSignalRaw, null, 2));
await writeFile(resolve(dataDir, "wattshift_bill_estimates_raw.json"), JSON.stringify(billRaw, null, 2));

await writeFile(
  resolve(dataDir, "wattshift_rate_plans.csv"),
  toCsv([
    ["zip", "utility_id", "utility_name", "rate_plan_id", "rate_id", "ud_id", "rate_plan_name", "supported_type"],
    ...allRatePlans.map((plan) => [
      plan.zip,
      plan.utilityId,
      plan.utilityName,
      plan.ratePlanId,
      plan.rateID,
      plan.udId,
      plan.ratePlanName,
      plan.supportedType,
    ]),
  ]),
);

await writeFile(
  resolve(dataDir, "wattshift_selected_rate_plans.csv"),
  toCsv([
    ["zip", "utility_id", "utility_name", "rate_plan_id", "rate_id", "ud_id", "rate_plan_name", "supported_type"],
    ...selectedRatePlans.map((plan) => [
      plan.zip,
      plan.utilityId,
      plan.utilityName,
      plan.ratePlanId,
      plan.rateID,
      plan.udId,
      plan.ratePlanName,
      plan.supportedType,
    ]),
  ]),
);

await writeFile(
  resolve(dataDir, "wattshift_price_signals.csv"),
  toCsv([
    ["rate_plan_id", "utility_name", "rate_plan_name", "interval", "start_time", "end_time", "price"],
    ...priceSignals.map((row) => [
      row.ratePlanId,
      row.utilityName,
      row.ratePlanName,
      row.interval,
      row.startTime,
      row.endTime,
      row.price,
    ]),
  ]),
);

await writeFile(
  resolve(dataDir, "wattshift_bill_estimates.csv"),
  toCsv([
    [
      "rate_plan_id",
      "utility_name",
      "rate_plan_name",
      "building_id",
      "segment",
      "daily_kwh",
      "peak_kw",
      "peak_hour",
      "bill_cost",
      "raw_keys",
    ],
    ...billRows.map((row) => [
      row.ratePlanId,
      row.utilityName,
      row.ratePlanName,
      row.buildingId,
      row.segment,
      row.dailyKwh.toFixed(4),
      row.peakKw.toFixed(4),
      row.peakHour,
      row.billCost,
      row.rawKeys,
    ]),
  ]),
);

console.log("Wrote:");
console.log("- data/wattshift_rate_plans.csv");
console.log("- data/wattshift_selected_rate_plans.csv");
console.log("- data/wattshift_price_signals.csv");
console.log("- data/wattshift_bill_estimates.csv");
console.log("- raw JSON companion files");
