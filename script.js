const story = window.PRODUCE_STORY_DATA;
const fresh = story.fresh;
const pairs = story.pairs;
const stats = story.stats;

const colors = {
  Honest: "#52a36f",
  Forgivable: "#f2b84b",
  Deceptive: "#ea6148",
  ink: "#171816",
  muted: "#6d716b",
  mono: "#6FA87E",
  line: "#d9ded4",
  blue: "#6071dd",
  violet: "#8b6fd4",
  panel: "#ffffff"
};

const fmtMoney = (value) => `$${Number(value).toFixed(2)}`;
const fmtAxisMoney = (value) => Number.isInteger(value) ? `$${value}` : fmtMoney(value);
const fmtPct = (value) => `${Math.round(value)}%`;
const fmtSignedPct = (value) => `${value > 0 ? "+" : ""}${Math.round(value)}%`;
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
})[char]);

function svgNode(tag, attrs = {}, text = "") {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  if (text) node.textContent = text;
  return node;
}

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function createSvg(id, width = 760, height = 552) {
  const holder = document.getElementById(id);
  clearNode(holder);
  const svg = svgNode("svg", {
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    role: "presentation"
  });
  holder.appendChild(svg);
  return svg;
}

function linearScale(domain, range) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  return (value) => r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
}

function addText(svg, text, x, y, attrs = {}) {
  const node = svgNode("text", { x, y, ...attrs }, text);
  svg.appendChild(node);
  return node;
}

function withTooltip(node, html) {
  const existingClass = node.getAttribute("class");
  node.setAttribute("class", existingClass ? `${existingClass} hotspot` : "hotspot");
  node.setAttribute("tabindex", "0");
  node.setAttribute("data-tooltip", html);
  return node;
}

function produceTooltip(d) {
  return `<strong>${esc(safeItem(d.item))}</strong>Shelf: ${fmtMoney(d.shelf)}/lb<br>Real edible: ${fmtMoney(d.real)}/lb<br>Inflation: ${fmtSignedPct(d.inflation)}<br>Edible yield: ${fmtPct(d.yield * 100)}`;
}

function pairTooltip(d) {
  return `<strong>${esc(d.label)}</strong>Fresh: ${fmtMoney(d.freshCup)} per cup<br>${esc(d.processedForm)}: ${fmtMoney(d.processedCup)} per cup<br>${d.saves ? "Processed is cheaper" : "Processed costs more"}`;
}

function addChartTitle(svg, title, subtitle = "") {
  addText(svg, title, 18, 28, { class: "chart-title-small" });
  if (subtitle) addText(svg, subtitle, 18, 48, { class: "chart-subtitle" });
  addText(svg, "Hover for exact values", 742, 28, { class: "hover-hint", "text-anchor": "end" });
}

function safeItem(name) {
  return name.replace(", boiled", "").replace(", eaten raw", "").replace(", trimmed bunches", "");
}

function tierOpacity(tier) {
  return tier === "Honest" ? 0.42 : 0.95;
}

function drawAxisX(svg, ticks, scale, y, labelFormatter = String) {
  const group = svgNode("g", { class: "axis" });
  ticks.forEach((tick) => {
    const x = scale(tick);
    group.appendChild(svgNode("line", { x1: x, x2: x, y1: y - 6, y2: y, stroke: colors.line }));
    const text = svgNode("text", {
      x,
      y: y + 20,
      "text-anchor": "middle"
    }, labelFormatter(tick));
    group.appendChild(text);
  });
  svg.appendChild(group);
}

function drawGridX(svg, ticks, scale, y0, y1) {
  const group = svgNode("g", { class: "grid" });
  ticks.forEach((tick) => {
    const x = scale(tick);
    group.appendChild(svgNode("line", {
      x1: x,
      x2: x,
      y1: y0,
      y2: y1,
      stroke: colors.line,
      "stroke-dasharray": tick === 0 ? "none" : "3 6"
    }));
  });
  svg.appendChild(group);
}

function drawRangeChart() {
  const svg = createSvg("chart-range");
  addChartTitle(svg, "66 fresh products, ranked by price inflation", "Inflation = real edible-pound price divided by shelf price");

  const sorted = [...fresh].sort((a, b) => b.inflation - a.inflation);
  const margin = { left: 134, right: 34, top: 82, bottom: 48 };
  const width = 760;
  const height = 552;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const x = linearScale([-20, 170], [margin.left, margin.left + innerW]);
  const rowGap = innerH / sorted.length;
  const zero = x(0);
  const ticks = [-20, 0, 50, 100, 150];

  drawGridX(svg, ticks, x, margin.top, margin.top + innerH);
  drawAxisX(svg, ticks, x, margin.top + innerH + 8, (d) => `${d}%`);

  sorted.forEach((d, index) => {
    const y = margin.top + index * rowGap + rowGap * 0.18;
    const h = Math.max(3, rowGap * 0.62);
    const valueX = x(d.inflation);
    const x0 = Math.min(zero, valueX);
    const w = Math.abs(valueX - zero);
    const isHighlight =
    d.item === "Artichoke" ||
    d.item === "Collard greens";
  
    const bar = svgNode("rect", {
      x: x0,
      y,
      width: Math.max(1, w),
      height: h, // 不变
      rx: 2,
      fill:
        d.item === "Artichoke"
          ? "#E45B45"
          : d.item === "Collard greens"
          ? "#5C6FD6"
          : colors.mono,
      opacity: 1
  });
    svg.appendChild(withTooltip(bar, produceTooltip(d)));

    const shouldLabel = index === 0 || index === sorted.length - 1;
    if (shouldLabel) {
      const isNegativeExtreme = d.inflation < 0;
      addText(svg, safeItem(d.item), isNegativeExtreme ? valueX - 22 : margin.left - 12, y + h + 1, {
        fill: colors.ink,
        "font-size": 11,
        "text-anchor": "end",
        "font-weight": 650
      });
      addText(svg, fmtSignedPct(d.inflation), isNegativeExtreme ? zero + 10 : valueX + 6, y + h + 1, {
        fill: colors.muted,
        "font-size": 11,
        "text-anchor": "start",
        "font-weight": 500
      });
    }
  });

  addText(svg, "honest line", zero + 5, margin.top - 12, {
    fill: colors.muted,
    "font-size": 11,
    "font-weight": 500
  });
}

function drawLineScatter() {
  const svg = createSvg("chart-scatter-line");
  addChartTitle(svg, "Shelf price vs. real edible-pound price", "Dots above the diagonal cost more after waste");

  const margin = { left: 62, right: 34, top: 66, bottom: 58 };
  const width = 760;
  const height = 552;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const x = linearScale([0, 8.6], [margin.left, margin.left + innerW]);
  const y = linearScale([0, 8.8], [margin.top + innerH, margin.top]);
  const ticks = [0, 2, 4, 6, 8];

  drawGridX(svg, ticks, x, margin.top, margin.top + innerH);
  ticks.forEach((tick) => {
    const yy = y(tick);
    svg.appendChild(svgNode("line", {
      x1: margin.left,
      x2: margin.left + innerW,
      y1: yy,
      y2: yy,
      stroke: colors.line,
      "stroke-dasharray": "3 6"
    }));
    addText(svg, `$${tick}`, margin.left - 12, yy + 4, {
      fill: colors.muted,
      "font-size": 12,
      "text-anchor": "end"
    });
  });
  drawAxisX(svg, ticks, x, margin.top + innerH + 8, fmtAxisMoney);

  svg.appendChild(withTooltip(svgNode("line", {
    x1: x(0),
    y1: y(0),
    x2: x(8.6),
    y2: y(8.6),
    stroke: colors.ink,
    "stroke-width": 1.8,
    class: "honest-line"
  }), "<strong>Honest diagonal</strong>Shelf price equals real edible-pound price"));

  fresh.forEach((d) => {
    const dot = svgNode("circle", {
      cx: x(d.shelf),
      cy: y(d.real),
      r: 5.2,
      fill: colors.mono,
      opacity: d.tier === "Honest" ? 0.46 : 0.76,
      stroke: "#fff",
      "stroke-width": 1.2
    });
    svg.appendChild(withTooltip(dot, produceTooltip(d)));
  });

  addText(svg, "Shelf price per pound", margin.left + innerW / 2, height - 12, {
    fill: colors.muted,
    "font-size": 12,
    "font-weight": 500,
    "text-anchor": "middle"
  });
  addText(svg, "Real price per edible pound", 18, margin.top + innerH / 2, {
    fill: colors.muted,
    "font-size": 12,
    "font-weight": 500,
    "text-anchor": "middle",
    transform: `rotate(-90 18 ${margin.top + innerH / 2})`
  });
}

function polar(cx, cy, radius, angle) {
  return {
    x: cx + radius * Math.cos(angle - Math.PI / 2),
    y: cy + radius * Math.sin(angle - Math.PI / 2)
  };
}

function donutPath(cx, cy, outerR, innerR, start, end) {
  const large = end - start > Math.PI ? 1 : 0;
  const p1 = polar(cx, cy, outerR, start);
  const p2 = polar(cx, cy, outerR, end);
  const p3 = polar(cx, cy, innerR, end);
  const p4 = polar(cx, cy, innerR, start);
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${p4.x} ${p4.y}`,
    "Z"
  ].join(" ");
}

function drawTiersChart() {
  const svg = createSvg("chart-tiers");
  addChartTitle(svg, "66 fresh products, classified into three visibility tiers", "Honest means neither obvious high waste nor hidden high waste");

  const total = stats.freshCount;
  const tierRows = stats.byTier;
  const cx = 268;
  const cy = 290;
  const outer = 160;
  const inner = 90;
  let angle = -Math.PI * 0.86;

  tierRows.forEach((tier) => {
    const slice = (tier.count / total) * Math.PI * 2;
    const path = svgNode("path", {
      d: donutPath(cx, cy, outer, inner, angle, angle + slice),
      fill: colors[tier.tier],
      opacity: tier.tier === "Honest" ? 0.78 : 0.95
    });
    svg.appendChild(withTooltip(path, `<strong>${esc(tier.tier)}</strong>${tier.count} items (${Math.round((tier.count / total) * 100)}%)<br>Average inflation: ${fmtPct(tier.avgInflation)}`));
    angle += slice;
  });

  addText(svg, "1 in 4", cx, cy - 6, {
    fill: colors.ink,
    "font-family": "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif",
    "font-size": 48,
    "font-weight": 700,
    "text-anchor": "middle"
  });
  addText(svg, "hidden-tier items", cx, cy + 25, {
    fill: colors.muted,
    "font-size": 12,
    "font-weight": 500,
    "letter-spacing": 1.2,
    "text-anchor": "middle"
  });

  const legendX = 500;
  const legendY = 180;
  tierRows.forEach((tier, index) => {
    const y = legendY + index * 92;
    svg.appendChild(svgNode("rect", {
      x: legendX,
      y: y - 22,
      width: 18,
      height: 18,
      rx: 4,
      fill: colors[tier.tier]
    }));
    addText(svg, tier.tier, legendX + 30, y - 8, {
      fill: colors.ink,
      "font-size": 18,
      "font-weight": 650
    });
    addText(svg, `${tier.count} items, ${Math.round((tier.count / total) * 100)}%`, legendX + 30, y + 17, {
      fill: colors.muted,
      "font-size": 13,
      "font-weight": 500
    });
    addText(svg, `average inflation ${fmtPct(tier.avgInflation)}`, legendX + 30, y + 38, {
      fill: colors.muted,
      "font-size": 12,
      "font-weight": 650
    });
  });
}

function drawDumbbellChart(id, rows, options = {}) {
  const svg = createSvg(id);
  addChartTitle(svg, options.title, options.subtitle);
  const margin = { left: options.left || 146, right: 96, top: 80, bottom: 56 };
  const width = 760;
  const height = 552;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const maxValue = options.maxValue || Math.max(...rows.flatMap((d) => [d.shelf, d.real || d.processedCup, d.freshCup || 0])) * 1.16;
  const x = linearScale([0, maxValue], [margin.left, margin.left + innerW]);
  const step = innerH / rows.length;
  const ticks = options.ticks || [0, 2, 4, 6];

  drawGridX(svg, ticks, x, margin.top, margin.top + innerH);
  drawAxisX(svg, ticks, x, margin.top + innerH + 8, fmtAxisMoney);

  rows.forEach((d, index) => {
    const y = margin.top + step * index + step / 2;
    const a = options.processed ? d.freshCup : d.shelf;
    const b = options.processed ? d.processedCup : d.real;
    const xa = x(a);
    const xb = x(b);
    const better = options.processed && d.saves;

    const tooltip = options.processed ? pairTooltip(d) : produceTooltip(d);
    const connector = svgNode("line", {
      x1: xa,
      x2: xb,
      y1: y,
      y2: y,
      stroke: options.processed ? (better ? colors.Honest : colors.Deceptive) : colors.line,
      "stroke-width": 4,
      "stroke-linecap": "round",
      opacity: options.processed ? 0.58 : 1
    });
    svg.appendChild(withTooltip(connector, tooltip));
    const firstDot = svgNode("circle", {
      cx: xa,
      cy: y,
      r: 7,
      fill: options.processed ? colors.blue : colors.ink,
      stroke: "#fff",
      "stroke-width": 1.5
    });
    svg.appendChild(withTooltip(firstDot, tooltip));
    const secondDot = svgNode("circle", {
      cx: xb,
      cy: y,
      r: 8,
      fill: options.processed ? (better ? colors.Honest : colors.Deceptive) : colors.mono,
      stroke: "#fff",
      "stroke-width": 1.5
    });
    svg.appendChild(withTooltip(secondDot, tooltip));

    addText(svg, options.labeler ? options.labeler(d) : safeItem(d.item), margin.left - 12, y + 4, {
      fill: colors.ink,
      "font-size": 13,
      "font-weight": 650,
      "text-anchor": "end"
    });
    if (options.extra) {
      addText(svg, options.extra(d), 730, y + 4, {
        fill: options.processed ? (better ? colors.Honest : colors.Deceptive) : colors.muted,
        "font-size": 11,
        "font-weight": 600,
        "text-anchor": "end"
      });
    }
  });

  const legendY = 68;
  if (options.processed) {
    const legend = [
      { label: "Fresh", color: colors.blue },
      { label: "Processed cheaper", color: colors.Honest },
      { label: "Processed costs more", color: colors.Deceptive }
    ];
    let legendX = margin.left + 4;
    legend.forEach((item) => {
      svg.appendChild(svgNode("circle", { cx: legendX, cy: legendY, r: 6, fill: item.color }));
      addText(svg, item.label, legendX + 14, legendY + 4, {
        fill: colors.muted,
        "font-size": 12,
        "font-weight": 500
      });
      legendX += item.label.length * 7.1 + 36;
    });
  } else {
    svg.appendChild(svgNode("circle", { cx: margin.left + 4, cy: legendY, r: 6, fill: colors.ink }));
    addText(svg, "Shelf", margin.left + 16, legendY + 4, {
      fill: colors.muted,
      "font-size": 12,
      "font-weight": 500
    });
    svg.appendChild(svgNode("circle", {
      cx: margin.left + 92,
      cy: legendY,
      r: 6,
      fill: colors.Deceptive
    }));
    addText(svg, "Real edible", margin.left + 104, legendY + 4, {
      fill: colors.muted,
      "font-size": 12,
      "font-weight": 500
    });
  }
}

function drawForgivableChart() {
  const rows = fresh.filter((d) => d.tier === "Forgivable").sort((a, b) => b.inflation - a.inflation);
  drawDumbbellChart("chart-forgivable", rows, {
    title: "Visible peels, rinds, and seeds still change the price",
    subtitle: "Shelf price vs. real edible-pound price",
    maxValue: 4.8,
    ticks: [0, 1, 2, 3, 4],
    extra: (d) => `${Math.round(d.waste)}% waste`
  });
}

function drawArtichokeChart() {
  const svg = createSvg("chart-artichoke");
  addChartTitle(svg, "One purchased pound of artichoke, split by what gets eaten", "USDA preparation yield factor: 0.375");
  const artichoke = fresh.find((d) => d.item === "Artichoke");
  const shelf = artichoke.shelf;
  const eaten = shelf * artichoke.yield;
  const discarded = shelf - eaten;
  const x0 = 80;
  const y = 176;
  const width = 600;
  const barH = 86;
  const eatenW = width * artichoke.yield;
  const discardedW = width - eatenW;
  const segmentGap = 7;

  addText(svg, "100% purchased pound", x0 + width / 2, y - 16, {
    fill: colors.muted,
    "font-size": 12,
    "font-weight": 500,
    "text-anchor": "middle"
  });
  svg.appendChild(withTooltip(svgNode("rect", { x: x0, y, width: discardedW - segmentGap / 2, height: barH, rx: 8, fill: colors.Deceptive, opacity: 0.9 }), `<strong>Discarded portion</strong>${fmtMoney(discarded)} of each purchased pound<br>62% of the artichoke is not eaten`));
  svg.appendChild(withTooltip(svgNode("rect", { x: x0 + discardedW + segmentGap / 2, y, width: eatenW - segmentGap / 2, height: barH, rx: 8, fill: colors.Honest, opacity: 0.95 }), `<strong>Eaten portion</strong>${fmtMoney(eaten)} of each purchased pound<br>38% edible yield`));
  svg.appendChild(svgNode("rect", { x: x0, y, width, height: barH, rx: 8, fill: "none", stroke: "rgba(23,24,22,0.16)" }));

  addText(svg, "discarded", x0 + discardedW / 2, y + 34, {
    fill: "#fff",
    "font-size": 16,
    "font-weight": 650,
    "text-anchor": "middle"
  });
  addText(svg, `${fmtMoney(discarded)} / 62%`, x0 + discardedW / 2, y + 60, {
    fill: "#fff",
    "font-size": 13,
    "font-weight": 600,
    "text-anchor": "middle"
  });
  addText(svg, "eaten", x0 + discardedW + eatenW / 2, y + 34, {
    fill: "#fff",
    "font-size": 16,
    "font-weight": 650,
    "text-anchor": "middle"
  });
  addText(svg, `${fmtMoney(eaten)} / 38%`, x0 + discardedW + eatenW / 2, y + 60, {
    fill: "#fff",
    "font-size": 13,
    "font-weight": 600,
    "text-anchor": "middle"
  });

  const mathY = 368;
  addText(svg, `${fmtMoney(shelf)}`, 112, mathY, {
    fill: colors.ink,
    "font-family": "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif",
    "font-size": 54,
    "font-weight": 700
  });
  addText(svg, "shelf price", 118, mathY + 30, { fill: colors.muted, "font-size": 12, "font-weight": 500 });
  addText(svg, "/", 288, mathY - 2, { fill: colors.muted, "font-size": 42, "font-weight": 500 });
  addText(svg, "0.375", 338, mathY, {
    fill: colors.ink,
    "font-family": "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif",
    "font-size": 54,
    "font-weight": 700
  });
  addText(svg, "edible yield", 344, mathY + 30, { fill: colors.muted, "font-size": 12, "font-weight": 500 });
  addText(svg, "=", 492, mathY - 2, { fill: colors.muted, "font-size": 42, "font-weight": 500 });
  addText(svg, fmtMoney(artichoke.real), 552, mathY, {
    fill: colors.Deceptive,
    "font-family": "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif",
    "font-size": 54,
    "font-weight": 700
  });
  addText(svg, "per edible pound", 558, mathY + 30, { fill: colors.muted, "font-size": 12, "font-weight": 500 });
}

function drawHiddenChart() {
  const svg = createSvg("chart-hidden");
  addChartTitle(svg, "The hidden tier: waste that is hard to infer from the tag", "Each bar is the non-edible or lost share in USDA's preparation yield factor");
  const groups = [
    {
      label: "Structure",
      items: ["Artichoke", "Acorn squash", "Asparagus"],
      color: colors.Deceptive
    },
    {
      label: "Core and trim",
      items: ["Corn", "Butternut squash", "Okra"],
      color: colors.violet
    },
    {
      label: "Cooking loss",
      items: ["Turnip greens", "Spinach, boiled", "Broccoli heads"],
      color: colors.blue
    }
  ];
  const cardW = 214;
  const startX = 48;
  const topY = 104;
  const gap = 24;
  const barW = 154;

  groups.forEach((group, groupIndex) => {
    const x = startX + groupIndex * (cardW + gap);
    svg.appendChild(svgNode("rect", {
      x,
      y: topY,
      width: cardW,
      height: 340,
      rx: 8,
      fill: "#fff",
      stroke: "rgba(23,24,22,0.12)"
    }));
    addText(svg, group.label, x + 18, topY + 36, {
      fill: colors.ink,
      "font-size": 17,
      "font-weight": 650
    });
    group.items.forEach((item, index) => {
      const d = fresh.find((row) => row.item === item);
      const y = topY + 88 + index * 80;
      addText(svg, safeItem(item), x + 18, y, {
        fill: colors.ink,
        "font-size": 13,
        "font-weight": 600
      });
      svg.appendChild(svgNode("rect", {
        x: x + 18,
        y: y + 14,
        width: barW,
        height: 12,
        rx: 6,
        fill: "rgba(23,24,22,0.09)"
      }));
      const wasteBar = svgNode("rect", {
        x: x + 18,
        y: y + 14,
        width: Math.max(2, barW * (d.waste / 65)),
        height: 12,
        rx: 6,
        fill: group.color
      });
      svg.appendChild(withTooltip(wasteBar, produceTooltip(d)));
      addText(svg, `${Math.round(d.waste)}%`, x + 18 + barW + 10, y + 25, {
        fill: colors.muted,
        "font-size": 12,
        "font-weight": 600
      });
      addText(svg, `${fmtMoney(d.shelf)} tag -> ${fmtMoney(d.real)} real`, x + 18, y + 50, {
        fill: colors.muted,
        "font-size": 11,
        "font-weight": 500
      });
    });
  });
}

function drawNegativeChart() {
  const svg = createSvg("chart-negative");
  addChartTitle(svg, "Negative inflation items", "Yield factors above 1 move these below the shelf price");
  const rows = ["Collard greens", "Kale", "Brussels sprouts"].map((item) => fresh.find((d) => d.item === item));
  const margin = { left: 168, right: 72, top: 90, bottom: 70 };
  const width = 760;
  const height = 552;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const x = linearScale([-16, 4], [margin.left, margin.left + innerW]);
  const step = innerH / rows.length;
  const zero = x(0);

  drawGridX(svg, [-15, -10, -5, 0], x, margin.top, margin.top + innerH);
  drawAxisX(svg, [-15, -10, -5, 0], x, margin.top + innerH + 12, (d) => `${d}%`);
  svg.appendChild(svgNode("line", { x1: zero, x2: zero, y1: margin.top - 10, y2: margin.top + innerH, stroke: colors.ink, "stroke-width": 1.2 }));

  rows.forEach((d, index) => {
    const y = margin.top + step * index + 35;
    const valueX = x(d.inflation);
    const bar = svgNode("rect", {
      x: valueX,
      y,
      width: zero - valueX,
      height: 34,
      rx: 5,
      fill: colors.blue,
      opacity: 0.82
    });
    svg.appendChild(withTooltip(bar, produceTooltip(d)));
    addText(svg, safeItem(d.item), margin.left - 14, y + 23, {
      fill: colors.ink,
      "font-size": 15,
      "font-weight": 650,
      "text-anchor": "end"
    });
    addText(svg, fmtSignedPct(d.inflation), valueX - 8, y + 23, {
      fill: colors.blue,
      "font-size": 14,
      "font-weight": 650,
      "text-anchor": "end"
    });
    addText(svg, `${fmtMoney(d.shelf)} tag -> ${fmtMoney(d.real)} real`, zero + 12, y + 23, {
      fill: colors.muted,
      "font-size": 12,
      "font-weight": 500
    });
  });
}

function drawPricePatternChart() {
  const svg = createSvg("chart-price-pattern");
  addChartTitle(svg, "Shelf price does not explain inflation", "Fresh produce only, per pound");
  const margin = { left: 62, right: 34, top: 66, bottom: 58 };
  const width = 760;
  const height = 552;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const x = linearScale([0, 8.6], [margin.left, margin.left + innerW]);
  const y = linearScale([-20, 170], [margin.top + innerH, margin.top]);

  drawGridX(svg, [0, 2, 4, 6, 8], x, margin.top, margin.top + innerH);
  [-10, 0, 50, 100, 150].forEach((tick) => {
    const yy = y(tick);
    svg.appendChild(svgNode("line", {
      x1: margin.left,
      x2: margin.left + innerW,
      y1: yy,
      y2: yy,
      stroke: colors.line,
      "stroke-dasharray": tick === 0 ? "none" : "3 6"
    }));
    addText(svg, `${tick}%`, margin.left - 12, yy + 4, {
      fill: colors.muted,
      "font-size": 12,
      "text-anchor": "end"
    });
  });
  drawAxisX(svg, [0, 2, 4, 6, 8], x, margin.top + innerH + 8, fmtAxisMoney);

  fresh.forEach((d) => {
    const dot = svgNode("circle", {
      cx: x(d.shelf),
      cy: y(d.inflation),
      r: 5.2,
      fill: colors.mono,
      opacity: 0.58,
      stroke: "#fff",
      "stroke-width": 1
    });
    svg.appendChild(withTooltip(dot, produceTooltip(d)));
  });

  addText(svg, "Shelf price per pound", margin.left + innerW / 2, height - 12, {
    fill: colors.muted,
    "font-size": 12,
    "font-weight": 500,
    "text-anchor": "middle"
  });
}

function drawProcessedChart() {
  drawDumbbellChart("chart-processed", pairs, {
    title: "Fresh vs. canned/frozen, per edible cup equivalent",
    subtitle: "Processed saves money in some rows and loses money in others",
    processed: true,
    maxValue: 2.8,
    ticks: [0, 0.7, 1.4, 2.1, 2.8],
    left: 132,
    labeler: (d) => d.label,
    extra: (d) => d.saves ? "saves" : "costs more"
  });
}

function drawCategoryChart() {
  const svg = createSvg("chart-category");
  addChartTitle(svg, "Average price inflation by aisle", "Fresh items only");
  const rows = stats.byCategory;
  const margin = { left: 150, right: 88, top: 96, bottom: 80 };
  const width = 760;
  const height = 552;
  const innerW = width - margin.left - margin.right;
  const x = linearScale([0, 45], [margin.left, margin.left + innerW]);
  const yPositions = [190, 310];

  drawGridX(svg, [0, 10, 20, 30, 40], x, 130, 360);
  drawAxisX(svg, [0, 10, 20, 30, 40], x, 392, (d) => `${d}%`);

  rows.forEach((d, index) => {
    const y = yPositions[index];
    const color = d.category === "Fruit" ? colors.Deceptive : colors.Honest;
    const bar = svgNode("rect", {
      x: margin.left,
      y,
      width: x(d.avgInflation) - margin.left,
      height: 58,
      rx: 8,
      fill: color,
      opacity: 0.9
    });
    svg.appendChild(withTooltip(bar, `<strong>${esc(d.category)}</strong>${d.count} fresh rows<br>Average inflation: ${fmtPct(d.avgInflation)}`));
    addText(svg, d.category, margin.left - 18, y + 37, {
      fill: colors.ink,
      "font-size": 20,
      "font-weight": 650,
      "text-anchor": "end"
    });
    addText(svg, fmtPct(d.avgInflation), x(d.avgInflation) + 14, y + 37, {
      fill: color,
      "font-size": 24,
      "font-weight": 700
    });
    addText(svg, `${d.count} fresh rows`, x(d.avgInflation) + 16, y + 61, {
      fill: colors.muted,
      "font-size": 12,
      "font-weight": 500
    });
  });

  const callout = svgNode("g", {});
  callout.appendChild(svgNode("rect", {
    x: 430,
    y: 80,
    width: 242,
    height: 78,
    rx: 8,
    fill: "rgba(234,97,72,0.09)",
    stroke: "rgba(234,97,72,0.22)"
  }));
  const lines = ["Melons, citrus,", "and pomegranates", "pull fruit upward."];
  lines.forEach((line, i) => {
    callout.appendChild(svgNode("text", {
      x: 452,
      y: 105 + i * 20,
      fill: i === 0 ? colors.ink : colors.muted,
      "font-size": i === 0 ? 15 : 13,
      "font-weight": i === 0 ? 650 : 500
    }, line));
  });
  svg.appendChild(callout);
}

function renderSources() {
  const holder = document.getElementById("sources-list");
  story.sources.forEach((source) => {
    const link = document.createElement("a");
    link.href = source.url;
    link.textContent = source.label;
    holder.appendChild(link);
  });
}

function setupTooltips() {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;
  let activeTarget = null;

  const move = (event) => {
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
  };
  const show = (target, event) => {
    activeTarget = target;
    tooltip.innerHTML = target.dataset.tooltip;
    tooltip.setAttribute("aria-hidden", "false");
    tooltip.classList.add("is-visible");
    if (event) move(event);
  };
  const hide = () => {
    activeTarget = null;
    tooltip.classList.remove("is-visible");
    tooltip.setAttribute("aria-hidden", "true");
  };

  document.addEventListener("pointerover", (event) => {
    const target = event.target.closest?.(".hotspot");
    if (!target) return;
    show(target, event);
  });
  document.addEventListener("pointermove", (event) => {
    if (activeTarget) move(event);
  });
  document.addEventListener("pointerout", (event) => {
    if (!activeTarget) return;
    if (!event.relatedTarget || !activeTarget.contains(event.relatedTarget)) hide();
  });
  document.addEventListener("focusin", (event) => {
    const target = event.target.closest?.(".hotspot");
    if (!target) return;
    const rect = target.getBoundingClientRect();
    show(target, { clientX: rect.left + rect.width / 2, clientY: rect.top });
  });
  document.addEventListener("focusout", (event) => {
    if (event.target.closest?.(".hotspot")) hide();
  });
}

function setupScrollState() {
  const scenes = [...document.querySelectorAll(".scene")];
  const dots = [...document.querySelectorAll(".dotnav a")];
  const progress = document.querySelector(".progress span");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("is-active", entry.isIntersecting);
    });
    const active = scenes
      .map((scene) => {
        const rect = scene.getBoundingClientRect();
        return { scene, distance: Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2) };
      })
      .sort((a, b) => a.distance - b.distance)[0]?.scene;
    if (!active) return;
    dots.forEach((dot) => {
      const target = document.querySelector(dot.getAttribute("href"));
      dot.classList.toggle("is-current", target === active || target?.contains(active));
    });
  }, { threshold: 0.42 });

  scenes.forEach((scene) => observer.observe(scene));

  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progress.style.width = `${pct}%`;
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();
}

function drawAllCharts() {
  drawRangeChart();
  drawLineScatter();
  drawTiersChart();
  drawForgivableChart();
  drawArtichokeChart();
  drawHiddenChart();
  drawNegativeChart();
  drawPricePatternChart();
  drawProcessedChart();
  drawCategoryChart();
}

window.addEventListener("DOMContentLoaded", () => {
  drawAllCharts();
  renderSources();
  setupTooltips();
  setupScrollState();
});
