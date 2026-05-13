import { escapeHtml } from "./utils.js";

export function createCalendarController({ config, elements }) {
  const { calendarLayout } = elements;

  async function loadCalendar() {
    if (!calendarLayout) return;

    try {
      const response = await fetch(config.calendar?.dataUrl || "./data/calendar-events.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Calendar request failed: ${response.status}`);
      renderCalendar(await response.json());
    } catch (error) {
      renderCalendar({ events: [] });
    }
  }

  function renderCalendar(data) {
    const sources = config.calendar?.sources || [];
    const events = Array.isArray(data.events) ? data.events : [];
    const sourceById = new Map(sources.map((source) => [source.id, source]));

    calendarLayout.innerHTML = `
      <section class="calendar-panel">
        <header class="calendar-header">
          <div>
            <p>Shared display account</p>
            <h2>Today and upcoming</h2>
          </div>
          <div class="calendar-source-list">
            ${sources.map((source) => `<span style="--source-color: ${escapeHtml(source.color)}">${escapeHtml(source.label)}</span>`).join("")}
          </div>
        </header>
        <div class="calendar-events">
          ${events.length ? events.map((event) => renderCalendarEvent(event, sourceById)).join("") : renderCalendarEmptyState()}
        </div>
      </section>
    `;
  }

  function renderCalendarEvent(event, sourceById) {
    const source = sourceById.get(event.sourceId) || {};
    const color = source.color || event.color || "#8fbce6";
    return `
      <article class="calendar-event" style="--source-color: ${escapeHtml(color)}">
        <time>${escapeHtml(event.start || "All day")}</time>
        <div>
          <strong>${escapeHtml(event.title || "Untitled event")}</strong>
          <span>${escapeHtml(source.label || event.sourceId || "Calendar")}</span>
        </div>
      </article>
    `;
  }

  function renderCalendarEmptyState() {
    return `
      <div class="calendar-empty">
        <strong>Calendar source ready</strong>
        <span>Connect a display Google account, then write normalized events to data/calendar-events.json or replace this loader with Calendar API events.list.</span>
      </div>
    `;
  }

  return { loadCalendar };
}
