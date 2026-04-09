# Life-Log

Dashboard personale in Next.js per gestire abitudini, spese e note usando un solo file locale `data.json`.

## Flusso

1. Apri il sito senza login.
2. Trascina `data.json` nel browser oppure crea un archivio vuoto.
3. Visualizza KPI, grafico spese, tabella e calendario.
4. Aggiungi nuove spese, abitudini completate o note.
5. Scarica il JSON aggiornato e sovrascrivi il file precedente.

## Avvio

```bash
npm install
npm run dev
```

## Schema JSON

```json
{
  "meta": {
    "title": "Life-Log",
    "version": 1,
    "currency": "EUR",
    "updatedAt": "2026-04-09T08:00:00.000Z"
  },
  "habits": [
    {
      "id": "habit-read",
      "name": "Lettura",
      "color": "#f25f5c"
    }
  ],
  "habitEntries": [
    {
      "id": "entry-1",
      "habitId": "habit-read",
      "date": "2026-04-09"
    }
  ],
  "expenses": [
    {
      "id": "expense-1",
      "date": "2026-04-09",
      "category": "Spesa",
      "amount": 42.8,
      "note": "Mercato"
    }
  ],
  "notes": [
    {
      "id": "note-1",
      "date": "2026-04-09",
      "title": "Focus",
      "content": "Ridurre spese impulsive."
    }
  ]
}
```

È incluso anche [`public/sample-data.json`](public/sample-data.json) come dataset demo.
