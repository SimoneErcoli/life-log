"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import {
  HABIT_COLORS,
  compareByDateDesc,
  createEmptyData,
  createId,
  getCalendarCells,
  getMonthKey,
  getMonthName,
  getMonthSeries,
  normalizeData,
  normalizeDate,
  parseDateValue,
  serializeData,
} from "../lib/life-log";

const WEEK_DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function formatCurrency(value, currency) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatShortDate(value) {
  return parseDateValue(value).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  });
}

function createLookup(entries) {
  return entries.reduce((accumulator, entry) => {
    if (!accumulator[entry.date]) {
      accumulator[entry.date] = [];
    }

    accumulator[entry.date].push(entry.habitId);
    return accumulator;
  }, {});
}

export default function LifeLogDashboard() {
  const today = normalizeDate(new Date());
  const fileInputRef = useRef(null);

  const [data, setData] = useState(() => createEmptyData());
  const [fileName, setFileName] = useState("data.json");
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState("Trascina data.json oppure parti da un archivio vuoto.");
  const [isDirty, setIsDirty] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  const [expenseForm, setExpenseForm] = useState({
    date: today,
    category: "Casa",
    amount: "",
    note: "",
  });
  const [habitForm, setHabitForm] = useState({
    name: "",
    color: HABIT_COLORS[0],
  });
  const [noteForm, setNoteForm] = useState({
    date: today,
    title: "",
    content: "",
  });

  useEffect(() => {
    if (!selectedHabitId && data.habits[0]) {
      setSelectedHabitId(data.habits[0].id);
      return;
    }

    if (selectedHabitId && !data.habits.some((habit) => habit.id === selectedHabitId)) {
      setSelectedHabitId(data.habits[0]?.id || "");
    }
  }, [data.habits, selectedHabitId]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function commitData(updater, message) {
    setData((current) => {
      const draft = typeof updater === "function" ? updater(current) : updater;
      return {
        ...draft,
        meta: {
          ...draft.meta,
          updatedAt: new Date().toISOString(),
        },
      };
    });
    setIsDirty(true);
    if (message) {
      setStatus(message);
    }
  }

  async function applyImportedData(rawData, nextFileName, message) {
    const normalized = normalizeData(rawData);

    startTransition(() => {
      setData(normalized);
      setFileName(nextFileName || "data.json");
      setIsDirty(false);
      setStatus(message);
    });
  }

  async function handleFile(file) {
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      await applyImportedData(payload, file.name, `${file.name} caricato correttamente.`);
    } catch (error) {
      setStatus(`Import fallito: ${error instanceof Error ? error.message : "JSON non valido."}`);
    }
  }

  async function loadSample() {
    try {
      const response = await fetch("/sample-data.json");
      const payload = await response.json();
      await applyImportedData(payload, "data.json", "Archivio demo caricato.");
    } catch {
      setStatus("Impossibile caricare il file demo.");
    }
  }

  function handleDownload() {
    const snapshot = {
      ...data,
      meta: {
        ...data.meta,
        updatedAt: new Date().toISOString(),
      },
    };

    const blob = new Blob([serializeData(snapshot)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = fileName || "data.json";
    anchor.click();
    URL.revokeObjectURL(url);

    setData(snapshot);
    setIsDirty(false);
    setStatus("Download avviato. Puoi sovrascrivere il vecchio data.json.");
  }

  function handleCreateBlank() {
    const blank = createEmptyData();
    setData(blank);
    setFileName("data.json");
    setIsDirty(true);
    setStatus("Archivio vuoto creato. Aggiungi dati e poi scarica il file.");
  }

  function handleExpenseSubmit(event) {
    event.preventDefault();

    const amount = Number.parseFloat(expenseForm.amount);

    if (Number.isNaN(amount) || amount <= 0) {
      setStatus("Inserisci un importo valido maggiore di zero.");
      return;
    }

    const expense = {
      id: createId("expense"),
      date: normalizeDate(expenseForm.date) || today,
      category: expenseForm.category.trim() || "Generale",
      amount,
      note: expenseForm.note.trim(),
    };

    commitData(
      (current) => ({
        ...current,
        expenses: [expense, ...current.expenses].sort(compareByDateDesc),
      }),
      "Spesa aggiunta.",
    );

    setExpenseForm((current) => ({
      ...current,
      amount: "",
      note: "",
    }));
  }

  function handleHabitSubmit(event) {
    event.preventDefault();

    const name = habitForm.name.trim();

    if (!name) {
      setStatus("Inserisci il nome di un'abitudine.");
      return;
    }

    const habit = {
      id: createId("habit"),
      name,
      color: habitForm.color,
    };

    commitData(
      (current) => ({
        ...current,
        habits: [...current.habits, habit],
      }),
      "Abitudine creata.",
    );

    setHabitForm({
      name: "",
      color: HABIT_COLORS[(data.habits.length + 1) % HABIT_COLORS.length],
    });
    setSelectedHabitId(habit.id);
  }

  function handleNoteSubmit(event) {
    event.preventDefault();

    const title = noteForm.title.trim();
    const content = noteForm.content.trim();

    if (!title && !content) {
      setStatus("Scrivi almeno un titolo o il contenuto della nota.");
      return;
    }

    const note = {
      id: createId("note"),
      date: normalizeDate(noteForm.date) || today,
      title: title || "Nota",
      content,
    };

    commitData(
      (current) => ({
        ...current,
        notes: [note, ...current.notes].sort(compareByDateDesc),
      }),
      "Nota aggiunta.",
    );

    setNoteForm({
      date: today,
      title: "",
      content: "",
    });
  }

  function toggleHabitForDate(habitId, date) {
    if (!habitId) {
      setStatus("Crea o seleziona un'abitudine prima di usare il calendario.");
      return;
    }

    const exists = data.habitEntries.some(
      (entry) => entry.habitId === habitId && entry.date === date,
    );

    commitData(
      (current) => ({
        ...current,
        habitEntries: exists
          ? current.habitEntries.filter(
              (entry) => !(entry.habitId === habitId && entry.date === date),
            )
          : [{ id: createId("entry"), habitId, date }, ...current.habitEntries].sort(
              compareByDateDesc,
            ),
      }),
      exists ? "Completamento rimosso." : "Completamento registrato.",
    );
  }

  const currentMonthKey = getMonthKey(new Date());
  const monthlyExpenseTotal = data.expenses
    .filter((expense) => getMonthKey(expense.date) === currentMonthKey)
    .reduce((total, expense) => total + expense.amount, 0);
  const monthHabitHits = data.habitEntries.filter(
    (entry) => getMonthKey(entry.date) === currentMonthKey,
  ).length;
  const currency = data.meta.currency || "EUR";
  const expenseSeries = getMonthSeries(new Date(), 6).map((month) => ({
    ...month,
    total: data.expenses
      .filter((expense) => getMonthKey(expense.date) === month.key)
      .reduce((sum, expense) => sum + expense.amount, 0),
  }));
  const maxExpense = Math.max(...expenseSeries.map((month) => month.total), 1);
  const habitsByDate = createLookup(data.habitEntries);
  const calendarCells = getCalendarCells(calendarMonth);
  const selectedHabitEntries = new Set(
    data.habitEntries
      .filter((entry) => entry.habitId === selectedHabitId)
      .map((entry) => entry.date),
  );
  const recentExpenses = [...data.expenses].sort(compareByDateDesc).slice(0, 8);
  const recentNotes = [...data.notes].sort(compareByDateDesc).slice(0, 5);

  return (
    <section className="dashboard-grid">
      <div className="dashboard-main">
        <div
          className={`panel dropzone ${dragActive ? "is-drag-active" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setDragActive(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            handleFile(event.dataTransfer.files?.[0]);
          }}
        >
          <div>
            <p className="panel-kicker">File locale</p>
            <h2>{fileName}</h2>
            <p className="muted-text">
              Il dashboard non salva nulla lato server. Tutto resta in memoria
              finché non scarichi il file aggiornato.
            </p>
          </div>

          <div className="dropzone-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => fileInputRef.current?.click()}
            >
              Importa JSON
            </button>
            <button type="button" className="ghost-button" onClick={loadSample}>
              Carica demo
            </button>
            <button type="button" className="ghost-button" onClick={handleCreateBlank}>
              Nuovo archivio
            </button>
            <button type="button" className="accent-button" onClick={handleDownload}>
              Scarica data.json
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          <div className="status-row">
            <span className={`status-pill ${isDirty ? "is-dirty" : ""}`}>
              {isDirty ? "Modifiche non salvate" : "Sincronizzato col file"}
            </span>
            <p>{status}</p>
          </div>
        </div>

        <div className="stats-grid">
          <article className="stat-card">
            <p>Spese del mese</p>
            <strong>{formatCurrency(monthlyExpenseTotal, currency)}</strong>
          </article>
          <article className="stat-card">
            <p>Abitudini registrate</p>
            <strong>{data.habits.length}</strong>
          </article>
          <article className="stat-card">
            <p>Completamenti mensili</p>
            <strong>{monthHabitHits}</strong>
          </article>
          <article className="stat-card">
            <p>Note archiviate</p>
            <strong>{data.notes.length}</strong>
          </article>
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="panel-kicker">Trend</p>
              <h2>Spese degli ultimi 6 mesi</h2>
            </div>
            <p className="muted-text">
              Grafico generato direttamente da <code>expenses</code>.
            </p>
          </div>

          <div className="chart-grid">
            {expenseSeries.map((month) => (
              <div key={month.key} className="bar-group">
                <span>{formatCurrency(month.total, currency)}</span>
                <div className="bar-shell">
                  <div
                    className="bar-fill"
                    style={{
                      height: `${(month.total / maxExpense) * 100}%`,
                    }}
                  />
                </div>
                <strong>{month.label}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="editor-grid">
          <form className="panel form-panel" onSubmit={handleExpenseSubmit}>
            <div className="section-heading">
              <div>
                <p className="panel-kicker">Editing</p>
                <h2>Nuova spesa</h2>
              </div>
            </div>
            <label>
              Data
              <input
                type="date"
                value={expenseForm.date}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Categoria
              <input
                type="text"
                value={expenseForm.category}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                placeholder="Spesa, casa, trasporti..."
              />
            </label>
            <label>
              Importo
              <input
                type="number"
                min="0"
                step="0.01"
                value={expenseForm.amount}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                placeholder="0.00"
              />
            </label>
            <label>
              Nota
              <input
                type="text"
                value={expenseForm.note}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder="Descrizione opzionale"
              />
            </label>
            <button type="submit" className="primary-button">
              Aggiungi spesa
            </button>
          </form>

          <form className="panel form-panel" onSubmit={handleHabitSubmit}>
            <div className="section-heading">
              <div>
                <p className="panel-kicker">Editing</p>
                <h2>Nuova abitudine</h2>
              </div>
            </div>
            <label>
              Nome
              <input
                type="text"
                value={habitForm.name}
                onChange={(event) =>
                  setHabitForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Camminata, lettura, acqua..."
              />
            </label>
            <label>
              Colore
              <div className="color-row">
                {HABIT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-dot ${habitForm.color === color ? "is-selected" : ""}`}
                    style={{ backgroundColor: color }}
                    onClick={() =>
                      setHabitForm((current) => ({
                        ...current,
                        color,
                      }))
                    }
                    aria-label={`Seleziona ${color}`}
                  />
                ))}
              </div>
            </label>
            <button type="submit" className="primary-button">
              Aggiungi abitudine
            </button>
            <div className="habit-list">
              {data.habits.length === 0 ? (
                <p className="muted-text">Ancora nessuna abitudine configurata.</p>
              ) : (
                data.habits.map((habit) => (
                  <div key={habit.id} className="habit-chip">
                    <button
                      type="button"
                      className="habit-toggle"
                      onClick={() => toggleHabitForDate(habit.id, today)}
                    >
                      <span style={{ backgroundColor: habit.color }} />
                      {habit.name}
                    </button>
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() =>
                        commitData(
                          (current) => ({
                            ...current,
                            habits: current.habits.filter((item) => item.id !== habit.id),
                            habitEntries: current.habitEntries.filter(
                              (entry) => entry.habitId !== habit.id,
                            ),
                          }),
                          "Abitudine rimossa.",
                        )
                      }
                    >
                      Elimina
                    </button>
                  </div>
                ))
              )}
            </div>
          </form>

          <form className="panel form-panel" onSubmit={handleNoteSubmit}>
            <div className="section-heading">
              <div>
                <p className="panel-kicker">Editing</p>
                <h2>Nuova nota</h2>
              </div>
            </div>
            <label>
              Data
              <input
                type="date"
                value={noteForm.date}
                onChange={(event) =>
                  setNoteForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Titolo
              <input
                type="text"
                value={noteForm.title}
                onChange={(event) =>
                  setNoteForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Pensiero rapido"
              />
            </label>
            <label>
              Contenuto
              <textarea
                rows="4"
                value={noteForm.content}
                onChange={(event) =>
                  setNoteForm((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                placeholder="Scrivi una nota breve..."
              />
            </label>
            <button type="submit" className="primary-button">
              Salva nota
            </button>
          </form>
        </div>
      </div>

      <aside className="dashboard-side">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="panel-kicker">Calendario</p>
              <h2>{getMonthName(calendarMonth)}</h2>
            </div>
            <div className="calendar-nav">
              <button
                type="button"
                className="ghost-button"
                onClick={() =>
                  setCalendarMonth(
                    (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                  )
                }
              >
                Prec
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() =>
                  setCalendarMonth(
                    (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                  )
                }
              >
                Succ
              </button>
            </div>
          </div>

          <label className="calendar-select">
            Abitudine da segnare
            <select
              value={selectedHabitId}
              onChange={(event) => setSelectedHabitId(event.target.value)}
            >
              <option value="">Seleziona</option>
              {data.habits.map((habit) => (
                <option key={habit.id} value={habit.id}>
                  {habit.name}
                </option>
              ))}
            </select>
          </label>

          <div className="calendar-grid">
            {WEEK_DAYS.map((day) => (
              <span key={day} className="calendar-head">
                {day}
              </span>
            ))}
            {calendarCells.map((cell, index) =>
              cell ? (
                <button
                  key={cell.date}
                  type="button"
                  className={`calendar-cell ${
                    selectedHabitEntries.has(cell.date) ? "is-complete" : ""
                  }`}
                  onClick={() => toggleHabitForDate(selectedHabitId, cell.date)}
                >
                  <strong>{cell.day}</strong>
                  <div className="calendar-tags">
                    {(habitsByDate[cell.date] || []).slice(0, 3).map((habitId) => {
                      const habit = data.habits.find((item) => item.id === habitId);

                      if (!habit) {
                        return null;
                      }

                      return (
                        <span
                          key={`${cell.date}-${habit.id}`}
                          style={{ backgroundColor: habit.color }}
                        />
                      );
                    })}
                  </div>
                </button>
              ) : (
                <div key={`empty-${index}`} className="calendar-empty" />
              ),
            )}
          </div>
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="panel-kicker">Tabella</p>
              <h2>Ultime spese</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Categoria</th>
                  <th>Nota</th>
                  <th>Importo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recentExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-cell">
                      Nessuna spesa registrata.
                    </td>
                  </tr>
                ) : (
                  recentExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{formatShortDate(expense.date)}</td>
                      <td>{expense.category}</td>
                      <td>{expense.note || "—"}</td>
                      <td>{formatCurrency(expense.amount, currency)}</td>
                      <td>
                        <button
                          type="button"
                          className="delete-button"
                          onClick={() =>
                            commitData(
                              (current) => ({
                                ...current,
                                expenses: current.expenses.filter(
                                  (item) => item.id !== expense.id,
                                ),
                              }),
                              "Spesa rimossa.",
                            )
                          }
                        >
                          Elimina
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="panel-kicker">Archivio</p>
              <h2>Note recenti</h2>
            </div>
          </div>
          <div className="notes-stack">
            {recentNotes.length === 0 ? (
              <p className="muted-text">Ancora nessuna nota salvata.</p>
            ) : (
              recentNotes.map((note) => (
                <article key={note.id} className="note-card">
                  <div className="note-head">
                    <strong>{note.title}</strong>
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() =>
                        commitData(
                          (current) => ({
                            ...current,
                            notes: current.notes.filter((item) => item.id !== note.id),
                          }),
                          "Nota rimossa.",
                        )
                      }
                    >
                      Elimina
                    </button>
                  </div>
                  <span>{formatShortDate(note.date)}</span>
                  <p>{note.content || "Nessun contenuto."}</p>
                </article>
              ))
            )}
          </div>
        </div>
      </aside>
    </section>
  );
}
