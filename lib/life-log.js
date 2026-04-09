const DEFAULT_CURRENCY = "EUR";

export const HABIT_COLORS = [
  "#f25f5c",
  "#247ba0",
  "#70c1b3",
  "#f7b267",
  "#7d5ba6",
  "#2f4858",
];

export function createId(prefix = "item") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

export function parseDateValue(value) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

    if (match) {
      return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        12,
        0,
        0,
        0,
      );
    }

    return new Date(trimmed);
  }

  return new Date(value);
}

export function normalizeDate(value) {
  if (!value) {
    return "";
  }

  const date = parseDateValue(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(
    date.getDate(),
  )}`;
}

export function createEmptyData() {
  return {
    meta: {
      title: "Life-Log",
      version: 1,
      currency: DEFAULT_CURRENCY,
      updatedAt: new Date().toISOString(),
    },
    habits: [],
    habitEntries: [],
    expenses: [],
    notes: [],
  };
}

export function normalizeData(raw) {
  const base = createEmptyData();
  const source = raw && typeof raw === "object" ? raw : {};

  const habits = Array.isArray(source.habits)
    ? source.habits
        .map((habit, index) => {
          if (!habit || typeof habit !== "object") {
            return null;
          }

          const name = typeof habit.name === "string" ? habit.name.trim() : "";

          if (!name) {
            return null;
          }

          return {
            id: typeof habit.id === "string" && habit.id ? habit.id : createId("habit"),
            name,
            color:
              typeof habit.color === "string" && habit.color
                ? habit.color
                : HABIT_COLORS[index % HABIT_COLORS.length],
          };
        })
        .filter(Boolean)
    : [];

  const habitIds = new Set(habits.map((habit) => habit.id));

  const habitEntries = Array.isArray(source.habitEntries)
    ? source.habitEntries
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }

          const date = normalizeDate(entry.date);
          const habitId =
            typeof entry.habitId === "string" && habitIds.has(entry.habitId)
              ? entry.habitId
              : "";

          if (!date || !habitId) {
            return null;
          }

          return {
            id: typeof entry.id === "string" && entry.id ? entry.id : createId("entry"),
            habitId,
            date,
          };
        })
        .filter(Boolean)
    : [];

  const expenses = Array.isArray(source.expenses)
    ? source.expenses
        .map((expense) => {
          if (!expense || typeof expense !== "object") {
            return null;
          }

          const amount = Number.parseFloat(expense.amount);
          const date = normalizeDate(expense.date);
          const category =
            typeof expense.category === "string" && expense.category.trim()
              ? expense.category.trim()
              : "Generale";

          if (!date || Number.isNaN(amount)) {
            return null;
          }

          return {
            id:
              typeof expense.id === "string" && expense.id
                ? expense.id
                : createId("expense"),
            date,
            category,
            amount,
            note: typeof expense.note === "string" ? expense.note.trim() : "",
          };
        })
        .filter(Boolean)
    : [];

  const notes = Array.isArray(source.notes)
    ? source.notes
        .map((note) => {
          if (!note || typeof note !== "object") {
            return null;
          }

          const date = normalizeDate(note.date);
          const title = typeof note.title === "string" ? note.title.trim() : "";
          const content = typeof note.content === "string" ? note.content.trim() : "";

          if (!date || (!title && !content)) {
            return null;
          }

          return {
            id: typeof note.id === "string" && note.id ? note.id : createId("note"),
            date,
            title: title || "Nota",
            content,
          };
        })
        .filter(Boolean)
    : [];

  return {
    meta: {
      ...base.meta,
      ...(source.meta && typeof source.meta === "object" ? source.meta : {}),
      currency:
        typeof source.meta?.currency === "string" && source.meta.currency
          ? source.meta.currency
          : DEFAULT_CURRENCY,
      updatedAt:
        typeof source.meta?.updatedAt === "string" && source.meta.updatedAt
          ? source.meta.updatedAt
          : new Date().toISOString(),
    },
    habits,
    habitEntries,
    expenses,
    notes,
  };
}

export function serializeData(data) {
  const snapshot = {
    ...data,
    meta: {
      ...data.meta,
      updatedAt: new Date().toISOString(),
    },
  };

  return JSON.stringify(snapshot, null, 2);
}

export function compareByDateDesc(left, right) {
  return parseDateValue(right.date).getTime() - parseDateValue(left.date).getTime();
}

export function getMonthKey(value) {
  return normalizeDate(value).slice(0, 7);
}

export function getHabitStats(entries, habitId, referenceDate = new Date()) {
  const dates = Array.from(
    new Set(
      entries
        .filter((entry) => entry.habitId === habitId)
        .map((entry) => normalizeDate(entry.date))
        .filter(Boolean),
    ),
  ).sort();

  if (dates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedAt: "",
      totalCompletions: 0,
    };
  }

  const completedDates = new Set(dates);
  const dayMillis = 24 * 60 * 60 * 1000;
  let currentStreak = 0;
  let cursor = parseDateValue(referenceDate);

  while (completedDates.has(normalizeDate(cursor))) {
    currentStreak += 1;
    cursor = new Date(cursor.getTime() - dayMillis);
  }

  let longestStreak = 0;
  let streak = 0;
  let previousTime = null;

  dates.forEach((dateValue) => {
    const time = parseDateValue(dateValue).getTime();

    if (previousTime !== null && Math.round((time - previousTime) / dayMillis) === 1) {
      streak += 1;
    } else {
      streak = 1;
    }

    longestStreak = Math.max(longestStreak, streak);
    previousTime = time;
  });

  return {
    currentStreak,
    longestStreak,
    lastCompletedAt: dates[dates.length - 1],
    totalCompletions: dates.length,
  };
}

export function getMonthSeries(baseDate = new Date(), count = 6) {
  return Array.from({ length: count }).map((_, index) => {
    const cursor = new Date(baseDate.getFullYear(), baseDate.getMonth() - (count - index - 1), 1);
    const key = normalizeDate(cursor).slice(0, 7);

    return {
      key,
      label: cursor.toLocaleDateString("it-IT", {
        month: "short",
        year: "2-digit",
      }),
    };
  });
}

export function getMonthName(value) {
  return value.toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });
}

export function getCalendarCells(monthCursor) {
  const firstDay = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const lastDay = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
  const leadingSlots = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const cells = [];

  for (let index = 0; index < leadingSlots; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day);
    cells.push({
      date: normalizeDate(date),
      day,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}
