export type PointagesReportRow = {
  fullName: string;
  position: string;
  checkIn: string;
  checkOut: string;
  breakStart: string;
  breakEnd: string;
  breakDuration: string;
  workDuration: string;
};

export interface PointagesReportTemplateInput {
  periodLabel: string;
  generatedAtLabel: string;
  rows: PointagesReportRow[];
}

export interface PointagesEmployeeReportTemplateInput {
  periodLabel: string;
  generatedAtLabel: string;
  employeeLabel: string;
  departmentLabel: string;
  positionLabel: string;
  rows: Array<Omit<PointagesReportRow, "fullName"> & { dateLabel: string; lateLabel: string }>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cell(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  return v ? escapeHtml(v) : "—";
}

export function renderPointagesReportHtml(input: PointagesReportTemplateInput): string {
  const rowsHtml =
    input.rows.length > 0
      ? input.rows
          .map(
            (r) => `
              <tr>
                <td class="col-name">${cell(r.fullName)}</td>
                <td class="col-position">${cell(r.position)}</td>
                <td class="col-time">${cell(r.checkIn)}</td>
                <td class="col-time">${cell(r.checkOut)}</td>
                <td class="col-time">${cell(r.breakStart)}</td>
                <td class="col-time">${cell(r.breakEnd)}</td>
                <td class="col-duration">${cell(r.breakDuration)}</td>
                <td class="col-duration">${cell(r.workDuration)}</td>
              </tr>`,
          )
          .join("")
      : `
          <tr>
            <td class="empty" colspan="8">Aucune donnée disponible pour cette période.</td>
          </tr>`;

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Rapport quotidien des pointages</title>
    <style>
      @page {
        size: A4 landscape;
        margin: 12mm;
      }

      :root {
        --bg: #ffffff;
        --panel: #ffffff;

        --text: #0f172a;
        --muted: rgba(15, 23, 42, 0.65);

        --blue: #2f6bff;
        --blue-2: #1f4ed8;

        --border: rgba(15, 23, 42, 0.14);
        --border-strong: rgba(15, 23, 42, 0.22);

        --shadow: 0 12px 30px rgba(15, 23, 42, 0.10);
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        height: 100%;
      }

      body {
        margin: 0;
        color: var(--text);
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial,
          "Apple Color Emoji", "Segoe UI Emoji";
        background: var(--bg);
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .page {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: stretch;
        justify-content: center;
      }

      .container {
        width: 100%;
        max-width: 1100px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .header {
        display: grid;
        grid-template-columns: 260px 1fr 220px;
        gap: 12px;
        align-items: center;
        padding: 16px 18px;
        border: 1px solid var(--border);
        background: var(--panel);
        border-radius: 14px;
        box-shadow: var(--shadow);
      }

      .brand {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .logo {
        width: 52px;
        height: 52px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: radial-gradient(
            18px 18px at 30% 30%,
            rgba(255, 255, 255, 0.35),
            transparent 60%
          ),
          linear-gradient(180deg, rgba(47, 107, 255, 1), rgba(31, 78, 216, 1));
        border: 1px solid rgba(255, 255, 255, 0.22);
        position: relative;
        overflow: hidden;
      }

      .logo svg {
        width: 30px;
        height: 30px;
        filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.35));
      }

      .brand-text {
        display: flex;
        flex-direction: column;
        line-height: 1.05;
      }

      .brand-text .name {
        font-weight: 800;
        letter-spacing: 0.2px;
        font-size: 16px;
      }

      .brand-text .subtitle {
        margin-top: 4px;
        font-size: 12px;
        color: var(--muted);
        letter-spacing: 0.2px;
      }

      .title-wrap {
        text-align: center;
      }

      .title {
        font-weight: 900;
        letter-spacing: 1.6px;
        font-size: 18px;
        text-transform: uppercase;
        display: inline-block;
        padding-bottom: 6px;
        border-bottom: 2px solid rgba(15, 23, 42, 0.22);
      }

      .meta {
        text-align: right;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .meta .label {
        font-size: 11px;
        color: var(--muted);
        letter-spacing: 0.3px;
        text-transform: uppercase;
      }

      .meta .value {
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.3px;
      }

      .meta .chip {
        align-self: flex-end;
        font-size: 11px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid var(--border-strong);
        background: rgba(47, 107, 255, 0.12);
        color: rgba(15, 23, 42, 0.92);
        letter-spacing: 0.2px;
      }

      .card {
        border: 1px solid var(--border);
        background: var(--panel);
        border-radius: 14px;
        overflow: hidden;
        box-shadow: var(--shadow);
      }

      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      thead th {
        background: linear-gradient(180deg, var(--blue), var(--blue-2));
        color: #ffffff;
        font-weight: 800;
        font-size: 12px;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        padding: 12px 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.22);
        border-right: 1px solid rgba(255, 255, 255, 0.18);
      }

      thead th:last-child {
        border-right: none;
      }

      tbody td {
        padding: 12px 10px;
        border-top: 1px solid rgba(15, 23, 42, 0.10);
        border-right: 1px solid rgba(15, 23, 42, 0.10);
        font-size: 12.5px;
        color: rgba(15, 23, 42, 0.92);
        vertical-align: middle;
      }

      tbody tr:nth-child(odd) td {
        background: rgba(15, 23, 42, 0.02);
      }

      tbody tr:nth-child(even) td {
        background: rgba(15, 23, 42, 0.01);
      }

      tbody td:last-child {
        border-right: none;
      }

      .col-name {
        width: 28%;
        text-align: left;
        font-weight: 750;
      }

      .col-position {
        width: 18%;
        text-align: left;
        color: rgba(15, 23, 42, 0.75);
        font-weight: 650;
      }

      .col-time {
        width: 10.8%;
        text-align: center;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.2px;
      }

      .col-duration {
        width: 12.2%;
        text-align: center;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.2px;
        font-weight: 700;
      }

      .empty {
        padding: 18px;
        text-align: center;
        color: rgba(15, 23, 42, 0.65);
        font-size: 12.5px;
      }

      .footer {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 4px 0 4px;
        color: rgba(15, 23, 42, 0.55);
        font-size: 11px;
      }

      .footer .right {
        text-align: right;
      }
    </style>
  </head>

  <body>
    <div class="page">
      <div class="container">
        <header class="header">
          <div class="brand">
            <div class="logo" aria-label="Elite Time">
              <svg viewBox="0 0 24 24" fill="none" role="img" aria-hidden="true">
                <path
                  d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z"
                  stroke="rgba(255,255,255,0.92)"
                  stroke-width="1.6"
                />
                <path
                  d="M12 6v6l4 2"
                  stroke="rgba(255,255,255,0.92)"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M12 3.2v1.6"
                  stroke="rgba(255,255,255,0.65)"
                  stroke-width="1.4"
                  stroke-linecap="round"
                />
              </svg>
            </div>
            <div class="brand-text">
              <div class="name">Elite Time</div>
              <div class="subtitle">Rapport RH</div>
            </div>
          </div>

          <div class="title-wrap">
            <div class="title">RAPPORT QUOTIDIEN DES POINTAGES</div>
          </div>

          <div class="meta">
            <div>
              <div class="label">Période</div>
              <div class="value">${escapeHtml(input.periodLabel)}</div>
            </div>
            <div class="chip">A4 · Landscape</div>
          </div>
        </header>

        <section class="card">
          <table>
            <thead>
              <tr>
                <th class="col-name">Nom(s) et Prénom(s)</th>
                <th class="col-position">Poste</th>
                <th class="col-time">Entrée</th>
                <th class="col-time">Sortie</th>
                <th class="col-time">Début pause</th>
                <th class="col-time">Fin pause</th>
                <th class="col-duration">Durée pauses</th>
                <th class="col-duration">Durée travail</th>
              </tr>
            </thead>

            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </section>

        <div class="footer">
          <div class="left">Elite Time · Rapport officiel RH</div>
          <div class="right">Généré le ${escapeHtml(input.generatedAtLabel)}</div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

export function renderPointagesEmployeeReportHtml(
  input: PointagesEmployeeReportTemplateInput
): string {
  const rowsHtml =
    input.rows.length > 0
      ? input.rows
          .map(
            (r) => `
              <tr>
                <td class="col-date">${cell(r.dateLabel)}</td>
                <td class="col-position">${cell(r.position)}</td>
                <td class="col-time">${cell(r.checkIn)}</td>
                <td class="col-late">${cell(r.lateLabel)}</td>
                <td class="col-time">${cell(r.checkOut)}</td>
                <td class="col-time">${cell(r.breakStart)}</td>
                <td class="col-time">${cell(r.breakEnd)}</td>
                <td class="col-duration">${cell(r.breakDuration)}</td>
                <td class="col-duration">${cell(r.workDuration)}</td>
              </tr>`,
          )
          .join("")
      : `
          <tr>
            <td class="empty" colspan="9">Aucune donnée disponible pour cette période.</td>
          </tr>`;

  const metaBlock = `
    <div class="meta">
      <div>
        <div class="label">Employé</div>
        <div class="value">${escapeHtml(input.employeeLabel)}</div>
      </div>
      <div>
        <div class="label">Département</div>
        <div class="value">${escapeHtml(input.departmentLabel)}</div>
      </div>
      <div>
        <div class="label">Poste</div>
        <div class="value">${escapeHtml(input.positionLabel)}</div>
      </div>
      <div class="chip">A4 · Landscape</div>
    </div>`;

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Rapport individuel des pointages</title>
    <style>
      @page {
        size: A4 landscape;
        margin: 12mm;
      }

      :root {
        --bg: #ffffff;
        --panel: #ffffff;

        --text: #0f172a;
        --muted: rgba(15, 23, 42, 0.65);

        --blue: #2f6bff;
        --blue-2: #1f4ed8;

        --border: rgba(15, 23, 42, 0.14);
        --border-strong: rgba(15, 23, 42, 0.22);

        --shadow: 0 12px 30px rgba(15, 23, 42, 0.10);
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        height: 100%;
      }

      body {
        margin: 0;
        color: var(--text);
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial,
          "Apple Color Emoji", "Segoe UI Emoji";
        background: var(--bg);
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .page {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: stretch;
        justify-content: center;
      }

      .container {
        width: 100%;
        max-width: 1100px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .header {
        display: grid;
        grid-template-columns: 260px 1fr 320px;
        gap: 12px;
        align-items: center;
        padding: 16px 18px;
        border: 1px solid var(--border);
        background: var(--panel);
        border-radius: 14px;
        box-shadow: var(--shadow);
      }

      .brand {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .logo {
        width: 52px;
        height: 52px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: radial-gradient(
            18px 18px at 30% 30%,
            rgba(255, 255, 255, 0.35),
            transparent 60%
          ),
          linear-gradient(180deg, rgba(47, 107, 255, 1), rgba(31, 78, 216, 1));
        border: 1px solid rgba(255, 255, 255, 0.22);
        position: relative;
        overflow: hidden;
      }

      .logo svg {
        width: 30px;
        height: 30px;
        filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.35));
      }

      .brand-text {
        display: flex;
        flex-direction: column;
        line-height: 1.05;
      }

      .brand-text .name {
        font-weight: 800;
        letter-spacing: 0.2px;
        font-size: 16px;
      }

      .brand-text .subtitle {
        margin-top: 4px;
        font-size: 12px;
        color: var(--muted);
        letter-spacing: 0.2px;
      }

      .title-wrap {
        text-align: center;
      }

      .title {
        font-weight: 900;
        letter-spacing: 1.6px;
        font-size: 18px;
        text-transform: uppercase;
        display: inline-block;
        padding-bottom: 6px;
        border-bottom: 2px solid rgba(15, 23, 42, 0.22);
      }

      .meta {
        text-align: right;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .meta .label {
        font-size: 11px;
        color: var(--muted);
        letter-spacing: 0.3px;
        text-transform: uppercase;
      }

      .meta .value {
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.3px;
      }

      .meta .chip {
        align-self: flex-end;
        font-size: 11px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid var(--border-strong);
        background: rgba(47, 107, 255, 0.12);
        color: rgba(15, 23, 42, 0.92);
        letter-spacing: 0.2px;
      }

      .card {
        border: 1px solid var(--border);
        background: var(--panel);
        border-radius: 14px;
        overflow: hidden;
        box-shadow: var(--shadow);
      }

      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      thead th {
        background: linear-gradient(180deg, var(--blue), var(--blue-2));
        color: #ffffff;
        font-weight: 800;
        font-size: 12px;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        padding: 12px 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.22);
        border-right: 1px solid rgba(255, 255, 255, 0.18);
      }

      thead th:last-child {
        border-right: none;
      }

      tbody td {
        padding: 12px 10px;
        border-top: 1px solid rgba(15, 23, 42, 0.10);
        border-right: 1px solid rgba(15, 23, 42, 0.10);
        font-size: 12.5px;
        color: rgba(15, 23, 42, 0.92);
        vertical-align: middle;
      }

      tbody tr:nth-child(odd) td {
        background: rgba(15, 23, 42, 0.02);
      }

      tbody tr:nth-child(even) td {
        background: rgba(15, 23, 42, 0.01);
      }

      tbody td:last-child {
        border-right: none;
      }

      .col-position {
        width: 22%;
        text-align: left;
        color: rgba(15, 23, 42, 0.75);
        font-weight: 650;
      }

      .col-date {
        width: 12%;
        text-align: center;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.2px;
        font-weight: 750;
      }

      .col-late {
        width: 8%;
        text-align: center;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.2px;
        font-weight: 800;
        color: rgba(185, 28, 28, 0.92);
      }

      .col-time {
        width: 11.6%;
        text-align: center;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.2px;
      }

      .col-duration {
        width: 15.4%;
        text-align: center;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.2px;
        font-weight: 700;
      }

      .empty {
        padding: 18px;
        text-align: center;
        color: rgba(15, 23, 42, 0.65);
        font-size: 12.5px;
      }

      .footer {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 4px 0 4px;
        color: rgba(15, 23, 42, 0.55);
        font-size: 11px;
      }

      .footer .right {
        text-align: right;
      }
    </style>
  </head>

  <body>
    <div class="page">
      <div class="container">
        <header class="header">
          <div class="brand">
            <div class="logo" aria-label="Elite Time">
              <svg viewBox="0 0 24 24" fill="none" role="img" aria-hidden="true">
                <path
                  d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z"
                  stroke="rgba(255,255,255,0.92)"
                  stroke-width="1.6"
                />
                <path
                  d="M12 6v6l4 2"
                  stroke="rgba(255,255,255,0.92)"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M12 3.2v1.6"
                  stroke="rgba(255,255,255,0.65)"
                  stroke-width="1.4"
                  stroke-linecap="round"
                />
              </svg>
            </div>
            <div class="brand-text">
              <div class="name">Elite Time</div>
              <div class="subtitle">Rapport RH</div>
            </div>
          </div>

          <div class="title-wrap">
            <div class="title">RAPPORT INDIVIDUEL DES POINTAGES</div>
          </div>

          ${metaBlock}
        </header>

        <section class="card">
          <table>
            <thead>
              <tr>
                <th class="col-date">Date</th>
                <th class="col-position">Poste</th>
                <th class="col-time">Entrée</th>
                <th class="col-late">Retard</th>
                <th class="col-time">Sortie</th>
                <th class="col-time">Début pause</th>
                <th class="col-time">Fin pause</th>
                <th class="col-duration">Durée pauses</th>
                <th class="col-duration">Durée travail</th>
              </tr>
            </thead>

            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </section>

        <div class="footer">
          <div class="left">Elite Time · Rapport officiel RH</div>
          <div class="right">Période ${escapeHtml(input.periodLabel)} · Généré le ${escapeHtml(input.generatedAtLabel)}</div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}
