(() => {
  "use strict";

  const SHIFT_STORAGE_KEY = "shiftclear.shift.v1";
  const THEME_STORAGE_KEY = "shiftclear.theme.v1";

  const form = document.getElementById("shift-form");
  const input = document.getElementById("time-in");
  const inputError = document.getElementById("input-error");
  const result = document.getElementById("result");
  const countdown = document.getElementById("countdown");
  const countdownCaption = document.getElementById("countdown-caption");
  const statusLabel = document.getElementById("status-label");
  const statusAnnouncement = document.getElementById("status-announcement");
  const targetTime = document.getElementById("target-time");
  const targetDate = document.getElementById("target-date");
  const resetButton = document.getElementById("reset-button");
  const themeToggle = document.getElementById("theme-toggle");
  const privacyOpen = document.getElementById("privacy-open");
  const privacyDialog = document.getElementById("privacy-dialog");
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

  let activeShift = null;
  let timerId = null;
  let lastStatusKey = null;
  let themeOverride = readThemeOverride();

  function safeStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Persistence is optional; calculation still works without it.
    }
  }

  function safeStorageRemove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Persistence is optional; calculation still works without it.
    }
  }

  function readThemeOverride() {
    const stored = safeStorageGet(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  }

  function getResolvedTheme() {
    return themeOverride ?? (systemTheme.matches ? "dark" : "light");
  }

  function applyTheme() {
    const theme = getResolvedTheme();
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    themeToggle.setAttribute("aria-checked", String(theme === "dark"));
    themeToggle.setAttribute("aria-label", `Switch to ${nextTheme} mode`);
    themeToggle.title = `Switch to ${nextTheme} mode`;
  }

  function toggleTheme() {
    themeOverride = getResolvedTheme() === "dark" ? "light" : "dark";
    safeStorageSet(THEME_STORAGE_KEY, themeOverride);
    applyTheme();
  }

  function clearError() {
    inputError.textContent = "";
    inputError.hidden = true;
    input.setAttribute("aria-invalid", "false");
  }

  function showError(message) {
    inputError.textContent = message;
    inputError.hidden = false;
    input.setAttribute("aria-invalid", "true");
  }

  function buildRecord(parsed) {
    const target = ShiftClearCore.calculateTarget(parsed.startMs);
    return {
      version: 1,
      rawInput: parsed.raw,
      startMs: parsed.startMs,
      targetMs: target.targetMs
    };
  }

  function readSavedShift() {
    const stored = safeStorageGet(SHIFT_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    try {
      const record = JSON.parse(stored);
      if (ShiftClearCore.isRestorable(record, new Date())) {
        return record;
      }
    } catch {
      // Invalid data is removed below.
    }

    safeStorageRemove(SHIFT_STORAGE_KEY);
    return null;
  }

  function stopTicker() {
    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }
  }

  function updateStatus(status) {
    statusLabel.textContent = status.label;
    document.body.dataset.shiftStatus = status.key;

    if (status.key !== lastStatusKey) {
      statusAnnouncement.textContent = status.announcement;
      lastStatusKey = status.key;
    }
  }

  function tick() {
    stopTicker();
    if (!activeShift) {
      return;
    }

    const countdownSeconds = ShiftClearCore.getCountdownSeconds(activeShift.targetMs, Date.now());
    const formatted = ShiftClearCore.formatDuration(countdownSeconds);
    countdown.textContent = formatted;
    countdownCaption.hidden = countdownSeconds < 0;

    if (countdownSeconds < 0) {
      countdown.setAttribute("aria-label", `${ShiftClearCore.formatDuration(Math.abs(countdownSeconds))} past logout`);
    } else if (countdownSeconds === 0) {
      countdown.setAttribute("aria-label", "Shift over");
    } else {
      countdown.setAttribute("aria-label", `${formatted} remaining`);
    }

    updateStatus(ShiftClearCore.getStatus(countdownSeconds));

    const delay = 1000 - (Date.now() % 1000) + 15;
    timerId = window.setTimeout(tick, delay);
  }

  function activateShift(record, persist = true) {
    const target = ShiftClearCore.calculateTarget(record.startMs);
    activeShift = record;
    lastStatusKey = null;

    targetTime.textContent = ShiftClearCore.formatTime(record.targetMs);
    targetDate.textContent = target.crossesMidnight ? " (next day)" : "";
    form.hidden = true;
    result.hidden = false;
    clearError();
    tick();

    if (persist) {
      safeStorageSet(SHIFT_STORAGE_KEY, JSON.stringify(record));
    }
  }

  function calculateFromInput({ explicit = false } = {}) {
    const parsed = ShiftClearCore.parseTimeInput(input.value, new Date());
    if (!parsed.ok) {
      if (explicit) {
        showError(parsed.message);
      }
      return false;
    }

    activateShift(buildRecord(parsed));
    return true;
  }

  function resetShift() {
    stopTicker();
    activeShift = null;
    lastStatusKey = null;
    safeStorageRemove(SHIFT_STORAGE_KEY);
    form.reset();
    clearError();
    form.hidden = false;
    result.hidden = true;
    document.body.dataset.shiftStatus = "empty";
    countdown.textContent = "00:00:00";
    countdownCaption.hidden = false;
    statusAnnouncement.textContent = "Shift cleared.";
    input.focus();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    calculateFromInput({ explicit: true });
  });

  input.addEventListener("input", () => {
    if (input.getAttribute("aria-invalid") === "true") {
      clearError();
    }
  });

  input.addEventListener("paste", () => {
    window.setTimeout(() => calculateFromInput({ explicit: true }), 0);
  });

  resetButton.addEventListener("click", resetShift);
  themeToggle.addEventListener("click", toggleTheme);
  privacyOpen.addEventListener("click", () => {
    if (typeof privacyDialog.showModal === "function") {
      privacyDialog.showModal();
    } else {
      privacyDialog.setAttribute("open", "");
    }
  });

  privacyDialog.addEventListener("close", () => {
    privacyOpen.focus();
  });

  systemTheme.addEventListener("change", () => {
    if (themeOverride === null) {
      applyTheme();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && activeShift) {
      tick();
    }
  });

  applyTheme();

  const savedShift = readSavedShift();
  if (savedShift) {
    input.value = savedShift.rawInput;
    activateShift(savedShift, false);
  } else {
    input.focus();
  }
})();
