/**
 * Seshat Notch — Local Desktop Reminder Scheduler
 *
 * Schedules local desktop notifications and in-app banners for:
 * - Morning daily planning reminder (default 09:00)
 * - Evening execution & habit check-in reminder (default 20:00)
 * - Sunday weekly review prompt
 */

import { getLocalDateString } from '../utils/dateUtils.ts';
import { desktopShellService } from './desktopShellService.ts';

export interface ReminderSettings {
  enabled: boolean;
  morningTime: string; // HH:MM (24h), e.g. "09:00"
  eveningTime: string; // HH:MM (24h), e.g. "20:00"
  sundayReviewReminder: boolean;
}

const REMINDER_SETTINGS_KEY = 'seshat_reminder_settings';
const REMINDER_FIRED_PREFIX = 'seshat_reminder_fired_';

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  morningTime: '09:00',
  eveningTime: '20:00',
  sundayReviewReminder: true,
};

export const reminderService = {
  getSettings(): ReminderSettings {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(REMINDER_SETTINGS_KEY);
        if (raw) {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
        }
      }
    } catch {
      // Ignore storage errors
    }
    return { ...DEFAULT_SETTINGS };
  },

  saveSettings(settings: ReminderSettings): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
      }
    } catch {
      // Ignore storage errors
    }
  },

  async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    return await Notification.requestPermission();
  },

  getCurrentHHMM(now = new Date()): string {
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  },

  hasFiredToday(slot: 'morning' | 'evening' | 'sunday', todayStr: string): boolean {
    try {
      return localStorage.getItem(`${REMINDER_FIRED_PREFIX}${slot}`) === todayStr;
    } catch {
      return false;
    }
  },

  markFiredToday(slot: 'morning' | 'evening' | 'sunday', todayStr: string): void {
    try {
      localStorage.setItem(`${REMINDER_FIRED_PREFIX}${slot}`, todayStr);
    } catch {
      // Ignore
    }
  },

  dispatchDesktopNotification(title: string, body: string): void {
    void desktopShellService.dispatchNotification(title, body);
  },

  /**
   * Evaluates whether a scheduled reminder should fire right now.
   * Returns an active reminder message if triggered so the UI can also show a banner.
   */
  checkDueReminders(now = new Date()): { title: string; body: string } | null {
    const settings = this.getSettings();
    if (!settings.enabled) return null;

    const todayStr = getLocalDateString(now);
    const currentHHMM = this.getCurrentHHMM(now);

    if (
      settings.morningTime &&
      currentHHMM >= settings.morningTime &&
      currentHHMM < settings.eveningTime &&
      !this.hasFiredToday('morning', todayStr)
    ) {
      this.markFiredToday('morning', todayStr);
      const msg = {
        title: 'Morning Plan Check-In',
        body: `Review today's scheduled tasks and top priorities (${todayStr}).`,
      };
      this.dispatchDesktopNotification(msg.title, msg.body);
      return msg;
    }

    if (
      settings.eveningTime &&
      currentHHMM >= settings.eveningTime &&
      !this.hasFiredToday('evening', todayStr)
    ) {
      this.markFiredToday('evening', todayStr);
      const msg = {
        title: 'Evening Execution & Habit Check-In',
        body: 'Log today’s completed tasks, focus blocks, and habit check-ins.',
      };
      this.dispatchDesktopNotification(msg.title, msg.body);
      return msg;
    }

    if (
      settings.sundayReviewReminder &&
      now.getDay() === 0 &&
      currentHHMM >= '17:00' &&
      !this.hasFiredToday('sunday', todayStr)
    ) {
      this.markFiredToday('sunday', todayStr);
      const msg = {
        title: 'Sunday Weekly Review',
        body: 'Close out your week with a structured weekly review and carry-over triage.',
      };
      this.dispatchDesktopNotification(msg.title, msg.body);
      return msg;
    }

    return null;
  },
};

