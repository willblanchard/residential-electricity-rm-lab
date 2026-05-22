#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dashboardDir = path.resolve(__dirname, "..");
const dataDir = path.join(dashboardDir, "data");

const inputPath =
  process.argv[2] || "/private/tmp/il-single-family_detached.csv";

const sourceUrl =
  "https://oedi-data-lake.s3.amazonaws.com/nrel-pds-building-stock/end-use-load-profiles-for-us-building-stock/2021/resstock_amy2018_release_1/timeseries_aggregates/by_state/state=IL/il-single-family_detached.csv";

const categoryColumns = {
  hvac: [
    "out.electricity.cooling.energy_consumption",
    "out.electricity.heating.energy_consumption",
    "out.electricity.heating_supplement.energy_consumption",
    "out.electricity.fans_cooling.energy_consumption",
    "out.electricity.fans_heating.energy_consumption",
    "out.electricity.pumps_cooling.energy_consumption",
    "out.electricity.pumps_heating.energy_consumption",
  ],
  water_heating: [
    "out.electricity.water_systems.energy_consumption",
    "out.electricity.recirc_pump.energy_consumption",
  ],
  lighting: [
    "out.electricity.ext_holiday_light.energy_consumption",
    "out.electricity.exterior_lighting.energy_consumption",
    "out.electricity.garage_lighting.energy_consumption",
    "out.electricity.interior_lighting.energy_consumption",
  ],
  appliances: [
    "out.electricity.clothes_dryer.energy_consumption",
    "out.electricity.clothes_washer.energy_consumption",
    "out.electricity.cooking_range.energy_consumption",
    "out.electricity.dishwasher.energy_consumption",
    "out.electricity.extra_refrigerator.energy_consumption",
    "out.electricity.freezer.energy_consumption",
    "out.electricity.refrigerator.energy_consumption",
  ],
  plug_other: [
    "out.electricity.bath_fan.energy_consumption",
    "out.electricity.ceiling_fan.energy_consumption",
    "out.electricity.hot_tub_heater.energy_consumption",
    "out.electricity.hot_tub_pump.energy_consumption",
    "out.electricity.house_fan.energy_consumption",
    "out.electricity.plug_loads.energy_consumption",
    "out.electricity.pool_heater.energy_consumption",
    "out.electricity.pool_pump.energy_consumption",
    "out.electricity.pv.energy_consumption",
    "out.electricity.range_fan.energy_consumption",
    "out.electricity.vehicle.energy_consumption",
    "out.electricity.well_pump.energy_consumption",
  ],
};

const outputColumns = [
  "source",
  "state",
  "building_type",
  "weather_year",
  "profile_day",
  "hour",
  "hvac_kw",
  "water_heating_kw",
  "lighting_kw",
  "appliances_kw",
  "plug_other_kw",
  "unmapped_kw",
  "total_kw",
  "models_used",
  "units_represented",
];

function parseCsvLine(line) {
  return line.split(",");
}

function parseTimestamp(timestamp) {
  const [datePart, timePart] = timestamp.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute - 15, second));
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return {
    dateKey: `${yyyy}-${mm}-${dd}`,
    hour: date.getUTCHours(),
  };
}

function makeBucket() {
  return {
    intervals: 0,
    modelsUsed: 0,
    unitsRepresented: 0,
    categories: {
      hvac: 0,
      water_heating: 0,
      lighting: 0,
      appliances: 0,
      plug_other: 0,
      total: 0,
    },
  };
}

function sumColumns(values, indexes, unitsRepresented) {
  return indexes.reduce((sum, index) => {
    if (index < 0) return sum;
    return sum + Number(values[index] || 0) / unitsRepresented;
  }, 0);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, rows) {
  fs.writeFileSync(
    filePath,
    `${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`,
  );
}

function hourlyKw(bucket, key) {
  const hours = bucket.intervals * 0.25;
  return hours > 0 ? bucket.categories[key] / hours : 0;
}

function toOutputRow(bucket, profileDay, hour) {
  const hvac = hourlyKw(bucket, "hvac");
  const waterHeating = hourlyKw(bucket, "water_heating");
  const lighting = hourlyKw(bucket, "lighting");
  const appliances = hourlyKw(bucket, "appliances");
  const plugOther = hourlyKw(bucket, "plug_other");
  const total = hourlyKw(bucket, "total");
  const mapped = hvac + waterHeating + lighting + appliances + plugOther;
  return [
    "NLR/OEDI EULP 2021 ResStock AMY2018",
    "IL",
    "Single-Family Detached",
    "2018",
    profileDay,
    hour,
    hvac.toFixed(4),
    waterHeating.toFixed(4),
    lighting.toFixed(4),
    appliances.toFixed(4),
    plugOther.toFixed(4),
    (total - mapped).toFixed(4),
    total.toFixed(4),
    Math.round(bucket.modelsUsed),
    bucket.unitsRepresented.toFixed(3),
  ];
}

async function main() {
  if (!fs.existsSync(inputPath)) {
    console.error(`Input CSV not found: ${inputPath}`);
    process.exit(1);
  }

  fs.mkdirSync(dataDir, { recursive: true });

  const byDayHour = new Map();
  const byHour = Array.from({ length: 24 }, makeBucket);
  let header;
  let indexes;

  const stream = fs.createReadStream(inputPath);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;

    const values = parseCsvLine(line);
    if (!header) {
      header = values;
      const lookup = new Map(header.map((name, index) => [name, index]));
      indexes = {
        state: lookup.get("in.state"),
        buildingType: lookup.get("in.geometry_building_type_recs"),
        timestamp: lookup.get("timestamp"),
        modelsUsed: lookup.get("models_used"),
        unitsRepresented: lookup.get("units_represented"),
        total: lookup.get("out.electricity.total.energy_consumption"),
        categories: Object.fromEntries(
          Object.entries(categoryColumns).map(([category, columns]) => [
            category,
            columns.map((column) => lookup.get(column) ?? -1),
          ]),
        ),
      };
      continue;
    }

    const unitsRepresented = Number(values[indexes.unitsRepresented]);
    if (!Number.isFinite(unitsRepresented) || unitsRepresented <= 0) continue;

    const { dateKey, hour } = parseTimestamp(values[indexes.timestamp]);
    const bucketKey = `${dateKey}|${hour}`;
    let bucket = byDayHour.get(bucketKey);
    if (!bucket) {
      bucket = makeBucket();
      byDayHour.set(bucketKey, bucket);
    }

    const updateBucket = (target) => {
      target.intervals += 1;
      target.modelsUsed = Number(values[indexes.modelsUsed]);
      target.unitsRepresented = unitsRepresented;
      for (const [category, categoryIndexes] of Object.entries(indexes.categories)) {
        target.categories[category] += sumColumns(
          values,
          categoryIndexes,
          unitsRepresented,
        );
      }
      target.categories.total +=
        Number(values[indexes.total] || 0) / unitsRepresented;
    };

    updateBucket(bucket);
    updateBucket(byHour[hour]);
  }

  const days = new Map();
  for (const [key, bucket] of byDayHour.entries()) {
    const [dateKey, hourText] = key.split("|");
    const hour = Number(hourText);
    let day = days.get(dateKey);
    if (!day) {
      day = { dateKey, hours: new Map(), maxKw: 0, dailyKwh: 0 };
      days.set(dateKey, day);
    }
    const totalKw = hourlyKw(bucket, "total");
    day.hours.set(hour, bucket);
    day.maxKw = Math.max(day.maxKw, totalKw);
    day.dailyKwh += totalKw;
  }

  const completeDays = [...days.values()].filter((day) => day.hours.size === 24);
  completeDays.sort((a, b) => b.maxKw - a.maxKw);
  const peakDay = completeDays[0];

  if (!peakDay) {
    console.error("No complete 24-hour day found in input CSV.");
    process.exit(1);
  }

  const peakRows = [
    outputColumns,
    ...Array.from({ length: 24 }, (_, hour) =>
      toOutputRow(peakDay.hours.get(hour), peakDay.dateKey, hour),
    ),
  ];
  writeCsv(
    path.join(dataDir, "nlr_end_use_profile_il_sfd_peak_day.csv"),
    peakRows,
  );

  const annualRows = [
    outputColumns,
    ...byHour.map((bucket, hour) => toOutputRow(bucket, "annual_average", hour)),
  ];
  writeCsv(
    path.join(dataDir, "nlr_end_use_profile_il_sfd_annual_average.csv"),
    annualRows,
  );

  const totals = {
    hvac: 0,
    water_heating: 0,
    lighting: 0,
    appliances: 0,
    plug_other: 0,
    unmapped: 0,
    total: 0,
  };

  for (let hour = 0; hour < 24; hour += 1) {
    const bucket = peakDay.hours.get(hour);
    const hvac = hourlyKw(bucket, "hvac");
    const waterHeating = hourlyKw(bucket, "water_heating");
    const lighting = hourlyKw(bucket, "lighting");
    const appliances = hourlyKw(bucket, "appliances");
    const plugOther = hourlyKw(bucket, "plug_other");
    const total = hourlyKw(bucket, "total");
    totals.hvac += hvac;
    totals.water_heating += waterHeating;
    totals.lighting += lighting;
    totals.appliances += appliances;
    totals.plug_other += plugOther;
    totals.total += total;
    totals.unmapped += total - hvac - waterHeating - lighting - appliances - plugOther;
  }

  const peakHour = [...peakDay.hours.entries()].sort(
    (a, b) => hourlyKw(b[1], "total") - hourlyKw(a[1], "total"),
  )[0];
  const peakHourBucket = peakHour[1];
  const peakHourControllable =
    hourlyKw(peakHourBucket, "hvac") + hourlyKw(peakHourBucket, "water_heating");
  const peakHourTotal = hourlyKw(peakHourBucket, "total");

  const summaryRows = [
    ["metric", "value"],
    ["source_url", sourceUrl],
    ["dataset", "NLR/OEDI EULP 2021 ResStock AMY2018"],
    ["state", "IL"],
    ["building_type", "Single-Family Detached"],
    ["profile_day", peakDay.dateKey],
    ["selection_rule", "complete day with highest hourly total kW"],
    ["peak_hour", peakHour[0]],
    ["peak_total_kw_per_home", peakHourTotal.toFixed(4)],
    [
      "peak_hour_hvac_plus_water_heating_share",
      (peakHourControllable / peakHourTotal).toFixed(4),
    ],
    ["daily_total_kwh_per_home", totals.total.toFixed(4)],
    ["daily_hvac_kwh_per_home", totals.hvac.toFixed(4)],
    ["daily_water_heating_kwh_per_home", totals.water_heating.toFixed(4)],
    ["daily_lighting_kwh_per_home", totals.lighting.toFixed(4)],
    ["daily_appliances_kwh_per_home", totals.appliances.toFixed(4)],
    ["daily_plug_other_kwh_per_home", totals.plug_other.toFixed(4)],
    ["daily_unmapped_kwh_per_home", totals.unmapped.toFixed(4)],
    ["models_used", Math.round(peakHourBucket.modelsUsed)],
    ["units_represented", peakHourBucket.unitsRepresented.toFixed(3)],
  ];
  writeCsv(path.join(dataDir, "nlr_end_use_profile_il_sfd_summary.csv"), summaryRows);

  console.log(
    `Wrote NLR end-use profiles for ${peakDay.dateKey} peak day to ${dataDir}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
