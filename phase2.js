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
    response: { tou: 0.55, demand: 0.6 },
    thresholdMultiplier: 1.55,
    adoptionMultiplier: 0.62,
  },
  {
    label: "Average home",
    weight: 0.3,
    fit: { tou: 0.96, demand: 0.96 },
    response: { tou: 0.9, demand: 0.95 },
    thresholdMultiplier: 1,
    adoptionMultiplier: 0.92,
  },
  {
    label: "TOU-shaped use",
    weight: 0.18,
    fit: { tou: 1.38, demand: 0.82 },
    response: { tou: 0.42, demand: 0.7 },
    thresholdMultiplier: 0.86,
    adoptionMultiplier: 1,
  },
  {
    label: "Peak-kW intensive",
    weight: 0.2,
    fit: { tou: 0.84, demand: 1.38 },
    response: { tou: 0.68, demand: 0.55 },
    thresholdMultiplier: 0.82,
    adoptionMultiplier: 1.05,
  },
  {
    label: "High response / low friction",
    weight: 0.14,
    fit: { tou: 1.48, demand: 1.48 },
    response: { tou: 1.45, demand: 1.55 },
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
  const response = profile ? profile.response[plan] : 1;
  const customerSavings = segment.savings[plan] * scale * fit;
  const costAvoided = Math.max(
    0,
    segment.avoided[plan] * Math.pow(scale, 0.88) * response,
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
  const eligible = outcomes.filter(
    (outcome) => switchPullFor(outcome.customerSavings, threshold) > 0,
  );
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
    const negativeMarginPlanHomes = { tou: 0, demand: 0 };
    const marginGroups = {
      profitable: { homes: 0, leakage: 0, costAvoided: 0, margin: 0 },
      unprofitable: { homes: 0, leakage: 0, costAvoided: 0, margin: 0 },
    };
    let revenue = 0;
    let utilityCost = 0;

    householdProfiles.forEach((profile) => {
      const profileHomes = homes * profile.weight;
      const choice = profileChoice(segment, profile);
      const outcomesByPlan = Object.fromEntries(
        choice.outcomes.map((outcome) => [outcome.plan, outcome]),
      );

      planHomes.fixed += profileHomes * choice.shares.fixed;
      revenue += profileHomes * choice.shares.fixed * base.fixedBill;
      utilityCost += profileHomes * choice.shares.fixed * base.utilityCost;

      ["tou", "demand"].forEach((plan) => {
        const planShare = choice.shares[plan] || 0;
        if (planShare <= 0) return;
        const planHomeCount = profileHomes * planShare;
        const outcome = outcomesByPlan[plan];
        const group = outcome.marginDelta >= 0 ? marginGroups.profitable : marginGroups.unprofitable;
        planHomes[plan] += planHomeCount;
        group.homes += planHomeCount;
        group.leakage += planHomeCount * outcome.customerSavings;
        group.costAvoided += planHomeCount * outcome.costAvoided;
        group.margin += planHomeCount * outcome.marginDelta;
        if (outcome.marginDelta < 0) negativeMarginPlanHomes[plan] += planHomeCount;
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
      negativeMarginPlanHomes,
      marginGroups,
      negativeMarginSwitchHomes: marginGroups.unprofitable.homes,
      negativeMarginShare: switchHomes > 0 ? marginGroups.unprofitable.homes / switchHomes : 0,
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
  const negativeMarginSwitchHomes = rows.reduce(
    (sum, row) => sum + row.negativeMarginSwitchHomes,
    0,
  );
  const negativeMarginPlanHomes = {
    tou: rows.reduce((sum, row) => sum + row.negativeMarginPlanHomes.tou, 0),
    demand: rows.reduce((sum, row) => sum + row.negativeMarginPlanHomes.demand, 0),
  };
  const marginGroups = rows.reduce(
    (groups, row) => {
      for (const key of ["profitable", "unprofitable"]) {
        groups[key].homes += row.marginGroups[key].homes;
        groups[key].leakage += row.marginGroups[key].leakage;
        groups[key].costAvoided += row.marginGroups[key].costAvoided;
        groups[key].margin += row.marginGroups[key].margin;
      }
      return groups;
    },
    {
      profitable: { homes: 0, leakage: 0, costAvoided: 0, margin: 0 },
      unprofitable: { homes: 0, leakage: 0, costAvoided: 0, margin: 0 },
    },
  );
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
    negativeMarginSwitchHomes,
    negativeMarginPlanHomes,
    negativeMarginShare: switchHomes > 0 ? negativeMarginSwitchHomes / switchHomes : 0,
    marginGroups,
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
  document.getElementById("phase2-negative-margin-switchers").textContent =
    `${num.format(total.negativeMarginSwitchHomes)} / ${num.format(total.switchHomes)}`;
  document.getElementById("phase2-fixed-adder").textContent =
    `${money1.format(total.fixedAdderPerHome)}/mo`;
  document.getElementById("phase2-summary-note").textContent =
    `Recovering lost revenue only from stayers would add ${total.fixedAdderCents.toFixed(2)} cents/kWh to the remaining fixed-rate pool. Negative-margin switchers are ${pct.format(total.negativeMarginShare)} of all switchers.`;

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
    <div class="mini-metric phase2-metric negative">
      <label>Neg-margin switchers</label>
      <strong>${num.format(total.negativeMarginSwitchHomes)}</strong>
      <small>${pct.format(total.negativeMarginShare)} of switchers</small>
      <small>TOU ${num.format(total.negativeMarginPlanHomes.tou)} | Demand ${num.format(total.negativeMarginPlanHomes.demand)}</small>
    </div>
  `;
}

function renderLeakageChart(rows) {
  const svg = document.getElementById("phase2-leakage-chart");
  const total = aggregate(rows);
  const width = 760;
  const height = 430;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const red = "#b13a2f";
  const teal = "#087f8c";
  const green = "#2e7d32";
  const muted = "#64717b";
  const text = "#172026";
  const line = "#d9e0e4";
  const barX = 64;
  const barY = 122;
  const barWidth = 642;
  const barHeight = 20;
  const positiveMargin = total.marginDelta >= 0;
  const marginColor = positiveMargin ? green : red;
  const bridgeMax = Math.max(total.costAvoided, total.leakage, 1);
  const leakageWidth = (total.leakage / bridgeMax) * barWidth;
  const avoidedWidth = (total.costAvoided / bridgeMax) * barWidth;
  const marginWidth = (Math.abs(total.marginDelta) / bridgeMax) * barWidth;
  const profitable = total.marginGroups.profitable;
  const unprofitable = total.marginGroups.unprofitable;
  const splitRows = [
    {
      label: "Profitable switchers",
      homes: profitable.homes,
      margin: profitable.margin,
      color: green,
    },
    {
      label: "Negative-margin switchers",
      homes: unprofitable.homes,
      margin: unprofitable.margin,
      color: red,
    },
  ];
  const splitPlotLeft = 274;
  const splitAxisX = 398;
  const splitPlotRight = 684;
  const splitTrackWidth = splitPlotRight - splitPlotLeft;
  const splitRowTop = 240;
  const splitRowGap = 76;
  const splitRowHeight = 58;
  const splitBarHeight = 30;
  const maxPositive = Math.max(
    0,
    ...splitRows.map((row) => Math.max(row.margin, 0)),
  );
  const maxNegative = Math.max(
    0,
    ...splitRows.map((row) => Math.max(-row.margin, 0)),
  );
  const positiveScale =
    maxPositive > 0 ? (splitPlotRight - splitAxisX) / maxPositive : Infinity;
  const negativeScale =
    maxNegative > 0 ? (splitAxisX - splitPlotLeft) / maxNegative : Infinity;
  const splitScale = Number.isFinite(Math.min(positiveScale, negativeScale))
    ? Math.min(positiveScale, negativeScale)
    : 1;
  const splitBars = splitRows
    .map((row, index) => {
      const rowY = splitRowTop + index * splitRowGap;
      const barY = rowY + 14;
      const bar = Math.abs(row.margin) > 0
        ? Math.max(Math.abs(row.margin) * splitScale, 6)
        : 0;
      const x = row.margin >= 0 ? splitAxisX : splitAxisX - bar;
      const valueInside = bar >= 72;
      const valueX =
        row.margin >= 0
          ? valueInside
            ? x + bar - 10
            : x + bar + 10
          : valueInside
            ? x + 10
            : x - 10;
      const valueAnchor =
        row.margin >= 0
          ? valueInside
            ? "end"
            : "start"
          : valueInside
            ? "start"
            : "end";
      const valueFill = valueInside ? "#fff" : row.color;
      const trackFill =
        row.margin >= 0 ? "rgba(46, 125, 50, 0.08)" : "rgba(177, 58, 47, 0.08)";
      return `
        <rect x="48" y="${rowY.toFixed(1)}" width="${width - 96}" height="${splitRowHeight}" rx="9" fill="#fff" stroke="${line}" />
        <text x="70" y="${rowY + 23}" fill="${text}" font-size="12" font-weight="840">${row.label}</text>
        <text x="70" y="${rowY + 42}" fill="${muted}" font-size="10" font-weight="740">${num.format(row.homes)} homes</text>
        <rect x="${splitPlotLeft}" y="${barY}" width="${splitTrackWidth}" height="${splitBarHeight}" rx="8" fill="${trackFill}" />
        <line x1="${splitAxisX}" x2="${splitAxisX}" y1="${barY - 5}" y2="${barY + splitBarHeight + 5}" stroke="#aab6bd" stroke-width="1.4" />
        ${
          bar > 0
            ? `<rect x="${x.toFixed(1)}" y="${barY}" width="${bar.toFixed(1)}" height="${splitBarHeight}" rx="8" fill="${row.color}" />
              <text x="${valueX.toFixed(1)}" y="${barY + 20}" text-anchor="${valueAnchor}" fill="${valueFill}" font-size="12" font-weight="880">${signedMoney(row.margin)}</text>`
            : `<text x="${(splitAxisX + 10).toFixed(1)}" y="${barY + 20}" fill="${muted}" font-size="12" font-weight="820">${signedMoney(0)}</text>`
        }
      `;
    })
    .join("");
  const marginSegment =
    positiveMargin
      ? `<rect x="${(barX + leakageWidth).toFixed(1)}" y="${barY}" width="${marginWidth.toFixed(1)}" height="${barHeight}" rx="7" fill="${green}" />`
      : `<rect x="${(barX + avoidedWidth).toFixed(1)}" y="${barY}" width="${marginWidth.toFixed(1)}" height="${barHeight}" rx="7" fill="${red}" opacity="0.82" />`;
  const marginCardLabel = positiveMargin ? "Net margin" : "Margin shortfall";
  const marginCardNote = positiveMargin ? "left after savings" : "savings exceed avoided cost";
  const marginCardValue = positiveMargin
    ? signedMoney(total.marginDelta)
    : money.format(Math.abs(total.marginDelta));
  const operator = positiveMargin ? "+" : "-";
  const marginCardFill = positiveMargin ? "#e5f2e6" : "#f7e7e4";
  const marginCardStroke = positiveMargin ? "#b7d9bd" : "#e9c2bc";
  const componentCards = `
    <g class="bridge-equation">
      <rect x="54" y="61" width="186" height="50" rx="8" fill="#f7e7e4" stroke="#e9c2bc" />
      <text x="70" y="78" fill="${red}" font-size="9" font-weight="820">Bill savings</text>
      <text x="70" y="98" fill="${red}" font-size="14" font-weight="900">${money.format(total.leakage)}</text>
      <text x="154" y="78" fill="${red}" font-size="8" font-weight="720">revenue leakage</text>
      <text x="258" y="94" text-anchor="middle" fill="${muted}" font-size="19" font-weight="820">${operator}</text>
      <rect x="278" y="61" width="186" height="50" rx="8" fill="${marginCardFill}" stroke="${marginCardStroke}" />
      <text x="294" y="78" fill="${marginColor}" font-size="9" font-weight="820">${marginCardLabel}</text>
      <text x="294" y="98" fill="${marginColor}" font-size="14" font-weight="900">${marginCardValue}</text>
      <text x="376" y="78" fill="${marginColor}" font-size="8" font-weight="720">${marginCardNote}</text>
      <text x="482" y="94" text-anchor="middle" fill="${muted}" font-size="19" font-weight="820">=</text>
      <rect x="502" y="61" width="204" height="50" rx="8" fill="#e4f4f6" stroke="#acd7dc" />
      <text x="518" y="78" fill="${teal}" font-size="9" font-weight="820">Cost avoided</text>
      <text x="518" y="98" fill="${teal}" font-size="14" font-weight="900">${money.format(total.costAvoided)}</text>
      <text x="616" y="78" fill="${teal}" font-size="8" font-weight="720">utility cost reduction</text>
    </g>
  `;
  const leakageText =
    leakageWidth > 150
      ? `<text x="${(barX + leakageWidth / 2).toFixed(1)}" y="${barY + 14}" text-anchor="middle" fill="#fff" font-size="9" font-weight="860">${money.format(total.leakage)}</text>`
      : "";
  const marginText =
    marginWidth > 110
      ? `<text x="${(positiveMargin ? barX + leakageWidth + marginWidth / 2 : barX + avoidedWidth + marginWidth / 2).toFixed(1)}" y="${barY + 14}" text-anchor="middle" fill="#fff" font-size="9" font-weight="860">${positiveMargin ? signedMoney(total.marginDelta) : `-${money.format(Math.abs(total.marginDelta))}`}</text>`
      : "";

  svg.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="#fbfcfd" />
    <text x="48" y="29" fill="${text}" font-size="13" font-weight="840">Total cost avoided bridge</text>
    <text x="48" y="48" fill="${muted}" font-size="10" font-weight="720">Cost avoided is the part of switcher bill savings covered by utility cost reduction, plus any net margin left over.</text>
    ${componentCards}
    <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" rx="7" fill="#eef1f3" />
    <rect x="${barX}" y="${barY}" width="${leakageWidth.toFixed(1)}" height="${barHeight}" rx="7" fill="${red}" />
    ${marginSegment}
    ${leakageText}
    ${marginText}
    <line x1="${(barX + avoidedWidth).toFixed(1)}" x2="${(barX + avoidedWidth).toFixed(1)}" y1="${barY - 7}" y2="${barY + barHeight + 7}" stroke="${teal}" stroke-width="2" />
    <text x="${barX}" y="157" fill="${muted}" font-size="9" font-weight="720">Proportional bridge: bill savings ${operator} ${marginCardLabel.toLowerCase()} = avoided cost</text>
    <text x="${barX + avoidedWidth}" y="157" text-anchor="middle" fill="${teal}" font-size="9" font-weight="820">${money.format(total.costAvoided)}</text>
    <line x1="48" x2="${width - 48}" y1="170" y2="170" stroke="${line}" />
    <text x="48" y="198" fill="${text}" font-size="13" font-weight="840">Gross-margin split by switcher type</text>
    <text x="48" y="217" fill="${muted}" font-size="10" font-weight="720">Positive-margin homes are shown to the right of zero; negative-margin homes are shown to the left.</text>
    <text x="${splitAxisX}" y="230" text-anchor="middle" fill="${muted}" font-size="9" font-weight="760">$0</text>
    ${splitBars}
    <rect x="${width - 222}" y="390" width="174" height="28" rx="7" fill="${total.marginDelta >= 0 ? "#e5f2e6" : "#f7e7e4"}" />
    <text x="${width - 64}" y="409" text-anchor="end" fill="${marginColor}" font-size="12" font-weight="880">Net ${signedMoney(total.marginDelta)}</text>
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

function renderLinearMetric(value, maxValue, formatted, tone) {
  const width = maxValue > 0 ? clamp((Math.abs(value) / maxValue) * 100, 0, 100) : 0;
  const valueTone = Math.abs(value) > 0.05 ? tone : "neutral";
  return `
    <div class="table-metric-cell">
      <span class="table-metric-value ${valueTone}">${formatted}</span>
      <span class="table-bar-track">
        <span class="table-bar-fill ${tone}" style="width: ${width.toFixed(1)}%"></span>
      </span>
    </div>
  `;
}

function renderNegativeMarginMetric(row) {
  const touHomes = row.negativeMarginPlanHomes.tou;
  const demandHomes = row.negativeMarginPlanHomes.demand;
  const formatted = `${num.format(row.negativeMarginSwitchHomes)} / ${num.format(row.switchHomes)}`;
  const context =
    row.switchHomes > 0 ? `${pct.format(row.negativeMarginShare)} of switchers` : "No switch homes";
  const split = `TOU ${num.format(touHomes)} | Demand ${num.format(demandHomes)}`;
  const valueTone = row.negativeMarginSwitchHomes > 0.05 ? "negative" : "neutral";
  const touWidth = row.switchHomes > 0 ? clamp((touHomes / row.switchHomes) * 100, 0, 100) : 0;
  const demandWidth =
    row.switchHomes > 0 ? clamp((demandHomes / row.switchHomes) * 100, 0, 100 - touWidth) : 0;

  return `
    <div class="table-metric-cell">
      <span class="table-metric-value ${valueTone}">${formatted}</span>
      <span class="table-metric-context">${context}</span>
      <span class="table-metric-context">${split}</span>
      <span class="table-stacked-track" aria-label="${formatted}; ${context}; ${split}">
        <span class="table-stacked-segment tou" style="width: ${touWidth.toFixed(1)}%"></span>
        <span class="table-stacked-segment demand" style="width: ${demandWidth.toFixed(1)}%"></span>
      </span>
    </div>
  `;
}

function renderDivergingMetric(value, maxAbsValue, formatted) {
  const width = maxAbsValue > 0 ? clamp((Math.abs(value) / maxAbsValue) * 50, 0, 50) : 0;
  const left = value >= 0 ? 50 : 50 - width;
  const tone = value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
  return `
    <div class="table-metric-cell">
      <span class="table-metric-value ${tone}">${formatted}</span>
      <span class="table-diverging-track">
        <span class="table-diverging-zero"></span>
        <span class="table-diverging-fill ${tone}" style="left: ${left.toFixed(1)}%; width: ${width.toFixed(1)}%"></span>
      </span>
    </div>
  `;
}

function renderTable(rows) {
  const maxCustomerSavings = Math.max(1, ...rows.map((row) => row.customerSavings));
  const maxCostAvoided = Math.max(1, ...rows.map((row) => row.costAvoided));
  const maxLeakage = Math.max(1, ...rows.map((row) => row.leakage));
  const maxMarginPerSwitcher = Math.max(
    1,
    ...rows.map((row) => Math.abs(row.marginDeltaPerSwitcher)),
  );
  const maxSegmentMargin = Math.max(1, ...rows.map((row) => Math.abs(row.marginDelta)));

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
        <td>${renderNegativeMarginMetric(row)}</td>
        <td>${renderLinearMetric(row.customerSavings, maxCustomerSavings, money1.format(row.customerSavings), "negative")}</td>
        <td>${renderLinearMetric(row.costAvoided, maxCostAvoided, money1.format(row.costAvoided), "teal")}</td>
        <td>${renderDivergingMetric(row.marginDeltaPerSwitcher, maxMarginPerSwitcher, signedMoney(row.marginDeltaPerSwitcher))}</td>
        <td>${renderLinearMetric(row.leakage, maxLeakage, money.format(row.leakage), "negative")}</td>
        <td>${renderDivergingMetric(row.marginDelta, maxSegmentMargin, signedMoney(row.marginDelta))}</td>
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
      "negative_margin_switch_homes",
      "negative_margin_tou_homes",
      "negative_margin_demand_homes",
      "negative_margin_switch_share",
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
      total.negativeMarginSwitchHomes.toFixed(2),
      total.negativeMarginPlanHomes.tou.toFixed(2),
      total.negativeMarginPlanHomes.demand.toFixed(2),
      total.negativeMarginShare.toFixed(4),
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
      "negative_margin_switch_homes",
      "negative_margin_tou_homes",
      "negative_margin_demand_homes",
      "negative_margin_switch_share",
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
      row.negativeMarginSwitchHomes.toFixed(2),
      row.negativeMarginPlanHomes.tou.toFixed(2),
      row.negativeMarginPlanHomes.demand.toFixed(2),
      row.negativeMarginShare.toFixed(4),
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
