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
      homeAria: "Accueil SnapReport",
      menuLabel: "Menu",
      navAria: "Navigation principale",
      navCompany: "Entreprise",
      navProducts: "Produits",
      navCapabilities: "Expertises",
      navTeam: "Équipe",
      navContact: "Parlons de votre projet",
      heroEyebrow: "Votre avis façonne ce que nous construisons",
      heroHeading: "Dites-nous où l’IA pourrait <em>vous simplifier la tâche</em>.",
      heroLede: "Quelques minutes pour nous dire où l’IA pourrait vous aider. Vos réponses vont directement à l’équipe produit de SnapReport.",
      heroFootTime: "Quelques minutes",
      heroFootDirect: "Directement à l’équipe",
      heroFootPrivate: "Chiffré et privé",
      sectionIndexTitle: "Votre avis",
      sectionIndexSubtitle: "Quelques minutes, directement à l’équipe",
      eyebrow: "Webinaire SnapReport - Merci d’avoir été là !",
      heading: "Parlons de vos enjeux QHSE",
      lede: "Quelques minutes pour nous dire où l\u2019IA pourrait vous aider. Vos réponses arrivent directement à l\u2019équipe produit.",
      point1t: "Quelques minutes",
      point1d: "Un court formulaire, sans inscription.",
      point2t: "Direct",
      point2d: "Vos réponses arrivent à l\u2019équipe, pas à un robot.",
      point3t: "Privé",
      point3d: "Chiffré en transit et au repos. Jamais partagé, jamais vendu.",
      cardEyebrow: "Formulaire en direct",
      labelName: "Nom et prénom",
      labelEmail: "Email professionnel",
      emailPlaceholder: "prenom@entreprise.com",
      companyLabel: "Entreprise",
      optional: "(optionnel)",
      choose: "Choisir…",
      other: "Autre",
      interestTitle: "Qu’est-ce qui vous intéresse ?",
      interestHint: "Plusieurs choix possibles. Les réponses s’affichent selon vos choix.",
      interestDemo: "Une démo de nos outils",
      interestTraining: "Une formation IA",
      interestDiagnostic: "Un diagnostic IA",
      interestProject: "Un projet IA sur mesure",
      productsTitle: "Quel(s) outil(s) voulez-vous voir ?",
      projectDetailsTitle: "Votre projet",
      projectDescription: "Décrivez le besoin en quelques lignes",
      projectPlaceholder: "Ex. : automatiser nos rapports d’audit mensuels à partir de fichiers Excel et de photos terrain.",
      projectStageTitle: "Où en êtes-vous ?",
      projectStageIdea: "Une idée",
      projectStageScoped: "Besoin cadré",
      projectStageReady: "Prêt à lancer",
      painTitle: "1. Sur quelles tâches QHSE l'IA pourrait-elle vous permettre de gagner le plus de temps",
      painRegulatory: "Veille réglementaire",
      painAudit: "Audit interne",
      painCorrective: "Gestion des non-conformités et actions correctives",
      painInspection: "Inspection QHSE",
      painAnalysis: "Analyse des données et tendances",
      painPlaceholder: "Précisez : traçabilité, HACCP, sous-traitants…",
      timelineTitle: "Quand souhaitez-vous démarrer ?",
      timelineNow: "Dès maintenant",
      timelineThreeMonths: "Dans les 3 mois",
      timelineSixMonths: "Dans 3 à 6 mois",
      timelineNotSure: "Je ne sais pas encore",
      timelineMoreInfo: "Je souhaite en savoir plus",
      contactTitle: "Comment pouvons-nous vous contacter ?",
      contactHint: "Un seul échange pour identifier vos besoins. Pas de relances automatiques.",
      questionTitle: "Une question restée sans réponse pendant le webinaire ?",
      ratingTitle: "Le webinaire vous a-t-il été utile ?",
      newsletter: "M’informer des prochains webinaires et nouveautés (1 email par mois maximum).",
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
      helpTitle: "Comment on peut vous aider ?",
      helpDemo: "Accès démo de nos outils",
      helpTraining: "Formation",
      helpReporting: "Reporting",
      helpRegulatory: "Veille réglementaire",
      aiTrainingTitle: "Intéressé par nos offres de formation diagnostique sur l'IA ?",
      aiTrainingYes: "Oui",
      aiTrainingNo: "Non",
      consent: "J\u2019accepte que SnapReport conserve ces informations pour me recontacter.",
      privacy: "Vos réponses sont chiffrées et stockées de manière sécurisée. Utilisées uniquement pour donner suite à ce webinaire — jamais partagées ni vendues.",
      submit: "Envoyer mes réponses",
      sending: "Envoi…",
      errInvalid: "Merci de vérifier vos réponses, puis de renvoyer.",
      errInterest: "Choisissez au moins une option.",
      errProducts: "Choisissez au moins un outil à découvrir.",
      errFast: "Un instant — relisez vos réponses, puis renvoyez.",
      errNetwork: "Connexion impossible. Réessayez, ou écrivez-nous : snapreportai99@gmail.com",
      errRejected: "Impossible d’enregistrer vos réponses. Réessayez, ou écrivez-nous : snapreportai99@gmail.com",
      errClosed: "Le formulaire est fermé. Écrivez-nous : snapreportai99@gmail.com",
      successBody: "Nous prendrons contact avec vous dans les plus brefs délais",
      langGroup: "Langue du formulaire / Form language"
    },
    en: {
      homeAria: "SnapReport home",
      menuLabel: "Menu",
      navAria: "Main navigation",
      navCompany: "Company",
      navProducts: "Products",
      navCapabilities: "Capabilities",
      navTeam: "Team",
      navContact: "Start a conversation",
      heroEyebrow: "Your input shapes what we build",
      heroHeading: "Tell us where AI could <em>lighten the load</em>.",
      heroLede: "A few minutes to tell us where AI could help. Your answers go straight to the SnapReport product team.",
      heroFootTime: "A few minutes",
      heroFootDirect: "Direct to the team",
      heroFootPrivate: "Encrypted & private",
      sectionIndexTitle: "Your input",
      sectionIndexSubtitle: "A few minutes, straight to the team",
      eyebrow: "SnapReport webinar — thanks for being here!",
      heading: "Let's talk about your HSEQ challenges",
      lede: "A few minutes to tell us where AI could help. Your answers go straight to the product team.",
      point1t: "A few minutes",
      point1d: "A short form, no signup.",
      point2t: "Straight",
      point2d: "Your answers reach the team itself, not a robot.",
      point3t: "Private",
      point3d: "Encrypted in transit and at rest. Never shared, never sold.",
      cardEyebrow: "Live form",
      labelName: "Full name",
      labelEmail: "Work email",
      emailPlaceholder: "you@company.com",
      companyLabel: "Company",
      optional: "(optional)",
      choose: "Choose…",
      other: "Other",
      interestTitle: "What are you interested in?",
      interestHint: "You can choose more than one. Answers appear based on your selections.",
      interestDemo: "A demo of our tools",
      interestTraining: "AI training",
      interestDiagnostic: "An AI assessment",
      interestProject: "A custom AI project",
      productsTitle: "Which tool(s) would you like to see?",
      projectDetailsTitle: "Your project",
      projectDescription: "Describe the need in a few lines",
      projectPlaceholder: "E.g. automate our monthly audit reports from Excel files and field photos.",
      projectStageTitle: "Where are you at?",
      projectStageIdea: "Just an idea",
      projectStageScoped: "Scoped need",
      projectStageReady: "Ready to start",
      painTitle: "1. Which HSEQ tasks could AI help you save the most time on?",
      painRegulatory: "Regulatory monitoring",
      painAudit: "Internal audit",
      painCorrective: "Non-conformity and corrective action management",
      painInspection: "HSEQ inspection",
      painAnalysis: "Data and trend analysis",
      painPlaceholder: "Please specify: traceability, HACCP, subcontractors…",
      timelineTitle: "When would you like to get started?",
      timelineNow: "Right now",
      timelineThreeMonths: "Within 3 months",
      timelineSixMonths: "In 3–6 months",
      timelineNotSure: "I’m not sure yet",
      timelineMoreInfo: "I’d like to know more",
      contactTitle: "How can we contact you?",
      contactHint: "One conversation to identify your needs. No automatic follow-ups.",
      questionTitle: "A question left unanswered during the webinar?",
      ratingTitle: "Was the webinar useful to you?",
      newsletter: "Let me know about upcoming webinars and news (max. 1 email per month).",
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
      helpTitle: "How can we help?",
      helpDemo: "Demo access to our tools",
      helpTraining: "Training",
      helpReporting: "Reporting",
      helpRegulatory: "Regulatory monitoring",
      aiTrainingTitle: "Interested in our AI diagnostic training offers?",
      aiTrainingYes: "Yes",
      aiTrainingNo: "No",
      consent: "I agree that SnapReport may store this to follow up with me.",
      privacy: "Your answers are encrypted and stored securely. Used only to follow up on this webinar — never shared or sold.",
      submit: "Send my answers",
      sending: "Sending…",
      errInvalid: "Please check your answers, then send again.",
      errInterest: "Please choose at least one option.",
      errProducts: "Please choose at least one tool to see.",
      errFast: "One moment — review your answers, then send again.",
      errNetwork: "Connection failed. Please retry, or email us: snapreportai99@gmail.com",
      errRejected: "We couldn’t save your answers. Please retry, or email us: snapreportai99@gmail.com",
      errClosed: "The form is closed. Write to us: snapreportai99@gmail.com",
      successBody: "We’ll be in touch as soon as possible.",
      langGroup: "Form language / Langue du formulaire"
    }
  };

  const HTML_KEYS = new Set(["heading", "heroHeading"]);
  const section = document.querySelector("#form-section");
  if (!section) return;

  const form = section.querySelector("#webinarForm");
  if (!form) return;
  const successBox = section.querySelector(".webinar-success");
  const statusEl = section.querySelector(".webinar-form__status");
  const submitBtn = form?.querySelector(".webinar-form__submit");
  const honeypot = form?.querySelector('[name="website"]');
  const langButtons = section.querySelectorAll("[data-lang-btn]");
  const openedAt = Date.now();
  const field = (name) => form.elements.namedItem(name);
  const selectedValues = (name) => Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
  let currentLang = "fr";

  // --------------------------------------------------------------------------
  // Language
  // --------------------------------------------------------------------------
  const applyLang = (lang) => {
    if (!I18N[lang]) return;
    currentLang = lang;
    document.documentElement.lang = lang;
    section.setAttribute("lang", lang);
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const value = I18N[lang][el.dataset.i18n];
      if (value == null) return;
      if (HTML_KEYS.has(el.dataset.i18n)) el.innerHTML = value;
      else el.textContent = value;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      const value = I18N[lang][el.dataset.i18nPh];
      if (value != null) el.setAttribute("placeholder", value);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
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

  const syncInterestDetails = () => {
    form.querySelectorAll('input[name="interest"][data-reveal]').forEach((input) => {
      const details = document.getElementById(input.dataset.reveal);
      if (!details) return;
      details.hidden = !input.checked;
      if (!input.checked) {
        details.querySelectorAll("input, select, textarea").forEach((control) => {
          if (control.type === "checkbox" || control.type === "radio") control.checked = false;
          else control.value = "";
        });
      }
    });
  };
  const syncPainOther = () => {
    const other = form.querySelector("#painOther");
    const text = form.querySelector("#painOtherText");
    text.hidden = !other.checked;
    if (!other.checked) text.value = "";
  };
  form.addEventListener("change", () => {
    syncInterestDetails();
    syncPainOther();
  });
  syncInterestDetails();
  syncPainOther();

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
    const interests = selectedValues("interest");
    if (!interests.length) {
      setStatus(I18N[currentLang].errInterest, true);
      form.querySelector('[data-req="interest"]').scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (interests.includes("demo") && !selectedValues("products").length) {
      setStatus(I18N[currentLang].errProducts, true);
      document.getElementById("demoDetails").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!form.reportValidity()) return;

    const fillMs = Date.now() - openedAt;
    if (fillMs < MIN_FILL_MS) { setStatus(I18N[currentLang].errFast, true); return; }

    const answers = {};
    new FormData(form).forEach((value, key) => {
      if (["website", "source", "lang", "submitted_at", "consent"].includes(key)) return;
      answers[key] = key in answers ? [].concat(answers[key], value) : value;
    });
    ["interest", "products", "pain_points"].forEach((key) => {
      if (!Array.isArray(answers[key])) answers[key] = answers[key] ? [answers[key]] : [];
    });
    answers.consent = field("consent").checked;
    answers.newsletter = field("newsletter").checked;

    const helpMap = { demo: "demo", formation: "training" };
    const timingMap = { maintenant: "now", "3mois": "three_months", "6mois": "quarter", pas_encore: "exploring", plus_info: "exploring" };
    const notes = [
      answers.project_description && `Projet : ${answers.project_description}`,
      answers.question && `Question : ${answers.question}`,
      answers.pain_other && `Autre besoin : ${answers.pain_other}`
    ].filter(Boolean).join("\n\n").slice(0, 1000);
    const payload = {
      full_name: field("name").value,
      email: field("email").value,
      company: field("company").value,
      needs: [],
      help: interests.map((value) => helpMap[value]).filter(Boolean),
      ai_training: null,
      pace: timingMap[field("timing").value] || null,
      notes,
      lang: currentLang,
      website: honeypot ? honeypot.value : "",
      fill_ms: fillMs,
      consent: field("consent").checked,
      form_data: answers
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
        body: JSON.stringify({ payload })
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
      showSuccess();
      section.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (result && result.error === "rejected") {
      setStatus(I18N[currentLang].errRejected, true);
      return;
    }
    setStatus(I18N[currentLang].errInvalid, true);
  });
})();
