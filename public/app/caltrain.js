import { escapeHtml, parseCsv } from "./utils.js";

export function createCaltrainController({ config, elements, getActiveView }) {
  const { caltrainLayout } = elements;
  let caltrainStateTimer = null;

  async function loadCaltrain() {
    if (!caltrainLayout) return;
    caltrainLayout.innerHTML = `<div class="empty-state">Loading Caltrain schedule</div>`;

    try {
      const response = await fetch(config.caltrainDataUrl || "./data/caltrain-commute.csv", { cache: "no-store" });
      if (!response.ok) throw new Error(`Caltrain schedule request failed: ${response.status}`);
      const rows = parseCsv(await response.text());
      renderCaltrain(rows);
    } catch (error) {
      console.error(error);
      caltrainLayout.innerHTML = `<div class="empty-state">Caltrain schedule is unavailable. Check data/caltrain-commute.csv.</div>`;
    }
  }

  function startStatusRefresh() {
    window.clearInterval(caltrainStateTimer);
    caltrainStateTimer = setInterval(() => updateCaltrainState({ centerRunning: getActiveView() === "caltrain" }), 30 * 1000);
  }

  function renderCaltrain(rows) {
    const panels = [
      {
        name: "Morning northbound",
        title: "Sunnyvale to San Francisco",
        subtitle: "Weekday commute, 5:00-10:00 AM"
      },
      {
        name: "Evening southbound",
        title: "San Francisco to Sunnyvale",
        subtitle: "Weekday commute, 3:00-10:00 PM"
      }
    ];

    caltrainLayout.innerHTML = panels.map((panel, panelIndex) => {
      const trains = rows.filter((row) => row.panel === panel.name);
      if (!trains.length) {
        return `
          <section class="caltrain-panel">
            <header class="caltrain-panel-header">
              <div>
                <p>${escapeHtml(panel.subtitle)}</p>
                <h2>${escapeHtml(panel.title)}</h2>
              </div>
            </header>
            <div class="empty-state">No weekday trains found for this window.</div>
          </section>
        `;
      }

      return `
        <section class="caltrain-panel">
          <header class="caltrain-panel-header">
            <div>
              <p>${escapeHtml(panel.subtitle)}</p>
              <h2>${escapeHtml(panel.title)}</h2>
            </div>
            <span>${trains.length} trains</span>
          </header>
          <div class="train-table" data-panel-index="${panelIndex}">
            ${trains.map(renderTrainRow).join("")}
          </div>
        </section>
      `;
    }).join("");
    updateCaltrainState({ centerRunning: getActiveView() === "caltrain" });
  }

  function renderTrainRow(row) {
    const style = `--train-color: ${escapeHtml(row.color)}; --train-text: ${escapeHtml(row.text_color)};`;
    return `
      <article class="train-row" data-depart="${escapeHtml(row.depart)}" data-arrive="${escapeHtml(row.arrive)}" data-train="${escapeHtml(row.train)}" style="${style}">
        <div class="train-time">
          <strong>${escapeHtml(row.depart)}</strong>
          <span class="train-time-arrow">→</span>
          <span>${escapeHtml(row.arrive)}</span>
        </div>
        <div class="train-route">
          <span class="train-pill">${escapeHtml(row.service)}</span>
          <strong>#${escapeHtml(row.train)}</strong>
        </div>
        <div class="train-duration">${escapeHtml(row.duration)}</div>
      </article>
    `;
  }

  function updateCaltrainState({ centerRunning = false } = {}) {
    if (!caltrainLayout) return;
    const nowMinutes = getCurrentLocalMinutes();
    const runningRows = [];

    [...caltrainLayout.querySelectorAll(".train-row")].forEach((row) => {
      const departMinutes = parseScheduleMinutes(row.dataset.depart);
      const arriveMinutes = parseScheduleMinutes(row.dataset.arrive);
      const isRunning = nowMinutes >= departMinutes && nowMinutes < arriveMinutes;
      const isDeparted = nowMinutes >= arriveMinutes;

      row.classList.toggle("train-row-running", isRunning);
      row.classList.toggle("train-row-departed", isDeparted);
      row.classList.toggle("train-row-upcoming", !isRunning && !isDeparted);
      row.dataset.status = isRunning ? "running" : isDeparted ? "departed" : "upcoming";
      if (isRunning) runningRows.push(row);
    });

    if (centerRunning) {
      window.requestAnimationFrame(() => centerRunningRows(runningRows));
    }
  }

  function centerRunningRows(rows) {
    rows.forEach((row) => {
      const table = row.closest(".train-table");
      if (!table) return;
      const currentKey = row.dataset.train || row.dataset.depart;
      if (table.dataset.centeredTrain === currentKey) return;
      table.dataset.centeredTrain = currentKey;
      table.scrollTo({
        top: Math.max(0, row.offsetTop - table.clientHeight / 2 + row.clientHeight / 2),
        behavior: "smooth"
      });
    });
  }

  return { loadCaltrain, startStatusRefresh, updateCaltrainState };
}

function getCurrentLocalMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function parseScheduleMinutes(value) {
  const [hour = "0", minute = "0"] = String(value).split(":");
  return Number(hour) * 60 + Number(minute);
}
