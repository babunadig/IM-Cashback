// ==================== STORAGE KEYS & INITIAL SEED DATA ====================
const STORAGE_KEYS = {
  SETTINGS: "cb_site_settings_v1",
  COMPANIES: "cb_companies_v1",
  OFFERS: "cb_offers_v1",
  REDEMPTIONS: "cb_redemptions_v1"
};

const DEFAULT_SETTINGS = {
  siteName: "Cashback Rewards Portal",
  logoUrl: "",
  heading: "Claim Your Exclusive Business Cashback",
  welcomeMessage: "Verify your registered company details below to unlock your special cashback reward.",
  primaryColor: "#2563eb",
  secondaryColor: "#1e40af",
  instructions: "1. Enter your registered Company Name, Mobile Number, and GST Number.\n2. Enter the cashback code shared with you.\n3. Reveal and share your instant cashback reward.",
  contactDetails: "Support: support@example.com | +91 98765 43210",
  footerText: "© 2026 Cashback Rewards Portal. All rights reserved.",
  linkExpiryHours: 24
};

const DEFAULT_COMPANIES = [
  { companyName: "Apex Industrial Supplies", mobile: "9876543210", gst: "29ABCDE1234F1Z5" },
  { companyName: "Sunrise Packaging Pvt Ltd", mobile: "9845012345", gst: "27FGHIJ5678K1Z2" }
];

const DEFAULT_OFFERS = [
  { id: "off_1", code: "IM198", amount: 2000, active: true },
  { id: "off_2", code: "IM289", amount: 1000, active: true }
];

// Initialize local storage if empty
function initStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.COMPANIES)) {
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(DEFAULT_COMPANIES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.OFFERS)) {
    localStorage.setItem(STORAGE_KEYS.OFFERS, JSON.stringify(DEFAULT_OFFERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.REDEMPTIONS)) {
    localStorage.setItem(STORAGE_KEYS.REDEMPTIONS, JSON.stringify([]));
  }
}

const getSettings = () => ({ ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || "{}") });
const saveSettings = (s) => localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(s));
const getCompanies = () => JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPANIES) || "[]");
const saveCompanies = (list) => localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(list));
const getOffers = () => JSON.parse(localStorage.getItem(STORAGE_KEYS.OFFERS) || "[]");
const saveOffers = (list) => localStorage.setItem(STORAGE_KEYS.OFFERS, JSON.stringify(list));
const getRedemptions = () => JSON.parse(localStorage.getItem(STORAGE_KEYS.REDEMPTIONS) || "[]");
const saveRedemptions = (list) => localStorage.setItem(STORAGE_KEYS.REDEMPTIONS, JSON.stringify(list));

// Helpers
const normalizeGst = (g) => String(g || "").trim().toUpperCase();
const normalizeMobile = (m) => String(m || "").replace(/\D/g, "").slice(-10);
const normalizeText = (t) => String(t || "").trim().toLowerCase().replace(/\s+/g, " ");
const formatINR = (amt) => "₹" + Number(amt || 0).toLocaleString("en-IN");
const formatDateTime = (ms) => new Date(ms).toLocaleString("en-IN", {
  day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: true
});

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

// ==================== APPLY DYNAMIC BRANDING ====================
function applyBranding() {
  const cfg = getSettings();
  document.documentElement.style.setProperty("--primary", cfg.primaryColor);
  document.documentElement.style.setProperty("--secondary", cfg.secondaryColor);
  document.title = cfg.siteName;

  document.getElementById("siteNameText").textContent = cfg.siteName;
  const logoImg = document.getElementById("siteLogoImg");
  if (cfg.logoUrl) {
    logoImg.src = cfg.logoUrl;
    logoImg.classList.remove("hidden");
  } else {
    logoImg.classList.add("hidden");
  }

  document.getElementById("siteHeading").textContent = cfg.heading;
  document.getElementById("siteWelcome").textContent = cfg.welcomeMessage;
  document.getElementById("siteInstructions").textContent = cfg.instructions;
  document.getElementById("siteContact").textContent = cfg.contactDetails;
  document.getElementById("siteFooterText").textContent = cfg.footerText;
}

// ==================== VIEW ROUTING ====================
let verifiedCompany = null;
let isAdminLoggedIn = false;

function showView(viewId) {
  ["customerView", "shareView", "adminLoginView", "adminDashboardView"].forEach((id) => {
    document.getElementById(id).classList.add("hidden");
  });
  document.getElementById(viewId).classList.remove("hidden");
}

function handleRoute() {
  const hash = window.location.hash;
  if (hash.startsWith("#share=")) {
    const token = decodeURIComponent(hash.slice(7));
    renderShareCertificate(token);
  } else {
    showView("customerView");
  }
}

// ==================== CUSTOMER PORTAL: PAGE 1 & PAGE 2 ====================
document.getElementById("verifyForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const alertEl = document.getElementById("step1Alert");
  alertEl.classList.add("hidden");

  const nameInput = normalizeText(document.getElementById("companyName").value);
  const mobileInput = normalizeMobile(document.getElementById("mobile").value);
  const gstInput = normalizeGst(document.getElementById("gst").value);

  const match = getCompanies().find(
    (c) =>
      normalizeGst(c.gst) === gstInput &&
      normalizeMobile(c.mobile) === mobileInput &&
      normalizeText(c.companyName) === nameInput
  );

  if (!match) {
    alertEl.textContent = "Verification failed: Company Name, Mobile Number, or GST Number does not match our approved records.";
    alertEl.className = "alert alert-error";
    alertEl.classList.remove("hidden");
    return;
  }

  // Enforce One-Time Redemption Policy by GST
  const existing = getRedemptions().find((r) => normalizeGst(r.gst) === gstInput);
  if (existing) {
    alertEl.textContent = `This company (GST: ${gstInput}) has already redeemed its cashback offer (Ref ID: ${existing.referenceId}).`;
    alertEl.className = "alert alert-info";
    alertEl.classList.remove("hidden");
    return;
  }

  verifiedCompany = match;
  document.getElementById("step1Card").classList.add("hidden");
  document.getElementById("step2Card").classList.remove("hidden");
});

document.getElementById("redeemForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const alertEl = document.getElementById("step2Alert");
  alertEl.classList.add("hidden");

  if (!verifiedCompany) return;

  const codeInput = document.getElementById("cashbackCode").value.trim().toUpperCase();
  const offer = getOffers().find((o) => o.code.toUpperCase() === codeInput && o.active);

  if (!offer) {
    alertEl.textContent = "Invalid or inactive cashback code. Please check your code and try again.";
    alertEl.classList.remove("hidden");
    return;
  }

  // Double-check duplicate claim prevention
  const redemptions = getRedemptions();
  if (redemptions.some((r) => normalizeGst(r.gst) === normalizeGst(verifiedCompany.gst))) {
    alertEl.textContent = "This company has already claimed a cashback reward.";
    alertEl.classList.remove("hidden");
    return;
  }

  const cfg = getSettings();
  const nowMs = Date.now();
  const expiryHours = Number(cfg.linkExpiryHours) || 24;
  const expiresMs = nowMs + expiryHours * 60 * 60 * 1000;
  const refId = "CB-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.random().toString(36).substring(2, 7).toUpperCase();
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

  const record = {
    companyName: verifiedCompany.companyName,
    mobile: verifiedCompany.mobile,
    gst: normalizeGst(verifiedCompany.gst),
    code: offer.code,
    amount: Number(offer.amount),
    referenceId: refId,
    redeemedAt: nowMs,
    shareToken: token,
    expiresAt: expiresMs
  };

  redemptions.push(record);
  saveRedemptions(redemptions);

  // Render Page 3 Success Screen
  const amountStr = formatINR(record.amount);
  const baseUrl = window.location.href.split("#")[0];
  const shareUrl = `${baseUrl}#share=${encodeURIComponent(token)}`;

  document.getElementById("resAmount").textContent = amountStr;
  document.getElementById("resCompanyBanner").textContent = record.companyName;
  document.getElementById("resCompany").textContent = record.companyName;
  document.getElementById("resAmountDetail").textContent = amountStr;
  document.getElementById("resRefId").textContent = record.referenceId;
  document.getElementById("resCode").textContent = record.code;
  document.getElementById("resDate").textContent = formatDateTime(record.redeemedAt);
  document.getElementById("resExpiry").textContent = formatDateTime(record.expiresAt);
  document.getElementById("shareHoursLabel").textContent = expiryHours;
  document.getElementById("shareUrlPreview").textContent = shareUrl;

  const waText = encodeURIComponent(
    `Congratulations! ${record.companyName} won ${amountStr} cashback on ${cfg.siteName}! Ref ID: ${record.referenceId}. View certificate: ${shareUrl}`
  );
  document.getElementById("whatsappShareBtn").href = `https://wa.me/?text=${waText}`;

  document.getElementById("copyLinkBtn").onclick = async () => {
    await navigator.clipboard.writeText(shareUrl);
    const btn = document.getElementById("copyLinkBtn");
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = "Copy Link"), 2000);
  };

  document.getElementById("step2Card").classList.add("hidden");
  document.getElementById("step3Card").classList.remove("hidden");
});

// ==================== 24-HOUR SHAREABLE CERTIFICATE VIEW ====================
function renderShareCertificate(token) {
  showView("shareView");
  const expiredCard = document.getElementById("shareExpiredCard");
  const validCard = document.getElementById("shareValidCard");
  expiredCard.classList.add("hidden");
  validCard.classList.add("hidden");

  const record = getRedemptions().find((r) => r.shareToken === token);
  if (!record) {
    document.getElementById("shareExpiredMsg").textContent = "This shareable link is invalid or does not exist.";
    expiredCard.classList.remove("hidden");
    return;
  }

  if (Date.now() > record.expiresAt) {
    document.getElementById("shareExpiredMsg").textContent =
      `This shareable link expired on ${formatDateTime(record.expiresAt)}.`;
    expiredCard.classList.remove("hidden");
    return;
  }

  document.getElementById("sAmount").textContent = formatINR(record.amount);
  document.getElementById("sCompanyBanner").textContent = record.companyName;
  document.getElementById("sCompany").textContent = record.companyName;
  document.getElementById("sRefId").textContent = record.referenceId;
  document.getElementById("sCreated").textContent = formatDateTime(record.redeemedAt);
  document.getElementById("sExpires").textContent = formatDateTime(record.expiresAt);
  validCard.classList.remove("hidden");
}

document.getElementById("backToPortalBtn").addEventListener("click", (e) => {
  e.preventDefault();
  window.location.hash = "";
  resetCustomerPortal();
});

document.getElementById("homeNavLink").addEventListener("click", (e) => {
  e.preventDefault();
  window.location.hash = "";
  resetCustomerPortal();
});

function resetCustomerPortal() {
  verifiedCompany = null;
  document.getElementById("verifyForm").reset();
  document.getElementById("redeemForm").reset();
  document.getElementById("step1Card").classList.remove("hidden");
  document.getElementById("step2Card").classList.add("hidden");
  document.getElementById("step3Card").classList.add("hidden");
  showView("customerView");
}

// ==================== ADMIN AUTH & DASHBOARD ====================
document.getElementById("toggleAdminBtn").addEventListener("click", () => {
  if (isAdminLoggedIn) {
    showView("adminDashboardView");
    refreshAdminDashboard();
  } else {
    showView("adminLoginView");
  }
});

document.getElementById("adminLoginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("adminEmail").value.trim();
  const pass = document.getElementById("adminPassword").value;

  if (email === "admin@cashback.com" && pass === "admin123") {
    isAdminLoggedIn = true;
    document.getElementById("toggleAdminBtn").textContent = "Dashboard";
    document.getElementById("logoutAdminBtn").classList.remove("hidden");
    showView("adminDashboardView");
    refreshAdminDashboard();
  } else {
    const alertEl = document.getElementById("adminLoginAlert");
    alertEl.textContent = "Invalid admin email or password.";
    alertEl.classList.remove("hidden");
  }
});

document.getElementById("logoutAdminBtn").addEventListener("click", () => {
  isAdminLoggedIn = false;
  document.getElementById("toggleAdminBtn").textContent = "Admin Login";
  document.getElementById("logoutAdminBtn").classList.add("hidden");
  resetCustomerPortal();
});

// Admin Tabs
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.remove("hidden");
  });
});

function refreshAdminDashboard() {
  renderStats();
  populateSettingsForm();
  renderCompanies(getCompanies());
  renderOffers();
  renderRedemptions();
}

// E. Stats
function renderStats() {
  const companies = getCompanies();
  const offers = getOffers();
  const redemptions = getRedemptions();
  const now = Date.now();

  document.getElementById("statCompanies").textContent = companies.length;
  document.getElementById("statRedemptions").textContent = redemptions.length;
  document.getElementById("statAmount").textContent = formatINR(
    redemptions.reduce((sum, r) => sum + Number(r.amount || 0), 0)
  );
  document.getElementById("statOffers").textContent = offers.filter((o) => o.active).length;
  document.getElementById("statExpired").textContent = redemptions.filter((r) => r.expiresAt < now).length;
}

// A. Website Settings
function populateSettingsForm() {
  const s = getSettings();
  document.getElementById("setSiteName").value = s.siteName;
  document.getElementById("setExpiryHours").value = s.linkExpiryHours;
  document.getElementById("setLogoUrl").value = s.logoUrl;
  document.getElementById("setPrimaryColor").value = s.primaryColor;
  document.getElementById("setSecondaryColor").value = s.secondaryColor;
  document.getElementById("setHeading").value = s.heading;
  document.getElementById("setWelcome").value = s.welcomeMessage;
  document.getElementById("setInstructions").value = s.instructions;
  document.getElementById("setContact").value = s.contactDetails;
  document.getElementById("setFooter").value = s.footerText;
}

document.getElementById("setLogoFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById("setLogoUrl").value = reader.result;
  };
  reader.readAsDataURL(file);
});

document.getElementById("settingsForm").addEventListener("submit", (e) => {
  e.preventDefault();
  saveSettings({
    siteName: document.getElementById("setSiteName").value.trim(),
    linkExpiryHours: Number(document.getElementById("setExpiryHours").value) || 24,
    logoUrl: document.getElementById("setLogoUrl").value.trim(),
    primaryColor: document.getElementById("setPrimaryColor").value,
    secondaryColor: document.getElementById("setSecondaryColor").value,
    heading: document.getElementById("setHeading").value.trim(),
    welcomeMessage: document.getElementById("setWelcome").value.trim(),
    instructions: document.getElementById("setInstructions").value.trim(),
    contactDetails: document.getElementById("setContact").value.trim(),
    footerText: document.getElementById("setFooter").value.trim()
  });

  applyBranding();
  const alertEl = document.getElementById("settingsAlert");
  alertEl.textContent = "Website settings saved and updated live across the site!";
  alertEl.classList.remove("hidden");
  setTimeout(() => alertEl.classList.add("hidden"), 3000);
});

// B. Company Management
function renderCompanies(list) {
  const tbody = document.getElementById("companiesTableBody");
  tbody.innerHTML = list.map((c) => `
    <tr>
      <td>${escapeHtml(c.companyName)}</td>
      <td>${escapeHtml(c.mobile)}</td>
      <td><code>${escapeHtml(c.gst)}</code></td>
      <td>
        <button class="btn btn-sm btn-outline edit-comp" data-gst="${escapeHtml(c.gst)}">Edit</button>
        <button class="btn btn-sm btn-danger del-comp" data-gst="${escapeHtml(c.gst)}">Delete</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll(".edit-comp").forEach((btn) => {
    btn.onclick = () => {
      const c = getCompanies().find((x) => x.gst === btn.dataset.gst);
      if (!c) return;
      document.getElementById("compName").value = c.companyName;
      document.getElementById("compMobile").value = c.mobile;
      document.getElementById("compGst").value = c.gst;
    };
  });

  tbody.querySelectorAll(".del-comp").forEach((btn) => {
    btn.onclick = () => {
      if (!confirm("Delete this company?")) return;
      saveCompanies(getCompanies().filter((x) => x.gst !== btn.dataset.gst));
      refreshAdminDashboard();
    };
  });
}

document.getElementById("companyForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const companyName = document.getElementById("compName").value.trim();
  const mobile = document.getElementById("compMobile").value.trim();
  const gst = normalizeGst(document.getElementById("compGst").value);

  const list = getCompanies().filter((c) => normalizeGst(c.gst) !== gst);
  list.push({ companyName, mobile, gst });
  saveCompanies(list);
  e.target.reset();
  refreshAdminDashboard();
});

document.getElementById("companySearch").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  renderCompanies(
    getCompanies().filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        c.gst.toLowerCase().includes(q) ||
        c.mobile.includes(q)
    )
  );
});

document.getElementById("csvUploadBtn").addEventListener("click", async () => {
  const file = document.getElementById("csvUploadInput").files[0];
  if (!file) return alert("Select a CSV file first.");

  const text = await file.text();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const map = new Map(getCompanies().map((c) => [normalizeGst(c.gst), c]));
  let count = 0;

  lines.forEach((line, idx) => {
    const parts = line.split(",").map((p) => p.replace(/^"|"$/g, "").trim());
    if (parts.length < 3) return;
    if (idx === 0 && parts[2].toLowerCase().includes("gst")) return;
    const gst = normalizeGst(parts[2]);
    map.set(gst, { companyName: parts[0], mobile: parts[1], gst });
    count++;
  });

  saveCompanies(Array.from(map.values()));
  alert(`Imported ${count} company records.`);
  document.getElementById("csvUploadInput").value = "";
  refreshAdminDashboard();
});

// C. Cashback Offers Management
function renderOffers() {
  const tbody = document.getElementById("offersTableBody");
  tbody.innerHTML = getOffers().map((o) => `
    <tr>
      <td><strong>${escapeHtml(o.code)}</strong></td>
      <td>${formatINR(o.amount)}</td>
      <td><span class="badge ${o.active ? "badge-active" : "badge-inactive"}">${o.active ? "Active" : "Inactive"}</span></td>
      <td>
        <button class="btn btn-sm btn-outline edit-offer" data-id="${o.id}">Edit</button>
        <button class="btn btn-sm btn-outline toggle-offer" data-id="${o.id}">${o.active ? "Deactivate" : "Activate"}</button>
        <button class="btn btn-sm btn-danger del-offer" data-id="${o.id}">Delete</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll(".edit-offer").forEach((btn) => {
    btn.onclick = () => {
      const o = getOffers().find((x) => x.id === btn.dataset.id);
      if (!o) return;
      document.getElementById("editOfferId").value = o.id;
      document.getElementById("offerCode").value = o.code;
      document.getElementById("offerAmount").value = o.amount;
      document.getElementById("offerActive").value = String(o.active);
      document.getElementById("offerFormTitle").textContent = "Edit Cashback Offer";
      document.getElementById("cancelOfferEdit").classList.remove("hidden");
    };
  });

  tbody.querySelectorAll(".toggle-offer").forEach((btn) => {
    btn.onclick = () => {
      const list = getOffers().map((o) => (o.id === btn.dataset.id ? { ...o, active: !o.active } : o));
      saveOffers(list);
      refreshAdminDashboard();
    };
  });

  tbody.querySelectorAll(".del-offer").forEach((btn) => {
    btn.onclick = () => {
      if (!confirm("Delete this cashback offer?")) return;
      saveOffers(getOffers().filter((o) => o.id !== btn.dataset.id));
      refreshAdminDashboard();
    };
  });
}

document.getElementById("cancelOfferEdit").addEventListener("click", () => {
  document.getElementById("offerForm").reset();
  document.getElementById("editOfferId").value = "";
  document.getElementById("offerFormTitle").textContent = "Create Cashback Offer";
  document.getElementById("cancelOfferEdit").classList.add("hidden");
});

document.getElementById("offerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = document.getElementById("editOfferId").value;
  const code = document.getElementById("offerCode").value.trim().toUpperCase();
  const amount = Number(document.getElementById("offerAmount").value);
  const active = document.getElementById("offerActive").value === "true";

  let list = getOffers();
  if (id) {
    list = list.map((o) => (o.id === id ? { ...o, code, amount, active } : o));
  } else {
    list.push({ id: "off_" + Date.now(), code, amount, active });
  }

  saveOffers(list);
  document.getElementById("cancelOfferEdit").click();
  refreshAdminDashboard();
});

// D. Redemptions & CSV Export
function renderRedemptions() {
  const now = Date.now();
  const tbody = document.getElementById("redemptionsTableBody");
  tbody.innerHTML = getRedemptions().map((r) => {
    const expired = r.expiresAt < now;
    return `
      <tr>
        <td>${escapeHtml(r.companyName)}</td>
        <td><code>${escapeHtml(r.gst)}</code></td>
        <td>${escapeHtml(r.code)}</td>
        <td><strong>${formatINR(r.amount)}</strong></td>
        <td><code>${escapeHtml(r.referenceId)}</code></td>
        <td>${formatDateTime(r.redeemedAt)}</td>
        <td><span class="badge ${expired ? "badge-inactive" : "badge-active"}">${expired ? "Expired" : "Active"}</span></td>
      </tr>
    `;
  }).join("");
}

document.getElementById("exportCsvBtn").addEventListener("click", () => {
  const headers = ["Company Name", "GST", "Mobile", "Code", "Amount", "Reference ID", "Redeemed At", "Link Status"];
  const now = Date.now();
  const rows = getRedemptions().map((r) => [
    r.companyName,
    r.gst,
    r.mobile,
    r.code,
    r.amount,
    r.referenceId,
    formatDateTime(r.redeemedAt),
    r.expiresAt < now ? "Expired" : "Active"
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `cashback-redemptions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
});

// ==================== BOOT APP ====================
initStorage();
applyBranding();
handleRoute();
window.addEventListener("hashchange", handleRoute);