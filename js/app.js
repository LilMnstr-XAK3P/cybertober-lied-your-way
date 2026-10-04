/* Cyber October — app shell (reusable every year): calendar, unlocking, lessons, XP, badges, SCORM reporting. */
(function () {
  var C = CONTENT, CFG = C.config, esc = GAMES.esc;
  var now = new Date();
  CFG.year = CFG.year || now.getFullYear();                 // the course runs in the current year's October
  (function fillTokens() {                                  // {{year}}, {{theme}}… in content text
    var TH = CFG.theme, cur = TH.year === CFG.year;
    var T = { year: CFG.year, theme: TH.name, themeBlurb: TH.blurb, themeWhy: TH.why,
      themeIntro: cur ? "This year\u2019s theme is" : "The " + TH.year + " theme was",
      themeQ: cur ? "this year\u2019s Cybersecurity Awareness Month theme" : "the " + TH.year + " Cybersecurity Awareness Month theme" };
    function walk(o) {
      for (var k in o) {
        if (typeof o[k] === "string") o[k] = o[k].replace(/\{\{(\w+)\}\}/g, function (m, t) { return t in T ? T[t] : m; });
        else if (o[k] && typeof o[k] === "object") walk(o[k]);
      }
    }
    walk(C.days); walk(C.library);
  })();
  var KEYS = ["video", "kb4", "read", "g0", "g1", "quiz"];          // fixed bit order (do not reorder: saved progress depends on it)
  var WEIGHT = { video: 2, kb4: 2.5, read: 2, g0: 3, g1: 3, quiz: 3 };
  var MAXXP = { core: 100, tabletop: 100, bonus: 50, boss: 200 };
  var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  var DAYS = C.days, BY = {}; DAYS.forEach(function (d) { BY[d.d] = d; });
  var REQUIRED = DAYS.filter(function (d) { return d.kind !== "bonus"; });
  var REQ_XP = REQUIRED.reduce(function (s, d) { return s + MAXXP[d.kind]; }, 0);

  /* ---------- state ---------- */
  var activeFilter = "all";
  var mask = {}, flags = 0;                // flags bit0 = cyber pledge taken; bits 1..6 = badge reveal shown
  function load() {
    var s = SCORM.load(); if (!s || s.indexOf("v1|") !== 0) return;
    var p = s.split("|"), m = p[1] || "";
    for (var i = 0; i < m.length; i++) mask[i + 1] = Math.max(0, B64.indexOf(m[i]));
    flags = parseInt(p[2] || "0", 36) || 0;
  }
  function serialize() { var m = ""; for (var d = 1; d <= 31; d++) m += B64[mask[d] || 0]; return "v1|" + m + "|" + flags.toString(36); }

  /* ---------- steps + points ---------- */
  function steps(day) {
    var out = [];
    if (day.video) out.push("video");
    if (day.kb4 && day.kb4.id) out.push("kb4");
    if (day.read) out.push("read");
    (day.games || []).forEach(function (g, i) { out.push("g" + i); });
    if (day.quiz) out.push("quiz");
    return out;
  }
  function points(day) {
    var st = steps(day), tot = st.reduce(function (s, k) { return s + WEIGHT[k]; }, 0), max = MAXXP[day.kind], P = {}, used = 0;
    st.forEach(function (k, i) { P[k] = i === st.length - 1 ? max - used : Math.round(max * WEIGHT[k] / tot); used += P[k]; });
    return P;
  }
  function has(d, k) { return !!((mask[d] || 0) & (1 << KEYS.indexOf(k))); }
  function dayXP(day) { var P = points(day); return steps(day).reduce(function (s, k) { return s + (has(day.d, k) ? P[k] : 0); }, 0); }
  function dayDone(day) { return steps(day).every(function (k) { return has(day.d, k); }); }

  /* ---------- dates ---------- */
  function unlocked(d) {
    if (CFG.unlockAll) return true;
    return now >= new Date(CFG.year, CFG.month, d, 0, 0, 0);
  }
  function todayNum() { return now.getFullYear() === CFG.year && now.getMonth() === CFG.month ? now.getDate() : 0; }

  /* ---------- totals + SCORM ---------- */
  function totals() {
    var req = 0, bon = 0, reqDone = 0, bonDone = 0;
    DAYS.forEach(function (d) { var x = dayXP(d); if (d.kind === "bonus") { bon += x; if (dayDone(d)) bonDone++; } else { req += x; if (dayDone(d)) reqDone++; } });
    if (flags & 1) bon += 50;
    var pct = Math.min(100, Math.round((req + bon) / REQ_XP * 100));
    return { xp: req + bon, pct: pct, reqDone: reqDone, bonDone: bonDone, passed: pct >= CFG.passPct };
  }
  function persist() { var t = totals(); SCORM.save(serialize(), t.pct, t.passed); }

  /* ---------- badges ---------- */
  function badgeGot(b) { return b.days.every(function (n) { return dayDone(BY[n]); }); }
  function checkBadges() {
    C.badges.forEach(function (b, i) {
      var bit = 1 << (i + 1);
      if (badgeGot(b) && !(flags & bit)) { flags |= bit; persist(); reveal(b); }
    });
  }
  function reveal(b) {
    var r = document.createElement("div"); r.className = "reveal"; r.setAttribute("role", "dialog"); r.setAttribute("aria-label", "Badge earned: " + b.name);
    r.innerHTML = '<div class="rc">' + (b.img ? '<img src="' + b.img + '" alt="' + esc(b.name) + ' badge">' : '<span class="reveal-icon" aria-hidden="true">' + esc(b.icon || "✦") + "</span>") + '<div><span class="tag">Badge earned</span><h3>' + esc(b.name) + "</h3><p>" + b.msg + '</p><button class="btn">Continue</button></div></div>';
    document.body.appendChild(r);
    var btn = r.querySelector("button"); btn.focus();
    function close() { r.remove(); }
    btn.onclick = close; r.onclick = function (e) { if (e.target === r) close(); };
  }

  /* ---------- dashboard ---------- */
  function wc(w) { return "var(" + C.weeks[w].c + ")"; }
  function renderAll() {
    var cal = document.getElementById("cal"), t = totals(), tn = todayNum();
    // Date positions remain fixed, including while a status filter is active.
    cal.innerHTML = "";
    var startWeekday = new Date(CFG.year, CFG.month, 1).getDay();
    var monthName = new Date(CFG.year, CFG.month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    document.getElementById("monthTitle").textContent = monthName;
    document.getElementById("calendar-legend").innerHTML = Object.keys(C.weeks).map(function (key) {
      return '<span style="--c:' + wc(key) + '"><i aria-hidden="true"></i>' + esc(C.weeks[key].n) + '</span>';
    }).join("");
    var headings = document.createElement("div"); headings.className = "calendar-weekdays"; headings.setAttribute("aria-hidden", "true");
    headings.innerHTML = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(function (name) { return "<span>" + name + "</span>"; }).join("");
    cal.appendChild(headings);
    var row = document.createElement("div"); row.className = "month-grid"; cal.appendChild(row);
    DAYS.forEach(function (day) { addDay(row, day); });
    function addDay(row, day) {
      var b = document.createElement("button"); b.type = "button";
      var lock = !unlocked(day.d), x = dayXP(day), max = MAXXP[day.kind], done = dayDone(day);
      b.className = "day " + (day.kind === "bonus" ? "bonus " : "") + (day.kind === "boss" ? "boss " : "") + (lock ? "locked " : "") + (day.d === tn ? "today " : "") + (done ? "done" : x ? "part" : "");
      b.style.setProperty("--c", wc(day.w));
      var slot = startWeekday + day.d - 1;
      b.style.gridColumn = String(slot % 7 + 1);
      b.style.gridRow = String(Math.floor(slot / 7) + 1);
      b.dataset.day = day.d;
      var kind = { core: "Lesson", bonus: "Bonus", tabletop: "Team challenge", boss: "Final quest" }[day.kind];
      var st = lock ? "🔒 Oct " + day.d : done ? "✓ Done" : x ? "In progress" : "Start";
      b.innerHTML = '<span class="wd" aria-hidden="true">' + new Date(CFG.year, CFG.month, day.d).toLocaleDateString("en-US", { weekday: "short" }) + '</span><span class="d">' + day.d + '</span><span class="kind">' + kind + '</span><span class="t">' + esc(day.title) + '</span><span class="activity-preview">' + esc(activitySummary(day)) + '</span><span class="meta"><span class="xp">' + (x ? x + "/" : "") + max + ' XP</span><span class="state">' + st + '</span></span><span class="bar"><i style="width:' + Math.round(x / max * 100) + '%"></i></span>';
      b.setAttribute("aria-label", new Date(CFG.year, CFG.month, day.d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) + ", " + kind + ": " + day.title + ". " + (lock ? "Preview available. Activities unlock October " + day.d : done ? "Complete" : x + " of " + max + " XP"));
      b.onclick = function () { openDay(day); };
      b.hidden = activeFilter === "open" ? lock || done : activeFilter === "done" ? !done : false;
      row.appendChild(b);
    }
    document.getElementById("pct").textContent = t.pct + "%";
    document.getElementById("ringlbl").setAttribute("aria-label", "Course score " + t.pct + " percent");
    document.getElementById("arc").setAttribute("stroke-dashoffset", (314.16 * (1 - t.pct / 100)).toFixed(1));
    document.getElementById("xp").textContent = t.xp.toLocaleString();
    document.getElementById("core").textContent = t.reqDone + " / " + REQUIRED.length;
    document.getElementById("bon").textContent = t.bonDone + " / " + (DAYS.length - REQUIRED.length);
    var ps = document.getElementById("passline").parentNode;
    ps.classList.toggle("passed", t.passed);
    document.getElementById("passline").textContent = t.passed ? "Passed" : CFG.passPct + "%";
    document.getElementById("passlbl").textContent = t.passed ? "You did it!" : "Score goal";
    document.getElementById("badges").innerHTML = C.badges.map(function (b) {
      var got = badgeGot(b);
      return '<button type="button" class="badge' + (got ? " got" : "") + '" style="--c:' + wc(b.w) + '" data-badge="' + b.id + '" aria-label="' + esc(b.name) + (got ? " badge earned" : " badge, not yet earned: " + esc(b.how)) + '"><i>' + (b.img ? '<img src="' + b.img + '" alt="">' : esc(b.icon || "✦")) + "</i>" + '<span class="badge-name">' + esc(b.name) + '</span><span class="badge-status">' + (got ? "✓ Earned" : "Not earned yet") + "</span></button>";
    }).join("");
    document.querySelectorAll("#badges [data-badge]").forEach(function (el) {
      el.onclick = function () { var b = C.badges.filter(function (x) { return x.id === el.dataset.badge; })[0]; if (badgeGot(b)) reveal(b); else toast(b.name + ": " + b.how); };
    });
    document.getElementById("empty-state").hidden = !!cal.querySelector(".day:not([hidden])");
    var rc = document.getElementById("regchk"); rc.checked = !!(flags & 1); rc.disabled = !!(flags & 1);
    document.getElementById("mission").classList.toggle("done", !!(flags & 1));
  }

  function hello() {
    var n = SCORM.name(), tn = todayNum(), h = document.getElementById("hello"), open = DAYS.filter(function (d) { return unlocked(d.d); }).length;
    var msg = (n ? "Welcome, <b>" + esc(n.split(" ")[0]) + "</b>. " : "Hey, cyber explorer! ");
    if (CFG.unlockAll) msg += CFG.edition === "lms" ? '<span class="tag">Instructor preview</span> All 31 days are unlocked in this preview copy.' : "All 31 days are open. Go in any order.";
    else if (!open) msg += "The calendar opens on <b>October 1, " + CFG.year + "</b>.";
    else if (tn) msg += "Today is <b>October " + tn + "</b>. " + open + " of 31 days are open. Missed days stay open, so you can catch up anytime.";
    else msg += "All " + open + " days are open. Finish any you missed.";
    msg += '';
    if (!SCORM.isLive()) msg += CFG.edition === "web" ? ' <span class="src">Your progress is saved in this browser on this device.</span>' : ' <span class="src">(Not connected to Canvas: progress is saved in this browser only.)</span>';
    h.innerHTML = msg;
  }

  /* ---------- lesson sheet ---------- */
  var sheet = document.getElementById("sheet"), panel = document.getElementById("panel"), cur = null, lastFocus = null;
  sheet.addEventListener("click", function (e) { if (e.target === sheet) closeDay(); });
  document.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("img[data-zoom]")) { e.preventDefault(); e.target.click(); return; }
    if (e.key === "Tab" && !sheet.hidden && !document.querySelector(".lightbox,.reveal")) {
      var focusable = Array.from(panel.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), summary, iframe, [tabindex="0"]')).filter(function (el) { return el.getClientRects().length; });
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { e.preventDefault(); if (last) last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { e.preventDefault(); if (first) first.focus(); }
    }
    if (e.key !== "Escape") return;
    var lb = document.querySelector(".lightbox,.reveal"); if (lb) { if (lb._shut) lb._shut(); else lb.remove(); return; }
    if (!sheet.hidden) closeDay();
  });
  function closeDay() { sheet.hidden = true; panel.innerHTML = ""; cur = null; document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); }

  function ytSrc(id) { return "https://www.youtube-nocookie.com/embed/" + id + "?rel=0&modestbranding=1&playsinline=1&cc_load_policy=1&cc_lang_pref=en&hl=en"; }
  function kalSrc(id) { return "https://www.kaltura.com/p/684682/embedPlaykitJs/uiconf_id/55674542?iframeembed=true&entry_id=" + id; }
  function frame(v) {
    var src = v.yt ? ytSrc(v.yt) : kalSrc(v.kal);
    return '<div class="vid"><iframe src="' + src + '" title="' + esc(v.title) + '" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div><p class="src">' + esc(v.title) + " · " + esc(v.by) + "</p>";
  }
  function docs(list) {
    if (!list || !list.length) return "";
    return '<div class="docs">' + list.map(function (x) { return '<a class="doc' + (/\.(webp|png|jpe?g)$/.test(x.f) ? " img" : "") + '" href="' + x.f + '" target="_blank" rel="noopener">' + esc(x.t) + "</a>"; }).join("") + "</div>";
  }

  function activitySummary(day) {
    var labels = [];
    if (day.video) labels.push("Watch");
    if (day.read) labels.push("Read");
    if (day.games && day.games.length) labels.push(day.games.length + (day.games.length === 1 ? " game" : " games"));
    if (day.kb4 && day.kb4.id) labels.push("Activity");
    if (day.quiz) labels.push("Quiz");
    return labels.join(" · ");
  }
  /* Accessible poster: keyboard-zoomable image + expandable full poster text (WCAG 1.1.1, 1.4.5, 2.1.1). */
  function posterAlt(f, alt) { var t = window.POSTER_TITLE && POSTER_TITLE[f]; return t ? "Poster: " + t + (POSTER_TEXT[f] ? ". Full poster text is available below the image." : "") : alt || ""; }
  function posterText(f) {
    var t = window.POSTER_TEXT && POSTER_TEXT[f]; if (!t) return "";
    return '<details class="ptext"><summary>Read the poster text</summary><div>' + t + "</div></details>";
  }
  function zoomImg(f, alt, cls) { return '<img' + (cls ? ' class="' + cls + '"' : "") + ' src="' + esc(f) + '" alt="' + esc(posterAlt(f, alt)) + '" data-zoom tabindex="0" role="button" aria-label="Enlarge poster: ' + esc((window.POSTER_TITLE && POSTER_TITLE[f]) || alt || "image") + '">'; }
  function posterFigure(poster) { return '<figure class="poster">' + zoomImg(poster.f, poster.alt) + posterText(poster.f) + "</figure>"; }
  window.LIED_A11Y = { posterText: posterText, zoomImg: zoomImg };

  function previewPosters(day) {
    var posters = day.poster ? [day.poster] : [];
    (day.games || []).forEach(function (game) {
      if (game.img && !posters.some(function (poster) { return poster.f === game.img; })) posters.push({f: game.img, alt: game.alt || game.title});
    });
    if (!posters.length) return "";
    return '<section class="preview-posters" aria-label="Mission posters"><h4>Explore the mission posters</h4><p>Choose a poster to open the full-size image.</p><div>' + posters.map(function (poster) {
      return '<div class="pp"><a href="' + esc(poster.f) + '" target="_blank" rel="noopener"><img src="' + esc(poster.f) + '" alt="' + esc(posterAlt(poster.f, poster.alt)) + '" loading="lazy"><span>Open full-size poster<span class="sr-only"> (opens in a new tab)</span> ↗</span></a>' + posterText(poster.f) + '</div>';
    }).join("") + '</div>' + docs(day.docs) + '</section>';
  }

  function previewDay(day) {
    lastFocus = document.activeElement;
    cur = null;
    var activities = [];
    if (day.video) activities.push({label: "Watch", title: day.video.title});
    if (day.read) activities.push({label: "Read", title: day.readTitle || day.title});
    if (day.kb4 && day.kb4.id) activities.push({label: "Activity", title: day.kb4.title});
    (day.games || []).forEach(function (g) { activities.push({label: "Play", title: g.title}); });
    if (day.quiz) activities.push({label: "Quiz", title: (day.quizTitle || "Check your skills") + " · " + day.quiz.length + " questions"});
    var date = new Date(CFG.year, CFG.month, day.d).toLocaleDateString("en-US", {weekday: "long", month: "long", day: "numeric", year: "numeric"});
    panel.innerHTML = '<div class="phead" style="--c:' + wc(day.w) + ';background:' + wc(day.w) + '"><div class="pd">' + day.d + '</div><div><small>Mission preview · ' + esc(date) + '</small><h3 id="ptitle">' + esc(day.title) + '</h3><small>' + MAXXP[day.kind] + ' XP available when this mission opens</small></div><button class="x" aria-label="Close preview">×</button></div><div class="pbody"><div class="preview-note"><b>A sneak peek at your next adventure</b><p>This mission opens on ' + esc(date) + '. For now, explore what you’ll get to do!</p></div><ol class="preview-activities">' + activities.map(function (activity) { return '<li><span>' + esc(activity.label) + '</span><b>' + esc(activity.title) + '</b></li>'; }).join("") + '</ol>' + previewPosters(day) + '<button class="btn" data-close-preview>Back to the calendar</button></div>';
    panel.querySelector(".x").onclick = closeDay;
    panel.querySelector("[data-close-preview]").onclick = closeDay;
    sheet.hidden = false; sheet.scrollTop = 0; document.body.style.overflow = "hidden";
    panel.querySelector(".x").focus();
  }

  function openDay(day) {
    if (!unlocked(day.d)) { previewDay(day); return; }
    lastFocus = document.activeElement;
    cur = day; var P = points(day), st = steps(day), n = 0, w = C.weeks[day.w];
    function head(k, label) { n++; return '<h4>' + n + " · " + label + ' <span class="pts" data-p="' + P[k] + '">' + P[k] + " XP</span></h4>"; }
    var h = '<div class="phead" style="--c:' + wc(day.w) + ';background:' + wc(day.w) + '"><div class="pd">' + day.d + '</div><div><small>' + "October " + day.d + " · " + esc(w.n) + '</small><h3 id="ptitle">' + esc(day.title) + "</h3><small>" + MAXXP[day.kind] + " XP" + (day.kind === "bonus" ? " bonus (extra credit)" : "") + (day.intro ? " · " + day.intro : "") + '</small></div><button class="x" aria-label="Close lesson">×</button></div><div class="pprog"><i></i></div><div class="pbody">';
    if (day.d === 31) h += '<div id="certbox"></div>';
    if (day.video) {
      h += '<div class="step" id="s-video" style="--c:' + wc(day.w) + '">' + head("video", "Watch") + frame(day.video) + '<div class="row"><button class="btn" data-mark="video">Mark video watched</button></div>';
      if (day.extras && day.extras.length) h += '<details class="extras"><summary>Want more? ' + day.extras.length + " extra video" + (day.extras.length > 1 ? "s" : "") + " (optional)</summary>" + day.extras.map(function (v, i) { return '<div class="xv" data-x="' + i + '"></div>'; }).join("") + "</details>";
      h += "</div>";
    }
    if (day.kb4 && day.kb4.id) {
      var url = "https://training.knowbe4.com/modstore/view/" + day.kb4.id + "/en-us";
      h += '<div class="step" id="s-kb4">' + head("kb4", "KnowBe4 module: " + esc(day.kb4.title)) +
        '<div class="vid kbf"><iframe src="' + url + '" title="KnowBe4 module: ' + esc(day.kb4.title) + '" loading="lazy" allow="autoplay; fullscreen" allowfullscreen></iframe></div>' +
        '<div class="row"><a class="btn ghost" href="' + url + '" target="_blank" rel="noopener">Open in new tab ↗</a><button class="btn" data-mark="kb4">I finished the module</button></div>' +
        '<p class="src">This activity comes from KnowBe4. If it does not load, ask your teacher for help. Access may vary.</p>' +
        '<div class="regnote"><b>For teachers:</b> Some activities use the KnowBe4 teaching kit. <a href="' + CFG.kitUrl + '" target="_blank" rel="noopener">Teaching resources ↗</a></div></div>';
    }
    if (day.read) {
      h += '<div class="step" id="s-read" style="--c:' + wc(day.w) + '">' + head("read", day.readTitle || "Read") + (day.poster ? posterFigure(day.poster) : "") + day.read + '<div class="clear"></div>' + (day.src ? '<p class="src">' + day.src + "</p>" : "") + docs(day.docs) + '<div class="row"><button class="btn" data-mark="read">I\'ve read this</button></div></div>';
    }
    (day.games || []).forEach(function (g, i) {
      h += '<div class="step" id="s-g' + i + '" style="--c:' + wc(day.w) + '">' + head("g" + i, "Play: " + esc(g.title)) + '<div data-game="' + i + '"></div></div>';
    });
    if (day.quiz) h += '<div class="step" id="s-quiz">' + head("quiz", day.quizTitle || "Knowledge check") + '<div data-quiz></div></div>';
    h += "</div>";
    panel.innerHTML = h;
    panel.querySelector(".x").onclick = closeDay;
    panel.querySelectorAll("[data-mark]").forEach(function (b) { b.onclick = function () { award(day, b.dataset.mark); }; });
    var ex = panel.querySelector(".extras");
    if (ex) ex.addEventListener("toggle", function () { if (ex.open) ex.querySelectorAll("[data-x]").forEach(function (el) { if (!el.innerHTML) el.innerHTML = frame(day.extras[+el.dataset.x]); }); });
    (day.games || []).forEach(function (g, i) { GAMES[g.type](panel.querySelector('[data-game="' + i + '"]'), g, function () { award(day, "g" + i); }); });
    if (day.quiz) quiz(panel.querySelector("[data-quiz]"), day);
    sheet.hidden = false; document.body.style.overflow = "hidden"; sheet.scrollTop = 0;
    refresh(day); panel.querySelector(".x").focus();
  }

  function refresh(day) {
    if (!cur || cur.d !== day.d) return;
    var st = steps(day), done = 0;
    st.forEach(function (k) {
      var el = document.getElementById("s-" + k); if (!el) return;
      var d = has(day.d, k); if (d) done++;
      el.classList.toggle("done", d);
      var p = el.querySelector(".pts"); p.textContent = (d ? "✓ " : "") + p.dataset.p + " XP";
      var b = el.querySelector("[data-mark]"); if (b) { b.disabled = d; if (d) b.textContent = "Done ✓"; }
    });
    panel.querySelector(".pprog i").style.width = Math.round(done / st.length * 100) + "%";
    if (day.d === 31) cert();
  }

  function award(day, k) {
    if (has(day.d, k)) return;
    var wasDone = dayDone(day);
    mask[day.d] = (mask[day.d] || 0) | (1 << KEYS.indexOf(k));
    persist(); renderAll(); refresh(day);
    var P = points(day); toast("+" + P[k] + " XP");
    if (!wasDone && dayDone(day)) setTimeout(function () { toast("October " + day.d + " complete!"); checkBadges(); }, 900);
  }

  function quiz(el, day) {
    var Q = day.quiz, need = day.quizPass || Math.ceil(Q.length * 2 / 3), ans = {};
    el.innerHTML = '<p class="gi">Answer all ' + Q.length + " questions. You need " + need + " correct to earn the points, and you can retry.</p>" + Q.map(function (q, qi) {
      return '<div class="q"><p>' + (qi + 1) + ". " + q.q + "</p>" + q.o.map(function (o, oi) { return '<button class="opt" data-q="' + qi + '" data-o="' + oi + '">' + o + "</button>"; }).join("") + '<p class="qwhy" hidden></p></div>';
    }).join("") + '<div class="qfb" aria-live="polite"></div>';
    el.querySelectorAll(".opt").forEach(function (b) {
      b.onclick = function () {
        var qi = +b.dataset.q, oi = +b.dataset.o; if (qi in ans) return; ans[qi] = oi;
        el.querySelectorAll('.opt[data-q="' + qi + '"]').forEach(function (x) { var xo = +x.dataset.o; if (xo === Q[qi].a) x.classList.add("right"); else if (xo === oi) x.classList.add("wrong"); x.disabled = true; });
        if (Q[qi].why) { var w = b.parentNode.querySelector(".qwhy"); w.innerHTML = (oi === Q[qi].a ? "✔ " : "✕ ") + Q[qi].why; w.hidden = false; }
        if (Object.keys(ans).length === Q.length) {
          var k = Q.filter(function (q, i) { return ans[i] === q.a; }).length, ok = k >= need, out = el.querySelector(".qfb");
          out.innerHTML = '<div class="fb" style="--c2:var(' + (ok ? "--ok" : "--bad") + ')"><b>' + k + " of " + Q.length + " correct.</b> " + (ok ? "Passed." : "You need " + need + ". Review the explanations and try again.") + "</div>" + (ok ? "" : '<div class="row"><button class="btn ghost" data-retry>Retry the check</button></div>');
          if (ok) award(day, "quiz"); else out.querySelector("[data-retry]").onclick = function () { quiz(el, day); };
        }
      };
    });
  }

  function cert() {
    var box = document.getElementById("certbox"); if (!box) return;
    var t = totals();
    if (!(dayDone(BY[31]) && t.passed)) { box.innerHTML = '<div class="callout" style="--c:var(--boss)"><b>Certificate:</b> finish today\'s Jeopardy board and final check, and reach ' + CFG.passPct + "% overall, to unlock your Cyber Defender certificate. Your score right now is " + t.pct + "%.</div>"; return; }
    var n = SCORM.name() || "Cyber Defender";
    box.innerHTML = '<div class="cert"><p>Cybersecurity Awareness Month ' + CFG.year + ' · “' + esc(CFG.theme.name) + '”</p><h3>Certificate of Completion</h3><p>This certifies that</p><div class="nm">' + esc(n) + '</div><p>completed <b>LIED Cybertober ' + CFG.year + '</b> with a score of <b>' + t.pct + '%</b> and earned the rank of <b>Cyber Defender</b>.</p><p>LIED Cybertober was created by ' + esc(CFG.author) + (CFG.coAuthor ? " and " + esc(CFG.coAuthor) : "") + '.</p><p class="src" style="color:#53627A">October 31, ' + CFG.year + ' · Unofficial certificate of completion for a student learning project. Not an official school credential.</p></div><div class="row"><button class="btn" data-print>Print or save as PDF</button></div>';
    box.querySelector("[data-print]").onclick = function () { try { window.print(); } catch (e) { toast("Printing isn't available here. Take a screenshot instead."); } };
  }

  /* ---------- library + credits ---------- */
  function library() {
    var h = "<h2>Resource Library</h2>";
    C.library.forEach(function (g) {
      h += "<h3>" + esc(g.group) + "</h3>" + (g.intro ? '<p class="rintro">' + g.intro + "</p>" : "") + '<div class="rgrid">' + g.items.map(function (r) {
        return '<a class="rcard" href="' + r.u + '" target="_blank" rel="noopener"><b>' + esc(r.t) + "</b><small>" + esc(r.d) + "</small><code>" + esc(r.show || r.u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")) + "</code></a>";
      }).join("") + "</div>";
    });
    document.getElementById("library").innerHTML = h;
    citations(); footer();
  }

  function citations() {
    var n = 0, h = '<summary><h2>Sources &amp; Citations</h2><span class="src">Show all sources used in this course</span></summary><p class="rintro">' + C.citationNote + "</p>";
    C.citations.forEach(function (g) {
      if (g.lmsOnly && CFG.edition === "public") return;
      h += "<h3>" + esc(g.group) + '</h3><ol class="clist">' + g.items.map(function (x) { n++; return "<li>" + x + "</li>"; }).join("") + "</ol>";
    });
    var vids = [], seen = {};
    DAYS.forEach(function (d) {
      [d.video].concat(d.extras || []).forEach(function (v) {
        if (!v) return; var id = v.yt || v.kal;
        if (seen[id]) { seen[id].days.push(d.d); return; }
        seen[id] = { v: v, days: [d.d] }; vids.push(seen[id]);
      });
    });
    h += "<h3>Embedded videos</h3><ol class=\"clist\">" + vids.map(function (x) {
      var v = x.v, url = v.yt ? "https://www.youtube.com/watch?v=" + v.yt : "https://www.nist.gov/video-gallery";
      n++; return "<li>" + esc(v.by) + ". (n.d.). <i>" + esc(v.title) + "</i> [Video]. " + (v.yt ? "YouTube" : "NIST (Kaltura player)") + '. <a href="' + url + '" target="_blank" rel="noopener">' + esc(url.replace(/^https?:\/\/(www\.)?/, "")) + "</a>. Used on October " + x.days.join(", ") + ".</li>";
    }).join("") + "</ol>";
    var el = document.getElementById("citations"); el.innerHTML = h;
    el.querySelector(".src").textContent = "Show all " + n + " sources used in this course";
  }

  function footer() {
    var who = "Created by " + (CFG.authorUrl ? '<a href="' + esc(CFG.authorUrl) + '">' + esc(CFG.author) + "</a>" : esc(CFG.author)) + ", " + esc(CFG.authorTitle) + (CFG.coAuthor ? ", and " + esc(CFG.coAuthor) + ", " + esc(CFG.coAuthorTitle) : ""), disc = CFG.disclaimer;
    document.getElementById("credits").innerHTML = '<p class="byline">' + who + ' · <a href="#citations" data-cite>Sources &amp; citations</a></p><p>' + disc + "</p><p>Not affiliated with or endorsed by KnowBe4, CISA, NIST, the National Cybersecurity Alliance or the FTC. Their materials are adapted and credited for educational use and remain the property of their owners. Created October 1, 2026.</p>";
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-cite]"); if (!a) return;
    e.preventDefault(); var c = document.getElementById("citations"); c.open = true; c.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ---------- misc ---------- */
  var tt;
  function toast(t) { var e = document.getElementById("toast"); e.textContent = t; e.hidden = false; clearTimeout(tt); tt = setTimeout(function () { e.hidden = true; }, 2200); }
  document.addEventListener("click", function (e) {
    var z = e.target.closest && e.target.closest("[data-zoom]"); if (!z) return;
    var back = document.activeElement;
    var lb = document.createElement("div"); lb.className = "lightbox"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Enlarged poster");
    lb.innerHTML = '<button type="button" class="lb-x" aria-label="Close enlarged poster">×</button><img src="' + z.getAttribute("src") + '" alt="' + esc(z.getAttribute("alt") || "") + '">';
    function shut() { lb.remove(); if (back && back.focus) back.focus(); }
    lb.onclick = shut; lb.querySelector(".lb-x").onkeydown = function (e) { if (e.key === "Tab") e.preventDefault(); };
    document.body.appendChild(lb); lb.querySelector(".lb-x").focus(); lb._shut = shut;
  });
  document.getElementById("todaybtn").onclick = function () {
    var tn = todayNum(), open = DAYS.filter(function (d) { return unlocked(d.d); });
    if (!open.length) { toast("The calendar opens on October 1."); return; }
    var pick = (tn && BY[tn] && !dayDone(BY[tn])) ? BY[tn] : open.filter(function (d) { return !dayDone(d) && d.kind !== "bonus"; })[0] || open.filter(function (d) { return !dayDone(d); })[0] || open[open.length - 1];
    openDay(pick);
  };

  document.getElementById("regchk").onchange = function (e) { if (e.target.checked && !(flags & 1)) { flags |= 1; persist(); renderAll(); toast("+50 XP · You’re on the cyber team!"); } };


  document.querySelectorAll("[data-filter]").forEach(function (button) {
    button.onclick = function () {
      activeFilter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach(function (b) { var selected = b === button; b.classList.toggle("active", selected); b.setAttribute("aria-pressed", String(selected)); });
      renderAll();
    };
  });
  SCORM.init(); load(); hello(); library(); renderAll(); persist();
  window.CYBEROCT = { steps: steps, points: points, totals: totals, REQ_XP: REQ_XP, open: openDay, render: renderAll };   // test hooks
})();
