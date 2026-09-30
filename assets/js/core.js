"use strict";

const ShiftClearCore = (() => {
  const SHIFT_MS = 9 * 60 * 60 * 1000;
  const FINAL_STRETCH_SECONDS = 15 * 60;

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatTime(value) {
    const date = value instanceof Date ? value : new Date(value);
    const hours = date.getHours();
    const displayHour = hours % 12 || 12;
    const period = hours >= 12 ? "PM" : "AM";
    return `${pad(displayHour)}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${period}`;
  }

  function formatDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric"
    }).format(date);
  }

  function sameLocalDate(leftValue, rightValue) {
    const left = leftValue instanceof Date ? leftValue : new Date(leftValue);
    const right = rightValue instanceof Date ? rightValue : new Date(rightValue);
    return left.getFullYear() === right.getFullYear()
      && left.getMonth() === right.getMonth()
      && left.getDate() === right.getDate();
  }

  function parseTimeInput(value, nowValue = new Date()) {
    const raw = String(value ?? "").trim();
    const now = nowValue instanceof Date ? new Date(nowValue.getTime()) : new Date(nowValue);

    if (!raw) {
      return { ok: false, code: "empty", message: "Enter your Time In to continue." };
    }

    let hours;
    let minutes;
    let seconds;
    const twelveHour = raw.match(/^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?\s*([ap]m)$/i);
    const twentyFourHour = raw.match(/^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/);

    if (twelveHour) {
      const displayHours = Number(twelveHour[1]);
      if (displayHours < 1 || displayHours > 12) {
        return { ok: false, code: "invalid", message: "Use an hour from 1 to 12 with AM or PM." };
      }

      hours = displayHours % 12;
      if (twelveHour[4].toLowerCase() === "pm") {
        hours += 12;
      }
      minutes = Number(twelveHour[2]);
      seconds = Number(twelveHour[3] ?? 0);
    } else if (twentyFourHour) {
      hours = Number(twentyFourHour[1]);
      if (hours > 23) {
        return { ok: false, code: "invalid", message: "Use an hour from 00 to 23 for 24-hour time." };
      }
      minutes = Number(twentyFourHour[2]);
      seconds = Number(twentyFourHour[3] ?? 0);
    } else {
      return {
        ok: false,
        code: "format",
        message: "Use a time like 07:31:41 AM, 07:31 AM, or 07:31."
      };
    }

    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
      seconds,
      0
    );

    if (
      start.getFullYear() !== now.getFullYear()
      || start.getMonth() !== now.getMonth()
      || start.getDate() !== now.getDate()
      || start.getHours() !== hours
      || start.getMinutes() !== minutes
      || start.getSeconds() !== seconds
    ) {
      return { ok: false, code: "invalid", message: "That time is not valid on today's local clock." };
    }

    if (start.getTime() > now.getTime()) {
      return { ok: false, code: "future", message: "Time In cannot be later than the current time." };
    }

    return {
      ok: true,
      raw,
      startMs: start.getTime(),
      normalized: formatTime(start)
    };
  }

  function calculateTarget(startValue) {
    const start = startValue instanceof Date ? new Date(startValue.getTime()) : new Date(startValue);
    const preliminaryMs = start.getTime() + SHIFT_MS;
    const floor = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
      16,
      0,
      0,
      0
    );
    const floorMs = floor.getTime();
    const targetMs = Math.max(preliminaryMs, floorMs);

    return {
      preliminaryMs,
      floorMs,
      targetMs,
      adjusted: targetMs === floorMs && preliminaryMs < floorMs,
      crossesMidnight: !sameLocalDate(start, targetMs)
    };
  }

  function getCountdownSeconds(targetValue, nowValue = Date.now()) {
    const targetMs = targetValue instanceof Date ? targetValue.getTime() : Number(targetValue);
    const nowMs = nowValue instanceof Date ? nowValue.getTime() : Number(nowValue);
    const seconds = Math.ceil((targetMs - nowMs) / 1000);
    return Object.is(seconds, -0) ? 0 : seconds;
  }

  function formatDuration(totalSeconds) {
    const numericSeconds = Number(totalSeconds);
    const wholeSeconds = Number.isFinite(numericSeconds) ? Math.trunc(numericSeconds) : 0;
    const absoluteSeconds = Math.abs(wholeSeconds);
    const sign = wholeSeconds < 0 ? "-" : "";
    const hours = Math.floor(absoluteSeconds / 3600);
    const minutes = Math.floor((absoluteSeconds % 3600) / 60);
    const seconds = absoluteSeconds % 60;
    return `${sign}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  function getStatus(countdownSeconds) {
    if (countdownSeconds < 0) {
      return { key: "extended", label: "Extended Time", announcement: "Extended time." };
    }
    if (countdownSeconds === 0) {
      return { key: "complete", label: "Shift Over", announcement: "Shift over." };
    }
    if (countdownSeconds <= FINAL_STRETCH_SECONDS) {
      return { key: "final", label: "Final Stretch", announcement: "Final stretch. Fifteen minutes or less remain." };
    }
    return { key: "active", label: "Shift in Progress", announcement: "Shift in progress." };
  }

  function isRestorable(record, nowValue = new Date()) {
    const now = nowValue instanceof Date ? nowValue : new Date(nowValue);
    if (!record || record.version !== 1 || typeof record.rawInput !== "string") {
      return false;
    }
    if (!Number.isFinite(record.startMs) || !Number.isFinite(record.targetMs)) {
      return false;
    }
    if (record.startMs > now.getTime()) {
      return false;
    }

    const expected = calculateTarget(record.startMs).targetMs;
    if (record.targetMs !== expected) {
      return false;
    }

    return record.targetMs > now.getTime() || sameLocalDate(record.targetMs, now);
  }

  return Object.freeze({
    SHIFT_MS,
    FINAL_STRETCH_SECONDS,
    parseTimeInput,
    calculateTarget,
    getCountdownSeconds,
    formatDuration,
    formatTime,
    formatDate,
    sameLocalDate,
    getStatus,
    isRestorable
  });
})();
