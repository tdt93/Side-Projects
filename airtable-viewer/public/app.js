const subtitle = document.getElementById("subtitle");
const toolbar = document.getElementById("toolbar");
const filterEl = document.getElementById("filter");
const sortFieldEl = document.getElementById("sortField");
const sortDirEl = document.getElementById("sortDir");
const errorEl = document.getElementById("error");
const emptyEl = document.getElementById("empty");
const gridEl = document.getElementById("grid");
const tableEl = document.getElementById("table");
const theadRow = document.getElementById("theadRow");
const tbody = document.getElementById("tbody");
const layoutButtons = document.querySelectorAll(".segmented__btn");

let rawRecords = [];
let fieldNames = [];
let layout = "grid";

function formatCellValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (v && typeof v === "object" && "url" in v) return v.url;
        return typeof v === "object" ? JSON.stringify(v) : String(v);
      })
      .join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function collectFieldNames(records) {
  const set = new Set();
  for (const r of records) {
    if (r.fields && typeof r.fields === "object") {
      Object.keys(r.fields).forEach((k) => set.add(k));
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function recordMatchesFilter(record, q) {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    record.id,
    ...Object.entries(record.fields || {}).map(([k, v]) => `${k} ${formatCellValue(v)}`),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

function sortValueForField(record, field) {
  if (!field) return "";
  const v = record.fields?.[field];
  const s = formatCellValue(v);
  const n = Number(s.replace(/,/g, ""));
  if (s !== "" && !Number.isNaN(n) && String(n) === s.replace(/,/g, "")) return n;
  return s.toLowerCase();
}

function getSortedFiltered() {
  const q = filterEl.value;
  const field = sortFieldEl.value;
  const dir = sortDirEl.value === "desc" ? -1 : 1;

  let list = rawRecords.filter((r) => recordMatchesFilter(r, q));

  list = [...list].sort((a, b) => {
    const va = sortValueForField(a, field);
    const vb = sortValueForField(b, field);
    if (typeof va === "number" && typeof vb === "number") {
      return (va - vb) * dir;
    }
    const sa = String(va);
    const sb = String(vb);
    return sa.localeCompare(sb, undefined, { numeric: true, sensitivity: "base" }) * dir;
  });

  return list;
}

function renderGrid(records) {
  gridEl.innerHTML = records
    .map(
      (r) => `
    <article class="card">
      <div class="card__id">${escapeHtml(r.id)}</div>
      ${fieldNames
        .map((name) => {
          const val = formatCellValue(r.fields?.[name]);
          if (val === "") return "";
          return `<div class="card__field">
            <div class="card__field-name">${escapeHtml(name)}</div>
            <div class="card__field-value">${escapeHtml(val)}</div>
          </div>`;
        })
        .join("")}
    </article>`
    )
    .join("");
}

function renderTable(records) {
  theadRow.innerHTML = ["Record ID", ...fieldNames]
    .map((h) => `<th scope="col">${escapeHtml(h)}</th>`)
    .join("");

  tbody.innerHTML = records
    .map((r) => {
      const cells = [
        `<td><span class="cell-value">${escapeHtml(r.id)}</span></td>`,
        ...fieldNames.map((name) => {
          const val = formatCellValue(r.fields?.[name]);
          return `<td><span class="cell-value">${escapeHtml(val)}</span></td>`;
        }),
      ];
      return `<tr>${cells.join("")}</tr>`;
    })
    .join("");
}

function render() {
  const records = getSortedFiltered();
  subtitle.textContent = `${records.length} of ${rawRecords.length} record${rawRecords.length === 1 ? "" : "s"}`;

  if (records.length === 0 && rawRecords.length > 0) {
    emptyEl.hidden = false;
    gridEl.hidden = true;
    tableEl.hidden = true;
    return;
  }

  emptyEl.hidden = true;
  if (layout === "grid") {
    gridEl.hidden = false;
    tableEl.hidden = true;
    renderGrid(records);
  } else {
    gridEl.hidden = true;
    tableEl.hidden = false;
    renderTable(records);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setLayout(next) {
  layout = next;
  layoutButtons.forEach((btn) => {
    const active = btn.dataset.layout === next;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
  render();
}

filterEl.addEventListener("input", () => render());
sortFieldEl.addEventListener("change", () => render());
sortDirEl.addEventListener("change", () => render());

layoutButtons.forEach((btn) => {
  btn.addEventListener("click", () => setLayout(btn.dataset.layout));
});

async function init() {
  const health = await fetch("/api/health").then((r) => r.json());
  if (!health.ok) {
    errorEl.hidden = false;
    errorEl.textContent = `Configure your server: copy .env.example to .env and set: ${health.missingEnv.join(", ")}. Then restart.`;
    subtitle.textContent = "Not configured";
    return;
  }

  subtitle.textContent = "Loading…";
  const res = await fetch("/api/records");
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    errorEl.hidden = false;
    errorEl.textContent = data.error || `HTTP ${res.status}`;
    subtitle.textContent = "Error";
    return;
  }

  rawRecords = data.records || [];
  fieldNames = collectFieldNames(rawRecords);

  sortFieldEl.replaceChildren();
  for (const f of fieldNames) {
    const opt = document.createElement("option");
    opt.value = f;
    opt.textContent = f;
    sortFieldEl.appendChild(opt);
  }
  if (fieldNames.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "(no fields)";
    sortFieldEl.appendChild(opt);
  }

  toolbar.hidden = false;
  subtitle.textContent = `${rawRecords.length} record${rawRecords.length === 1 ? "" : "s"}`;

  if (rawRecords.length === 0) {
    emptyEl.hidden = false;
    emptyEl.textContent = "No records in this table.";
    return;
  }

  setLayout("grid");
}

init();
