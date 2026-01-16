// script.js — wires UI to Flask /find endpoint using ChatGPT-backed search

const $ = (id) => document.getElementById(id);

const els = {
  item: $("itemName"),
  min: $("minPrice"),
  max: $("maxPrice"),
  button: $("searchBtn"),
  status: $("status"),
  resultsSection: $("results"),
  meta: $("resultMeta"),
  list: $("recommendationList"),
  reasoning: $("cfReasoning"),
  alternative: $("cfAlternative"),
  year: $("year"),
  reasoningInput: document.getElementById("preferences")
};

function escapeHTML(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function stripUrls(str) {
  if (!str) return str;
  // Remove URLs from text
  return String(str).replace(/https?:\/\/[^\s]+/gi, '').trim();
}

function formatPrice(value, currency = "USD") {
  if (value === null || value === undefined || value === "") return "Price unavailable";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(num);
  } catch (_err) {
    return `$${num.toFixed(2)}`;
  }
}

function setStatus(message, tone = "info") {
  if (!els.status) return;
  els.status.textContent = message || "";
  els.status.style.color =
    tone === "error" ? "#b91c1c" : tone === "muted" ? "rgba(15,23,42,.6)" : "inherit";
}

function toggleLoading(isLoading) {
  if (!els.button) return;
  els.button.disabled = isLoading;
  els.button.classList.toggle("btn--loading", isLoading);
}

function renderResults(payload) {
  const results = Array.isArray(payload.results) ? payload.results : [];
  els.list.innerHTML = "";

  if (!results.length) {
    els.resultsSection.classList.remove("hidden");
    els.resultsSection.hidden = false;
    els.meta.textContent = "0 results";
    setStatus("No results found. Try a different query.", "muted");
    els.reasoning.textContent = "";
    els.alternative.textContent = "";
    return;
  }

  results.forEach((item, idx) => {
    const card = document.createElement("article");
    card.className = `rec ${idx === 0 ? "rec--top" : ""}`.trim();

    const rankClass = idx + 1 <= 3 ? `rank--${idx + 1}` : "";
    const priceLabel = formatPrice(item.price, item.currency);
    const score = item.rating ? Math.round(Number(item.rating)) : 90 - idx * 5;

    card.innerHTML = `
      <div class="rec__top">
        <div class="rec__left">
          <div class="rank ${rankClass}">${idx + 1}</div>
          <div>
            <h3 class="rec__name">${escapeHTML(item.title || item.name || payload.item || "")}</h3>
            <div class="rec__price">${escapeHTML(priceLabel)}</div>
          </div>
        </div>
        ${item.url ? `<a class="linkBtn" href="${escapeHTML(item.url)}" target="_blank" rel="noopener">
          View
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M15 3h6v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>` : ""}
      </div>

      <div class="score">
        <div class="score__row">
          <div class="score__label">
            <svg viewBox="0 0 24 24" fill="none"><path d="M5 12l3 3 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Quality Score
          </div>
          <div class="score__pct">${score}%</div>
        </div>
        <div class="bar"><div style="width:0%; background: var(--good);"></div></div>
      </div>

      <p class="rec__desc">${escapeHTML(stripUrls(item.summary || item.description) || "No description provided yet.")}</p>
      <div class="rationale">
        <h4>Reasoning</h4>
        <p>${escapeHTML(stripUrls(item.reason) || "Top picks surfaced by the AI based on your filters.")}</p>
      </div>
    `;

    els.list.appendChild(card);

    // animate score bar fill
    requestAnimationFrame(() => {
      const barFill = card.querySelector(".bar > div");
      if (barFill) barFill.style.width = `${Math.max(0, Math.min(score, 100))}%`;
    });
  });

  const metaText = `${results.length} result${results.length === 1 ? "" : "s"}`;
  els.meta.textContent = payload.source ? `${metaText} · ${payload.source}` : metaText;

  els.reasoning.textContent =
    stripUrls(results[0]?.reason || payload.reasoning) || "AI explanation will appear once results load.";
  els.alternative.textContent =
    results[0]?.title || payload.item || "Another option will appear here.";

  els.resultsSection.classList.remove("hidden");
  els.resultsSection.hidden = false;
  setStatus("");

  // Show hint to use chat assistant
  chatState.currentItem = results[0]?.title || payload.item;
  showChatHint();
}

function getNumberValue(input) {
  const value = input?.value?.trim();
  if (!value) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

async function handleSearch() {
  const query = els.item.value.trim();
  if (!query) {
    setStatus("Please enter an item to search for.", "error");
    els.item.focus();
    return;
  }

  const payload = {
    query,
    min_price: getNumberValue(els.min),
    max_price: getNumberValue(els.max),
    reasoning: els.reasoningInput?.value?.trim() || null
  };

  setStatus("Searching...", "muted");
  toggleLoading(true);

  try {
    const res = await fetch("/find", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      setStatus(data.error || "Search failed. Try again.", "error");
      return;
    }

    renderResults(data);
  } catch (err) {
    console.error(err);
    setStatus("Unable to search right now. Please try again in a moment.", "error");
  } finally {
    toggleLoading(false);
  }
}

const chatEls = {
  box: document.getElementById("chatbox"),
  fab: document.getElementById("chatFab"),
  log: document.getElementById("chatLog"),
  text: document.getElementById("chatText"),
  send: document.getElementById("chatSend"),
  context: document.getElementById("chatContext"),
  hint: document.getElementById("chatHint"),
  hintClose: document.querySelector(".chat-hint__close"),
};

const chatState = {
  history: [],
  currentItem: null,
  sending: false,
  hintDismissed: false,
};

function showChatHint() {
  if (chatState.hintDismissed || !chatEls.hint) return;
  setTimeout(() => {
    chatEls.hint.classList.add("show");
  }, 800);
}

function hideChatHint() {
  if (!chatEls.hint) return;
  chatEls.hint.classList.remove("show");
}

function dismissChatHint() {
  chatState.hintDismissed = true;
  hideChatHint();
}

function toggleChat() {
  if (!chatEls.box) return;
  const isOpen = chatEls.box.classList.contains("open");
  chatEls.box.classList.toggle("open", !isOpen);
  if (isOpen) {
    chatEls.box.hidden = true;
    chatEls.box.classList.add("hidden");
  } else {
    chatEls.box.hidden = false;
    chatEls.box.classList.remove("hidden");
    dismissChatHint();
  }
}

function appendChat(role, text) {
  if (!chatEls.log) return;
  const div = document.createElement("div");
  div.className = `chat-msg ${role}`;
  div.textContent = `${role === "user" ? "You" : "AI"}: ${text}`;
  chatEls.log.appendChild(div);
  chatEls.log.scrollTop = chatEls.log.scrollHeight;
}

async function sendChat() {
  if (chatState.sending) return;
  const content = chatEls.text?.value?.trim();
  if (!content) return;

  chatState.history.push({ role: "user", content });
  appendChat("user", content);
  chatEls.text.value = "";
  chatState.sending = true;
  chatEls.send.disabled = true;
  chatEls.send.textContent = "Sending...";

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item: chatState.currentItem,
        messages: chatState.history,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      appendChat("assistant", data.error || "Sorry, I couldn't reply.");
      return;
    }
    chatState.history.push({ role: "assistant", content: data.reply });
    appendChat("assistant", data.reply);
    if (data.item && !chatState.currentItem) chatState.currentItem = data.item;
  } catch (err) {
    console.error(err);
    appendChat("assistant", "Sorry, I couldn't reply. Try again.");
  } finally {
    chatState.sending = false;
    chatEls.send.disabled = false;
    chatEls.send.textContent = "Send";
  }
}

// Hook up events
chatEls.fab?.addEventListener("click", toggleChat);
chatEls.send?.addEventListener("click", sendChat);
chatEls.text?.addEventListener("keydown", (e) => { if (e.key === "Enter") sendChat(); });
chatEls.hintClose?.addEventListener("click", dismissChatHint);

// Optional: close on ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && chatEls.box?.classList.contains("open")) toggleChat();
});

// When you have a search result, set chatState.currentItem and optionally open chat
// Example to call in your search success handler:
// chatState.currentItem = topResultTitle;
// chatEls.context.textContent = `Discussing: ${topResultTitle}`;
// chatEls.box.hidden = false; chatEls.box.classList.add("open");


document.addEventListener("DOMContentLoaded", () => {
  if (els.year) els.year.textContent = new Date().getFullYear();

  els.button?.addEventListener("click", handleSearch);

  [els.item, els.min, els.max].forEach((input) => {
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSearch();
    });
  });
});
