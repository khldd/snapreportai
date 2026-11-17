(() => {
  "use strict";

  const SUPABASE_URL = "https://hqvhfttqkxrahfbgqdxa.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_aUAvE8Y7lNshFi2O6gVDDw_47d6HxYC";
  const PAGE_SIZE = 25;

  const loginPanel = document.querySelector("#loginPanel");
  const dashboard = document.querySelector("#dashboard");
  const loginForm = document.querySelector("#loginForm");
  const loginButton = document.querySelector("#loginButton");
  const loginMessage = document.querySelector("#loginMessage");
  const loginPassword = document.querySelector("#loginPassword");
  const signedInEmail = document.querySelector("#signedInEmail");
  const logoutButton = document.querySelector("#logoutButton");
  const searchForm = document.querySelector("#searchForm");
  const searchInput = document.querySelector("#searchInput");
  const searchButton = document.querySelector("#searchButton");
  const refreshButton = document.querySelector("#refreshButton");
  const resultsBody = document.querySelector("#resultsBody");
  const resultsSummary = document.querySelector("#resultsSummary");
  const resultsMessage = document.querySelector("#resultsMessage");
  const emptyState = document.querySelector("#emptyState");
  const previousButton = document.querySelector("#previousButton");
  const nextButton = document.querySelector("#nextButton");
  const pageSummary = document.querySelector("#pageSummary");

  let session = null;
  let offset = 0;
  let totalCount = 0;
  let loading = false;

  const setMessage = (element, message) => {
    element.textContent = message;
    element.hidden = !message;
  };

  const setBusy = (busy) => {
    loading = busy;
    searchButton.disabled = busy;
    refreshButton.disabled = busy;
    previousButton.disabled = busy || offset === 0;
    nextButton.disabled = busy || offset + PAGE_SIZE >= totalCount;
  };

  const clearSession = () => {
    session = null;
    offset = 0;
    totalCount = 0;
    searchInput.value = "";
    signedInEmail.textContent = "";
    resultsBody.replaceChildren();
    resultsSummary.textContent = "";
    pageSummary.textContent = "";
    loginPanel.hidden = false;
    dashboard.hidden = true;
  };

  const parseJson = async (response) => {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("The server returned an unexpected response.");
    }
    return response.json();
  };

  const signIn = async (email, password) => {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) throw new Error("Sign-in failed. Check your email and password.");
    const data = await parseJson(response);
    if (!data.access_token || !data.refresh_token || !data.user) {
      throw new Error("Sign-in failed. The authentication service returned an invalid session.");
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
      email: data.user.email || email
    };
  };

  const refreshSession = async () => {
    if (!session?.refreshToken) {
      session = null;
      return false;
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ refresh_token: session.refreshToken })
      });

      if (!response.ok) {
        session = null;
        return false;
      }

      const data = await parseJson(response);
      if (!data.access_token || !data.refresh_token) {
        session = null;
        return false;
      }

      session = {
        ...session,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600)
      };
      return true;
    } catch (error) {
      session = null;
      throw error;
    }
  };

  const getAccessToken = async () => {
    if (!session) throw new Error("Your session has ended. Please sign in again.");
    if (session.expiresAt < Math.floor(Date.now() / 1000) + 60) {
      const refreshed = await refreshSession();
      if (!refreshed) throw new Error("Your session has ended. Please sign in again.");
    }
    return session.accessToken;
  };

  const authorizedFetch = async (url, options) => {
    let token = await getAccessToken();
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 401 && await refreshSession()) {
      token = session.accessToken;
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`
        }
      });
    }

    return response;
  };

  const makeCell = (text, className) => {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    cell.textContent = text;
    return cell;
  };

  const prettyValue = (value) => {
    if (Array.isArray(value)) return value.map(prettyValue).join(", ");
    if (value && typeof value === "object") return JSON.stringify(value);
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (value == null || value === "") return "—";
    return String(value);
  };

  const readableInterests = (formData) => {
    const labels = {
      demo: "Product demo",
      formation: "AI training",
      diagnostic: "AI assessment",
      projet: "Custom AI project"
    };
    return (formData?.interest || []).map((value) => labels[value] || value).join(", ") || "—";
  };

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown date";
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  };

  const makeDetails = (lead) => {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const pre = document.createElement("pre");
    summary.textContent = "View answers";
    pre.textContent = JSON.stringify({
      language: lead.lang,
      interests: lead.form_data?.interest || [],
      products: lead.form_data?.products || [],
      questionnaire: lead.form_data || {},
      notes: lead.notes || ""
    }, null, 2);
    details.append(summary, pre);
    const cell = document.createElement("td");
    cell.append(details);
    return cell;
  };

  const renderLeads = (leads) => {
    const rows = leads.map((lead) => {
      const row = document.createElement("tr");
      row.append(makeCell(formatDate(lead.created_at), "received-date"));

      const personCell = document.createElement("td");
      const name = document.createElement("span");
      name.className = "person-name";
      name.textContent = lead.full_name || "—";
      const email = document.createElement("a");
      email.className = "person-email";
      email.href = `mailto:${encodeURIComponent(lead.email || "").replace(/%40/gi, "@")}`;
      email.textContent = lead.email || "—";
      personCell.append(name, email);
      row.append(personCell);

      const companyCell = document.createElement("td");
      const company = document.createElement("span");
      company.className = "company-name";
      company.textContent = lead.company || "—";
      companyCell.append(company);
      row.append(companyCell);
      row.append(makeCell(readableInterests(lead.form_data), "interest-list"));
      row.append(makeDetails(lead));
      return row;
    });

    resultsBody.replaceChildren(...rows);
    emptyState.hidden = leads.length > 0;
    const start = totalCount === 0 ? 0 : offset + 1;
    const end = Math.min(offset + leads.length, totalCount);
    resultsSummary.textContent = `${totalCount.toLocaleString()} response${totalCount === 1 ? "" : "s"}${searchInput.value.trim() ? " found" : ""}`;
    pageSummary.textContent = totalCount === 0 ? "Page 0 of 0" : `Showing ${start}–${end}`;
    previousButton.disabled = loading || offset === 0;
    nextButton.disabled = loading || offset + PAGE_SIZE >= totalCount;
  };

  const loadLeads = async () => {
    if (loading || !session) return;
    setBusy(true);
    setMessage(resultsMessage, "");
    resultsBody.replaceChildren();
    resultsSummary.textContent = "Loading responses…";
    emptyState.hidden = true;

    try {
      const response = await authorizedFetch(`${SUPABASE_URL}/rest/v1/rpc/get_webinar_leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p_limit: PAGE_SIZE,
          p_offset: offset,
          p_search: searchInput.value.trim()
        })
      });

      const data = await parseJson(response);
      if (!response.ok) {
        if (response.status === 401) {
          clearSession();
          setMessage(loginMessage, "Your session has ended. Please sign in again.");
          return;
        }
        if (response.status === 403 || data.code === "42501" || data.message === "admin_required") {
          clearSession();
          setMessage(loginMessage, "This Supabase Auth account is not authorized for the dashboard.");
          return;
        }
        throw new Error("Could not load responses. Check the dashboard setup and try again.");
      }

      const result = Array.isArray(data) ? data[0] : null;
      if (!result || !Array.isArray(result.lead_rows) || !Number.isFinite(Number(result.total_count))) {
        throw new Error("The dashboard received an invalid response from Supabase.");
      }
      totalCount = Number(result.total_count);
      renderLeads(result.lead_rows);
    } catch (error) {
      if (!session) {
        clearSession();
        setMessage(loginMessage, "Your session ended. Please sign in again.");
      } else {
        setMessage(resultsMessage, error.message || "Could not load responses. Please try again.");
        resultsSummary.textContent = "";
      }
    } finally {
      setBusy(false);
    }
  };

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (loginButton.disabled) return;
    setMessage(loginMessage, "");
    loginButton.disabled = true;
    loginButton.textContent = "Signing in…";

    try {
      const fields = new FormData(loginForm);
      session = await signIn(String(fields.get("email")).trim(), String(fields.get("password")));
      loginPassword.value = "";
      signedInEmail.textContent = session.email;
      loginPanel.hidden = true;
      dashboard.hidden = false;
      offset = 0;
      await loadLeads();
    } catch (error) {
      session = null;
      setMessage(loginMessage, error.message || "Could not sign in. Please try again.");
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Sign in";
    }
  });

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    offset = 0;
    loadLeads();
  });

  refreshButton.addEventListener("click", () => loadLeads());
  previousButton.addEventListener("click", () => {
    offset = Math.max(0, offset - PAGE_SIZE);
    loadLeads();
  });
  nextButton.addEventListener("click", () => {
    if (offset + PAGE_SIZE < totalCount) {
      offset += PAGE_SIZE;
      loadLeads();
    }
  });

  logoutButton.addEventListener("click", async () => {
    const currentSession = session;
    clearSession();
    setMessage(loginMessage, "");
    if (currentSession?.accessToken) {
      try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${currentSession.accessToken}`
          }
        });
        if (!response.ok) {
          setMessage(loginMessage, "Signed out here, but Supabase could not confirm the remote sign-out.");
        }
      } catch {
        setMessage(loginMessage, "Signed out here, but Supabase could not confirm the remote sign-out.");
      }
    }
    document.querySelector("#loginEmail").focus();
  });
})();
