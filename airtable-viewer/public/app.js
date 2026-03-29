const shell = document.getElementById("shell");
const sidebar = document.getElementById("sidebar");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const menuToggle = document.getElementById("menuToggle");
const accountGuest = document.getElementById("accountGuest");
const accountUser = document.getElementById("accountUser");
const userEmail = document.getElementById("userEmail");
const scrollToLogin = document.getElementById("scrollToLogin");
const logoutBtn = document.getElementById("logoutBtn");
const sidebarNav = document.getElementById("sidebarNav");
const sidebarControls = document.getElementById("sidebarControls");
const pageTitle = document.getElementById("pageTitle");
const subtitle = document.getElementById("subtitle");
const loginView = document.getElementById("loginView");
const recordsView = document.getElementById("recordsView");
const loginForm = document.getElementById("loginForm");
const loginFlash = document.getElementById("loginFlash");
const googleBtn = document.getElementById("googleBtn");
const googleDivider = document.getElementById("googleDivider");
const filterEl = document.getElementById("filter");
const sortFieldEl = document.getElementById("sortField");
const sortDirEl = document.getElementById("sortDir");
const errorEl = document.getElementById("error");
const emptyEl = document.getElementById("empty");
const gridEl = document.getElementById("grid");
const tableWrap = document.getElementById("tableWrap");
const tableEl = document.getElementById("table");
const theadRow = document.getElementById("theadRow");
const tbody = document.getElementById("tbody");
const layoutButtons = document.querySelectorAll(".segmented__btn");

const fetchOpts = { credentials: "same-origin" };

let rawRecords = [];
let fieldNames = [];
let layout = "grid";

function setSidebarOpen(open) {
  shell.classList.toggle("is-sidebar-open", open);
  menuToggle?.setAttribute("aria-expanded", open ? "true" : "false");
  if (sidebarBackdrop) sidebarBackdrop.hidden = !open;
}

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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderGrid(records) {
  gridEl.innerHTML = records
    .map(
      (r) => `
    <article class="card-record">
      <div class="card-record__id">${escapeHtml(r.id)}</div>
      ${fieldNames
        .map((name) => {
          const val = formatCellValue(r.fields?.[name]);
          if (val === "") return "";
          return `<div class="card-record__field">
            <div class="card-record__name">${escapeHtml(name)}</div>
            <div class="card-record__value">${escapeHtml(val)}</div>
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
  subtitle.textContent = `${records.length} of ${rawRecords.length} shown`;

  if (records.length === 0 && rawRecords.length > 0) {
    emptyEl.hidden = false;
    emptyEl.textContent = "No records match your filter.";
    gridEl.hidden = true;
    tableWrap.hidden = true;
    return;
  }

  emptyEl.hidden = true;
  if (layout === "grid") {
    gridEl.hidden = false;
    tableWrap.hidden = true;
    renderGrid(records);
  } else {
    gridEl.hidden = true;
    tableWrap.hidden = false;
    renderTable(records);
  }
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

function showAuthDenied() {
  loginFlash.hidden = false;
  loginFlash.textContent = "Google sign-in is only available for emails your administrator has added.";
}

function applyUrlAuthFlags() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("auth") === "denied") showAuthDenied();
}

function showGoogleUI(enabled) {
  googleDivider.hidden = !enabled;
  googleBtn.hidden = !enabled;
}

function setLoggedInUI(email) {
  pageTitle.textContent = "Records";
  accountGuest.hidden = true;
  accountUser.hidden = false;
  userEmail.textContent = email;
  sidebarNav.hidden = false;
  sidebarControls.hidden = false;
  loginView.hidden = true;
  recordsView.hidden = false;
  loginFlash.hidden = true;
}

function setGuestUI() {
  pageTitle.textContent = "Welcome";
  subtitle.textContent = "Sign in to view Airtable data.";
  accountGuest.hidden = false;
  accountUser.hidden = true;
  sidebarNav.hidden = true;
  sidebarControls.hidden = true;
  loginView.hidden = false;
  recordsView.hidden = true;
  rawRecords = [];
  fieldNames = [];
  filterEl.value = "";
}

async function loadRecords() {
  errorEl.hidden = true;
  subtitle.textContent = "Loading…";

  const health = await fetch("/api/health", fetchOpts).then((r) => r.json());
  if (!health.ok) {
    errorEl.hidden = false;
    errorEl.textContent = `Configure the server: set ${health.missingEnv.join(", ")} in .env and restart.`;
    subtitle.textContent = "Not configured";
    return;
  }

  const res = await fetch("/api/records", fetchOpts);
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    setGuestUI();
    return;
  }

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

  if (rawRecords.length === 0) {
    emptyEl.hidden = false;
    emptyEl.textContent = "No records in this table.";
    gridEl.hidden = true;
    tableWrap.hidden = true;
    subtitle.textContent = "0 records";
    return;
  }

  emptyEl.hidden = true;
  subtitle.textContent = `${rawRecords.length} record${rawRecords.length === 1 ? "" : "s"}`;
  setLayout(layout);
}

async function bootstrapSession() {
  const [meRes, cfgRes] = await Promise.all([
    fetch("/api/me", fetchOpts),
    fetch("/api/config", fetchOpts).then((r) => r.json()),
  ]);

  showGoogleUI(Boolean(cfgRes.googleAuth));

  if (meRes.ok) {
    const data = await meRes.json();
    const email = data.user?.email;
    if (email) {
      setLoggedInUI(email);
      await loadRecords();
      return;
    }
  }

  setGuestUI();
}

menuToggle?.addEventListener("click", () => {
  setSidebarOpen(!shell.classList.contains("is-sidebar-open"));
});

sidebarBackdrop?.addEventListener("click", () => setSidebarOpen(false));

scrollToLogin?.addEventListener("click", () => {
  loginView?.scrollIntoView({ behavior: "smooth", block: "center" });
  setSidebarOpen(false);
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setSidebarOpen(false);
});

filterEl.addEventListener("input", () => {
  if (!recordsView.hidden) render();
});
sortFieldEl.addEventListener("change", () => render());
sortDirEl.addEventListener("change", () => render());

layoutButtons.forEach((btn) => {
  btn.addEventListener("click", () => setLayout(btn.dataset.layout));
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginFlash.hidden = true;
  const fd = new FormData(loginForm);
  const email = String(fd.get("email") || "").trim();
  const password = String(fd.get("password") || "");

  if (!email) {
    loginFlash.hidden = false;
    loginFlash.textContent = "Enter your email.";
    return;
  }
  if (!password) {
    loginFlash.hidden = false;
    loginFlash.textContent = "Enter your password or use Google.";
    return;
  }

  const res = await fetch("/api/login", {
    ...fetchOpts,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    loginFlash.hidden = false;
    loginFlash.textContent = data.error || "Sign-in failed.";
    return;
  }

  setLoggedInUI(data.user.email);
  await loadRecords();
  setSidebarOpen(false);
});

logoutBtn.addEventListener("click", async () => {
  await fetch("/api/logout", { ...fetchOpts, method: "POST" });
  setGuestUI();
  history.replaceState(null, "", "/");
});

document.getElementById("navRecords")?.addEventListener("click", (e) => e.preventDefault());
document.getElementById("linkPrivacy")?.addEventListener("click", (e) => e.preventDefault());
document.getElementById("linkSupport")?.addEventListener("click", (e) => e.preventDefault());

applyUrlAuthFlags();
bootstrapSession();
</think>


<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
StrReplace