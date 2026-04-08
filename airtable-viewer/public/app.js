const shell = document.getElementById("shell");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const menuToggle = document.getElementById("menuToggle");

const accountActionBtn = document.getElementById("accountActionBtn");
const accountActionText = document.getElementById("accountActionText");
const logoutIconWrap = document.getElementById("logoutIconWrap");

const langSelect = document.getElementById("langSelect");

const sidebarControls = document.getElementById("sidebarControls");
const workspaceMain = document.getElementById("workspaceMain");

const pageTitle = document.getElementById("pageTitle");
const subtitle = document.getElementById("subtitle");

const loginView = document.getElementById("loginView");
const recordsView = document.getElementById("recordsView");
const loginForm = document.getElementById("loginForm");
const loginFlash = document.getElementById("loginFlash");

const loginHeading = document.getElementById("loginHeading");

const filterEl = document.getElementById("filter");
const sortFieldEl = document.getElementById("sortField");
const sortDirEl = document.getElementById("sortDir");

const viewModeCases = document.getElementById("viewModeCases");
const viewModeClients = document.getElementById("viewModeClients");
const viewModeCasesMobile = document.getElementById("viewModeCasesMobile");
const viewModeClientsMobile = document.getElementById("viewModeClientsMobile");
const filterMobile = document.getElementById("filterMobile");
const workspaceToolbar = document.getElementById("workspaceToolbar");

const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");
const pageSizeSelect = document.getElementById("pageSizeSelect");
const pager = document.getElementById("pager");

const errorEl = document.getElementById("error");
const emptyEl = document.getElementById("empty");
const tableWrap = document.getElementById("tableWrap");
const theadRow = document.getElementById("theadRow");
const tbody = document.getElementById("tbody");
const cardList = document.getElementById("cardList");

const fetchOpts = { credentials: "same-origin" };

function clearRecordTableUi() {
  tbody.innerHTML = "";
  theadRow.innerHTML = "";
  if (cardList) {
    cardList.innerHTML = "";
    cardList.hidden = true;
  }
}

const mqlMobileLayout = window.matchMedia("(max-width: 900px)");
function isMobileCardLayout() {
  return mqlMobileLayout.matches;
}

/** Browser tab title (fixed branding). */
const APP_DOC_TITLE = "A2D - Partner Relations";

let rawRecords = [];

/** @type {{ key: string, airtableField: string }[]} */
let listColumns = [];

/** @type {"cases" | "clients"} */
let listViewMode = "cases";

const CASE_SORT_KEYS = ["documentSubmittedDate", "fingerprintDate", "decisionExpectedDate", "collectionCardDate"];
const CLIENT_SORT_KEYS = ["fullname", "dob", "passportNr", "cardExpiredDate"];

let page = 1;
let pageSize = Number(pageSizeSelect?.value || 20);

let q = "";
let sortField = "";
let sortDir = "asc";

const i18n = {
  en: {
    languageName: "English",
    languageLabel: "Language",
    signInLabel: "Sign in",
    welcomeTitle: "Welcome",
    loggedInTitle: "Records",
    loginHeading: "Sign in",
    loginLead: "Sign in with your business email and phone number.",
    guestSubtitle: "Please sign in to check your cases",
    loadingBase: "Loading",
    findSortLabel: "Find & sort",
    searchLabel: "Search",
    searchPlaceholder: "Filter all columns…",
    sortByLabel: "Sort by",
    orderLabel: "Order",
    ascending: "Ascending",
    descending: "Descending",
    pagerPrev: "Prev",
    pagerNext: "Next",
    perPageLabel: "Per page",
    noRecords: "No records match your filter.",
    noRecordsInTable: "No records in this table.",
    errorLoading: "Failed to load records.",
    configMissing: "Configure the server: set {vars} in .env and restart.",
    listFieldsMissing:
      "Set VIEW_FIELDS",
    pageInfoShort: "page: {page}/{pages}",
    emailLabel: "Email",
    phoneLabel: "Phone number",
    loginHint: "Use the same email and phone number provided to our system.",
    footerPrivacy: "Privacy policy",
    footerSupport: "Support",
    footerCopyright: "Copyright A2D SOLUTIONS © {year}",
    listViewAria: "Choose which list to show",
    documentTitleGuest: "Welcome — A2D Solutions",
    documentTitleRecords: "Records — A2D Solutions",
    notConfiguredSubtitle: "Not configured",
    errorSubtitle: "Error",
    noPartnerFilter:
      "Your partner row in Airtable is missing the partner name used for case matching. Ask your administrator to fill that field.",
    loginEmailRequired: "Enter your email.",
    loginPhoneRequired: "Enter your phone number.",
    loginFailed: "Sign-in failed.",
    loginErrorInvalid:
      "Invalid email or phone number. Use the same Email and phone number provided to our service (digits only must match for the phone, with or without country code).",
    loginErrorPartnerFieldEmpty:
      "Your partner record is incomplete: the partner name used to filter cases is missing. Contact your administrator.",
    loginLockedMinutes: "Too many failed attempts. Try again in about {minutes} minute(s).",
    loginLockedHours: "Too many failed attempts. Try again in about {hours} hour(s).",
    loginErrorLockedGeneric: "Too many failed attempts. Please try again later.",
    loginErrorRateLimit: "Too many login attempts. Please wait and try again.",
    loginErrorMissingFields: "Enter your email and phone number.",
    loginErrorServerConfig: "The service is temporarily unavailable. Please try again later.",
    col_fullname: "Full name",
    col_dob: "Date of birth",
    col_passportNr: "Passport nr.",
    col_case: "Case",
    col_fingerprintDate: "Fingerprint date",
    col_documentSubmittedDate: "Document submitted date",
    col_decisionExpectedDate: "Decision expected date",
    col_collectionCardDate: "Collection card date",
    col_cardExpiredDate: "Card expiry date",
    listViewSection: "List",
    viewActiveCases: "Active cases",
    viewClientList: "Client list",
    documentTitleClients: "Clients — A2D Solutions",
    listClientFieldsMissing:
      "Set LIST_FIELDS",
    errorLoadingClients: "Failed to load client list.",
  },
  vi: {
    languageName: "Tiếng Việt",
    languageLabel: "Ngôn ngữ",
    signInLabel: "Đăng nhập",
    welcomeTitle: "Chào mừng",
    loggedInTitle: "Danh sách",
    loginHeading: "Đăng nhập",
    loginLead: "Đăng nhập bằng email doanh nghiệp và số điện thoại.",
    guestSubtitle: "Vui lòng đăng nhập để kiểm tra các hồ sơ của bạn",
    loadingBase: "Đang tải",
    findSortLabel: "Tìm kiếm & sắp xếp",
    searchLabel: "Tìm kiếm",
    searchPlaceholder: "Lọc theo tất cả cột…",
    sortByLabel: "Sắp xếp theo",
    orderLabel: "Thứ tự",
    ascending: "Tăng dần",
    descending: "Giảm dần",
    pagerPrev: "Trước",
    pagerNext: "Sau",
    perPageLabel: "Mỗi trang",
    noRecords: "Không có dữ liệu phù hợp với bộ lọc của bạn.",
    noRecordsInTable: "Không có dữ liệu trong bảng này.",
    errorLoading: "Không thể tải dữ liệu.",
    configMissing: "Cấu hình server: đặt {vars} trong .env và khởi động lại.",
    listFieldsMissing:
      "Đặt VIEW_FIELDS",
    pageInfoShort: "trang: {page}/{pages}",
    emailLabel: "Email",
    phoneLabel: "Số điện thoại",
    loginHint: "Sử dụng cùng email và số điện thoại đã cung cấp cho hệ thống của chúng tôi.",
    footerPrivacy: "Chính sách riêng tư",
    footerSupport: "Hỗ trợ",
    documentTitleGuest: "Chào mừng — A2D Solutions",
    documentTitleRecords: "Danh sách — A2D Solutions",
    notConfiguredSubtitle: "Chưa cấu hình",
    errorSubtitle: "Lỗi",
    noPartnerFilter:
      "Dòng đối tác trên Airtable thiếu tên dùng để khớp hồ sơ. Nhờ quản trị viên điền trường đó.",
    loginEmailRequired: "Nhập email của bạn.",
    loginPhoneRequired: "Nhập số điện thoại.",
    loginFailed: "Đăng nhập thất bại.",
    loginErrorInvalid:
      "Email hoặc số điện thoại không đúng. Dùng cùng email và số điện thoại đã cung cấp cho dịch vụ của chúng tôi (chỉ cần khớp các chữ số, có hoặc không có mã quốc gia).",
    loginErrorPartnerFieldEmpty:
      "Hồ sơ đối tác chưa đủ: thiếu tên dùng để lọc hồ sơ. Liên hệ quản trị viên.",
    loginLockedMinutes: "Quá nhiều lần thử không thành công. Thử lại sau khoảng {minutes} phút.",
    loginLockedHours: "Quá nhiều lần thử không thành công. Thử lại sau khoảng {hours} giờ.",
    loginErrorLockedGeneric: "Quá nhiều lần thử không thành công. Vui lòng thử lại sau.",
    loginErrorRateLimit: "Bạn đã đăng nhập quá nhiều lần. Vui lòng đợi rồi thử lại.",
    loginErrorMissingFields: "Vui lòng nhập email và số điện thoại.",
    loginErrorServerConfig: "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.",
    col_fullname: "Họ và tên",
    col_dob: "Ngày sinh",
    col_passportNr: "Số hộ chiếu",
    col_case: "Hồ sơ / vụ việc",
    col_fingerprintDate: "Ngày lấy vân tay",
    col_documentSubmittedDate: "Ngày nộp hồ sơ",
    col_decisionExpectedDate: "Ngày dự kiến có quyết định",
    col_collectionCardDate: "Ngày nhận thẻ",
    col_cardExpiredDate: "Ngày hết hạn thẻ",
    listViewSection: "Danh sách",
    listViewAria: "Chọn danh sách hiển thị",
    viewActiveCases: "Hồ sơ đang xử lý",
    viewClientList: "Danh sách khách hàng",
    documentTitleClients: "Khách hàng — A2D Solutions",
    listClientFieldsMissing:
      "Đặt LIST_FIELDS",
    errorLoadingClients: "Không tải được danh sách khách hàng.",
    footerCopyright: "Bản quyền A2D SOLUTIONS © {year}",
  },
  pl: {
    languageName: "Polski",
    languageLabel: "Język",
    signInLabel: "Zaloguj się",
    welcomeTitle: "Witamy",
    loggedInTitle: "Rekordy",
    loginHeading: "Zaloguj się",
    loginLead: "Zaloguj się firmowym adresem e-mail i numerem telefonu.",
    guestSubtitle: "Zaloguj się, aby sprawdzić swoje sprawy",
    loadingBase: "Ładowanie",
    findSortLabel: "Szukaj i sortuj",
    searchLabel: "Szukaj",
    searchPlaceholder: "Filtruj po wszystkich kolumnach…",
    sortByLabel: "Sortuj po",
    orderLabel: "Kolejność",
    ascending: "Rosnąco",
    descending: "Malejąco",
    pagerPrev: "Wstecz",
    pagerNext: "Dalej",
    perPageLabel: "Na stronę",
    noRecords: "Brak rekordów spełniających filtr.",
    noRecordsInTable: "Brak rekordów w tej tabeli.",
    errorLoading: "Nie udało się wczytać danych.",
    configMissing: "Skonfiguruj serwer: ustaw {vars} w .env i uruchom ponownie.",
    listFieldsMissing:
      "Ustaw VIEW_FIELDS",
    pageInfoShort: "strona: {page}/{pages}",
    emailLabel: "E-mail",
    phoneLabel: "Numer telefonu",
    loginHint: "Użyj tego samego adresu e-mail i numeru telefonu, które zostały nam przekazane.",
    footerPrivacy: "Polityka prywatności",
    footerSupport: "Wsparcie",
    footerCopyright: "Copyright A2D SOLUTIONS © {year}",
    listViewAria: "Wybierz widok listy",
    documentTitleGuest: "Witamy — A2D Solutions",
    documentTitleRecords: "Rekordy — A2D Solutions",
    notConfiguredSubtitle: "Brak konfiguracji",
    errorSubtitle: "Błąd",
    noPartnerFilter:
      "W wierszu partnera w Airtable brakuje nazwy używanej do dopasowania spraw. Poproś administratora o uzupełnienie tego pola.",
    loginEmailRequired: "Podaj adres e-mail.",
    loginPhoneRequired: "Podaj numer telefonu.",
    loginFailed: "Logowanie nie powiodło się.",
    loginErrorInvalid:
      "Nieprawidłowy adres e-mail lub numer telefonu. Użyj tego samego e-maila i numeru telefonu, które przekazaliście naszej obsłudze (wystarczy zgodność cyfr, z numerem kierunkowym kraju lub bez).",
    loginErrorPartnerFieldEmpty:
      "Profil partnera jest niepełny: brakuje nazwy używanej do filtrowania spraw. Skontaktuj się z administratorem.",
    loginLockedMinutes: "Zbyt wiele nieudanych prób. Spróbuj ponownie za około {minutes} min.",
    loginLockedHours: "Zbyt wiele nieudanych prób. Spróbuj ponownie za około {hours} godz.",
    loginErrorLockedGeneric: "Zbyt wiele nieudanych prób. Spróbuj ponownie później.",
    loginErrorRateLimit: "Zbyt wiele prób logowania. Odczekaj chwilę i spróbuj ponownie.",
    loginErrorMissingFields: "Podaj adres e-mail i numer telefonu.",
    loginErrorServerConfig: "Usługa jest tymczasowo niedostępna. Spróbuj ponownie później.",
    col_fullname: "Imię i nazwisko",
    col_dob: "Data urodzenia",
    col_passportNr: "Nr paszportu",
    col_case: "Sprawa",
    col_fingerprintDate: "Data poboru odcisków",
    col_documentSubmittedDate: "Data złożenia dokumentów",
    col_decisionExpectedDate: "Oczekiwana data decyzji",
    col_collectionCardDate: "Data odbioru karty",
    col_cardExpiredDate: "Data wygaśnięcia karty",
    listViewSection: "Lista",
    viewActiveCases: "Aktywne sprawy",
    viewClientList: "Lista klientów",
    documentTitleClients: "Klienci — A2D Solutions",
    listClientFieldsMissing:
      "Ustaw LIST_FIELDS",
    errorLoadingClients: "Nie udało się wczytać listy klientów.",
  },
};

let currentLang = "vi";

function t(key) {
  const dict = i18n[currentLang] || i18n.en;
  return dict[key] ?? i18n.en[key] ?? key;
}

function formatLoginLockMessage(retryAfterSec) {
  const sec = Math.max(1, Number(retryAfterSec) || 60);
  const m = Math.ceil(sec / 60);
  if (m >= 60) {
    const h = Math.ceil(m / 60);
    return t("loginLockedHours").replace("{hours}", String(h));
  }
  return t("loginLockedMinutes").replace("{minutes}", String(Math.max(1, m)));
}

/** @param {{ errorCode?: string, error?: string, retryAfterSec?: number }} data */
function messageFromLoginError(data) {
  const code = data?.errorCode;
  switch (code) {
    case "LOGIN_INVALID":
      return t("loginErrorInvalid");
    case "LOGIN_PARTNER_FIELD_EMPTY":
      return t("loginErrorPartnerFieldEmpty");
    case "LOGIN_LOCKED":
    case "LOGIN_LOCKED_AFTER_FAIL":
      return data?.retryAfterSec != null ? formatLoginLockMessage(data.retryAfterSec) : t("loginErrorLockedGeneric");
    case "LOGIN_RATE_LIMIT":
      return t("loginErrorRateLimit");
    case "LOGIN_MISSING_FIELDS":
      return t("loginErrorMissingFields");
    case "SERVER_CONFIG":
      return t("loginErrorServerConfig");
    default:
      return data?.error || t("loginFailed");
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCellValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (v && typeof v === "object" && "url" in v) return v.url;
        return typeof v === "object" ? JSON.stringify(v) : String(v);
      })
      .join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function recordMatchesFilter(record, query) {
  const needle = String(query || "").trim().toLowerCase();
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

function filterAndSortRecords() {
  const searched = rawRecords.filter((r) => recordMatchesFilter(r, q));

  const sorted = [...searched].sort((a, b) => {
    const va = sortValueForField(a, sortField);
    const vb = sortValueForField(b, sortField);
    const dir = sortDir === "desc" ? -1 : 1;

    if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
    return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" }) * dir;
  });

  return sorted;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function columnHeader(key) {
  const k = `col_${key}`;
  return t(k);
}

function fieldByKey(key) {
  return listColumns.find((c) => c.key === key)?.airtableField;
}

function cellValueForKey(record, key) {
  const f = fieldByKey(key);
  if (!f) return "";
  return formatCellValue(record.fields?.[f]);
}

function hasCollectionCardDate(record) {
  return String(cellValueForKey(record, "collectionCardDate") ?? "").trim() !== "";
}

function caseCardKv(key, record) {
  return `<div class="case-card__kv"><span class="case-card__k">${escapeHtml(columnHeader(key))}</span><span class="case-card__v">${escapeHtml(cellValueForKey(record, key))}</span></div>`;
}

function populateSortFieldOptions() {
  if (!sortFieldEl) return;
  const keys = listViewMode === "cases" ? CASE_SORT_KEYS : CLIENT_SORT_KEYS;
  const map = new Map(listColumns.map((c) => [c.key, c.airtableField]));

  sortFieldEl.replaceChildren();
  for (const key of keys) {
    const field = map.get(key);
    if (!field) continue;
    const opt = document.createElement("option");
    opt.value = field;
    opt.textContent = columnHeader(key);
    sortFieldEl.appendChild(opt);
  }
  if (!sortFieldEl.options.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "—";
    sortFieldEl.appendChild(opt);
  }
  const allowed = [...sortFieldEl.options].map((o) => o.value).filter(Boolean);
  if (allowed.includes(sortField)) {
    sortFieldEl.value = sortField;
  } else {
    sortField = allowed[0] || "";
    sortFieldEl.value = sortField;
  }
}

function renderTable(pageRecords) {
  const cols = listColumns;

  theadRow.innerHTML = cols
    .map((c) => `<th scope="col">${escapeHtml(columnHeader(c.key))}</th>`)
    .join("");

  const rows = pageRecords.map((r, i) => {
    const cells = cols.map((c) => {
      const val = formatCellValue(r.fields?.[c.airtableField]);
      return `<td><span class="cell-value">${escapeHtml(val)}</span></td>`;
    });
    const rowClass = `table__row${hasCollectionCardDate(r) ? " table__row--card-ready" : ""}`;
    return `<tr class="${rowClass}" data-row="${i}">${cells.join("")}</tr>`;
  });

  tbody.innerHTML = rows.join("");
  tableWrap.hidden = false;
}

function renderCaseCards(pageRecords) {
  const html = pageRecords
    .map((r) => {
      const left = ["fullname", "dob", "passportNr"].map((k) => caseCardKv(k, r)).join("");
      const caseRight = `<div class="case-card__right">
        <span class="case-card__k">${escapeHtml(columnHeader("case"))}</span>
        <span class="case-card__v case-card__v--case">${escapeHtml(cellValueForKey(r, "case"))}</span>
      </div>`;
      const g1 = caseCardKv("documentSubmittedDate", r) + caseCardKv("fingerprintDate", r);
      const g2 = caseCardKv("decisionExpectedDate", r) + caseCardKv("collectionCardDate", r);
      const cardClass = `case-card${hasCollectionCardDate(r) ? " case-card--card-ready" : ""}`;
      return `<article class="${cardClass}">
        <div class="case-card__section case-card__section--top">
          <div class="case-card__top-grid">
            <div class="case-card__left">${left}</div>
            ${caseRight}
          </div>
        </div>
        <div class="case-card__section case-card__section--bottom">
          <div class="case-card__grid2">${g1}</div>
          <div class="case-card__grid2">${g2}</div>
        </div>
      </article>`;
    })
    .join("");
  cardList.innerHTML = html;
  cardList.hidden = false;
}

function renderClientCards(pageRecords) {
  const keys = ["fullname", "dob", "passportNr", "cardExpiredDate"];
  const html = pageRecords
    .map((r) => {
      const top = keys.slice(0, 3).map((k) => caseCardKv(k, r)).join("");
      const bottom = caseCardKv("cardExpiredDate", r);
      return `<article class="case-card case-card--client">
        <div class="case-card__section case-card__section--top">
          <div class="case-card__client-stack">${top}</div>
        </div>
        <div class="case-card__section case-card__section--bottom">
          <div class="case-card__client-wide">${bottom}</div>
        </div>
      </article>`;
    })
    .join("");
  cardList.innerHTML = html;
  cardList.hidden = false;
}

function setPaginationUI(totalCount) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  page = clamp(page, 1, totalPages);

  prevPageBtn.disabled = page <= 1;
  nextPageBtn.disabled = page >= totalPages;

  pageInfo.textContent = t("pageInfoShort")
    .replace("{page}", String(page))
    .replace("{pages}", String(totalPages));
}

function render() {
  if (!listColumns.length) {
    emptyEl.hidden = true;
    tableWrap.hidden = true;
    if (cardList) {
      cardList.innerHTML = "";
      cardList.hidden = true;
    }
    if (pager) pager.hidden = true;
    return;
  }

  const sorted = filterAndSortRecords();
  const totalCount = sorted.length;

  errorEl.hidden = true;

  if (!totalCount) {
    emptyEl.hidden = false;
    emptyEl.textContent = rawRecords.length ? t("noRecords") : t("noRecordsInTable");
    tableWrap.hidden = true;
    if (cardList) {
      cardList.innerHTML = "";
      cardList.hidden = true;
    }
    if (pager) pager.hidden = false;
    setPaginationUI(totalCount);
    return;
  }

  emptyEl.hidden = true;
  setPaginationUI(totalCount);

  const start = (page - 1) * pageSize;
  const pageRecords = sorted.slice(start, start + pageSize);
  if (isMobileCardLayout()) {
    tableWrap.hidden = true;
    tbody.innerHTML = "";
    theadRow.innerHTML = "";
    if (listViewMode === "cases") renderCaseCards(pageRecords);
    else renderClientCards(pageRecords);
  } else {
    if (cardList) {
      cardList.innerHTML = "";
      cardList.hidden = true;
    }
    renderTable(pageRecords);
  }
  if (pager) pager.hidden = false;
}

function setSubtitleLoading(loading) {
  if (!loading) {
    subtitle.hidden = true;
    subtitle.textContent = "";
    subtitle.removeAttribute("aria-busy");
    return;
  }
  subtitle.hidden = false;
  subtitle.setAttribute("aria-busy", "true");
  subtitle.innerHTML = `<span class="loading-line">${escapeHtml(t("loadingBase"))}</span><span class="loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>`;
}

function enforceAuthPanels(isAuthed) {
  if (isAuthed) {
    loginView.setAttribute("hidden", "");
    recordsView.removeAttribute("hidden");
    if (workspaceMain) workspaceMain.dataset.authed = "1";
  } else {
    loginView.removeAttribute("hidden");
    recordsView.setAttribute("hidden", "");
    if (workspaceMain) delete workspaceMain.dataset.authed;
  }
}

function setGuestUI() {
  pageTitle.textContent = t("welcomeTitle");
  loginHeading.textContent = t("loginHeading");
  errorEl.hidden = true;
  emptyEl.hidden = true;

  sidebarControls.hidden = true;
  if (workspaceToolbar) workspaceToolbar.hidden = true;
  if (pager) pager.hidden = true;
  enforceAuthPanels(false);

  accountActionText.textContent = t("signInLabel");
  accountActionBtn.classList.remove("pill--user");
  accountActionBtn.classList.add("pill--accent");
  if (logoutIconWrap) logoutIconWrap.hidden = true;

  subtitle.hidden = false;
  subtitle.removeAttribute("aria-busy");
  subtitle.textContent = t("guestSubtitle");
  refreshDocumentTitle();

  listViewMode = "cases";
  updateViewModeButtons();
  rawRecords = [];
  listColumns = [];
  clearRecordTableUi();
}

function setLoggedInUI(email) {
  pageTitle.textContent = t("loggedInTitle");
  enforceAuthPanels(true);
  subtitle.hidden = true;
  subtitle.textContent = "";

  sidebarControls.hidden = false;
  if (workspaceToolbar) workspaceToolbar.hidden = false;
  if (pager) pager.hidden = true;
  if (logoutIconWrap) logoutIconWrap.hidden = false;

  accountActionText.textContent = email;
  accountActionBtn.classList.remove("pill--accent");
  accountActionBtn.classList.add("pill--user");
  updateViewModeButtons();
  refreshDocumentTitle();
}

function refreshDocumentTitle() {
  document.title = APP_DOC_TITLE;
}

function updateWorkspaceFooter() {
  const el = document.getElementById("workspaceFooterCopy");
  if (!el) return;
  el.textContent = t("footerCopyright").replace("{year}", String(new Date().getFullYear()));
}

function updateViewModeButtons() {
  viewModeCases?.classList.toggle("is-active", listViewMode === "cases");
  viewModeClients?.classList.toggle("is-active", listViewMode === "clients");
  viewModeCasesMobile?.classList.toggle("is-active", listViewMode === "cases");
  viewModeClientsMobile?.classList.toggle("is-active", listViewMode === "clients");
}

function setListViewMode(mode) {
  if (mode !== "cases" && mode !== "clients") return;
  if (listViewMode === mode) return;
  listViewMode = mode;
  updateViewModeButtons();
  page = 1;
  refreshDocumentTitle();
  if (!accountActionBtn?.classList.contains("pill--user")) return;
  if (mode === "cases") loadRecords();
  else loadClients();
}

function refreshHtmlLang() {
  const map = { en: "en", vi: "vi", pl: "pl" };
  document.documentElement.lang = map[currentLang] || "en";
}

function applyI18n() {
  const cur = currentLang;
  const options = [
    { value: "en", label: i18n.en.languageName },
    { value: "vi", label: i18n.vi.languageName },
    { value: "pl", label: i18n.pl.languageName },
  ];
  langSelect.replaceChildren();
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    langSelect.appendChild(o);
  }
  langSelect.value = cur;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    if (el === accountActionText && accountActionBtn?.classList.contains("pill--user")) return;
    const key = el.dataset.i18n;
    if (!key) return;
    el.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.dataset.i18nAria;
    if (key) el.setAttribute("aria-label", t(key));
  });

  document.querySelectorAll(".js-toolbar-filter").forEach((el) => {
    el.placeholder = t("searchPlaceholder");
  });
  sortDirEl.querySelector('option[value="asc"]').textContent = t("ascending");
  sortDirEl.querySelector('option[value="desc"]').textContent = t("descending");
  sortFieldEl.ariaLabel = t("sortByLabel");

  if (accountActionBtn?.classList.contains("pill--user")) {
    enforceAuthPanels(true);
    if (subtitle.getAttribute("aria-busy") !== "true") subtitle.hidden = true;
    if (listColumns.length) populateSortFieldOptions();
    if (listColumns.length && !recordsView.hidden) render();
  }

  updateWorkspaceFooter();
  refreshHtmlLang();
  refreshDocumentTitle();
}

function applyUrlAuthFlags() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("auth") === "denied") {
    if (loginFlash) {
      loginFlash.hidden = false;
      loginFlash.textContent = t("loginErrorInvalid");
    }
  }
}

function applyServerConfig(cfg) {
  listColumns = Array.isArray(cfg?.listViewColumns) ? cfg.listViewColumns : [];
  syncClientListTab(cfg);
}

function syncClientListTab(cfg) {
  const show = Boolean(cfg?.clientListConfigured);
  if (viewModeClients) viewModeClients.hidden = !show;
  if (viewModeClientsMobile) viewModeClientsMobile.hidden = !show;
  if (!show && listViewMode === "clients") {
    listViewMode = "cases";
    updateViewModeButtons();
    refreshDocumentTitle();
    if (accountActionBtn?.classList.contains("pill--user") && !recordsView.hidden) {
      loadRecords();
    }
  }
}

async function loadRecords() {
  errorEl.hidden = true;
  emptyEl.hidden = true;
  setSubtitleLoading(true);

  const health = await fetch("/api/health", fetchOpts).then((r) => r.json());
  if (!health.ok) {
    errorEl.hidden = false;
    errorEl.textContent = t("configMissing").replace("{vars}", health.missingEnv.join(", "));
    setSubtitleLoading(false);
    subtitle.hidden = false;
    subtitle.textContent = t("notConfiguredSubtitle");
    return;
  }

  if (!listColumns.length) {
    const cfgWarm = await fetch("/api/config", fetchOpts).then((r) => (r.ok ? r.json() : {}));
    applyServerConfig(cfgWarm);
  }

  const res = await fetch("/api/records", fetchOpts);
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    setSubtitleLoading(false);
    setGuestUI();
    return;
  }

  if (!res.ok) {
    errorEl.hidden = false;
    errorEl.textContent = data.error || t("errorLoading");
    setSubtitleLoading(false);
    subtitle.hidden = false;
    subtitle.textContent = t("errorSubtitle");
    return;
  }

  if (listViewMode !== "cases") {
    setSubtitleLoading(false);
    return;
  }

  // Authoritative field layout from server (same process that reads .env — avoids stale / empty client config).
  if (Array.isArray(data.listViewColumns) && data.listViewColumns.length) {
    listColumns = data.listViewColumns;
  }

  if (data.noPartnerFilter) {
    errorEl.hidden = false;
    errorEl.textContent = t("noPartnerFilter");
    rawRecords = [];
    clearRecordTableUi();
    tableWrap.hidden = true;
    if (pager) pager.hidden = true;
    setSubtitleLoading(false);
    return;
  }

  if (!listColumns.length) {
    errorEl.hidden = false;
    errorEl.textContent = t("listFieldsMissing");
    rawRecords = [];
    clearRecordTableUi();
    tableWrap.hidden = true;
    if (pager) pager.hidden = true;
    setSubtitleLoading(false);
    return;
  }

  rawRecords = data.records || [];

  populateSortFieldOptions();

  page = 1;
  render();
  setSubtitleLoading(false);
  if (pager) pager.hidden = false;
}

async function loadClients() {
  errorEl.hidden = true;
  emptyEl.hidden = true;
  setSubtitleLoading(true);

  const health = await fetch("/api/health", fetchOpts).then((r) => r.json());
  if (!health.ok) {
    errorEl.hidden = false;
    errorEl.textContent = t("configMissing").replace("{vars}", health.missingEnv.join(", "));
    setSubtitleLoading(false);
    subtitle.hidden = false;
    subtitle.textContent = t("notConfiguredSubtitle");
    return;
  }

  const res = await fetch("/api/clients", fetchOpts);
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    setSubtitleLoading(false);
    setGuestUI();
    return;
  }

  if (!res.ok) {
    errorEl.hidden = false;
    errorEl.textContent = data.detail || data.error || t("errorLoadingClients");
    setSubtitleLoading(false);
    subtitle.hidden = false;
    subtitle.textContent = t("errorSubtitle");
    return;
  }

  if (listViewMode !== "clients") {
    setSubtitleLoading(false);
    return;
  }

  if (Array.isArray(data.clientListColumns) && data.clientListColumns.length) {
    listColumns = data.clientListColumns;
  }

  if (data.noPartnerFilter) {
    errorEl.hidden = false;
    errorEl.textContent = t("noPartnerFilter");
    rawRecords = [];
    clearRecordTableUi();
    tableWrap.hidden = true;
    if (pager) pager.hidden = true;
    setSubtitleLoading(false);
    return;
  }

  if (!listColumns.length) {
    errorEl.hidden = false;
    errorEl.textContent = t("listClientFieldsMissing");
    rawRecords = [];
    clearRecordTableUi();
    tableWrap.hidden = true;
    if (pager) pager.hidden = true;
    setSubtitleLoading(false);
    return;
  }

  rawRecords = data.records || [];
  populateSortFieldOptions();
  page = 1;
  render();
  setSubtitleLoading(false);
  if (pager) pager.hidden = false;
}

async function bootstrapSession() {
  const [meRes, cfgRes] = await Promise.all([
    fetch("/api/me", fetchOpts),
    fetch("/api/config", fetchOpts).then((r) => r.json()),
  ]);

  applyServerConfig(cfgRes);

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

function setSidebarOpen(open) {
  shell.classList.toggle("is-sidebar-open", open);
  menuToggle?.setAttribute("aria-expanded", open ? "true" : "false");
  if (sidebarBackdrop) sidebarBackdrop.hidden = !open;
}

menuToggle?.addEventListener("click", () => setSidebarOpen(!shell.classList.contains("is-sidebar-open")));
sidebarBackdrop?.addEventListener("click", () => setSidebarOpen(false));

viewModeCases?.addEventListener("click", () => setListViewMode("cases"));
viewModeClients?.addEventListener("click", () => setListViewMode("clients"));

accountActionBtn?.addEventListener("click", async () => {
  const isSignedIn = accountActionBtn.classList.contains("pill--user");
  if (isSignedIn) {
    await fetch("/api/logout", { ...fetchOpts, method: "POST" });
    setGuestUI();
    history.replaceState(null, "", "/");
    return;
  }

  loginView?.scrollIntoView({ behavior: "smooth", block: "center" });
  setSidebarOpen(false);
});

langSelect?.addEventListener("change", () => {
  currentLang = langSelect.value;
  localStorage.setItem("lang", currentLang);
  applyI18n();
  if (!accountActionBtn.classList.contains("pill--user")) {
    subtitle.hidden = false;
    subtitle.textContent = t("guestSubtitle");
  } else if (subtitle.getAttribute("aria-busy") !== "true") {
    subtitle.hidden = true;
    if (listColumns.length) render();
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setSidebarOpen(false);
});

function bindToolbarFilters() {
  document.querySelectorAll(".js-toolbar-filter").forEach((el) => {
    el.addEventListener("input", () => {
      q = el.value;
      document.querySelectorAll(".js-toolbar-filter").forEach((o) => {
        if (o !== el) o.value = el.value;
      });
      page = 1;
      if (!recordsView.hidden && listColumns.length) render();
    });
  });
}
bindToolbarFilters();

viewModeCasesMobile?.addEventListener("click", () => setListViewMode("cases"));
viewModeClientsMobile?.addEventListener("click", () => setListViewMode("clients"));

mqlMobileLayout.addEventListener("change", () => {
  if (accountActionBtn?.classList.contains("pill--user") && listColumns.length && !recordsView.hidden) {
    render();
  }
});

sortFieldEl?.addEventListener("change", () => {
  sortField = sortFieldEl.value;
  page = 1;
  render();
});

sortDirEl?.addEventListener("change", () => {
  sortDir = sortDirEl.value;
  page = 1;
  render();
});

pageSizeSelect?.addEventListener("change", () => {
  pageSize = Number(pageSizeSelect.value);
  page = 1;
  render();
});

prevPageBtn?.addEventListener("click", () => {
  page -= 1;
  render();
});
nextPageBtn?.addEventListener("click", () => {
  page += 1;
  render();
});

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginFlash.hidden = true;

  const fd = new FormData(loginForm);
  const email = String(fd.get("email") || "").trim();
  const phone = String(fd.get("phone") || "").trim();

  if (!email) {
    loginFlash.hidden = false;
    loginFlash.textContent = t("loginEmailRequired");
    return;
  }
  if (!phone) {
    loginFlash.hidden = false;
    loginFlash.textContent = t("loginPhoneRequired");
    return;
  }

  const res = await fetch("/api/login", {
    ...fetchOpts,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, phone }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    loginFlash.hidden = false;
    loginFlash.textContent = messageFromLoginError(data);
    return;
  }

  const cfgRes = await fetch("/api/config", fetchOpts).then((r) => r.json());
  applyServerConfig(cfgRes);

  setLoggedInUI(data.user.email);
  await loadRecords();
  setSidebarOpen(false);
});

currentLang = localStorage.getItem("lang") || "vi";
applyI18n();
applyUrlAuthFlags();

(async () => {
  subtitle.hidden = true;
  subtitle.textContent = "";
  await bootstrapSession();
})();
