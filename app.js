
(() => {
  "use strict";

  const C = window.FS_CONFIG;
  const STORAGE_EMAIL = "fs_hunting_email_v1";
  const STORAGE_USER = "fs_hunting_user_v1";

  const $ = (id) => document.getElementById(id);

  const el = {
    loginScreen: $("loginScreen"),
    gameScreen: $("gameScreen"),
    emailInput: $("emailInput"),
    loginBtn: $("loginBtn"),
    loginBackendDot: $("loginBackendDot"),
    loginBackendText: $("loginBackendText"),
    gameBackendDot: $("gameBackendDot"),
    gameBackendText: $("gameBackendText"),

    avatar: $("avatar"),
    displayName: $("displayName"),
    userEmail: $("userEmail"),
    changeUserBtn: $("changeUserBtn"),

    timerText: $("timerText"),
    questionCounter: $("questionCounter"),
    totalScore: $("totalScore"),
    seasonText: $("seasonText"),
    stepText: $("stepText"),

    questionIdTag: $("questionIdTag"),
    hotspotCountTag: $("hotspotCountTag"),
    questionText: $("questionText"),
    questionImage: $("questionImage"),
    clickLayer: $("clickLayer"),
    markerLayer: $("markerLayer"),
    revealLayer: $("revealLayer"),
    reasonList: $("reasonList"),
    progressFill: $("progressFill"),
    progressText: $("progressText"),

    undoBtn: $("undoBtn"),
    clearBtn: $("clearBtn"),
    submitBtn: $("submitBtn"),

    resultOverlay: $("resultOverlay"),
    resultTitle: $("resultTitle"),
    resultScore: $("resultScore"),
    resultLine: $("resultLine"),
    resultAnswers: $("resultAnswers"),
    resultHomeBtn: $("resultHomeBtn"),
    nextBtn: $("nextBtn"),
    toast: $("toast"),
    actionStatus: $("actionStatus"),
    busyOverlay: $("busyOverlay"),
    busyText: $("busyText"),
    sideTotalScore: $("sideTotalScore"),
    liveQuestionScore: $("liveQuestionScore"),
    leaderboardBtn: $("leaderboardBtn"),
    historyBtn: $("historyBtn"),
    howToBtn: $("howToBtn"),
    menuOverlay: $("menuOverlay"),
    menuModalTitle: $("menuModalTitle"),
    menuModalBody: $("menuModalBody"),
    menuModalClose: $("menuModalClose")
  };

  let user = null;
  let questions = [];
  let playOrder = [];
  let orderIndex = 0;
  let currentQuestion = null;
  let selections = [];
  let questionEnded = false;
  let secondsLeft = 45;
  let timerHandle = null;
  let autoNextHandle = null;
  let backendOnline = false;

  function showToast(message, ms = 2100) {
    el.toast.textContent = message;
    el.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.toast.classList.remove("show"), ms);
  }

  function setBackendState(ok, text) {
    backendOnline = ok;
    [el.loginBackendDot, el.gameBackendDot].forEach(dot => {
      if (!dot) return;
      dot.classList.toggle("online", ok);
      dot.classList.toggle("offline", !ok);
    });
    el.loginBackendText.textContent = text || (ok ? "Backend พร้อมใช้งาน" : "Backend ไม่พร้อมใช้งาน");
    el.gameBackendText.textContent = ok ? "Backend Online" : "Backend Offline";
  }
  function setActionStatus(message) {
    if (el.actionStatus) el.actionStatus.textContent = message || "พร้อมเลือกจุดในภาพ";
  }

  function setBusy(isBusy, message = "กำลังประมวลผล...") {
    if (!el.busyOverlay) return;
    el.busyOverlay.classList.toggle("hidden", !isBusy);
    if (el.busyText) el.busyText.textContent = message;
    document.body.style.overflow = isBusy ? "hidden" : "";
  }


  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      ...options
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Backend ตอบกลับไม่ใช่ JSON");
    }

    if (!data.ok) {
      throw new Error(data.error || "BACKEND_ERROR");
    }
    return data;
  }

  async function api(payload) {
    return requestJson(C.BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
  }

  async function pingBackend() {
    try {
      await requestJson(`${C.BACKEND_URL}?action=ping&t=${Date.now()}`);
      setBackendState(true, "Backend พร้อมใช้งาน");
      return true;
    } catch (err) {
      setBackendState(false, "เชื่อม Backend ไม่สำเร็จ");
      return false;
    }
  }

  function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  function saveRememberedUser(backendUser) {
    user = backendUser;
    localStorage.setItem(STORAGE_USER, JSON.stringify(backendUser));
    if (C.REMEMBER_EMAIL) {
      localStorage.setItem(STORAGE_EMAIL, backendUser.email);
    }
  }

  function loadRememberedUser() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_USER) || "null");
    } catch {
      return null;
    }
  }

  function clearRememberedUser() {
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_EMAIL);
    user = null;
  }

  async function login() {
    const email = el.emailInput.value.trim().toLowerCase();

    if (!validEmail(email)) {
      showToast("กรุณากรอกอีเมลให้ถูกต้อง");
      el.emailInput.focus();
      return;
    }

    el.loginBtn.disabled = true;
    el.loginBtn.textContent = "กำลังเข้าสู่ระบบ...";
    setBusy(true, "กำลังเข้าสู่ระบบ...");

    try {
      const data = await api({ action: "login", email });
      saveRememberedUser(data.user);
      openGame();
    } catch (err) {
      showToast(`Login ไม่สำเร็จ: ${err.message}`, 3200);
    } finally {
      el.loginBtn.disabled = false;
      el.loginBtn.textContent = "🚀 เริ่มเล่นเกม";
      setBusy(false);
    }
  }

  async function loadQuestions() {
    const data = await requestJson(`${C.BACKEND_URL}?action=questions&t=${Date.now()}`);

    const enabled = new Set(C.ENABLED_QUESTION_IDS);
    questions = (data.questions || []).filter(q => enabled.has(q.questionId));

    if (!questions.length) {
      throw new Error("ไม่พบคำถามที่เปิดใช้งานใน Frontend");
    }

    preloadQuestionImages(questions);
  }

  function preloadQuestionImages(items) {
    (items || []).forEach(q => {
      const img = new Image();
      img.decoding = "async";
      img.src = imagePath(q);
    });
  }

  async function syncProgress() {
    if (!user?.email) return;

    try {
      const data = await api({ action: "progress", email: user.email });
      el.totalScore.textContent = data.totalBestScore || 0;
      if (el.sideTotalScore) el.sideTotalScore.textContent = `${data.totalBestScore || 0} คะแนน`;
    } catch {
      el.totalScore.textContent = user.totalBestScore || 0;
      if (el.sideTotalScore) el.sideTotalScore.textContent = `${user.totalBestScore || 0} คะแนน`;
    if (el.sideTotalScore) el.sideTotalScore.textContent = `${user.totalBestScore || 0} คะแนน`;
    }
  }

  function renderUser() {
    el.displayName.textContent = user.displayName || "ผู้เล่น";
    el.userEmail.textContent = user.email || "";
    el.avatar.textContent = (user.displayName || user.email || "U").charAt(0).toUpperCase();
    el.totalScore.textContent = user.totalBestScore || 0;
  }

  async function openGame() {
    if (!user) return;

    renderUser();
    el.loginScreen.classList.add("hidden");
    el.gameScreen.classList.remove("hidden");
    setBusy(true, "กำลังโหลดเกม...");

    try {
      if (!questions.length) await loadQuestions();
      await syncProgress();
      startSession();
    } catch (err) {
      showToast(err.message, 3500);
      el.loginScreen.classList.remove("hidden");
      el.gameScreen.classList.add("hidden");
    } finally {
      setBusy(false);
    }
  }

  function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function startSession() {
    playOrder = shuffle(questions.map((_, i) => i));
    orderIndex = 0;
    loadCurrentQuestion();
  }

  function imagePath(q) {
    return `${C.QUESTION_IMAGE_DIR}${q.imageFile}?v=${encodeURIComponent(C.ASSET_VERSION || "1")}`;
  }

  function loadCurrentQuestion() {
    clearInterval(timerHandle);
    clearTimeout(autoNextHandle);

    selections = [];
    questionEnded = false;
    el.markerLayer.innerHTML = "";
    el.revealLayer.innerHTML = "";
    el.resultOverlay.classList.remove("show");
    el.submitBtn.disabled = false;
    el.submitBtn.textContent = "✈ ส่งคำตอบ";
    if (el.liveQuestionScore) el.liveQuestionScore.textContent = "--";
    el.clickLayer.style.pointerEvents = "auto";

    currentQuestion = questions[playOrder[orderIndex]];

    const total = questions.length;
    const current = orderIndex + 1;

    secondsLeft = Number(currentQuestion.timeLimitSec || 45);

    el.seasonText.textContent = `🌱 SEASON ${currentQuestion.season || 1} : จากฟาร์ม`;
    el.stepText.textContent = `ข้อ ${current} / ${total}`;
    el.questionCounter.textContent = `${current}/${total}`;
    el.questionIdTag.textContent = currentQuestion.questionId;
    el.hotspotCountTag.textContent = `⚠️ มี ${currentQuestion.hotspotCount} จุดไม่สอดคล้อง`;
    el.questionText.textContent = "จากภาพนี้ จุดใดที่ไม่สอดคล้องกับหลัก Food Safety?";
    el.questionImage.classList.add("is-loading");
    setActionStatus(`ข้อ ${current} จาก ${total} • เลือกได้สูงสุด ${currentQuestion.hotspotCount} จุด`);
    el.questionImage.src = imagePath(currentQuestion);
    el.questionImage.alt = `${currentQuestion.questionId} ${currentQuestion.sceneTitle || ""}`;
    el.progressFill.style.width = `${(current / total) * 100}%`;
    el.progressText.textContent = `${current} / ${total} ข้อ • ${currentQuestion.sceneTitle || currentQuestion.process || ""}`;

    renderReasons();
    updateTimer();

    timerHandle = setInterval(() => {
      secondsLeft -= 1;
      updateTimer();

      if (secondsLeft <= 0) {
        clearInterval(timerHandle);
        finishQuestion(true);
      }
    }, 1000);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateTimer() {
    el.timerText.textContent = `00:${String(Math.max(0, secondsLeft)).padStart(2, "0")}`;
    el.timerText.style.color = secondsLeft <= 10 ? "#ffd46a" : "";
  }

  function addSelection(clientX, clientY) {
    if (questionEnded) return;

    const max = Number(currentQuestion.hotspotCount || 1);
    if (selections.length >= max) {
      showToast(`เลือกได้สูงสุด ${max} จุด`);
      return;
    }

    const rect = el.clickLayer.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    if (x < 0 || x > 100 || y < 0 || y > 100) return;

    const tooClose = selections.some(s => Math.hypot(s.x - x, s.y - y) < 2.1);
    if (tooClose) {
      showToast("จุดนี้ใกล้กับจุดที่เลือกไว้แล้ว");
      return;
    }

    selections.push({
      x: +x.toFixed(2),
      y: +y.toFixed(2),
      reason: ""
    });

    renderMarkers();
    renderReasons();
  }

  function renderMarkers() {
    el.markerLayer.innerHTML = "";

    selections.forEach((selection, index) => {
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = "marker";
      marker.style.left = `${selection.x}%`;
      marker.style.top = `${selection.y}%`;
      marker.textContent = index + 1;
      marker.title = "แตะเพื่อลบจุดนี้";

      marker.addEventListener("click", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        if (questionEnded) return;

        selections.splice(index, 1);
        renderMarkers();
        renderReasons();
      });

      el.markerLayer.appendChild(marker);
    });
  }

  function renderReasons() {
    if (!selections.length) {
      el.reasonList.innerHTML = `
        <div class="empty-reason">ยังไม่ได้เลือกจุด • เลือกจุดในภาพเพื่อเพิ่มช่องใส่เหตุผล</div>
      `;
      return;
    }

    el.reasonList.innerHTML = "";

    selections.forEach((selection, index) => {
      const row = document.createElement("div");
      row.className = "reason-row";

      row.innerHTML = `
        <div class="reason-number">${index + 1}</div>
        <div>
          <textarea class="reason-input"
            placeholder="ทำไมจุดที่เลือก ${index + 1} จึงไม่สอดคล้องกับ Food Safety?"></textarea>
          <div class="reason-note">อธิบายสั้น ๆ ว่าจุดนี้เสี่ยงหรือไม่ถูกหลักอย่างไร</div>
        </div>
      `;

      const textarea = row.querySelector("textarea");
      textarea.value = selection.reason || "";
      textarea.addEventListener("input", () => {
        selections[index].reason = textarea.value;
      });

      el.reasonList.appendChild(row);
    });
  }

  function revealBackendAnswers(reveal) {
    el.revealLayer.innerHTML = "";

    (reveal || []).forEach(h => {
      const ring = document.createElement("div");
      ring.className = "reveal-ring";
      ring.style.left = `${h.x}%`;
      ring.style.top = `${h.y}%`;
      ring.style.width = `${h.rx * 2}%`;
      ring.style.height = `${h.ry * 2}%`;
      el.revealLayer.appendChild(ring);
    });
  }

  async function finishQuestion(auto = false) {
    if (questionEnded) return;

    if (!selections.length && !auto) {
      showToast("กรุณาเลือกจุดในภาพก่อน");
      return;
    }

    questionEnded = true;
    clearInterval(timerHandle);

    el.submitBtn.disabled = true;
    el.submitBtn.textContent = "กำลังตรวจ...";
    el.submitBtn.classList.add("submitting");
    el.clickLayer.style.pointerEvents = "none";
    setActionStatus("กำลังส่งคำตอบไปตรวจ...");
    setBusy(true, "กำลังตรวจคำตอบ...");

    try {
      const data = await api({
        action: "submit",
        email: user.email,
        questionId: currentQuestion.questionId,
        selections: selections.map(s => ({
          x: s.x,
          y: s.y,
          reason: s.reason || ""
        })),
        elapsedSec: Math.max(0, Number(currentQuestion.timeLimitSec || 45) - secondsLeft)
      });

      el.totalScore.textContent = data.totalBestScore || 0;
      if (el.sideTotalScore) el.sideTotalScore.textContent = `${data.totalBestScore || 0} คะแนน`;
      revealBackendAnswers(data.reveal);

      const score = data.score || {};
      el.resultScore.textContent = `${score.total || 0} / 100`;

      el.resultLine.innerHTML = `
        พบจุดไม่สอดคล้อง <b>${score.clickMatchedCount || 0}</b>
        จาก <b>${score.totalHotspots || currentQuestion.hotspotCount}</b> จุด<br>
        คะแนนตำแหน่ง <b>${score.click || 0}</b>/50 •
        คะแนนเหตุผล <b>${score.reason || 0}</b>/50
      `;

      const revealHtml = (data.reveal || []).map((h, i) => `
        <div style="margin-top:8px">
          <b>${i + 1}) ${escapeHtml(h.label || "")}</b><br>
          ${escapeHtml(h.whyNotFoodSafety || "")}
        </div>
      `).join("");

      const selectedHtml = (data.results || []).map((r, i) => `
        <div style="margin-top:7px">
          จุดที่เลือก ${i + 1} —
          ${r.pointMatched ? "✅ ตำแหน่งถูก" : "❌ ตำแหน่งไม่ตรง"}
          ${r.pointMatched ? (r.reasonMatched ? " • ✅ เหตุผลผ่าน" : " • ⚠️ เหตุผลยังไม่ผ่าน") : ""}
        </div>
      `).join("");

      el.resultAnswers.innerHTML = `
        <b>เฉลยหลัง Submit</b>
        ${revealHtml || "<div>-</div>"}
        <br><b>ผลคำตอบของคุณ</b>
        ${selectedHtml || "<div>ไม่ได้เลือกจุด</div>"}
      `;

      const hasNext = orderIndex < playOrder.length - 1;
      setActionStatus(hasNext ? "ตรวจเสร็จแล้ว • ดูเฉลยและไปข้อถัดไปได้" : "ตรวจเสร็จแล้ว • จบรอบนี้แล้ว");
      el.resultTitle.textContent = hasNext ? "สรุปผลข้อนี้" : "จบ Session";
      el.nextBtn.textContent = hasNext ? "ไปข้อถัดไป" : "สุ่มเล่นใหม่";
      el.resultOverlay.classList.add("show");

      if (hasNext) {
        clearTimeout(autoNextHandle);
        autoNextHandle = setTimeout(nextQuestion, Math.max(1, C.AUTO_NEXT_SECONDS) * 1000);
      }
    } catch (err) {
      questionEnded = false;
      el.submitBtn.disabled = false;
      el.clickLayer.style.pointerEvents = "auto";
      setActionStatus("ส่งคำตอบไม่สำเร็จ • ลองอีกครั้ง");
      showToast(`Submit ไม่สำเร็จ: ${err.message}`, 3500);
    } finally {
      el.submitBtn.textContent = "✈ ส่งคำตอบ";
      el.submitBtn.classList.remove("submitting");
      setBusy(false);
    }
  }

  function nextQuestion() {
    clearTimeout(autoNextHandle);
    el.resultOverlay.classList.remove("show");
    setActionStatus("กำลังเปิดข้อถัดไป...");

    if (orderIndex < playOrder.length - 1) {
      orderIndex += 1;
      loadCurrentQuestion();
    } else {
      startSession();
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function goLogin(clearUser = false) {
    clearInterval(timerHandle);
    clearTimeout(autoNextHandle);

    if (clearUser) {
      clearRememberedUser();
      el.emailInput.value = "";
    }

    el.resultOverlay.classList.remove("show");
    el.gameScreen.classList.add("hidden");
    el.loginScreen.classList.remove("hidden");
    setBusy(false);
  }


  function openMenuModal(title, html) {
    el.menuModalTitle.textContent = title;
    el.menuModalBody.innerHTML = html;
    el.menuOverlay.classList.add("show");
  }

  function closeMenuModal() {
    el.menuOverlay.classList.remove("show");
  }

  async function showLeaderboard() {
    setBusy(true, "กำลังโหลด Leaderboard...");
    try {
      const data = await requestJson(`${C.BACKEND_URL}?action=leaderboard&limit=20&t=${Date.now()}`);
      const rows = data.leaderboard || [];
      const html = rows.length ? `
        <table class="lb-table">
          <thead><tr><th>อันดับ</th><th>ผู้เล่น</th><th>คะแนน</th></tr></thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${escapeHtml(r.rank)}</td>
                <td>${escapeHtml(r.displayName || r.email || "-")}</td>
                <td><b>${escapeHtml(r.totalBestScore || 0)}</b></td>
              </tr>`).join("")}
          </tbody>
        </table>` : `<div class="empty-reason">ยังไม่มีข้อมูล Leaderboard</div>`;
      openMenuModal("🏆 Leaderboard", html);
    } catch (err) {
      showToast("โหลด Leaderboard ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function showHistory() {
    setBusy(true, "กำลังโหลดประวัติ...");
    try {
      const data = await api({ action: "progress", email: user.email });
      const rows = data.progress || [];
      const html = rows.length ? `
        <table class="history-table">
          <thead><tr><th>ข้อ</th><th>Best Score</th><th>Attempts</th></tr></thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${escapeHtml(r.questionId)}</td>
                <td><b>${escapeHtml(r.bestScore || 0)}</b></td>
                <td>${escapeHtml(r.attempts || 0)}</td>
              </tr>`).join("")}
          </tbody>
        </table>` : `<div class="empty-reason">ยังไม่มีประวัติการเล่น</div>`;
      openMenuModal("🕘 ประวัติการเล่น", html);
    } catch (err) {
      showToast("โหลดประวัติไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  function showHowToPlay() {
    openMenuModal("ⓘ วิธีการเล่น", `
      <div class="help-list">
        <div class="help-step"><i>1</i><div><b>สังเกตภาพ</b><br>หาจุดที่ไม่สอดคล้องกับหลัก Food Safety</div></div>
        <div class="help-step"><i>2</i><div><b>แตะ/คลิกจุด</b><br>เลือกได้หลายจุดตามจำนวนที่ระบบกำหนด</div></div>
        <div class="help-step"><i>3</i><div><b>ใส่เหตุผล</b><br>อธิบายสั้น ๆ ว่าจุดนั้นมีความเสี่ยงหรือไม่ถูกหลักอย่างไร</div></div>
        <div class="help-step"><i>4</i><div><b>กดส่งคำตอบ</b><br>คะแนนตำแหน่ง 50 คะแนน + เหตุผล 50 คะแนน</div></div>
        <div class="help-step"><i>5</i><div><b>สะสมคะแนน</b><br>ระบบเก็บ Best Score ของแต่ละข้อไว้สำหรับ Leaderboard</div></div>
      </div>
    `);
  }

  function handleSeasonMenu(button) {
    const season = Number(button.dataset.season || 1);
    if (season !== 1) {
      showToast(`Season ${season} ยังไม่เปิดให้เล่น`);
      return;
    }
    showToast("กำลังเล่น Season 1 : จากฟาร์ม");
  }

  // Events
  el.loginBtn.addEventListener("click", login);
  el.emailInput.addEventListener("keydown", e => {
    if (e.key === "Enter") login();
  });

  el.changeUserBtn.addEventListener("click", () => goLogin(true));
  el.undoBtn.addEventListener("click", () => {
    if (questionEnded || !selections.length) return;
    selections.pop();
    renderMarkers();
    renderReasons();
  });
  el.clearBtn.addEventListener("click", () => {
    if (questionEnded) return;
    selections = [];
    renderMarkers();
    renderReasons();
  });
  el.submitBtn.addEventListener("click", () => finishQuestion(false));
  el.nextBtn.addEventListener("click", nextQuestion);
  el.resultHomeBtn.addEventListener("click", () => el.resultOverlay.classList.remove("show"));
  if (el.leaderboardBtn) el.leaderboardBtn.addEventListener("click", showLeaderboard);
  if (el.historyBtn) el.historyBtn.addEventListener("click", showHistory);
  if (el.howToBtn) el.howToBtn.addEventListener("click", showHowToPlay);
  if (el.menuModalClose) el.menuModalClose.addEventListener("click", closeMenuModal);
  if (el.menuOverlay) {
    el.menuOverlay.addEventListener("click", (e) => {
      if (e.target === el.menuOverlay) closeMenuModal();
    });
  }
  document.querySelectorAll(".menu-item[data-season]").forEach(btn => {
    btn.addEventListener("click", () => handleSeasonMenu(btn));
  });

  el.clickLayer.addEventListener("click", e => addSelection(e.clientX, e.clientY));
  el.clickLayer.addEventListener("touchend", e => {
    const t = e.changedTouches?.[0];
    if (!t) return;
    addSelection(t.clientX, t.clientY);
    e.preventDefault();
  }, { passive: false });

  el.questionImage.addEventListener("load", () => {
    el.questionImage.classList.remove("is-loading");
  });

  el.questionImage.addEventListener("error", () => {
    el.questionImage.classList.remove("is-loading");
    showToast(`ไม่พบภาพ ${currentQuestion?.imageFile || ""} ใน GitHub assets`, 3200);
  });

  // Boot
  const savedEmail = localStorage.getItem(STORAGE_EMAIL);
  if (savedEmail) el.emailInput.value = savedEmail;

  const remembered = loadRememberedUser();
  if (remembered?.email) {
    el.emailInput.value = remembered.email;
  }

  setActionStatus("พร้อมเลือกจุดในภาพ");
  pingBackend();
})();
