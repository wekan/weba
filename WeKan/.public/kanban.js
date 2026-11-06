/* MIT License. Reports embedded in a Gambas WebContainer. */
(function (root) {
  'use strict';
  const summary = cards => ['Todo', 'Doing', 'Done'].map(status => ({status, count: cards.filter(c => c.status === status).length}));
  const monthDays = (year, month) => new Date(year, month + 1, 0).getDate();
  function render() {
    document.querySelectorAll('.weba-content').forEach(section => {
      const data = section.querySelector('.weba-data'), report = section.querySelector('.weba-report');
      if (!data || !report) return;
      report.replaceChildren(); data.hidden = false;
      const cards = [...data.querySelectorAll('.weba-card')], view = section.dataset.view;
      function add(parent, tag, text, cls) {
        const el = document.createElement(tag);
        if (text !== undefined) el.textContent = text;
        if (cls) el.className = cls;
        parent.append(el); return el;
      }
      if (view === 'Lists' || view === 'Swimlanes') {
        const lanes = view === 'Swimlanes' ? [...new Set(cards.map(c => c.dataset.lane || 'Default'))] : ['All cards'];
        lanes.forEach(lane => {
          add(report, 'h3', lane);
          const columns = add(report, 'div', undefined, 'weba-columns');
          ['Todo', 'Doing', 'Done'].forEach(status => {
            const column = add(columns, 'section', undefined, 'weba-column');
            add(column, 'h4', status);
            cards.filter(c => c.dataset.status === status && (view !== 'Swimlanes' || (c.dataset.lane || 'Default') === lane)).forEach(c => column.append(c.cloneNode(true)));
          });
        });
      } else if (view === 'Calendar') {
        const now = new Date(), controls = add(report, 'div', undefined, 'weba-calendar-controls');
        const previous = add(controls, 'button', 'Previous month'), label = add(controls, 'strong'), next = add(controls, 'button', 'Next month');
        previous.type = next.type = 'button';
        const grid = add(report, 'div', undefined, 'weba-calendar');
        let year = now.getFullYear(), month = now.getMonth();
        function draw() {
          grid.replaceChildren();
          label.textContent = new Date(year, month, 1).toLocaleDateString(undefined, {year:'numeric', month:'long'});
          ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d => add(grid, 'strong', d));
          for (let i = 0; i < (new Date(year, month, 1).getDay() + 6) % 7; i++) add(grid, 'div');
          for (let d = 1; d <= monthDays(year, month); d++) {
            const cell = add(grid, 'section', undefined, 'weba-day'); add(cell, 'strong', String(d));
            const iso = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            cards.filter(c => c.dataset.due === iso).forEach(c => cell.append(c.cloneNode(true)));
          }
        }
        function shift(delta) { const date = new Date(year, month + delta, 1); year = date.getFullYear(); month = date.getMonth(); draw(); }
        previous.onclick = () => shift(-1); next.onclick = () => shift(1); draw();
        if (cards.some(c => !c.dataset.due)) add(report, 'h3', 'No due date');
        cards.filter(c => !c.dataset.due).forEach(c => report.append(c.cloneNode(true)));
      } else if (view === 'Charts') {
        add(report, 'h3', 'Cards by status');
        summary(cards.map(c => c.dataset)).forEach(({status,count}) => {
          const row = add(report, 'div', undefined, 'weba-chart-row'); add(row, 'span', `${status}: ${count}`);
          const meter = add(row, 'meter'); meter.min = 0; meter.max = Math.max(cards.length,1); meter.value = count;
          meter.setAttribute('aria-label', `${status}: ${count} cards`);
        });
        add(report, 'p', `Total: ${cards.length} cards. Current counts, without inferred history.`);
      } else if (view === 'Table' || view === 'Gantt') {
        const table = add(report, 'table'), header = add(add(table, 'thead'), 'tr');
        ['Card','Status','Swimlane','Due date'].forEach(t => add(header, 'th', t));
        if (view === 'Gantt') add(header, 'th', 'Milestone');
        const body = add(table, 'tbody');
        cards.slice().sort((a,b) => view === 'Gantt' ? a.dataset.due.localeCompare(b.dataset.due) : 0).forEach(card => {
          const row = add(body, 'tr');
          [card.querySelector('strong').textContent,card.dataset.status,card.dataset.lane,card.dataset.due || 'No due date'].forEach(t => add(row,'td',t));
          if (view === 'Gantt') add(add(row,'td'),'span',card.dataset.due ? '◆ '+card.dataset.due : 'Unscheduled','weba-milestone');
        });
        if (view === 'Gantt') add(report,'p','Due-date milestones. Durations and dependencies are not recorded yet.');
      } else {
        if (!cards.length) add(report,'p','No cards. Create a board, select it in the tree and add a card.');
        return;
      }
      data.hidden = true;
    });
  }
  root.webaRender = render;
  if (typeof module !== 'undefined') module.exports = {summary, monthDays};
})(typeof window === 'undefined' ? globalThis : window);
