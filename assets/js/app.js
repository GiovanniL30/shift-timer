(() => {
  "use strict";

  const SHIFT_STORAGE_KEY = "shiftclear.shift.v1";

  const form = document.getElementById("shift-form");
  const input = document.getElementById("time-in");
  const inputError = document.getElementById("input-error");
  const result = document.getElementById("result");
  const countdown = document.getElementById("countdown");
  const statusLabel = document.getElementById("status-label");
  const statusAnnouncement = document.getElementById("status-announcement");
  const targetTime = document.getElementById("target-time");
  const targetDate = document.getElementById("target-date");
  const resetButton = document.getElementById("reset-button");

  let activeShift = null;
  let timerId = null;
  let lastStatusKey = null;

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

    const remaining = ShiftClearCore.getRemainingSeconds(activeShift.targetMs, Date.now());
    const formatted = ShiftClearCore.formatDuration(remaining);
    countdown.textContent = formatted;
    countdown.setAttribute("aria-label", `${formatted} remaining`);
    updateStatus(ShiftClearCore.getStatus(remaining));

    if (remaining > 0) {
      const delay = 1000 - (Date.now() % 1000) + 15;
      timerId = window.setTimeout(tick, delay);
    }
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

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && activeShift) {
      tick();
    }
  });

  const savedShift = readSavedShift();
  if (savedShift) {
    input.value = savedShift.rawInput;
    activateShift(savedShift, false);
  } else {
    input.focus();
  }
})();
