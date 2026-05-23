(function renderOptimizationModelPage() {
  const frontierSvg = document.getElementById("optimization-frontier-chart");
  const capacitySvg = document.getElementById("optimization-capacity-chart");
  if (!frontierSvg || !capacitySvg || typeof allOptimizations !== "function") {
    return;
  }

  const width = 760;
  const height = 420;
  const pad = { top: 34, right: 34, bottom: 72, left: 88 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const colors = {
    tou: "#b36b00",
    demand: "#087f8c",
    flat: "#64717b",
    optimized: "#172026",
    feasible: "#087f8c",
    infeasible: "#9aa5ad",
    capacity: "#b13a2f",
    grid: "#dfe6eb",
    text: "#172026",
    muted: "#64717b",
    panel: "#fbfcfd",
    good: "#2e7d32",
  };
  const percent = new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  });
  const number = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  });

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function uniqueSorted(values) {
    return [...new Set(values.map((value) => Number(value.toFixed(4))))].sort(
      (a, b) => a - b,
    );
  }

  function niceCeil(value, step) {
    return Math.ceil(value / step) * step;
  }

  function moneyAxis(value) {
    if (Math.abs(value) < 1) return "$0";
    const sign = value < 0 ? "-" : "";
    const abs = Math.abs(value);
    if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
    return `${sign}$${Math.round(abs / 1000)}k`;
  }

  function signedMoneyLabel(value) {
    if (typeof signedCompactMoney === "function") return signedCompactMoney(value);
    if (Math.abs(value) < 1) return "$0";
    return `${value > 0 ? "+" : "-"}${moneyAxis(Math.abs(value))}`;
  }

  function scale(value, min, max, pixelMin, pixelMax) {
    if (max === min) return (pixelMin + pixelMax) / 2;
    return pixelMin + ((value - min) / (max - min)) * (pixelMax - pixelMin);
  }

  function xFor(value, min, max) {
    return scale(value, min, max, pad.left, width - pad.right);
  }

  function yFor(value, min, max) {
    return scale(value, min, max, height - pad.bottom, pad.top);
  }

  function linePath(points) {
    return points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
      )
      .join(" ");
  }

  function axisLabel(text, x, y, anchor = "middle") {
    return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${colors.muted}" font-size="12" font-weight="760">${text}</text>`;
  }

  function metricHtml(label, value, detail, status = "") {
    return `
      <div class="optimization-chart-metric ${status}">
        <label>${escapeHtml(label)}</label>
        <strong>${escapeHtml(value)}</strong>
        <span>${escapeHtml(detail)}</span>
      </div>
    `;
  }

  function collectOptimizationRows() {
    const results = allOptimizations();
    const overallPool = results
      .flatMap((result) => result.candidates)
      .filter((candidate) => candidate.feasible);
    const fallbackPool = results.flatMap((result) => result.candidates);
    const overallBest = (overallPool.length ? overallPool : fallbackPool).reduce(
      (winner, candidate) =>
        !winner || candidate.objectiveValue > winner.objectiveValue
          ? candidate
          : winner,
      null,
    );
    const bestByKind = new Set(
      results.map((result) => `${result.kind}:${result.best.value}`),
    );
    const overallKey = overallBest
      ? `${overallBest.kind}:${overallBest.value}`
      : "";
    const rows = results.flatMap((result) =>
      result.candidates.map((candidate) => ({
        ...candidate,
        label: optimizerDecisionLabel(candidate.kind, candidate.value),
        tariffName: tariffById(candidate.tariffId).name,
        isKindBest: bestByKind.has(`${candidate.kind}:${candidate.value}`),
        isOverallBest: `${candidate.kind}:${candidate.value}` === overallKey,
      })),
    );
    return { results, rows, overallBest };
  }

  function frontierPoint(row, x, y) {
    const fill = row.feasible ? colors[row.kind] : colors.infeasible;
    const opacity = row.feasible ? 0.9 : 0.42;
    const stroke = row.isOverallBest ? colors.text : "#ffffff";
    const strokeWidth = row.isOverallBest ? 2.8 : row.isKindBest ? 2 : 1;
    const title =
      `${row.tariffName} ${row.label}: ` +
      `${percent.format(row.revenueRetention)} revenue retained, ` +
      `${signedMoneyLabel(row.marginDelta)} margin vs flat, ` +
      `${number.format(row.economics.peakKw)} kW peak, ` +
      `${row.feasible ? "feasible" : "constraint violation"}`;
    if (row.kind === "demand") {
      const radius = row.isOverallBest ? 7 : row.isKindBest ? 6 : 5;
      return `
        <path d="M ${x.toFixed(1)} ${(y - radius).toFixed(1)} L ${(x + radius).toFixed(1)} ${y.toFixed(1)} L ${x.toFixed(1)} ${(y + radius).toFixed(1)} L ${(x - radius).toFixed(1)} ${y.toFixed(1)} Z"
          fill="${fill}" opacity="${opacity}" stroke="${stroke}" stroke-width="${strokeWidth}">
          <title>${escapeHtml(title)}</title>
        </path>
      `;
    }
    const radius = row.isOverallBest ? 7 : row.isKindBest ? 6 : 5;
    return `
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius}" fill="${fill}" opacity="${opacity}" stroke="${stroke}" stroke-width="${strokeWidth}">
        <title>${escapeHtml(title)}</title>
      </circle>
    `;
  }

  function renderFrontier() {
    const { rows, overallBest } = collectOptimizationRows();
    const xMin = Math.floor((Math.min(optimizationConfig.revenueRetentionMin, ...rows.map((row) => row.revenueRetention)) - 0.01) * 100) / 100;
    const xMax = Math.ceil((Math.max(1, ...rows.map((row) => row.revenueRetention)) + 0.01) * 100) / 100;
    const maxAbsMargin = Math.max(
      5000,
      ...rows.map((row) => Math.abs(row.marginDelta)),
    );
    const yStep = maxAbsMargin > 200000 ? 50000 : 25000;
    const yMax = niceCeil(maxAbsMargin * 1.15, yStep);
    const yMin = -yMax;
    const xTicks = uniqueSorted([
      xMin,
      optimizationConfig.revenueRetentionMin,
      1,
      xMax,
    ]).filter((tick) => tick >= xMin && tick <= xMax);
    const yTicks = [-yMax, -yMax / 2, 0, yMax / 2, yMax];
    const thresholdX = xFor(optimizationConfig.revenueRetentionMin, xMin, xMax);
    const zeroY = yFor(0, yMin, yMax);
    const points = rows
      .map((row) =>
        frontierPoint(
          row,
          xFor(row.revenueRetention, xMin, xMax),
          yFor(row.marginDelta, yMin, yMax),
        ),
      )
      .join("");

    frontierSvg.innerHTML = `
      <rect width="${width}" height="${height}" fill="${colors.panel}" />
      ${xTicks
        .map((tick) => {
          const x = xFor(tick, xMin, xMax);
          return `
            <line x1="${x.toFixed(1)}" y1="${pad.top}" x2="${x.toFixed(1)}" y2="${height - pad.bottom}" stroke="${colors.grid}" stroke-width="1" />
            <text x="${x.toFixed(1)}" y="${height - 48}" text-anchor="middle" fill="${colors.muted}" font-size="11" font-weight="720">${percent.format(tick)}</text>
          `;
        })
        .join("")}
      ${yTicks
        .map((tick) => {
          const y = yFor(tick, yMin, yMax);
          return `
            <line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${width - pad.right}" y2="${y.toFixed(1)}" stroke="${tick === 0 ? "#b9c3ca" : colors.grid}" stroke-width="${tick === 0 ? 1.4 : 1}" />
            <text x="${pad.left - 12}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="${colors.muted}" font-size="11" font-weight="720">${moneyAxis(tick)}</text>
          `;
        })
        .join("")}
      <line x1="${thresholdX.toFixed(1)}" y1="${pad.top}" x2="${thresholdX.toFixed(1)}" y2="${height - pad.bottom}" stroke="${colors.capacity}" stroke-width="2" stroke-dasharray="7 6" />
      <text x="${(thresholdX + 8).toFixed(1)}" y="${pad.top + 14}" fill="${colors.capacity}" font-size="11" font-weight="820">95% revenue floor</text>
      <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" stroke="#94a0a8" stroke-width="1.2" />
      <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" stroke="#94a0a8" stroke-width="1.2" />
      ${points}
      <g transform="translate(${width - 286} ${pad.top + 4})">
        <circle cx="0" cy="0" r="5" fill="${colors.tou}" />
        <text x="12" y="4" fill="${colors.muted}" font-size="11" font-weight="760">TOU spread</text>
        <path d="M 111 -5 L 116 0 L 111 5 L 106 0 Z" fill="${colors.demand}" />
        <text x="124" y="4" fill="${colors.muted}" font-size="11" font-weight="760">Demand charge</text>
      </g>
      ${axisLabel("Realized revenue retained", width / 2, height - 18)}
      <text x="20" y="${height / 2}" transform="rotate(-90 20 ${height / 2})" text-anchor="middle" fill="${colors.muted}" font-size="12" font-weight="760">Monthly margin vs flat</text>
      <title>Feasible frontier scatter of tariff candidates by revenue retention and margin delta.</title>
    `;

    const feasibleCount = rows.filter((row) => row.feasible).length;
    const summary = document.getElementById("optimization-frontier-summary");
    if (summary && overallBest) {
      summary.innerHTML =
        metricHtml("Candidates", String(rows.length), `${feasibleCount} feasible`, "") +
        metricHtml(
          "LP optimum",
          optimizerDecisionLabel(overallBest.kind, overallBest.value),
          tariffById(overallBest.tariffId).name,
          "positive",
        ) +
        metricHtml(
          "Objective",
          signedMoneyLabel(overallBest.marginDelta),
          "monthly margin vs flat",
          overallBest.marginDelta >= 0 ? "positive" : "negative",
        ) +
        metricHtml(
          "Revenue kept",
          percent.format(overallBest.revenueRetention),
          "realized after response",
          overallBest.revenueRetention >= optimizationConfig.revenueRetentionMin
            ? "positive"
            : "negative",
        );
    }
  }

  function renderCapacity() {
    const { overallBest } = collectOptimizationRows();
    if (!overallBest) return;
    const flat = portfolioEconomics("flat", state).total;
    const optimized = portfolioEconomics(
      overallBest.tariffId,
      overallBest.scenario,
    ).total;
    const capacityLimit = optimizationConfig.maxPeakKw;
    const hours = Array.from({ length: 24 }, (_, hour) => hour);
    const yMax = niceCeil(
      Math.max(
        capacityLimit,
        ...flat.hourlyGrid,
        ...optimized.hourlyGrid,
      ) * 1.08,
      5000,
    );
    const yMin = 0;
    const yTicks = Array.from({ length: 5 }, (_, index) => (yMax / 4) * index);
    const xTickHours = [0, 4, 8, 12, 16, 20, 23];
    const flatPoints = flat.hourlyGrid.map((value, hour) => ({
      x: xFor(hour, 0, 23),
      y: yFor(value, yMin, yMax),
    }));
    const optimizedPoints = optimized.hourlyGrid.map((value, hour) => ({
      x: xFor(hour, 0, 23),
      y: yFor(value, yMin, yMax),
    }));
    const capacityY = yFor(capacityLimit, yMin, yMax);
    const flatPeakHour = flat.hourlyGrid.indexOf(Math.max(...flat.hourlyGrid));
    const optimizedPeakHour = optimized.hourlyGrid.indexOf(
      Math.max(...optimized.hourlyGrid),
    );
    const optimizedLabel =
      `${tariffById(overallBest.tariffId).name} ` +
      optimizerDecisionLabel(overallBest.kind, overallBest.value);

    capacitySvg.innerHTML = `
      <rect width="${width}" height="${height}" fill="${colors.panel}" />
      <rect x="${pad.left}" y="${pad.top}" width="${chartWidth}" height="${Math.max(0, capacityY - pad.top).toFixed(1)}" fill="#f8e8e6" opacity="0.72" />
      ${xTickHours
        .map((hour) => {
          const x = xFor(hour, 0, 23);
          return `
            <line x1="${x.toFixed(1)}" y1="${pad.top}" x2="${x.toFixed(1)}" y2="${height - pad.bottom}" stroke="${colors.grid}" stroke-width="1" />
            <text x="${x.toFixed(1)}" y="${height - 48}" text-anchor="middle" fill="${colors.muted}" font-size="11" font-weight="720">${hour}:00</text>
          `;
        })
        .join("")}
      ${yTicks
        .map((tick) => {
          const y = yFor(tick, yMin, yMax);
          return `
            <line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${width - pad.right}" y2="${y.toFixed(1)}" stroke="${colors.grid}" stroke-width="1" />
            <text x="${pad.left - 12}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="${colors.muted}" font-size="11" font-weight="720">${number.format(tick)}</text>
          `;
        })
        .join("")}
      <line x1="${pad.left}" y1="${capacityY.toFixed(1)}" x2="${width - pad.right}" y2="${capacityY.toFixed(1)}" stroke="${colors.capacity}" stroke-width="2.4" stroke-dasharray="8 6" />
      <text x="${pad.left + 10}" y="${(capacityY - 9).toFixed(1)}" fill="${colors.capacity}" font-size="11" font-weight="820">capacity ${number.format(capacityLimit)} kW</text>
      <path d="${linePath(flatPoints)}" fill="none" stroke="${colors.flat}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <path d="${linePath(optimizedPoints)}" fill="none" stroke="${colors.optimized}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="${flatPoints[flatPeakHour].x.toFixed(1)}" cy="${flatPoints[flatPeakHour].y.toFixed(1)}" r="5" fill="${colors.flat}" stroke="#fff" stroke-width="2">
        <title>Flat peak: ${number.format(flat.peakKw)} kW at ${flatPeakHour}:00</title>
      </circle>
      <circle cx="${optimizedPoints[optimizedPeakHour].x.toFixed(1)}" cy="${optimizedPoints[optimizedPeakHour].y.toFixed(1)}" r="6" fill="${colors.optimized}" stroke="#fff" stroke-width="2">
        <title>${escapeHtml(optimizedLabel)} peak: ${number.format(optimized.peakKw)} kW at ${optimizedPeakHour}:00</title>
      </circle>
      <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" stroke="#94a0a8" stroke-width="1.2" />
      <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" stroke="#94a0a8" stroke-width="1.2" />
      <g transform="translate(${width - 330} ${pad.top + 4})">
        <line x1="0" y1="0" x2="24" y2="0" stroke="${colors.flat}" stroke-width="3" />
        <text x="32" y="4" fill="${colors.muted}" font-size="11" font-weight="760">Flat</text>
        <line x1="84" y1="0" x2="108" y2="0" stroke="${colors.optimized}" stroke-width="3.4" />
        <text x="116" y="4" fill="${colors.muted}" font-size="11" font-weight="760">LP optimum</text>
        <line x1="214" y1="0" x2="238" y2="0" stroke="${colors.capacity}" stroke-width="2.4" stroke-dasharray="7 5" />
        <text x="246" y="4" fill="${colors.muted}" font-size="11" font-weight="760">Capacity</text>
      </g>
      ${axisLabel("Hour of day", width / 2, height - 18)}
      <text x="20" y="${height / 2}" transform="rotate(-90 20 ${height / 2})" text-anchor="middle" fill="${colors.muted}" font-size="12" font-weight="760">Portfolio kW</text>
      <title>Hourly portfolio load under flat pricing versus the optimized tariff with the MATLAB capacity limit.</title>
    `;

    const summary = document.getElementById("optimization-capacity-summary");
    const peakCut = flat.peakKw - optimized.peakKw;
    const slack = capacityLimit - optimized.peakKw;
    if (summary) {
      summary.innerHTML =
        metricHtml("Flat peak", `${number.format(flat.peakKw)} kW`, `${flatPeakHour}:00 portfolio max`) +
        metricHtml(
          "Optimized peak",
          `${number.format(optimized.peakKw)} kW`,
          optimizedLabel,
          optimized.peakKw <= capacityLimit ? "positive" : "negative",
        ) +
        metricHtml(
          "Peak cut",
          `${number.format(peakCut)} kW`,
          percent.format(flat.peakKw > 0 ? peakCut / flat.peakKw : 0),
          peakCut >= 0 ? "positive" : "negative",
        ) +
        metricHtml(
          "Capacity slack",
          `${number.format(slack)} kW`,
          `${number.format(capacityLimit)} kW limit`,
          slack >= 0 ? "positive" : "negative",
        );
    }
  }

  renderFrontier();
  renderCapacity();
})();
