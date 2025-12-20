// script.js — UI only (Flask compatible)

// helpers
const $ = (id) => document.getElementById(id);

function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// mock data (replace with Flask API later)
function mockRecommendations(item, min, max) {
  const base = min || 100;

  return {
    results: [
      {
        rank: 1,
        name: `Premium ${item}`,
        price: `$${base}`,
        score: 94,
        description: "High quality build with excellent long-term value.",
        reason: "Best overall balance of quality, durability, and features."
      },
      {
        rank: 2,
        name: `Standard ${item}`,
        price: `$${Math.floor(base * 0.7)}`,
        score: 88,
        description: "Reliable option that meets most user needs.",
        reason: "Great value without unnecessary premium features."
      },
      {
        rank: 3,
        name: `Budget ${item}`,
        price: `$${Math.floor(base * 0.5)}`,
        score: 81,
        description: "Basic functionality at the lowest price.",
        reason: "Best choice if cost is the top priority."
      }
    ],
    reasoning: {
      condition: "If subscription models were acceptable",
      alternative: `${item} Pro Subscription`,
      explanation:
        "A subscription plan could offer continuous upgrades, but one-time purchases better fit your constraints."
    }
  };
}

// render UI
function renderResults(data) {
  const list = $("recommendationList");
  list.innerHTML = "";

  data.results.forEach((item) => {
    const card = document.createElement("div");
    card.className = `rec-card rank-${item.rank}`;

    card.innerHTML = `
      <div class="rec-header">
        <span class="rank-badge">${item.rank === 1 ? "★" : `#${item.rank}`}</span>
        <div>
          <h3>${escapeHTML(item.name)}</h3>
          <p class="price">${escapeHTML(item.price)}</p>
        </div>
        <span class="score">${item.score}%</span>
      </div>

      <div class="score-bar">
        <div class="score-fill" style="width:0%"></div>
      </div>

      <p class="desc">${escapeHTML(item.description)}</p>

      <div class="reason">
        <strong>Why this option:</strong>
        <p>${escapeHTML(item.reason)}</p>
      </div>
    `;

    list.appendChild(card);

    // animate score bar
    requestAnimationFrame(() => {
      card.querySelector(".score-fill").style.width = `${item.score}%`;
    });
  });

  // AI reasoning
  $("aiReasoning").innerHTML = `
    <p><strong>${data.reasoning.condition}:</strong></p>
    <p>${escapeHTML(data.reasoning.explanation)}</p>
    <p><em>Alternative:</em> ${escapeHTML(data.reasoning.alternative)}</p>
  `;

  $("results").style.display = "block";
}

// search handler
function handleSearch() {
  const item = $("itemInput").value.trim();
  if (!item) {
    $("itemInput").focus();
    return;
  }

  const min = Number($("minPrice").value);
  const max = Number($("maxPrice").value);

  const data = mockRecommendations(item, min, max);
  renderResults(data);
}

// setup
document.addEventListener("DOMContentLoaded", () => {
  $("searchBtn").addEventListener("click", handleSearch);

  ["itemInput", "minPrice", "maxPrice"].forEach((id) => {
    $(id).addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSearch();
    });
  });
});
