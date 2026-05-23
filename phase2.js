const portfolioSize = 10000;

const base = {
  fixedBill: 164,
  utilityCost: 135,
  monthlyKwh: 910,
};

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

const pct = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

const num = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const state = {
  menu: "both",
  spread: 2,
  demandCharge: 20,
  threshold: 8,
  adoption: 0.75,
};

const segmentDefs = [
  {
    behavior: "Passive / inelastic",
    behaviorShort: "Passive",
    device: "No energy devices",
    deviceShort: "None",
    homes: 20,
    savings: { tou: 0, demand: -3 },
    avoided: { tou: 0, demand: 0 },
  },
  {
    behavior: "Passive / inelastic",
    behaviorShort: "Passive",
    device: "Just thermostat",
    deviceShort: "Thermostat",
    homes: 10,
    savings: { tou: 6, demand: 8 },
    avoided: { tou: 8, demand: 15 },
  },
  {
    behavior: "Passive / inelastic",
    behaviorShort: "Passive",
    device: "Just battery",
    deviceShort: "Battery",
    homes: 5,
    savings: { tou: 10, demand: 18 },
    avoided: { tou: 14, demand: 35 },
  },
  {
    behavior: "Passive / inelastic",
    behaviorShort: "Passive",
    device: "Thermostat + battery",
    deviceShort: "Both",
    homes: 10,
    savings: { tou: 17, demand: 25 },
    avoided: { tou: 25, demand: 48 },
  },
  {
    behavior: "Somewhat elastic",
    behaviorShort: "Elastic",
    device: "No energy devices",
    deviceShort: "None",
    homes: 15,
    savings: { tou: 4, demand: 2 },
    avoided: { tou: 6, demand: 8 },
  },
  {
    behavior: "Somewhat elastic",
    behaviorShort: "Elastic",
    device: "Just thermostat",
    deviceShort: "Thermostat",
    homes: 15,
    savings: { tou: 12, demand: 10 },
    avoided: { tou: 18, demand: 24 },
  },
  {
    behavior: "Somewhat elastic",
    behaviorShort: "Elastic",
    device: "Just battery",
    deviceShort: "Battery",
    homes: 5,
    savings: { tou: 17, demand: 24 },
    avoided: { tou: 28, demand: 52 },
  },
  {
    behavior: "Somewhat elastic",
    behaviorShort: "Elastic",
    device: "Thermostat + battery",
    deviceShort: "Both",
    homes: 20,
    savings: { tou: 26, demand: 34 },
    avoided: { tou: 42, demand: 68 },
  },
];

const householdProfiles = [
  {
    label: "Low fit / high friction",
    weight: 0.18,
    fit: { tou: 0.62, demand: 0.68 },
    costFit: 0.7,
    thresholdMultiplier: 1.55,
    adoptionMultiplier: 0.62,
  },
  {
    label: "Average home",
    weight: 0.3,
    fit: { tou: 0.96, demand: 0.96 },
    costFit: 0.95,
    thresholdMultiplier: 1,
    adoptionMultiplier: 0.92,
  },
  {
    label: "TOU-shaped use",
    weight: 0.18,
    fit: { tou: 1.38, demand: 0.82 },
    costFit: 1.05,
    thresholdMultiplier: 0.86,
    adoptionMultiplier: 1,
  },
  {
    label: "Peak-kW intensive",
    weight: 0.2,
    fit: { tou: 0.84, demand: 1.38 },
    costFit: 1.1,
    thresholdMultiplier: 0.82,
    adoptionMultiplier: 1.05,
  },
  {
    label: "High response / low friction",
    weight: 0.14,
    fit: { tou: 1.48, demand: 1.48 },
    costFit: 1.25,
    thresholdMultiplier: 0.58,
    adoptionMultiplier: 1.18,
  },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function signedMoney(value) {
  if (Math.abs(value) < 0.5) return money.format(0);
  const formatted = money.format(Math.abs(value));
  return value > 0 ? `+${formatted}` : `-${formatted}`;
}

function signedCompactMoney(value) {
  if (Math.abs(value) < 0.5) return "$0";
  const sign = value > 0 ? "+" : "-";
  const magnitude = Math.abs(value);
  if (magnitude >= 1000) return `${sign}$${(magnitude / 1000).toFixed(1)}k`;
  return `${sign}${money.format(magnitude)}`;
}

function availablePlans() {
  if (state.menu === "tou") return ["tou"];
  if (state.menu === "demand") return ["demand"];
  return ["tou", "demand"];
}

function signalScale(plan) {
  if (plan === "tou") return clamp(state.spread - 1, 0, 2.3);
  return clamp(state.demandCharge / 20, 0, 1.7);
}

function planOutcome(segment, plan, profile = null) {
  const scale = signalScale(plan);
  const fit = profile ? profile.fit[plan] : 1;
  const customerSavings = segment.savings[plan] * scale * fit;
  const avoidedFit = profile ? (0.45 + 0.55 * fit) * profile.costFit : 1;
  const costAvoided = Math.max(
    0,
    segment.avoided[plan] * Math.pow(scale, 0.88) * avoidedFit,
  );
  return {
    plan,
    customerSavings,
    costAvoided,
    bill: base.fixedBill - customerSavings,
    utilityCost: base.utilityCost - costAvoided,
    marginDelta: costAvoided - customerSavings,
  };
}

function switchPullFor(customerSavings, threshold) {
  const surplus = customerSavings - threshold;
  if (customerSavings <= 0 || surplus < 0) return 0;
  return clamp(0.18 + surplus / 32, 0.18, 1);
}

function profileChoice(segment, profile) {
  const threshold = state.threshold * profile.thresholdMultiplier;
  const outcomes = availablePlans().map((plan) => planOutcome(segment, plan, profile));
  const eligible = outcomes.filter((outcome) => switchPullFor(outcome.customerSavings, threshold) > 0);
  const shares = { fixed: 1, tou: 0, demand: 0 };

  if (eligible.length === 0) {
    return { profile, threshold, shares, outcomes };
  }

  const maxSavings = Math.max(...eligible.map((outcome) => outcome.customerSavings));
  const grossSwitchShare = clamp(
    state.adoption *
      profile.adoptionMultiplier *
      switchPullFor(maxSavings, threshold),
    0,
    1,
  );
  const weights = eligible.map((outcome) =>
    Math.exp(clamp((outcome.customerSavings - threshold) / 7, -4, 4)),
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  eligible.forEach((outcome, index) => {
    shares[outcome.plan] = grossSwitchShare * (weights[index] / totalWeight);
  });
  shares.fixed = 1 - shares.tou - shares.demand;

  return { profile, threshold, shares, outcomes };
}

function rowsForState() {
  const denominator = segmentDefs.reduce((sum, item) => sum + item.homes, 0);
  return segmentDefs.map((segment) => {
    const homes = (segment.homes / denominator) * portfolioSize;
    const planHomes = { fixed: 0, tou: 0, demand: 0 };
    let revenue = 0;
    let utilityCost = 0;

    householdProfiles.forEach((profile) => {
      const profileHomes = homes * profile.weight;
      const choice = profileChoice(segment, profile);
      const outcomesByPlan = Object.fromEntries(choice.outcomes.map((outcome) => [outcome.plan, outcome]));

      planHomes.fixed += profileHomes * choice.shares.fixed;
      revenue += profileHomes * choice.shares.fixed * base.fixedBill;
      utilityCost += profileHomes * choice.shares.fixed * base.utilityCost;

      ["tou", "demand"].forEach((plan) => {
        const planShare = choice.shares[plan] || 0;
        if (planShare <= 0) return;
        const planHomeCount = profileHomes * planShare;
        const outcome = outcomesByPlan[plan];
        planHomes[plan] += planHomeCount;
        revenue += planHomeCount * outcome.bill;
        utilityCost += planHomeCount * outcome.utilityCost;
      });
    });

    const stayHomes = planHomes.fixed;
    const switchHomes = planHomes.tou + planHomes.demand;
    const baselineRevenue = homes * base.fixedBill;
    const baselineCost = homes * base.utilityCost;
    const leakage = baselineRevenue - revenue;
    const costAvoidedTotal = baselineCost - utilityCost;
    const customerSavings = switchHomes > 0 ? leakage / switchHomes : 0;
    const costAvoided = switchHomes > 0 ? costAvoidedTotal / switchHomes : 0;
    const marginDeltaPerSwitcher = costAvoided - customerSavings;
    const planShares = {
      fixed: stayHomes / homes,
      tou: planHomes.tou / homes,
      demand: planHomes.demand / homes,
    };

    return {
      ...segment,
      homes,
      stayHomes,
      switchHomes,
      switchShare: switchHomes / homes,
      planHomes,
      planShares,
      customerSavings,
      costAvoided,
      marginDeltaPerSwitcher,
      revenue,
      utilityCost,
      baselineRevenue,
      baselineCost,
      leakage,
      costAvoidedTotal,
      marginDelta: revenue - utilityCost - (baselineRevenue - baselineCost),
    };
  });
}

function aggregate(rows = rowsForState()) {
  const baselineRevenue = rows.reduce((sum, row) => sum + row.baselineRevenue, 0);
  const baselineCost = rows.reduce((sum, row) => sum + row.baselineCost, 0);
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const utilityCost = rows.reduce((sum, row) => sum + row.utilityCost, 0);
  const switchHomes = rows.reduce((sum, row) => sum + row.switchHomes, 0);
  const stayHomes = rows.reduce((sum, row) => sum + row.stayHomes, 0);
  const touSwitchHomes = rows.reduce((sum, row) => sum + row.planHomes.tou, 0);
  const demandSwitchHomes = rows.reduce((sum, row) => sum + row.planHomes.demand, 0);
  const leakage = baselineRevenue - revenue;
  const costAvoided = baselineCost - utilityCost;
  const marginDelta = revenue - utilityCost - (baselineRevenue - baselineCost);
  const fixedAdderPerHome = stayHomes > 0 ? leakage / stayHomes : 0;
  const fixedAdderCents = stayHomes > 0 ? (leakage / (stayHomes * base.monthlyKwh)) * 100 : 0;
  const automatedHomes = rows
    .filter((row) => row.device !== "No energy devices")
    .reduce((sum, row) => sum + row.homes, 0);
  const automatedSwitchHomes = rows
    .filter((row) => row.device !== "No energy devices")
    .reduce((sum, row) => sum + row.switchHomes, 0);
  const automatedShare = automatedHomes / portfolioSize;
  const automatedSwitcherShare = switchHomes > 0 ? automatedSwitchHomes / switchHomes : 0;
  return {
    baselineRevenue,
    baselineCost,
    revenue,
    utilityCost,
    switchHomes,
    stayHomes,
    touSwitchHomes,
    demandSwitchHomes,
    leakage,
    costAvoided,
    marginDelta,
    fixedAdderPerHome,
    fixedAdderCents,
    automatedShare,
    automatedSwitcherShare,
    selectionSkew: automatedSwitcherShare - automatedShare,
  };
}

function renderSummary(rows) {
  const total = aggregate(rows);
  document.getElementById("phase2-switch-homes").textContent =
    `${num.format(total.switchHomes)} homes`;
  document.getElementById("phase2-switch-note").textContent =
    `${pct.format(total.switchHomes / portfolioSize)} of the portfolio leaves fixed: ${num.format(total.touSwitchHomes)} TOU, ${num.format(total.demandSwitchHomes)} demand`;
  document.getElementById("phase2-leakage").textContent = money.format(total.leakage);
  document.getElementById("phase2-cost-avoided").textContent = money.format(total.costAvoided);
  document.getElementById("phase2-margin-delta").textContent = signedMoney(total.marginDelta);
  document.getElementById("phase2-fixed-adder").textContent =
    `${money1.format(total.fixedAdderPerHome)}/mo`;
  document.getElementById("phase2-summary-note").textContent =
    `Recovering lost revenue only from stayers would add ${total.fixedAdderCents.toFixed(2)} cents/kWh to the remaining fixed-rate pool. Within each broad segment, household load fit and WTP/friction create the TOU versus demand mix.`;

  document.getElementById("phase2-metrics").innerHTML = `
    <div class="mini-metric phase2-metric">
      <label>Fixed stayers</label>
      <strong>${num.format(total.stayHomes)}</strong>
    </div>
    <div class="mini-metric phase2-metric tou">
      <label>TOU switchers</label>
      <strong>${num.format(total.touSwitchHomes)}</strong>
    </div>
    <div class="mini-metric phase2-metric demand">
      <label>Demand switchers</label>
      <strong>${num.format(total.demandSwitchHomes)}</strong>
    </div>
    <div class="mini-metric phase2-metric">
      <label>Automation skew</label>
      <strong>${pct.format(total.selectionSkew)}</strong>
    </div>
  `;
}

function renderLeakageChart(rows) {
  const svg = document.getElementById("phase2-leakage-chart");
  const total = aggregate(rows);
  const values = [
    { label: "Revenue leakage", value: -total.leakage, color: "#b13a2f" },
    { label: "Cost avoided", value: total.costAvoided, color: "#087f8c" },
    {
      label: "Margin impact",
      value: total.marginDelta,
      color: total.marginDelta >= 0 ? "#2e7d32" : "#b13a2f",
    },
  ];
  const width = 760;
  const height = 340;
  const pad = { top: 38, right: 42, bottom: 70, left: 82 };
  const plotHeight = height - pad.top - pad.bottom;
  const zeroY = pad.top + plotHeight / 2;
  const maxAbs = Math.max(1, ...values.map((item) => Math.abs(item.value))) * 1.22;
  const yFor = (value) => zeroY - (value / maxAbs) * (plotHeight / 2);
  const barWidth = 118;
  const gap = 72;
  const x0 = 132;

  const bars = values
    .map((item, index) => {
      const x = x0 + index * (barWidth + gap);
      const barHeight = (Math.abs(item.value) / maxAbs) * (plotHeight / 2);
      const y = item.value >= 0 ? yFor(item.value) : zeroY;
      const labelY = item.value >= 0 ? y - 10 : y + barHeight + 20;
      return `
        <rect x="${x}" y="${y.toFixed(1)}" width="${barWidth}" height="${barHeight.toFixed(1)}" rx="6" fill="${item.color}" />
        <text x="${x + barWidth / 2}" y="${labelY.toFixed(1)}" text-anchor="middle" fill="${item.color}" font-size="13" font-weight="820">${signedMoney(item.value)}</text>
        <text x="${x + barWidth / 2}" y="${height - 32}" text-anchor="middle" fill="#64717b" font-size="12" font-weight="760">${item.label}</text>
      `;
    })
    .join("");
  const yTicks = [-maxAbs, -maxAbs / 2, 0, maxAbs / 2, maxAbs]
    .map((value) => {
      const y = yFor(value);
      return `
        <line x1="${pad.left}" x2="${width - pad.right}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${Math.abs(value) < 1 ? "#aab6bd" : "#d9e0e4"}" stroke-width="${Math.abs(value) < 1 ? "1.4" : "1"}" />
        <text x="${pad.left - 10}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#64717b" font-size="10" font-weight="700">${signedCompactMoney(value)}</text>
      `;
    })
    .join("");

  svg.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="#fbfcfd" />
    ${yTicks}
    <line x1="${pad.left}" x2="${pad.left}" y1="${pad.top}" y2="${height - pad.bottom}" stroke="#d9e0e4" />
    <text x="${pad.left}" y="22" fill="#172026" font-size="13" font-weight="820">Change versus all-fixed baseline</text>
    ${bars}
  `;
}

function renderSelectionChart(rows) {
  const svg = document.getElementById("phase2-selection-chart");
  const width = 620;
  const height = 420;
  const pad = { top: 28, right: 38, bottom: 58, left: 156 };
  const chartWidth = width - pad.left - pad.right;
  const rowGap = 10;
  const rowHeight = 32;
  const maxHomes = Math.max(...rows.map((row) => row.homes));
  const xFor = (homes) => pad.left + (homes / maxHomes) * chartWidth;
  const xTicks = [0, maxHomes / 2, maxHomes]
    .map((homes) => {
      const x = xFor(homes);
      return `
        <line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${height - pad.bottom}" y2="${height - pad.bottom + 5}" stroke="#aab6bd" />
        <text x="${x.toFixed(1)}" y="${height - pad.bottom + 18}" text-anchor="middle" fill="#64717b" font-size="10" font-weight="700">${num.format(homes)}</text>
      `;
    })
    .join("");
  const groups = rows
    .map((row, index) => {
      const y = pad.top + index * (rowHeight + rowGap);
      const totalWidth = (row.homes / maxHomes) * chartWidth;
      const stayWidth = (row.planHomes.fixed / row.homes) * totalWidth || 0;
      const touWidth = (row.planHomes.tou / row.homes) * totalWidth || 0;
      const demandWidth = (row.planHomes.demand / row.homes) * totalWidth || 0;
      const label = `${row.behaviorShort} / ${row.deviceShort}`;
      const touRect =
        touWidth > 0.8
          ? `<rect x="${(pad.left + stayWidth).toFixed(1)}" y="${y}" width="${touWidth.toFixed(1)}" height="${rowHeight}" rx="7" fill="#b36b00" />`
          : "";
      const demandRect =
        demandWidth > 0.8
          ? `<rect x="${(pad.left + stayWidth + touWidth).toFixed(1)}" y="${y}" width="${demandWidth.toFixed(1)}" height="${rowHeight}" rx="7" fill="#087f8c" />`
          : "";
      return `
        <text x="${pad.left - 12}" y="${y + 20}" text-anchor="end" fill="#172026" font-size="12" font-weight="760">${label}</text>
        <rect x="${pad.left}" y="${y}" width="${totalWidth.toFixed(1)}" height="${rowHeight}" rx="7" fill="#eef1f3" />
        ${touRect}
        ${demandRect}
        <text x="${pad.left + totalWidth + 8}" y="${y + 20}" fill="#64717b" font-size="11" font-weight="720">${num.format(row.switchHomes)}</text>
      `;
    })
    .join("");

  svg.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="#fbfcfd" />
    ${groups}
    <line x1="${pad.left}" x2="${width - pad.right}" y1="${height - pad.bottom}" y2="${height - pad.bottom}" stroke="#aab6bd" />
    ${xTicks}
    <text x="${pad.left}" y="${height - 12}" fill="#64717b" font-size="11" font-weight="720">Total segment homes; switching homes are labeled at right.</text>
  `;
}

function planMixText(row) {
  const parts = [`Fixed ${pct.format(row.planShares.fixed)}`];
  if (row.planShares.tou > 0.005) parts.push(`TOU ${pct.format(row.planShares.tou)}`);
  if (row.planShares.demand > 0.005) parts.push(`Demand ${pct.format(row.planShares.demand)}`);
  return parts.join(" | ");
}

function renderPlanMix(row) {
  const segments = [
    { plan: "fixed", share: row.planShares.fixed },
    { plan: "tou", share: row.planShares.tou },
    { plan: "demand", share: row.planShares.demand },
  ]
    .filter((item) => item.share > 0.001)
    .map(
      (item) =>
        `<span class="plan-mix-segment ${item.plan}" style="width: ${(item.share * 100).toFixed(2)}%"></span>`,
    )
    .join("");
  const text = planMixText(row);
  return `
    <div class="plan-mix-cell">
      <div class="plan-mix-bar" aria-label="${text}">${segments}</div>
      <span>${text}</span>
    </div>
  `;
}

function renderTable(rows) {
  document.getElementById("phase2-table").innerHTML = rows
    .map((row) => `
      <tr>
        <td>${row.behavior}</td>
        <td>${row.device}</td>
        <td>${renderPlanMix(row)}</td>
        <td>${num.format(row.homes)}</td>
        <td>${num.format(row.switchHomes)}</td>
        <td>${num.format(row.planHomes.tou)}</td>
        <td>${num.format(row.planHomes.demand)}</td>
        <td>${money1.format(row.customerSavings)}</td>
        <td>${money1.format(row.costAvoided)}</td>
        <td>${signedMoney(row.marginDeltaPerSwitcher)}</td>
        <td>${money.format(row.leakage)}</td>
        <td>${signedMoney(row.marginDelta)}</td>
      </tr>
    `)
    .join("");
}

function updateControlLabels() {
  document.getElementById("phase2-spread-value").textContent = state.spread.toFixed(1);
  document.getElementById("phase2-demand-value").textContent = state.demandCharge.toFixed(0);
  document.getElementById("phase2-threshold-value").textContent = state.threshold.toFixed(0);
  document.getElementById("phase2-adoption-value").textContent = Math.round(state.adoption * 100);
  document.querySelectorAll("[data-menu]").forEach((button) => {
    button.classList.toggle("active", button.dataset.menu === state.menu);
  });
}

function render() {
  updateControlLabels();
  const rows = rowsForState();
  renderSummary(rows);
  renderLeakageChart(rows);
  renderSelectionChart(rows);
  renderTable(rows);
}

function toCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
        })
        .join(","),
    )
    .join("\n");
}

function downloadCsv() {
  const rows = rowsForState();
  const total = aggregate(rows);
  const csvRows = [
    [
      "menu",
      "tou_spread",
      "demand_charge_per_kw_month",
      "base_switching_threshold_per_month",
      "max_eligible_adoption",
      "total_switch_homes",
      "tou_switch_homes",
      "demand_switch_homes",
      "revenue_leakage",
      "cost_avoided",
      "margin_delta",
      "fixed_pool_adder_per_home",
      "fixed_pool_adder_cents_per_kwh",
    ],
    [
      state.menu,
      state.spread,
      state.demandCharge,
      state.threshold,
      state.adoption,
      total.switchHomes.toFixed(2),
      total.touSwitchHomes.toFixed(2),
      total.demandSwitchHomes.toFixed(2),
      total.leakage.toFixed(2),
      total.costAvoided.toFixed(2),
      total.marginDelta.toFixed(2),
      total.fixedAdderPerHome.toFixed(2),
      total.fixedAdderCents.toFixed(4),
    ],
    [],
    [
      "behavior",
      "device",
      "homes",
      "switch_homes",
      "fixed_homes",
      "tou_homes",
      "demand_homes",
      "fixed_share",
      "tou_share",
      "demand_share",
      "avg_customer_savings_per_switcher",
      "avg_cost_avoided_per_switcher",
      "margin_delta_per_switcher",
      "segment_leakage",
      "segment_margin_delta",
    ],
    ...rows.map((row) => [
      row.behavior,
      row.device,
      row.homes.toFixed(2),
      row.switchHomes.toFixed(2),
      row.planHomes.fixed.toFixed(2),
      row.planHomes.tou.toFixed(2),
      row.planHomes.demand.toFixed(2),
      row.planShares.fixed.toFixed(4),
      row.planShares.tou.toFixed(4),
      row.planShares.demand.toFixed(4),
      row.customerSavings.toFixed(2),
      row.costAvoided.toFixed(2),
      row.marginDeltaPerSwitcher.toFixed(2),
      row.leakage.toFixed(2),
      row.marginDelta.toFixed(2),
    ]),
  ];
  const blob = new Blob([toCsv(csvRows)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "utility_rm_phase2_optional_rate_selection.csv";
  link.click();
  URL.revokeObjectURL(url);
}

document.getElementById("phase2-menu").addEventListener("click", (event) => {
  const button = event.target.closest("[data-menu]");
  if (!button) return;
  state.menu = button.dataset.menu;
  render();
});

document.getElementById("phase2-spread").addEventListener("input", (event) => {
  state.spread = Number(event.target.value);
  render();
});

document.getElementById("phase2-demand").addEventListener("input", (event) => {
  state.demandCharge = Number(event.target.value);
  render();
});

document.getElementById("phase2-threshold").addEventListener("input", (event) => {
  state.threshold = Number(event.target.value);
  render();
});

document.getElementById("phase2-adoption").addEventListener("input", (event) => {
  state.adoption = Number(event.target.value) / 100;
  render();
});

document.getElementById("download-phase2").addEventListener("click", downloadCsv);

render();
