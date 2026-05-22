const buildings = Array.isArray(window.phase3WtpBuildings)
  ? window.phase3WtpBuildings
  : [];

const phase3 = {
  energyPriceCents: 18,
  demandCharge: 0,
  mode: "bounded",
};

const phase3Config = {
  flatAnchor: 0.18,
  capacityLimitKw: 272,
  fixedLpOptimum: 0.2755,
  demandCurveDivisor: 2.106,
  boundedMin: 0.72,
  boundedMax: 1.18,
};

const fmtMoney0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const fmtMoney1 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 1,
});
const fmtNum = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const fmtPct = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function demandAtPrice(building, effectivePrice) {
  if (building.slope <= 0) return building.annualKwh;
  return Math.max(
    0,
    (building.intercept - effectivePrice) /
      (building.slope / phase3Config.demandCurveDivisor),
  );
}

function capacityBurden(building, demandCharge) {
  if (building.annualKwh <= 0) return 0;
  return (demandCharge * building.peakKw * 12) / building.annualKwh;
}

function boundedDemand(rawAnnualKwh, baselineAnnualKwh) {
  if (baselineAnnualKwh <= 0) return rawAnnualKwh;
  const ratio = rawAnnualKwh / baselineAnnualKwh;
  return baselineAnnualKwh *
    clamp(ratio, phase3Config.boundedMin, phase3Config.boundedMax);
}

function buildingResult(building, energyPrice, demandCharge, mode = phase3.mode) {
  const effectivePrice = energyPrice + capacityBurden(building, demandCharge);
  const rawAnnualKwh = demandAtPrice(building, effectivePrice);
  const annualKwh =
    mode === "raw"
      ? rawAnnualKwh
      : boundedDemand(rawAnnualKwh, building.annualKwh);
  const demandRatio =
    building.annualKwh > 0 ? annualKwh / building.annualKwh : 1;
  const peakProxyKw = building.peakKw * demandRatio;
  const monthlyRevenue =
    (energyPrice * annualKwh) / 12 + demandCharge * peakProxyKw;
  return {
    ...building,
    effectivePrice,
    rawAnnualKwh,
    annualKwh,
    demandRatio,
    peakProxyKw,
    monthlyRevenue,
    reductionRatio: 1 - demandRatio,
  };
}

function portfolioAt(energyPrice, demandCharge, mode = phase3.mode) {
  const rows = buildings.map((building) =>
    buildingResult(building, energyPrice, demandCharge, mode),
  );
  const totalAnnualKwh = rows.reduce((sum, row) => sum + row.annualKwh, 0);
  const baselineAnnualKwh = buildings.reduce(
    (sum, building) => sum + building.annualKwh,
    0,
  );
  const monthlyRevenue = rows.reduce((sum, row) => sum + row.monthlyRevenue, 0);
  const peakProxyKw = rows.reduce((sum, row) => sum + row.peakProxyKw, 0);
  const averageDemandRatio =
    baselineAnnualKwh > 0 ? totalAnnualKwh / baselineAnnualKwh : 1;
  return {
    rows,
    totalAnnualKwh,
    baselineAnnualKwh,
    monthlyRevenue,
    peakProxyKw,
    averageDemandRatio,
    capacitySlackKw: phase3Config.capacityLimitKw - peakProxyKw,
  };
}

function frontierRows(mode = phase3.mode) {
  const rows = [];
  for (let cents = 5; cents <= 45; cents += 0.5) {
    const price = cents / 100;
    rows.push({
      price,
      cents,
      ...portfolioAt(price, phase3.demandCharge, mode),
    });
  }
  return rows;
}

function svgLine(points) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}

function chartScales(values, minPadding = 0) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return {
    min: min - span * minPadding,
    max: max + span * minPadding,
  };
}

function renderAxes(width, height, pad, xLabel, yLabel) {
  return `
    <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" stroke="#9aa7af" />
    <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" stroke="#9aa7af" />
    <text x="${width / 2}" y="${height - 10}" text-anchor="middle" fill="#64717b" font-size="12" font-weight="720">${xLabel}</text>
    <text x="16" y="${height / 2}" text-anchor="middle" fill="#64717b" font-size="12" font-weight="720" transform="rotate(-90 16 ${height / 2})">${yLabel}</text>
  `;
}

function renderRevenueChart(frontier, selected) {
  const svg = document.getElementById("phase3-revenue-chart");
  const width = 680;
  const height = 340;
  const pad = { top: 24, right: 28, bottom: 48, left: 64 };
  const yScale = chartScales(frontier.map((row) => row.monthlyRevenue), 0.08);
  const xFor = (price) =>
    pad.left +
    ((price - 0.05) / 0.4) * (width - pad.left - pad.right);
  const yFor = (value) =>
    height -
    pad.bottom -
    ((value - yScale.min) / (yScale.max - yScale.min)) *
      (height - pad.top - pad.bottom);
  const points = frontier.map((row) => ({
    x: xFor(row.price),
    y: yFor(row.monthlyRevenue),
  }));
  const selectedX = xFor(phase3.energyPriceCents / 100);
  const optimumX = xFor(phase3Config.fixedLpOptimum);
  svg.innerHTML = `
    ${renderAxes(width, height, pad, "flat energy price", "monthly revenue")}
    <path d="${svgLine(points)}" fill="none" stroke="#3765a3" stroke-width="3" stroke-linecap="round" />
    <line x1="${optimumX.toFixed(1)}" y1="${pad.top}" x2="${optimumX.toFixed(1)}" y2="${height - pad.bottom}" stroke="#b36b00" stroke-width="2" stroke-dasharray="6 6" />
    <text x="${optimumX + 6}" y="${pad.top + 16}" fill="#7d4b00" font-size="11" font-weight="820">Nathan fixed-rate optimum</text>
    <circle cx="${selectedX.toFixed(1)}" cy="${yFor(selected.monthlyRevenue).toFixed(1)}" r="5.5" fill="#087f8c" stroke="#fff" stroke-width="2" />
    <text x="${pad.left}" y="${pad.top + 12}" fill="#3765a3" font-size="12" font-weight="820">${fmtMoney0.format(selected.monthlyRevenue)} / month</text>
  `;
}

function renderDemandChart(frontier, selected) {
  const svg = document.getElementById("phase3-demand-chart");
  const width = 680;
  const height = 340;
  const pad = { top: 24, right: 28, bottom: 48, left: 64 };
  const yScale = chartScales(frontier.map((row) => row.averageDemandRatio), 0.1);
  const xFor = (price) =>
    pad.left +
    ((price - 0.05) / 0.4) * (width - pad.left - pad.right);
  const yFor = (value) =>
    height -
    pad.bottom -
    ((value - yScale.min) / (yScale.max - yScale.min)) *
      (height - pad.top - pad.bottom);
  const points = frontier.map((row) => ({
    x: xFor(row.price),
    y: yFor(row.averageDemandRatio),
  }));
  const selectedX = xFor(phase3.energyPriceCents / 100);
  const anchorY = yFor(1);
  svg.innerHTML = `
    ${renderAxes(width, height, pad, "flat energy price", "annual kWh ratio")}
    <line x1="${pad.left}" y1="${anchorY.toFixed(1)}" x2="${width - pad.right}" y2="${anchorY.toFixed(1)}" stroke="#9aa7af" stroke-dasharray="5 5" />
    <path d="${svgLine(points)}" fill="none" stroke="#087f8c" stroke-width="3" stroke-linecap="round" />
    <circle cx="${selectedX.toFixed(1)}" cy="${yFor(selected.averageDemandRatio).toFixed(1)}" r="5.5" fill="#087f8c" stroke="#fff" stroke-width="2" />
    <text x="${pad.left}" y="${pad.top + 12}" fill="#087f8c" font-size="12" font-weight="820">${fmtPct.format(selected.averageDemandRatio)} of baseline kWh</text>
  `;
}

function renderScatter(rows) {
  const svg = document.getElementById("phase3-scatter-chart");
  const width = 680;
  const height = 340;
  const pad = { top: 24, right: 28, bottom: 48, left: 64 };
  const xScale = chartScales(rows.map((row) => row.slope), 0.08);
  const yScale = chartScales(rows.map((row) => row.intercept), 0.08);
  const maxAnnual = Math.max(...rows.map((row) => row.annualKwh));
  const xFor = (value) =>
    pad.left +
    ((value - xScale.min) / (xScale.max - xScale.min)) *
      (width - pad.left - pad.right);
  const yFor = (value) =>
    height -
    pad.bottom -
    ((value - yScale.min) / (yScale.max - yScale.min)) *
      (height - pad.top - pad.bottom);
  const dots = rows
    .map((row) => {
      const radius = 3 + 6 * Math.sqrt(row.annualKwh / maxAnnual);
      const color =
        row.segment === "high_peak"
          ? "#b36b00"
          : row.segment === "mid_peak"
            ? "#087f8c"
            : "#64717b";
      return `<circle cx="${xFor(row.slope).toFixed(1)}" cy="${yFor(row.intercept).toFixed(1)}" r="${radius.toFixed(1)}" fill="${color}" opacity="0.68"><title>${row.id}: intercept ${row.intercept}, slope ${row.slope}</title></circle>`;
    })
    .join("");
  svg.innerHTML = `
    ${renderAxes(width, height, pad, "slope", "intercept")}
    ${dots}
  `;
}

function renderCapacityChart(selected) {
  const svg = document.getElementById("phase3-capacity-chart");
  const width = 680;
  const height = 340;
  const pad = { top: 26, right: 40, bottom: 48, left: 70 };
  const cap = phase3Config.capacityLimitKw;
  const current = selected.peakProxyKw;
  const max = Math.max(cap, current) * 1.18;
  const yFor = (value) =>
    height - pad.bottom - (value / max) * (height - pad.top - pad.bottom);
  const barWidth = 96;
  const capX = 200;
  const currentX = 390;
  const bar = (x, value, color, label) => {
    const y = yFor(value);
    return `
      <rect x="${x}" y="${y.toFixed(1)}" width="${barWidth}" height="${(height - pad.bottom - y).toFixed(1)}" rx="6" fill="${color}" opacity="0.82" />
      <text x="${x + barWidth / 2}" y="${(y - 8).toFixed(1)}" text-anchor="middle" fill="${color}" font-size="12" font-weight="820">${fmtNum.format(value)} kW</text>
      <text x="${x + barWidth / 2}" y="${height - 18}" text-anchor="middle" fill="#64717b" font-size="12" font-weight="760">${label}</text>
    `;
  };
  svg.innerHTML = `
    ${renderAxes(width, height, pad, "", "portfolio peak proxy")}
    ${bar(capX, cap, "#64717b", "Capacity screen")}
    ${bar(currentX, current, current <= cap ? "#2e7d32" : "#b13a2f", "Selected WTP")}
    <text x="${pad.left}" y="${pad.top + 10}" fill="${current <= cap ? "#2e7d32" : "#b13a2f"}" font-size="12" font-weight="820">${current <= cap ? "Under" : "Over"} screen by ${fmtNum.format(Math.abs(cap - current))} kW</text>
  `;
}

function renderKpis(selected) {
  document.getElementById("phase3-building-count").textContent = buildings.length;
  const container = document.getElementById("phase3-kpis");
  container.innerHTML = [
    ["Monthly revenue", fmtMoney0.format(selected.monthlyRevenue)],
    ["Annual kWh", `${fmtNum.format(selected.totalAnnualKwh / 1000)}k`],
    ["Demand ratio", fmtPct.format(selected.averageDemandRatio)],
    ["Peak proxy", `${fmtNum.format(selected.peakProxyKw)} kW`],
    ["Capacity slack", `${fmtNum.format(selected.capacitySlackKw)} kW`],
  ]
    .map(
      ([label, value]) => `
        <article class="phase3-kpi">
          <label>${label}</label>
          <strong>${value}</strong>
        </article>
      `,
    )
    .join("");
}

function renderBuildingRows(rows) {
  const tbody = document.getElementById("phase3-building-rows");
  tbody.innerHTML = [...rows]
    .sort((a, b) => b.reductionRatio - a.reductionRatio)
    .slice(0, 40)
    .map(
      (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${row.segment.replace("_", " ")}</td>
          <td>${row.intercept.toFixed(2)}</td>
          <td>${row.slope.toFixed(6)}</td>
          <td>${(row.effectivePrice * 100).toFixed(1)}¢</td>
          <td>${fmtPct.format(row.demandRatio)}</td>
          <td>${fmtNum.format(row.annualKwh)}</td>
          <td>${fmtMoney1.format(row.monthlyRevenue)}</td>
          <td>${fmtNum.format(row.peakProxyKw)} kW</td>
        </tr>
      `,
    )
    .join("");
}

function renderPhase3() {
  const energyPrice = phase3.energyPriceCents / 100;
  const selected = portfolioAt(energyPrice, phase3.demandCharge, phase3.mode);
  const frontier = frontierRows(phase3.mode);
  document.getElementById("phase3-energy-price-value").textContent =
    phase3.energyPriceCents.toFixed(1);
  document.getElementById("phase3-demand-charge-value").textContent =
    phase3.demandCharge;
  renderKpis(selected);
  renderRevenueChart(frontier, selected);
  renderDemandChart(frontier, selected);
  renderScatter(selected.rows);
  renderCapacityChart(selected);
  renderBuildingRows(selected.rows);
}

document.getElementById("phase3-energy-price").addEventListener("input", (event) => {
  phase3.energyPriceCents = Number(event.target.value);
  renderPhase3();
});

document.getElementById("phase3-demand-charge").addEventListener("input", (event) => {
  phase3.demandCharge = Number(event.target.value);
  renderPhase3();
});

document.getElementById("phase3-mode").addEventListener("change", (event) => {
  phase3.mode = event.target.value;
  renderPhase3();
});

renderPhase3();
