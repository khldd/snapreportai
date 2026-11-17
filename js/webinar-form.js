(() => {
  "use strict";

  // ==========================================================================
  // CONFIG — paste your Supabase project values here (Settings → API).
  // The anon key is designed to be public. NEVER put the service_role key here.
  // ==========================================================================
  const SUPABASE_URL = "https://hqvhfttqkxrahfbgqdxa.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_aUAvE8Y7lNshFi2O6gVDDw_47d6HxYC";
  // ==========================================================================

  const MIN_FILL_MS = 3000;
  const LANG_KEY = "snapreport-lang";

  if (SUPABASE_URL.includes("REPLACE")) {
    console.warn("[webinar-form] Supabase config not set yet — form will render but submissions will fail.");
  }

  const I18N = {
    fr: {
      eyebrow: "Webinaire en direct / Votre avis compte",
      heading: 'Dites-nous où l\u2019IA vous <em>allégerait</em>.',
      lede: "Deux minutes, six questions. Vos réponses arrivent directement à l\u2019équipe produit — elles décident de ce que nous construisons ensuite.",
      point1t: "2 minutes",
      point1d: "Chronométré honnêtement : six questions, aucune inscription.",
      point2t: "Direct",
      point2d: "Vos réponses arrivent à l\u2019équipe, pas à un robot.",
      point3t: "Privé",
      point3d: "Chiffré en transit et au repos. Jamais partagé, jamais vendu.",
      cardEyebrow: "Formulaire en direct",
      labelName: "Nom et prénom",
      labelEmail: "Email professionnel",
      emailPlaceholder: "prenom@entreprise.com",
      labelCompany: "Entreprise",
      labelRole: "Votre rôle",
      optional: "(optionnel)",
      rolePlaceholder: "Choisir…",
      roleDirection: "Direction / Fondateur",
      roleOperations: "Opérations",
      roleQuality: "Qualité / Réglementaire",
      roleSales: "Ventes / Marketing",
      roleIT: "IT / Digital",
      roleOther: "Autre",
      labelSector: "Votre secteur",
      sectorPlaceholder: "Choisir…",
      sectorAgro: "Agroalimentaire",
      sectorIndustry: "Industrie",
      sectorDistribution: "Distribution / Retail",
      sectorServices: "Services",
      sectorTech: "Tech / Numérique",
      sectorHealth: "Santé",
      sectorOther: "Autre",
      needsTitle: "Si l\u2019IA pouvait vous alléger dès demain, ce serait sur quoi ?",
      needReports: "Rapports & administratif",
      needQuality: "Docs qualité & conformité",
      needClients: "Réponses aux clients",
      needData: "Analyse de données",
      needProduction: "Planification production",
      needMarketing: "Contenus marketing",
      needForecasts: "Prévisions & budgets",
      needOther: "Autre",
      notesLabel: "Quelque chose à préciser ?",
      notesPlaceholder: "Ex. : nos rapports d\u2019audit prennent trop de temps…",
      paceTitle: "À quel rythme ?",
      paceExploring: "J\u2019explore",
      paceThreeMonths: "Sous 3 mois",
      paceQuarter: "Ce trimestre",
      paceNow: "Maintenant",
      consent: "J\u2019accepte que SnapReport conserve ces informations pour me recontacter.",
      privacy: "Vos réponses sont chiffrées et stockées de manière sécurisée. Utilisées uniquement pour donner suite à ce webinaire — jamais partagées ni vendues.",
      submit: "Envoyer mes réponses",
      sending: "Envoi…",
      errInvalid: "Merci de vérifier vos réponses, puis de renvoyer.",
      errFast: "Un instant — relisez vos réponses, puis renvoyez.",
      errNetwork: "Connexion impossible. Réessayez, ou écrivez-nous : snapreportai99@gmail.com",
      errClosed: "Le formulaire est fermé. Écrivez-nous : snapreportai99@gmail.com",
      successTitle: "Bien reçu. Merci !",
      successBody: "Vos réponses sont arrivées directement à l\u2019équipe SnapReport. On vous recontacte très vite — et si le sujet est urgent, écrivez à snapreportai99@gmail.com.",
      successMeta: "Réponse enregistrée de manière sécurisée",
      langGroup: "Langue du formulaire / Form language"
    },
    en: {
      eyebrow: "Live webinar / Your input counts",
      heading: 'Tell us where AI should <em>lighten the load</em>.',
      lede: "Two minutes, six questions. Your answers go straight to the product team — they decide what we build next.",
      point1t: "2 minutes",
      point1d: "Honestly timed: six questions, no signup.",
      point2t: "Straight",
      point2d: "Your answers reach the team itself, not a robot.",
      point3t: "Private",
      point3d: "Encrypted in transit and at rest. Never shared, never sold.",
      cardEyebrow: "Live form",
      labelName: "Full name",
      labelEmail: "Work email",
      emailPlaceholder: "you@company.com",
      labelCompany: "Company",
      labelRole: "Your role",
      optional: "(optional)",
      rolePlaceholder: "Select…",
      roleDirection: "Founder / Leadership",
      roleOperations: "Operations",
      roleQuality: "Quality / Regulatory",
      roleSales: "Sales / Marketing",
      roleIT: "IT / Digital",
      roleOther: "Other",
      labelSector: "Your sector",
      sectorPlaceholder: "Select…",
      sectorAgro: "Food & agriculture",
      sectorIndustry: "Manufacturing",
      sectorDistribution: "Distribution / Retail",
      sectorServices: "Services",
      sectorTech: "Tech / Digital",
      sectorHealth: "Healthcare",
      sectorOther: "Other",
      needsTitle: "If AI could take work off your plate tomorrow, where would it help first?",
      needReports: "Reports & admin",
      needQuality: "Quality & compliance docs",
      needClients: "Customer replies",
      needData: "Data analysis",
      needProduction: "Production planning",
      needMarketing: "Marketing content",
      needForecasts: "Forecasts & budgets",
      needOther: "Something else",
      notesLabel: "Anything to add?",
      notesPlaceholder: "e.g. audit reports take us too long…",
      paceTitle: "How soon?",
      paceExploring: "Just exploring",
      paceThreeMonths: "Within 3 months",
      paceQuarter: "This quarter",
      paceNow: "Right now",
      consent: "I agree that SnapReport may store this to follow up with me.",
      privacy: "Your answers are encrypted and stored securely. Used only to follow up on this webinar — never shared or sold.",
      submit: "Send my answers",
      sending: "Sending…",
      errInvalid: "Please check your answers, then send again.",
      errFast: "One moment — review your answers, then send again.",
      errNetwork: "Connection failed. Please retry, or email us: snapreportai99@gmail.com",
      errClosed: "The form is closed. Write to us: snapreportai99@gmail.com",
      successTitle: "Got it. Thank you!",
      successBody: "Your answers went straight to the SnapReport team. We\u2019ll get back to you soon — and if it\u2019s urgent, write to snapreportai99@gmail.com.",
      successMeta: "Answer stored securely",
      langGroup: "Form language / Langue du formulaire"
    }
  };

  const HTML_KEYS = new Set(["heading"]);
  const section = document.querySelector("#ai-input");
  if (!section) return;

  const form = section.querySelector("#webinarForm");
  const successBox = section.querySelector(".webinar-success");
  const statusEl = section.querySelector(".webinar-form__status");
  const submitBtn = form?.querySelector(".webinar-form__submit");
  const honeypot = form?.querySelector('[name="website"]');
  const langButtons = section.querySelectorAll("[data-lang-btn]");
  const openedAt = Date.now();
  let currentLang = "fr";

  // --------------------------------------------------------------------------
  // Language
  // --------------------------------------------------------------------------
  const applyLang = (lang) => {
    if (!I18N[lang]) return;
    currentLang = lang;
    section.setAttribute("lang", lang);
    section.querySelectorAll("[data-i18n]").forEach((el) => {
      const value = I18N[lang][el.dataset.i18n];
      if (value == null) return;
      if (HTML_KEYS.has(el.dataset.i18n)) el.innerHTML = value;
      else el.textContent = value;
    });
    section.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      const value = I18N[lang][el.dataset.i18nPh];
      if (value != null) el.setAttribute("placeholder", value);
    });
    section.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const value = I18N[lang][el.dataset.i18nAria];
      if (value != null) el.setAttribute("aria-label", value);
    });
    langButtons.forEach((btn) => {
      const active = btn.dataset.langBtn === lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    try { window.localStorage.setItem(LANG_KEY, lang); } catch { /* private mode */ }
    if (statusEl && statusEl.textContent) statusEl.textContent = "";
  };

  langButtons.forEach((btn) => btn.addEventListener("click", () => applyLang(btn.dataset.langBtn)));

  let stored = null;
  try { stored = window.localStorage.getItem(LANG_KEY); } catch { /* private mode */ }
  applyLang(stored === "en" ? "en" : "fr");

  // --------------------------------------------------------------------------
  // Kill switch — the server is the real gate; this just keeps the page in sync.
  // Network errors intentionally keep the form visible: a flaky connection
  // should never blank the section during the live webinar.
  // --------------------------------------------------------------------------
  const disableForm = () => {
    section.hidden = true;
    document.querySelectorAll("[data-webinar-nav]").forEach((el) => { el.hidden = true; });
  };

  const checkFormEnabled = async () => {
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/webinar_form_enabled`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        },
        body: "{}",
        signal: controller.signal
      });
      window.clearTimeout(timer);
      if (response.ok) {
        const enabled = await response.json();
        if (enabled === false) disableForm();
      }
    } catch { /* keep the form; submissions stay gated server-side */ }
  };
  checkFormEnabled();

  // --------------------------------------------------------------------------
  // Submission
  // --------------------------------------------------------------------------
  const setStatus = (message, isError) => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.toggle("is-error", Boolean(isError));
  };

  const showSuccess = () => {
    if (!form || !successBox) return;
    form.hidden = true;
    successBox.hidden = false;
    setStatus("", false);
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Bots: fake success, nothing is stored, nothing is revealed.
    if (honeypot && honeypot.value.trim() !== "") { showSuccess(); return; }
    if (!form.reportValidity()) return;

    const fillMs = Date.now() - openedAt;
    if (fillMs < MIN_FILL_MS) { setStatus(I18N[currentLang].errFast, true); return; }

    const needs = Array.from(form.querySelectorAll('input[name="needs"]:checked')).map((input) => input.value);
    const paceInput = form.querySelector('input[name="pace"]:checked');
    const payload = {
      full_name: form.elements.fullName?.value ?? "",
      email: form.elements.email?.value ?? "",
      company: form.elements.company?.value ?? "",
      role: form.elements.role?.value || null,
      sector: form.elements.sector?.value || null,
      needs,
      pace: paceInput ? paceInput.value : null,
      notes: form.elements.notes?.value ?? "",
      lang: currentLang,
      website: honeypot ? honeypot.value : "",
      fill_ms: fillMs,
      consent: form.elements.consent?.checked === true
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      const label = submitBtn.querySelector("[data-i18n]");
      if (label) label.textContent = I18N[currentLang].sending;
    }
    setStatus("", false);

    let result = null;
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_webinar_lead`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      result = await response.json();
    } catch {
      if (submitBtn) submitBtn.disabled = false;
      const label = submitBtn?.querySelector("[data-i18n]");
      if (label) label.textContent = I18N[currentLang].submit;
      setStatus(I18N[currentLang].errNetwork, true);
      return;
    }

    if (submitBtn) submitBtn.disabled = false;
    const label = submitBtn?.querySelector("[data-i18n]");
    if (label) label.textContent = I18N[currentLang].submit;

    if (result && result.ok) {
      showSuccess();
      section.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (result && result.error === "disabled") {
      setStatus(I18N[currentLang].errClosed, true);
      return;
    }
    if (result && result.error === "rate_limited") {
      setStatus(I18N[currentLang].successBody, true);
      showSuccess();
      return;
    }
    setStatus(I18N[currentLang].errInvalid, true);
  });
})();
