const STORAGE_KEY = 'picu-payment-tracker-v2';
const LEGACY_STORAGE_KEY = 'picu-payment-tracker-v1';
const DEFAULT_BASE = 52000;
const PAGE_SIZE = 15;

const state = {
  ...loadState(),
  filters: {
    query: '',
    day: '',
    page: 1,
  },
};

const baseAmountInput = document.getElementById('baseAmount');
const personForm = document.getElementById('personForm');
const nameInput = document.getElementById('nameInput');
const dayInput = document.getElementById('dayInput');
const scheduleInput = document.getElementById('scheduleInput');
const peopleTableBody = document.getElementById('peopleTableBody');
const emptyMessage = document.getElementById('emptyMessage');
const resetPaymentsButton = document.getElementById('resetPayments');
const rowTemplate = document.getElementById('personRowTemplate');
const searchInput = document.getElementById('searchInput');
const dayFilter = document.getElementById('dayFilter');
const pagination = document.getElementById('pagination');
const totalExpected = document.getElementById('totalExpected');
const totalPaid = document.getElementById('totalPaid');
const totalPending = document.getElementById('totalPending');

baseAmountInput.value = state.baseAmount;

baseAmountInput.addEventListener('input', () => {
  const parsed = Number(baseAmountInput.value);
  if (Number.isFinite(parsed) && parsed >= 0) {
    state.baseAmount = parsed;
    saveState();
    render();
  }
});

personForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const day = dayInput.value;
  const schedule = scheduleInput.value.trim();

  if (!name || !schedule || !day) {
    return;
  }

  state.people.push({
    id: crypto.randomUUID(),
    name,
    day,
    schedule,
    paid: false,
  });

  personForm.reset();
  saveState();
  render();
});

resetPaymentsButton.addEventListener('click', () => {
  state.people = state.people.map((person) => ({ ...person, paid: false }));
  saveState();
  render();
});

searchInput.addEventListener('input', () => {
  state.filters.query = searchInput.value.trim().toLowerCase();
  state.filters.page = 1;
  render();
});

dayFilter.addEventListener('change', () => {
  state.filters.day = dayFilter.value;
  state.filters.page = 1;
  render();
});

function loadState() {
  const fallback = { baseAmount: DEFAULT_BASE, people: [] };
  const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      baseAmount:
        Number.isFinite(parsed.baseAmount) && parsed.baseAmount >= 0
          ? parsed.baseAmount
          : DEFAULT_BASE,
      people: Array.isArray(parsed.people)
        ? parsed.people.map((p) => ({
            id: typeof p.id === 'string' ? p.id : crypto.randomUUID(),
            name: typeof p.name === 'string' ? p.name : '',
            day: typeof p.day === 'string' ? p.day : 'Lunes',
            schedule: typeof p.schedule === 'string' ? p.schedule : '',
            paid: Boolean(p.paid),
          }))
        : [],
    };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ baseAmount: state.baseAmount, people: state.people }),
  );
}

function getFilteredPeople() {
  return state.people.filter((person) => {
    const matchesQuery = person.name.toLowerCase().includes(state.filters.query);
    const matchesDay = !state.filters.day || person.day === state.filters.day;
    return matchesQuery && matchesDay;
  });
}

function render() {
  const filtered = getFilteredPeople();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  if (state.filters.page > totalPages) {
    state.filters.page = totalPages;
  }

  const start = (state.filters.page - 1) * PAGE_SIZE;
  const visiblePeople = filtered.slice(start, start + PAGE_SIZE);

  peopleTableBody.innerHTML = '';

  visiblePeople.forEach((person) => {
    const row = rowTemplate.content.firstElementChild.cloneNode(true);
    const paidCheckbox = row.querySelector('.paidCheckbox');
    const nameField = row.querySelector('.nameField');
    const dayField = row.querySelector('.dayField');
    const scheduleField = row.querySelector('.scheduleField');
    const amount = row.querySelector('.amount');
    const deleteBtn = row.querySelector('.deleteBtn');

    paidCheckbox.checked = person.paid;
    nameField.value = person.name;
    dayField.value = person.day;
    scheduleField.value = person.schedule;
    amount.textContent = formatMoney(state.baseAmount);

    paidCheckbox.addEventListener('change', () => {
      person.paid = paidCheckbox.checked;
      saveState();
      updateSummary();
    });

    nameField.addEventListener('change', () => {
      person.name = nameField.value.trim();
      saveState();
    });

    dayField.addEventListener('change', () => {
      person.day = dayField.value;
      saveState();
      render();
    });

    scheduleField.addEventListener('change', () => {
      person.schedule = scheduleField.value.trim();
      saveState();
    });

    deleteBtn.addEventListener('click', () => {
      state.people = state.people.filter((p) => p.id !== person.id);
      saveState();
      render();
    });

    peopleTableBody.appendChild(row);
  });

  renderPagination(totalPages);
  emptyMessage.style.display = filtered.length === 0 ? 'block' : 'none';
  updateSummary();
}

function renderPagination(totalPages) {
  pagination.innerHTML = '';

  if (totalPages <= 1) {
    return;
  }

  for (let page = 1; page <= totalPages; page += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `page-btn ${page === state.filters.page ? 'active' : ''}`;
    btn.textContent = String(page);

    btn.addEventListener('click', () => {
      state.filters.page = page;
      render();
    });

    pagination.appendChild(btn);
  }
}

function updateSummary() {
  const expected = state.people.length * state.baseAmount;
  const collected = state.people.filter((p) => p.paid).length * state.baseAmount;
  const pending = expected - collected;

  totalExpected.textContent = formatMoney(expected);
  totalPaid.textContent = formatMoney(collected);
  totalPending.textContent = formatMoney(pending);
}

function formatMoney(value) {
  return `$${value.toLocaleString('es-AR')}`;
}

render();
