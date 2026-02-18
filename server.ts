import "dotenv/config";
import { createServer } from "http";
import next from "next";
import { Server as SocketIOServer, type Socket } from "socket.io";
import prisma from "./src/lib/prisma";
import { syncEmployeesFromLdapCore } from "./src/lib/ldap-sync-employees";
import { runScheduledEmailJob } from "./src/lib/scheduled-emails";

interface LateAlertPayload {
  userId: string;
  userName: string;
  timestamp: string;
}

interface PointageReminderPayload {
  userId: string;
  message: string;
  timestamp: string;
}

const DEFAULT_MAX_SESSION_END_TIME = "20:00";
const DEFAULT_BREAK_DURATION_MINUTES = 60;

const POINTAGE_EXIT_REMINDER_START_HOUR = 17;
const POINTAGE_EXIT_REMINDER_START_MINUTE = 25;
const POINTAGE_EXIT_REMINDER_WINDOW_MINUTES = 10;
const POINTAGE_EXIT_REMINDER_INTERVAL_MS = 60_000;

function parseTimeToHM(value: string): [number, number] {
  const [hStr, mStr] = value.split(":");
  const h = Number(hStr);
  const m = Number(mStr);

  if (Number.isNaN(h) || Number.isNaN(m)) {
    return [0, 0];
  }

  return [h, m];
}

async function getSystemSettingsOrDefaults() {
  const settings = await prisma.systemSettings.findFirst({
    select: {
      maxSessionEndTime: true,
      breakDuration: true
    }
  });

  return {
    maxSessionEndTime: settings?.maxSessionEndTime ?? DEFAULT_MAX_SESSION_END_TIME,
    breakDuration: settings?.breakDuration ?? DEFAULT_BREAK_DURATION_MINUTES,
  };
}

function getNextOccurrenceLocalTime(hour: number, minute: number) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

function isBetweenInclusive(value: number, start: number, end: number) {
  return value >= start && value <= end;
}

function getMinutesOfDayLocal(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function isWithinPointageExitReminderWindow(now: Date) {
  const start = POINTAGE_EXIT_REMINDER_START_HOUR * 60 + POINTAGE_EXIT_REMINDER_START_MINUTE;
  const end = start + POINTAGE_EXIT_REMINDER_WINDOW_MINUTES;
  const current = getMinutesOfDayLocal(now);
  return isBetweenInclusive(current, start, end);
}

function scheduleLdapSyncTask() {
  const DEFAULT_INTERVAL_MINUTES = 60;

  const scheduleNext = (intervalMinutes: number) => {
    const safeInterval = Number.isFinite(intervalMinutes) && intervalMinutes > 0 ? intervalMinutes : DEFAULT_INTERVAL_MINUTES;
    const delayMs = safeInterval * 60_000;

    setTimeout(() => {
      void runOnce();
    }, delayMs);

    console.log(`[scheduler:ldap-sync] next run in ${safeInterval} minute(s)`);
  };

  async function runOnce() {
    let intervalMinutes = DEFAULT_INTERVAL_MINUTES;

    try {
      const settings = await prisma.systemSettings.findFirst({
        select: {
          id: true,
          ldapSyncEnabled: true,
          ldapSyncIntervalMinutes: true,
        },
      });

      if (settings?.ldapSyncIntervalMinutes && settings.ldapSyncIntervalMinutes > 0) {
        intervalMinutes = settings.ldapSyncIntervalMinutes;
      }

      if (!settings?.ldapSyncEnabled) {
        console.log("[scheduler:ldap-sync] disabled in system settings, skipping sync");
      } else {
        const now = new Date();
        const { syncedCount } = await syncEmployeesFromLdapCore();

        await prisma.systemSettings.update({
          where: { id: settings.id },
          data: { ldapLastSyncAt: now },
        });

        console.log(`[scheduler:ldap-sync] synchronized ${syncedCount} employees`);
      }
    } catch (err) {
      console.error("[scheduler:ldap-sync] failed", err);
    } finally {
      scheduleNext(intervalMinutes);
    }
  }

  void runOnce();
}

function scheduleDailyTask(hour: number, minute: number, taskName: string, fn: () => Promise<void>) {
  const next = getNextOccurrenceLocalTime(hour, minute);
  const delayMs = Math.max(0, next.getTime() - Date.now());

  setTimeout(async () => {
    try {
      await fn();
    } catch (err) {
      console.error(`[scheduler:${taskName}] failed`, err);
    }

    scheduleDailyTask(hour, minute, taskName, fn);
  }, delayMs);

  console.log(`[scheduler:${taskName}] scheduled at ${next.toLocaleString("fr-FR")}`);
}

function getMinuteKeyLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function startScheduledEmailJobsPolling() {
  const lastRunByJobId = new Map<string, string>();

  const tick = async () => {
    const now = new Date();
    const minuteKey = getMinuteKeyLocal(now);
    const hour = now.getHours();
    const minute = now.getMinutes();

    try {
      const jobs = await prisma.scheduledEmailJob.findMany({
        where: {
          enabled: true,
          hour,
          minute,
        },
        select: {
          id: true,
          type: true,
          weekday: true,
        },
      });

      for (const job of jobs) {
        if (job.type === "WEEKLY_REPORT" && (job.weekday == null || job.weekday < 0 || job.weekday > 6)) {
          continue;
        }

        if (lastRunByJobId.get(job.id) === minuteKey) {
          continue;
        }

        lastRunByJobId.set(job.id, minuteKey);
        console.log(`[scheduler:scheduled-email] triggering ${job.type} (${job.id}) at ${minuteKey}`);
        try {
          await runScheduledEmailJob(job.id);
        } catch (err) {
          console.error(`[scheduler:scheduled-email] job failed (${job.type} ${job.id})`, err);
        }
      }
    } catch (err) {
      console.error("[scheduler:scheduled-email] tick failed", err);
    }
  };

  void tick();
  setInterval(() => {
    void tick();
  }, 30_000);

  console.log("[scheduler:scheduled-email] polling started (every 30s)");
}

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const port = Number(process.env.PORT || 3000);

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  let pointageExitReminderInterval: NodeJS.Timeout | null = null;

  const sendPointageExitReminder = async () => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const activePointages = await prisma.pointage.findMany({
      where: {
        isActive: true,
        entryTime: { not: null },
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: { userId: true },
    });

    const uniqueUserIds = Array.from(new Set(activePointages.map((p) => p.userId)));
    if (uniqueUserIds.length === 0) {
      console.log("[scheduler:pointage-exit-reminder] no active sessions");
      return;
    }

    const timestamp = new Date().toISOString();
    for (const userId of uniqueUserIds) {
      const payload: PointageReminderPayload = {
        userId: userId as string,
        message: "N'oubliez pas de pointer votre heure de départ.",
        timestamp,
      };
      io.emit("employee_pointage_exit_reminder", payload);
    }

    console.log(
      `[scheduler:pointage-exit-reminder] sent to ${uniqueUserIds.length} employees`,
    );
  };

  const startPointageExitReminderWindow = () => {
    if (pointageExitReminderInterval) {
      return;
    }

    const windowStart = new Date();
    const windowEnd = new Date(windowStart);
    windowEnd.setMinutes(windowEnd.getMinutes() + POINTAGE_EXIT_REMINDER_WINDOW_MINUTES);

    console.log(
      `[scheduler:pointage-exit-reminder] window started (${windowStart.toLocaleTimeString("fr-FR")} → ${windowEnd.toLocaleTimeString("fr-FR")})`,
    );

    void sendPointageExitReminder();

    pointageExitReminderInterval = setInterval(() => {
      const now = new Date();

      if (!isWithinPointageExitReminderWindow(now)) {
        if (pointageExitReminderInterval) {
          clearInterval(pointageExitReminderInterval);
          pointageExitReminderInterval = null;
        }
        console.log("[scheduler:pointage-exit-reminder] window ended");
        return;
      }

      void sendPointageExitReminder();
    }, POINTAGE_EXIT_REMINDER_INTERVAL_MS);
  };

  const autoCloseActivePointages = async () => {
    const { maxSessionEndTime, breakDuration } = await getSystemSettingsOrDefaults();
    const [maxH, maxM] = parseTimeToHM(maxSessionEndTime);

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const actives = await prisma.pointage.findMany({
      where: {
        isActive: true,
        entryTime: { not: null },
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        userId: true,
        date: true,
        entryTime: true,
      },
    });

    if (actives.length === 0) {
      console.log("[scheduler:auto-close-pointages] no active pointages");
      return;
    }

    const updates = actives.map((active) => {
      const entryDate = new Date(active.date);
      const [h, m] = (active.entryTime ?? "00:00").split(":");
      entryDate.setHours(Number(h), Number(m), 0, 0);

      const cutoff = new Date(entryDate);
      cutoff.setHours(maxH, maxM, 0, 0);

      const endDate = cutoff;
      const exitTime = endDate.toTimeString().slice(0, 5);

      let durationMinutes = Math.max(
        0,
        Math.floor((endDate.getTime() - entryDate.getTime()) / 60000),
      );

      if (durationMinutes > breakDuration) {
        durationMinutes -= breakDuration;
      }

      return prisma.pointage.update({
        where: { id: active.id },
        data: {
          exitTime,
          duration: durationMinutes,
          isActive: false,
        },
      });
    });

    await prisma.$transaction(updates);
    console.log(`[scheduler:auto-close-pointages] closed ${actives.length} pointages`);
  };

  io.on("connection", (socket: Socket) => {
    console.log("Client connected");

    socket.on("employee_late_alert", (payload: LateAlertPayload) => {
      io.emit("employee_late_alert", payload);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Server with Next.js and Socket.io running on http://localhost:${port}`);
  });

  scheduleDailyTask(
    POINTAGE_EXIT_REMINDER_START_HOUR,
    POINTAGE_EXIT_REMINDER_START_MINUTE,
    "pointage-exit-reminder",
    async () => {
      startPointageExitReminderWindow();
    },
  );

  if (isWithinPointageExitReminderWindow(new Date())) {
    startPointageExitReminderWindow();
  }

  (async () => {
    try {
      const { maxSessionEndTime } = await getSystemSettingsOrDefaults();
      const [maxH, maxM] = parseTimeToHM(maxSessionEndTime);
      scheduleDailyTask(maxH, maxM, "auto-close-pointages", autoCloseActivePointages);
    } catch (err) {
      console.error("[scheduler:auto-close-pointages] unable to schedule", err);
    }
  })();

  // Scheduled email jobs (daily / weekly reports)
  startScheduledEmailJobsPolling();

  try {
    scheduleLdapSyncTask();
  } catch (err) {
    console.error("[scheduler:ldap-sync] unable to schedule", err);
  }
});
