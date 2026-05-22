"use strict";

const exampleData = `sample,group,gene,ct
C1,Control,GAPDH,18.30
C1,Control,GAPDH,18.42
C1,Control,IL6,26.10
C1,Control,IL6,26.00
C2,Control,GAPDH,18.50
C2,Control,GAPDH,18.47
C2,Control,IL6,25.80
C2,Control,IL6,25.92
C3,Control,GAPDH,18.21
C3,Control,GAPDH,18.36
C3,Control,IL6,26.23
C3,Control,IL6,26.18
T1,Treatment,GAPDH,18.55
T1,Treatment,GAPDH,18.49
T1,Treatment,IL6,23.90
T1,Treatment,IL6,23.83
T2,Treatment,GAPDH,18.62
T2,Treatment,GAPDH,18.71
T2,Treatment,IL6,24.08
T2,Treatment,IL6,24.00
T3,Treatment,GAPDH,18.39
T3,Treatment,GAPDH,18.44
T3,Treatment,IL6,23.71
T3,Treatment,IL6,23.88
D1,Drug,GAPDH,18.70
D1,Drug,GAPDH,18.63
D1,Drug,IL6,25.18
D1,Drug,IL6,25.24
D2,Drug,GAPDH,18.58
D2,Drug,GAPDH,18.61
D2,Drug,IL6,25.07
D2,Drug,IL6,25.01
D3,Drug,GAPDH,18.73
D3,Drug,GAPDH,18.68
D3,Drug,IL6,25.44
D3,Drug,IL6,25.30`;

const dualReferenceExampleData = `sample,group,gene,ct
C1,Control,GAPDH,18.30
C1,Control,GAPDH,18.42
C1,Control,ACTB,19.10
C1,Control,ACTB,19.02
C1,Control,IL6,26.10
C1,Control,IL6,26.00
C2,Control,GAPDH,18.50
C2,Control,GAPDH,18.47
C2,Control,ACTB,19.20
C2,Control,ACTB,19.17
C2,Control,IL6,25.80
C2,Control,IL6,25.92
C3,Control,GAPDH,18.21
C3,Control,GAPDH,18.36
C3,Control,ACTB,18.94
C3,Control,ACTB,19.05
C3,Control,IL6,26.23
C3,Control,IL6,26.18
T1,Treatment,GAPDH,18.55
T1,Treatment,GAPDH,18.49
T1,Treatment,ACTB,19.26
T1,Treatment,ACTB,19.19
T1,Treatment,IL6,23.90
T1,Treatment,IL6,23.83
T2,Treatment,GAPDH,18.62
T2,Treatment,GAPDH,18.71
T2,Treatment,ACTB,19.34
T2,Treatment,ACTB,19.45
T2,Treatment,IL6,24.08
T2,Treatment,IL6,24.00
T3,Treatment,GAPDH,18.39
T3,Treatment,GAPDH,18.44
T3,Treatment,ACTB,19.10
T3,Treatment,ACTB,19.15
T3,Treatment,IL6,23.71
T3,Treatment,IL6,23.88
D1,Drug,GAPDH,18.70
D1,Drug,GAPDH,18.63
D1,Drug,ACTB,19.40
D1,Drug,ACTB,19.35
D1,Drug,IL6,25.18
D1,Drug,IL6,25.24
D2,Drug,GAPDH,18.58
D2,Drug,GAPDH,18.61
D2,Drug,ACTB,19.25
D2,Drug,ACTB,19.30
D2,Drug,IL6,25.07
D2,Drug,IL6,25.01
D3,Drug,GAPDH,18.73
D3,Drug,GAPDH,18.68
D3,Drug,ACTB,19.44
D3,Drug,ACTB,19.39
D3,Drug,IL6,25.44
D3,Drug,IL6,25.30`;

const state = {
  rows: [],
  result: null,
};

const technicalReplicateRangeThreshold = 0.5;

const els = {
  dataInput: document.getElementById("dataInput"),
  loadExample: document.getElementById("loadExample"),
  dualReferenceMode: document.getElementById("dualReferenceMode"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  targetGene: document.getElementById("targetGene"),
  referenceGene: document.getElementById("referenceGene"),
  referenceGene2: document.getElementById("referenceGene2"),
  referenceGene2Field: document.getElementById("referenceGene2Field"),
  controlGroup: document.getElementById("controlGroup"),
  errorMode: document.getElementById("errorMode"),
  controlColor: document.getElementById("controlColor"),
  treatmentColor: document.getElementById("treatmentColor"),
  showPoints: document.getElementById("showPoints"),
  showMeanLabels: document.getElementById("showMeanLabels"),
  message: document.getElementById("message"),
  warning: document.getElementById("warning"),
  sampleCount: document.getElementById("sampleCount"),
  groupCount: document.getElementById("groupCount"),
  anovaP: document.getElementById("anovaP"),
  controlMeanDeltaCt: document.getElementById("controlMeanDeltaCt"),
  chart: document.getElementById("chart"),
  groupTable: document.getElementById("groupTable"),
  sampleTable: document.getElementById("sampleTable"),
  downloadSvg: document.getElementById("downloadSvg"),
  downloadCsv: document.getElementById("downloadCsv"),
};

function parseInput(text) {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("请至少提供一行表头和一行 Ct 数据。");
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delimiter).map(normalizeHeader);
  const required = ["sample", "group", "gene", "ct"];
  const missing = required.filter((key) => !headers.includes(key));
  if (missing.length) {
    throw new Error(`缺少必要表头：${missing.join(", ")}。`);
  }

  const index = Object.fromEntries(headers.map((name, idx) => [name, idx]));
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = splitLine(lines[i], delimiter);
    const ct = Number(values[index.ct]);
    if (!Number.isFinite(ct)) {
      throw new Error(`第 ${i + 1} 行 Ct 不是有效数字。`);
    }
    rows.push({
      sample: clean(values[index.sample]),
      group: clean(values[index.group]),
      gene: clean(values[index.gene]),
      ct,
    });
  }

  rows.forEach((row, idx) => {
    if (!row.sample || !row.group || !row.gene) {
      throw new Error(`第 ${idx + 2} 行 sample、group 或 gene 为空。`);
    }
  });

  return rows;
}

function detectDelimiter(header) {
  const counts = [
    [",", (header.match(/,/g) || []).length],
    ["\t", (header.match(/\t/g) || []).length],
    [";", (header.match(/;/g) || []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : /\s{2,}/.test(header) ? /\s{2,}/ : ",";
}

function splitLine(line, delimiter) {
  if (delimiter instanceof RegExp) return line.split(delimiter).map(clean);
  const cells = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(clean(current));
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(clean(current));
  return cells;
}

function clean(value) {
  return String(value ?? "").trim().replace(/^"|"$/g, "");
}

function normalizeHeader(header) {
  const normalized = clean(header).toLowerCase().replace(/\s+/g, "");
  const aliases = {
    sample: "sample",
    samples: "sample",
    "样本": "sample",
    "样品": "sample",
    group: "group",
    groups: "group",
    "组别": "group",
    "分组": "group",
    gene: "gene",
    genes: "gene",
    "基因": "gene",
    ct: "ct",
    cq: "ct",
    cp: "ct",
    "ct值": "ct",
  };
  return aliases[normalized] || normalized;
}

function updateSelectors(rows) {
  const genes = unique(rows.map((row) => row.gene));
  const groups = unique(rows.map((row) => row.group));
  const reference = guessReference(genes);
  const reference2 = guessSecondReference(genes, reference);
  setOptions(els.targetGene, genes, guessTarget(genes));
  setOptions(els.referenceGene, genes, reference);
  setOptions(els.referenceGene2, genes, reference2);
  setOptions(els.controlGroup, groups, guessControl(groups));
  updateModeUi();
}

function setOptions(select, values, preferred) {
  const previous = select.value;
  select.innerHTML = "";
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  select.value = values.includes(previous) ? previous : preferred;
}

function guessReference(genes) {
  const refs = ["gapdh", "actb", "b2m", "18s", "rplp0", "hprt1", "tbp"];
  return genes.find((gene) => refs.includes(gene.toLowerCase())) || genes[0] || "";
}

function guessTarget(genes) {
  const reference = guessReference(genes);
  const reference2 = guessSecondReference(genes, reference);
  return genes.find((gene) => gene !== reference && gene !== reference2) || genes.find((gene) => gene !== reference) || genes[0] || "";
}

function guessSecondReference(genes, referenceGene) {
  const refs = ["actb", "b2m", "18s", "rplp0", "hprt1", "tbp", "gapdh"];
  return genes.find((gene) => gene !== referenceGene && refs.includes(gene.toLowerCase())) || genes.find((gene) => gene !== referenceGene) || genes[0] || "";
}

function guessControl(groups) {
  const names = ["control", "ctrl", "untreated", "vehicle", "mock", "对照"];
  return groups.find((group) => names.includes(group.toLowerCase())) || groups[0] || "";
}

function unique(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function orderGroups(groups, controlGroup) {
  return [...groups].sort((a, b) => {
    if (a === controlGroup) return -1;
    if (b === controlGroup) return 1;
    return a.localeCompare(b, "zh-CN");
  });
}

function updateModeUi() {
  els.referenceGene2Field.hidden = !els.dualReferenceMode.checked;
}

function validateGeneSelection(config) {
  if (config.targetGene === config.referenceGene) {
    throw new Error("目标基因不能和内参基因相同，请重新选择。");
  }
  if (config.dualReferenceMode && config.targetGene === config.referenceGene2) {
    throw new Error("目标基因不能和第二内参相同，请重新选择。");
  }
  if (config.dualReferenceMode && config.referenceGene === config.referenceGene2) {
    throw new Error("两个内参基因不能相同，请重新选择。");
  }
}

function findTechnicalReplicateWarnings(rows, selectedGenes) {
  const groups = new Map();
  rows
    .filter((row) => selectedGenes.has(row.gene))
    .forEach((row) => {
      const key = [row.sample, row.group, row.gene].join("\u0001");
      if (!groups.has(key)) {
        groups.set(key, { sample: row.sample, group: row.group, gene: row.gene, cts: [] });
      }
      groups.get(key).cts.push(row.ct);
    });

  return [...groups.values()]
    .filter((entry) => entry.cts.length > 1)
    .map((entry) => {
      const minCt = Math.min(...entry.cts);
      const maxCt = Math.max(...entry.cts);
      return { ...entry, minCt, maxCt, range: maxCt - minCt };
    })
    .filter((entry) => entry.range > technicalReplicateRangeThreshold)
    .sort((a, b) => b.range - a.range);
}

function analyze() {
  clearMessage();
  clearWarning();
  try {
    const rows = parseInput(els.dataInput.value);
    state.rows = rows;
    updateSelectors(rows);
    const config = {
      dualReferenceMode: els.dualReferenceMode.checked,
      targetGene: els.targetGene.value,
      referenceGene: els.referenceGene.value,
      referenceGene2: els.referenceGene2.value,
      controlGroup: els.controlGroup.value,
      errorMode: els.errorMode.value,
      controlColor: els.controlColor.value,
      treatmentColor: els.treatmentColor.value,
      showPoints: els.showPoints.checked,
      showMeanLabels: els.showMeanLabels.checked,
    };
    validateGeneSelection(config);
    const result = calculate(rows, config);
    state.result = result;
    render(result);
    const selectedGenes = new Set(config.dualReferenceMode ? [config.targetGene, config.referenceGene, config.referenceGene2] : [config.targetGene, config.referenceGene]);
    showWarnings({
      technicalReplicates: findTechnicalReplicateWarnings(rows, selectedGenes),
      statsWarnings: result.statsWarnings,
    });
  } catch (error) {
    state.result = null;
    renderEmptyState();
    showMessage(error.message);
  }
}

function calculate(rows, config) {
  const referenceGenes = config.dualReferenceMode ? [config.referenceGene, config.referenceGene2] : [config.referenceGene];
  const distinctGenes = new Set([config.targetGene, ...referenceGenes]);
  if (distinctGenes.size !== referenceGenes.length + 1) {
    throw new Error(config.dualReferenceMode ? "目标基因、内参基因和第二内参不能相同。" : "目标基因和内参基因不能相同。");
  }

  const selectedGenes = new Set([config.targetGene, ...referenceGenes]);
  const filtered = rows.filter((row) => selectedGenes.has(row.gene));
  const technical = new Map();
  filtered.forEach((row) => {
    const key = [row.sample, row.group, row.gene].join("\u0001");
    if (!technical.has(key)) {
      technical.set(key, { sample: row.sample, group: row.group, gene: row.gene, cts: [] });
    }
    technical.get(key).cts.push(row.ct);
  });

  const sampleMap = new Map();
  technical.forEach((entry) => {
    const key = [entry.sample, entry.group].join("\u0001");
    if (!sampleMap.has(key)) sampleMap.set(key, { sample: entry.sample, group: entry.group });
    sampleMap.get(key)[entry.gene] = mean(entry.cts);
  });

  const samples = [...sampleMap.values()]
    .filter((entry) => Number.isFinite(entry[config.targetGene]) && referenceGenes.every((gene) => Number.isFinite(entry[gene])))
    .map((entry) => ({
      sample: entry.sample,
      group: entry.group,
      targetCt: entry[config.targetGene],
      referenceCt: mean(referenceGenes.map((gene) => entry[gene])),
      referenceCts: Object.fromEntries(referenceGenes.map((gene) => [gene, entry[gene]])),
      deltaCt: entry[config.targetGene] - mean(referenceGenes.map((gene) => entry[gene])),
    }));

  if (!samples.length) {
    throw new Error(config.dualReferenceMode ? "没有找到同时包含目标基因和两个内参基因 Ct 的样本。" : "没有找到同时包含目标基因和内参基因 Ct 的样本。");
  }

  const groups = unique(samples.map((sample) => sample.group));
  if (!groups.includes(config.controlGroup)) {
    throw new Error("对照组不存在。");
  }

  const controlSamples = samples.filter((sample) => sample.group === config.controlGroup);

  const controlMeanDeltaCt = mean(controlSamples.map((sample) => sample.deltaCt));
  const enrichedSamples = samples.map((sample) => ({
    ...sample,
    deltaDeltaCt: sample.deltaCt - controlMeanDeltaCt,
    relativeExpression: Math.pow(2, -(sample.deltaCt - controlMeanDeltaCt)),
  }));

  const orderedGroups = orderGroups(groups, config.controlGroup);
  const groupedDeltaCts = Object.fromEntries(orderedGroups.map((group) => [group, enrichedSamples.filter((sample) => sample.group === group).map((sample) => sample.deltaCt)]));
  const undersizedGroups = orderedGroups.filter((group) => groupedDeltaCts[group].length < 2);
  const statsWarnings = [];
  const anovaSkippedReason = undersizedGroups.length
    ? `ANOVA 已跳过：以下组生物学重复 n < 2：${undersizedGroups.map((group) => `${group} n=${groupedDeltaCts[group].length}`).join("，")}。只有所有参与分析的组都满足 n >= 2 才进行 ANOVA。`
    : "";
  if (anovaSkippedReason) statsWarnings.push(anovaSkippedReason);

  const groupResults = orderedGroups.map((group) => {
    const groupSamples = enrichedSamples.filter((sample) => sample.group === group);
    const deltaCts = groupSamples.map((sample) => sample.deltaCt);
    const meanDeltaCt = mean(deltaCts);
    const deltaDeltaCt = meanDeltaCt - controlMeanDeltaCt;
    const foldChange = Math.pow(2, -deltaDeltaCt);
    const spread = config.errorMode === "none" ? 0 : config.errorMode === "sd" ? std(deltaCts) : sem(deltaCts);
    const errorLower = Math.pow(2, -(deltaDeltaCt + spread));
    const errorUpper = Math.pow(2, -(deltaDeltaCt - spread));
    const welch = group === config.controlGroup ? null : getWelchResult(deltaCts, groupedDeltaCts[config.controlGroup], group, config.controlGroup);
    if (welch?.warning) statsWarnings.push(welch.warning);
    return {
      group,
      n: groupSamples.length,
      meanDeltaCt,
      deltaDeltaCt,
      foldChange,
      errorMode: config.errorMode,
      errorLower,
      errorUpper,
      displayError: config.errorMode === "none" ? null : Math.max(Math.abs(foldChange - errorLower), Math.abs(errorUpper - foldChange)),
      pValue: welch ? welch.p : null,
    };
  });

  const anova = anovaSkippedReason
    ? { f: NaN, p: NaN }
    : oneWayAnova(orderedGroups.map((group) => groupedDeltaCts[group]));
  if (!anovaSkippedReason && !Number.isFinite(anova.p)) {
    statsWarnings.push("ANOVA p 无法计算：组内方差为 0 或数据不足，当前结果仅用于观察表达趋势。");
  }

  return {
    config,
    samples: enrichedSamples,
    groups: groupResults,
    anova,
    controlMeanDeltaCt,
    statsWarnings,
  };
}

function render(result) {
  els.sampleCount.textContent = String(result.samples.length);
  els.groupCount.textContent = String(result.groups.length);
  els.anovaP.textContent = Number.isFinite(result.anova.p) ? formatP(result.anova.p) : "-";
  els.controlMeanDeltaCt.textContent = format(result.controlMeanDeltaCt);
  renderGroupTable(result.groups);
  renderSampleTable(result.samples);
  renderChart(result);
}

function renderEmptyState() {
  els.sampleCount.textContent = "0";
  els.groupCount.textContent = "0";
  els.anovaP.textContent = "-";
  els.controlMeanDeltaCt.textContent = "-";
  els.groupTable.innerHTML = "";
  els.sampleTable.innerHTML = "";
  renderChart({ groups: [], samples: [], config: {} });
}

function renderGroupTable(groups) {
  els.groupTable.innerHTML = groups
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.group)}</td>
        <td>${row.n}</td>
        <td>${format(row.meanDeltaCt)}</td>
        <td>${format(row.foldChange)}</td>
        <td>${row.displayError === null ? "-" : format(row.displayError)}</td>
        <td>${row.pValue === null ? "control" : formatP(row.pValue)}</td>
        <td>${stars(row.pValue)}</td>
      </tr>`,
    )
    .join("");
}

function renderSampleTable(samples) {
  els.sampleTable.innerHTML = samples
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.sample)}</td>
        <td>${escapeHtml(row.group)}</td>
        <td>${format(row.targetCt)}</td>
        <td>${format(row.referenceCt)}</td>
        <td>${format(row.deltaCt)}</td>
        <td>${format(row.relativeExpression)}</td>
      </tr>`,
    )
    .join("");
}

function renderChart(result) {
  const groups = result.groups;
  const { controlGroup, controlColor, treatmentColor, showPoints, showMeanLabels } = result.config;
  if (!groups.length) {
    els.chart.innerHTML = '<div class="empty-state">等待分析结果</div>';
    return;
  }

  const minWidth = 920;
  const height = 420;
  const margin = { top: 28, right: 24, bottom: 72, left: 72 };
  const minBarW = 56;
  const barGap = 22;
  const width = Math.max(minWidth, margin.left + margin.right + groups.length * minBarW + Math.max(0, groups.length - 1) * barGap);
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const maxPointY = Math.max(...result.samples.map((sample) => sample.relativeExpression));
  const maxY = niceMax(Math.max(...groups.map((row) => row.errorUpper), maxPointY, 1.2));
  const barW = Math.max(minBarW, (plotW - barGap * (groups.length - 1)) / groups.length);
  const y = (value) => margin.top + plotH - (value / maxY) * plotH;
  const zero = y(0);
  const ticks = 5;

  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => (maxY / ticks) * i);
  const referenceY = y(1);
  const grid = yTicks
    .map((tick) => {
      const yy = y(tick);
      return `<line x1="${margin.left}" x2="${width - margin.right}" y1="${yy}" y2="${yy}" stroke="#dfe7ef"/>
        <text x="${margin.left - 10}" y="${yy + 4}" text-anchor="end" font-size="12" fill="#657280">${formatTick(tick)}</text>`;
    })
    .join("");

  const pointsByGroup = new Map();
  result.samples.forEach((sample) => {
    if (!pointsByGroup.has(sample.group)) pointsByGroup.set(sample.group, []);
    pointsByGroup.get(sample.group).push(sample);
  });

  const bars = groups
    .map((row, i) => {
      const x = margin.left + i * (barW + barGap);
      const top = y(row.foldChange);
      const errTop = y(row.errorUpper);
      const errBottom = y(row.errorLower);
      const color = row.group === controlGroup ? controlColor : treatmentColor;
      const label = truncate(row.group, 14);
      const samplePoints = showPoints ? renderSamplePoints(pointsByGroup.get(row.group) || [], x, barW, y, i) : "";
      const errorLines =
        row.errorMode === "none"
          ? ""
          : `<line x1="${x + barW / 2}" x2="${x + barW / 2}" y1="${errTop}" y2="${errBottom}" stroke="#17202a" stroke-width="2"/>
        <line x1="${x + barW / 2 - 8}" x2="${x + barW / 2 + 8}" y1="${errTop}" y2="${errTop}" stroke="#17202a" stroke-width="2"/>
        <line x1="${x + barW / 2 - 8}" x2="${x + barW / 2 + 8}" y1="${errBottom}" y2="${errBottom}" stroke="#17202a" stroke-width="2"/>`;
      const meanLabel = showMeanLabels
        ? `<text x="${x + barW / 2}" y="${Math.min(top - 8, errTop - 8)}" text-anchor="middle" font-size="12" font-weight="700" fill="#17202a">${format(row.foldChange)}</text>`
        : "";
      return `<rect x="${x}" y="${top}" width="${barW}" height="${zero - top}" rx="3" fill="${color}"/>
        ${errorLines}
        ${samplePoints}
        <text x="${x + barW / 2}" y="${height - 44}" text-anchor="middle" font-size="13" fill="#263341">${escapeHtml(label)}</text>
        ${meanLabel}`;
    })
    .join("");

  els.chart.innerHTML = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#fbfcfe"/>
    ${grid}
    <line x1="${margin.left}" x2="${width - margin.right}" y1="${referenceY}" y2="${referenceY}" stroke="#b42318" stroke-width="1.5" stroke-dasharray="6 5"/>
    <text x="${width - margin.right}" y="${referenceY - 7}" text-anchor="end" font-size="12" fill="#b42318">1.0</text>
    <line x1="${margin.left}" x2="${width - margin.right}" y1="${zero}" y2="${zero}" stroke="#17202a"/>
    <line x1="${margin.left}" x2="${margin.left}" y1="${margin.top}" y2="${zero}" stroke="#17202a"/>
    ${bars}
    <text x="22" y="${margin.top + plotH / 2}" transform="rotate(-90 22 ${margin.top + plotH / 2})" text-anchor="middle" font-size="13" fill="#334155">Relative expression (2^-ΔΔCt)</text>
  </svg>`;
}

function renderSamplePoints(samples, barX, barW, y, groupIndex) {
  const center = barX + barW / 2;
  const maxOffset = Math.min(24, barW * 0.28);
  return samples
    .map((sample, sampleIndex) => {
      const offset = jitter(groupIndex, sampleIndex) * maxOffset;
      const cx = center + offset;
      const cy = y(sample.relativeExpression);
      return `<circle cx="${cx}" cy="${cy}" r="4.2" fill="#ffffff" stroke="#17202a" stroke-width="1.4">
        <title>${escapeHtml(sample.sample)}: ${format(sample.relativeExpression)}</title>
      </circle>`;
    })
    .join("");
}

function jitter(groupIndex, sampleIndex) {
  const raw = Math.sin((groupIndex + 1) * 97.31 + (sampleIndex + 1) * 43.17) * 10000;
  return (raw - Math.floor(raw)) * 2 - 1;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
}

function std(values) {
  return Math.sqrt(variance(values));
}

function sem(values) {
  return values.length ? std(values) / Math.sqrt(values.length) : 0;
}

function getWelchResult(groupValues, controlValues, group, controlGroup) {
  if (controlValues.length < 2 || groupValues.length < 2) {
    return {
      p: NaN,
      warning: `Welch p 已跳过：${group} vs ${controlGroup} 需要两组都满足 n >= 2，目前 ${group} n=${groupValues.length}，${controlGroup} n=${controlValues.length}。`,
    };
  }
  const result = welchTTest(groupValues, controlValues);
  if (!Number.isFinite(result.p)) {
    return {
      ...result,
      warning: `Welch p 无法计算：${group} vs ${controlGroup} 存在零方差或无法估计方差，当前比较仅用于观察趋势。`,
    };
  }
  return result;
}

function welchTTest(a, b) {
  if (a.length < 2 || b.length < 2) return { t: NaN, df: NaN, p: NaN };
  const ma = mean(a);
  const mb = mean(b);
  const va = variance(a);
  const vb = variance(b);
  const sa = va / a.length;
  const sb = vb / b.length;
  const standardError = Math.sqrt(sa + sb);
  const dfDenominator = sa ** 2 / (a.length - 1) + sb ** 2 / (b.length - 1);
  if (standardError === 0 || dfDenominator === 0) {
    return { t: NaN, df: NaN, p: NaN };
  }
  const t = (ma - mb) / standardError;
  const df = ((sa + sb) ** 2) / dfDenominator;
  if (!Number.isFinite(t) || !Number.isFinite(df) || df <= 0) {
    return { t: NaN, df: NaN, p: NaN };
  }
  const p = 2 * (1 - studentTCdf(Math.abs(t), df));
  return { t, df, p: clamp(p, 0, 1) };
}

function oneWayAnova(groups) {
  const validGroups = groups.filter((group) => group.length > 1);
  const all = validGroups.flat();
  if (validGroups.length < 2 || all.length <= validGroups.length) {
    return { f: NaN, p: NaN };
  }
  const grandMean = mean(all);
  const ssBetween = validGroups.reduce((sum, group) => sum + group.length * (mean(group) - grandMean) ** 2, 0);
  const ssWithin = validGroups.reduce((sum, group) => {
    const groupMean = mean(group);
    return sum + group.reduce((inner, value) => inner + (value - groupMean) ** 2, 0);
  }, 0);
  const dfBetween = validGroups.length - 1;
  const dfWithin = all.length - validGroups.length;
  if (ssWithin === 0 || dfWithin <= 0) {
    return { f: NaN, p: NaN };
  }
  const f = ssBetween / dfBetween / (ssWithin / dfWithin);
  if (!Number.isFinite(f)) {
    return { f: NaN, p: NaN };
  }
  const p = 1 - fCdf(f, dfBetween, dfWithin);
  return { f, p: clamp(p, 0, 1) };
}

function studentTCdf(t, df) {
  const x = df / (df + t * t);
  const ib = regularizedBeta(x, df / 2, 0.5);
  return t >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

function fCdf(f, d1, d2) {
  if (!Number.isFinite(f) || f < 0) return NaN;
  const x = (d1 * f) / (d1 * f + d2);
  return regularizedBeta(x, d1 / 2, d2 / 2);
}

function regularizedBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaContinuedFraction(x, a, b)) / a;
  }
  return 1 - (bt * betaContinuedFraction(1 - x, b, a)) / b;
}

function betaContinuedFraction(x, a, b) {
  const maxIter = 100;
  const eps = 3e-7;
  const fpmin = 1e-30;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < fpmin) d = fpmin;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIter; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
}

function logGamma(z) {
  const cof = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.001208650973866179,
    -0.000005395239384953,
  ];
  let x = z;
  let y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < cof.length; j += 1) {
    y += 1;
    ser += cof[j] / y;
  }
  return Math.log(2.5066282746310005 * ser / x) - tmp;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function niceMax(value) {
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * 10 ** exponent;
}

function format(value) {
  if (!Number.isFinite(value)) return "-";
  if (Math.abs(value) >= 100) return value.toFixed(1);
  if (Math.abs(value) >= 10) return value.toFixed(2);
  return value.toFixed(3);
}

function formatTick(value) {
  return value >= 10 ? value.toFixed(0) : value.toFixed(1);
}

function formatP(value) {
  if (!Number.isFinite(value)) return "-";
  if (value < 0.0001) return "<0.0001";
  return value.toFixed(4);
}

function stars(value) {
  if (value === null) return "-";
  if (!Number.isFinite(value)) return "n/a";
  if (value < 0.001) return "***";
  if (value < 0.01) return "**";
  if (value < 0.05) return "*";
  return "ns";
}

function truncate(value, max) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showMessage(text) {
  els.message.textContent = text;
  els.message.hidden = false;
}

function clearMessage() {
  els.message.hidden = true;
  els.message.textContent = "";
}

function showWarnings({ technicalReplicates, statsWarnings }) {
  if (!technicalReplicates.length && !statsWarnings.length) {
    clearWarning();
    return;
  }
  const sections = [];
  if (statsWarnings.length) {
    sections.push(`<ul>${statsWarnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>`);
  }
  if (technicalReplicates.length) {
    const visibleWarnings = technicalReplicates.slice(0, 8);
    const hiddenCount = technicalReplicates.length - visibleWarnings.length;
    const items = visibleWarnings
      .map(
        (entry) =>
          `<li>${escapeHtml(entry.sample)} / ${escapeHtml(entry.group)} / ${escapeHtml(entry.gene)}：Ct 极差 ${format(entry.range)} (${format(entry.minCt)}-${format(entry.maxCt)})</li>`,
      )
      .join("");
    const suffix = hiddenCount > 0 ? `<p>另有 ${hiddenCount} 组技术重复也超过阈值。</p>` : "";
    sections.push(`<div>以下技术重复 Ct 极差超过 ${technicalReplicateRangeThreshold}，建议检查是否存在异常值；当前结果仍按技术重复平均值继续计算。</div><ul>${items}</ul>${suffix}`);
  }
  els.warning.innerHTML = `<strong>Warning</strong>${sections.join("")}`;
  els.warning.hidden = false;
}

function clearWarning() {
  els.warning.hidden = true;
  els.warning.innerHTML = "";
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadSvg() {
  const svg = els.chart.querySelector("svg");
  if (!svg) return;
  download("qpcr_fold_change.svg", svg.outerHTML, "image/svg+xml;charset=utf-8");
}

function downloadCsv() {
  if (!state.result) return;
  const rows = [
    ["sample", "group", "target_ct", "reference_ct", "delta_ct", "delta_delta_ct", "relative_expression"],
    ...state.result.samples.map((row) => [
      row.sample,
      row.group,
      row.targetCt,
      row.referenceCt,
      row.deltaCt,
      row.deltaDeltaCt,
      row.relativeExpression,
    ]),
    [],
    ["group", "n", "mean_delta_ct", "delta_delta_ct", "fold_change", "error", "welch_p"],
    ...state.result.groups.map((row) => [
      row.group,
      row.n,
      row.meanDeltaCt,
      row.deltaDeltaCt,
      row.foldChange,
      row.displayError,
      row.pValue ?? "",
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  download("qpcr_results.csv", csv, "text/csv;charset=utf-8");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function refreshFromText() {
  try {
    const rows = parseInput(els.dataInput.value);
    updateSelectors(rows);
  } catch {
    // Selector refresh is opportunistic while the user edits.
  }
}

els.loadExample.addEventListener("click", () => {
  const data = els.dualReferenceMode.checked ? dualReferenceExampleData : exampleData;
  els.dataInput.value = data;
  updateSelectors(parseInput(data));
  analyze();
});

els.analyzeBtn.addEventListener("click", analyze);
els.dataInput.addEventListener("blur", refreshFromText);
els.dualReferenceMode.addEventListener("change", () => {
  updateModeUi();
});
els.targetGene.addEventListener("change", analyze);
els.referenceGene.addEventListener("change", analyze);
els.referenceGene2.addEventListener("change", analyze);
els.controlGroup.addEventListener("change", analyze);
els.errorMode.addEventListener("change", analyze);
els.controlColor.addEventListener("input", analyze);
els.treatmentColor.addEventListener("input", analyze);
els.showPoints.addEventListener("change", analyze);
els.showMeanLabels.addEventListener("change", analyze);
els.downloadSvg.addEventListener("click", downloadSvg);
els.downloadCsv.addEventListener("click", downloadCsv);

updateModeUi();
renderEmptyState();
