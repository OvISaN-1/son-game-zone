/* ============================================================
   George's Game Zone — shared stats, badges, streaks & nicknames
   Loaded by index.html, football-quiz.html, geography-quiz.html
   and mountain-quiz.html. Everything is stored in this browser
   only (localStorage) — same as the "scores save on this device
   only" note next to the leaderboard.
   ============================================================ */
(function (GZ) {
  const KEY = "gamezone_stats_v1";
  const NICKNAMES = ["ClawsTiger", "MiniDragon", "GeoSon"];

  const BADGES = [
    { id: "first-whistle",     emoji: "🎮", name: "First Whistle",   desc: "Play your very first quiz" },
    { id: "globe-trotter",     emoji: "🌍", name: "Globe Trotter",   desc: "Finish a round of Capital Quest" },
    { id: "peak-bagger",       emoji: "🏔️", name: "Peak Bagger",     desc: "Finish a round of Peak Challenge" },
    { id: "forest-frenzy",     emoji: "🌳", name: "Tricky Trees",    desc: "Finish a round of Football Frenzy" },
    { id: "perfect-round",     emoji: "💯", name: "Perfect Round",   desc: "Get every question right in one round" },
    { id: "quickfire-king",    emoji: "⚡", name: "Quickfire King",  desc: "Score 15 or more correct in one round" },
    { id: "three-day-streak",  emoji: "🔥", name: "On Fire",         desc: "Play on 3 days in a row" },
    { id: "all-rounder",       emoji: "🌟", name: "All-Rounder",     desc: "Play all three games at least once" },
    { id: "keepy-uppy-king",   emoji: "🤹", name: "Keepy-Uppy King", desc: "Get 25 keepy-uppies in one go" },
  ];

  function defaultStats() {
    return {
      gamesPlayed: { "football-frenzy": 0, "capital-quest": 0, "mountain-peaks": 0 },
      bestScore:   { "football-frenzy": 0, "capital-quest": 0, "mountain-peaks": 0 },
      keepyUppyBest: 0,
      badges: [],
      streak: 0,
      lastPlayed: null,
      totalGames: 0
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultStats();
      const parsed = JSON.parse(raw);
      const merged = Object.assign(defaultStats(), parsed);
      merged.gamesPlayed = Object.assign(defaultStats().gamesPlayed, parsed.gamesPlayed || {});
      merged.bestScore = Object.assign(defaultStats().bestScore, parsed.bestScore || {});
      return merged;
    } catch (e) {
      return defaultStats();
    }
  }

  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
  }

  function midnight(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function updateStreak(s) {
    const today = midnight(new Date());
    if (!s.lastPlayed) {
      s.streak = 1;
    } else {
      const last = midnight(new Date(s.lastPlayed));
      const diffDays = Math.round((today - last) / 86400000);
      if (diffDays === 0) {
        // already played today — streak unchanged
      } else if (diffDays === 1) {
        s.streak = (s.streak || 0) + 1;
      } else {
        s.streak = 1;
      }
    }
    s.lastPlayed = today.toISOString();
  }

  function recordResult(gameId, correctCount, totalAnswered) {
    const s = load();
    s.gamesPlayed[gameId] = (s.gamesPlayed[gameId] || 0) + 1;
    s.totalGames = (s.totalGames || 0) + 1;
    if (correctCount > (s.bestScore[gameId] || 0)) s.bestScore[gameId] = correctCount;
    updateStreak(s);

    const newlyAwarded = [];
    function award(id) {
      if (!s.badges.includes(id)) {
        s.badges.push(id);
        newlyAwarded.push(id);
      }
    }
    award("first-whistle");
    if (gameId === "capital-quest") award("globe-trotter");
    if (gameId === "mountain-peaks") award("peak-bagger");
    if (gameId === "football-frenzy") award("forest-frenzy");
    if (totalAnswered >= 5 && correctCount === totalAnswered) award("perfect-round");
    if (correctCount >= 15) award("quickfire-king");
    if ((s.streak || 0) >= 3) award("three-day-streak");
    if (s.gamesPlayed["capital-quest"] > 0 && s.gamesPlayed["mountain-peaks"] > 0 && s.gamesPlayed["football-frenzy"] > 0) {
      award("all-rounder");
    }

    save(s);
    return {
      stats: s,
      newBadges: newlyAwarded.map(id => BADGES.find(b => b.id === id)).filter(Boolean)
    };
  }

  function recordKeepyUppy(score) {
    const s = load();
    const isNewBest = score > (s.keepyUppyBest || 0);
    if (isNewBest) s.keepyUppyBest = score;

    const newlyAwarded = [];
    function award(id) {
      if (!s.badges.includes(id)) {
        s.badges.push(id);
        newlyAwarded.push(id);
      }
    }
    if (score >= 25) award("keepy-uppy-king");

    save(s);
    return {
      stats: s,
      isNewBest,
      newBadges: newlyAwarded.map(id => BADGES.find(b => b.id === id)).filter(Boolean)
    };
  }

  function randomNickname() {
    return NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)];
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  function showToast(text) {
    let toast = document.getElementById("gz-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "gz-toast";
      toast.className = "gz-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.remove("show");
    void toast.offsetWidth; // restart animation
    toast.classList.add("show");
    clearTimeout(toast._gzTimer);
    toast._gzTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function announceBadges(newBadges) {
    (newBadges || []).forEach((b, i) => {
      setTimeout(() => showToast(`${b.emoji} New badge unlocked: ${b.name}!`), i * 3200 + 400);
    });
  }

  function renderCategoryChart(container, breakdown) {
    if (!container) return;
    const entries = Object.entries(breakdown || {}).sort((a, b) => b[1].total - a[1].total);
    if (entries.length === 0) {
      container.innerHTML = "";
      return;
    }
    let html = '<div class="gz-chart">';
    entries.forEach(([cat, v]) => {
      const pct = v.total ? Math.round((v.correct / v.total) * 100) : 0;
      html += `
        <div class="gz-chart-row">
          <div class="gz-chart-label">${escapeHtml(cat)}</div>
          <div class="gz-chart-track"><div class="gz-chart-fill" style="width:${pct}%"></div></div>
          <div class="gz-chart-value">${v.correct}/${v.total}</div>
        </div>`;
    });
    html += "</div>";
    container.innerHTML = html;
  }

  function renderBadgesGrid(container) {
    if (!container) return;
    const s = load();
    let html = "";
    BADGES.forEach(b => {
      const earned = s.badges.includes(b.id);
      html += `
        <div class="gz-badge ${earned ? "earned" : "locked"}" title="${escapeHtml(b.desc)}">
          <div class="gz-badge-emoji">${earned ? b.emoji : "🔒"}</div>
          <div class="gz-badge-name">${escapeHtml(b.name)}</div>
        </div>`;
    });
    container.innerHTML = html;
  }

  function renderBestScores(container) {
    if (!container) return;
    const s = load();
    const games = [
      { id: "football-frenzy", label: "Football Frenzy", emoji: "⚽" },
      { id: "capital-quest", label: "Capital Quest", emoji: "🌍" },
      { id: "mountain-peaks", label: "Peak Challenge", emoji: "🏔️" }
    ];
    const scale = 30; // nominal "great score" ceiling for the bar fill
    let html = '<div class="gz-chart">';
    games.forEach(g => {
      const best = s.bestScore[g.id] || 0;
      const pct = Math.max(best > 0 ? 6 : 0, Math.min(100, Math.round((best / scale) * 100)));
      html += `
        <div class="gz-chart-row">
          <div class="gz-chart-label">${g.emoji} ${escapeHtml(g.label)}</div>
          <div class="gz-chart-track"><div class="gz-chart-fill" style="width:${pct}%"></div></div>
          <div class="gz-chart-value">${best}</div>
        </div>`;
    });
    html += "</div>";
    container.innerHTML = html;
  }

  function renderStreak(container) {
    if (!container) return;
    const s = load();
    const streak = s.streak || 0;
    container.innerHTML = streak > 0
      ? `<span class="gz-flame">🔥</span> <strong>${streak}</strong> day${streak === 1 ? "" : "s"} in a row`
      : `Play today to start a streak! 🔥`;
  }

  GZ.load = load;
  GZ.recordResult = recordResult;
  GZ.recordKeepyUppy = recordKeepyUppy;
  GZ.randomNickname = randomNickname;
  GZ.showToast = showToast;
  GZ.announceBadges = announceBadges;
  GZ.renderCategoryChart = renderCategoryChart;
  GZ.renderBadgesGrid = renderBadgesGrid;
  GZ.renderBestScores = renderBestScores;
  GZ.renderStreak = renderStreak;
  GZ.BADGES = BADGES;
  GZ.NICKNAMES = NICKNAMES;
})(window.GZ = window.GZ || {});
