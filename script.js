import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const db = window.db;

const DEFAULT_BASE = 56000;
const PAGE_SIZE = 15;

const state = {
  baseAmount: DEFAULT_BASE,
  people: [],
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
const personAmountInput = document.getElementById('personAmountInput');
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
personAmountInput.value = state.baseAmount;

// 🔥 TIEMPO REAL (CLAVE)
onSnapshot(collection(db, "alumnos"), (snapshot) => {
  state.people = [];

  snapshot.forEach((docSnap) => {
    state.people.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  render();
});

// ➕ AGREGAR
personForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const day = dayInput.value;
  const schedule = scheduleInput.value.trim();
  const amount = Number(personAmountInput.value);

  if (!name || !schedule || !day || !Number.isFinite(amount) || amount < 0) return;

  await addDoc(collection(db, "alumnos"), {
    name,
    day,
    schedule,
    amount,
    paid: false,
  });

  personForm.reset();
  personAmountInput.value = state.baseAmount;
});

// 🔄 RESET PAGOS
resetPaymentsButton.addEventListener('click', async () => {
  for (const person of state.people) {
    await updateDoc(doc(db, "alumnos", person.id), {
      paid: false
    });
  }
});

// 🔍 FILTROS
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

function getFilteredPeople() {
  return state.people.filter((person) => {
    const matchesQuery = person.name.toLowerCase().includes(state.filters.query);
    const matchesDay = !state.filters.day || person.day === state.filters.day;
    return matchesQuery && matchesDay;
  });
}

// 🎨 RENDER
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
    const amountField = row.querySelector('.amountField');
    const deleteBtn = row.querySelector('.deleteBtn');

    paidCheckbox.checked = person.paid;
    nameField.value = person.name;
    dayField.value = person.day;
    scheduleField.value = person.schedule;
    amountField.value = person.amount;

    paidCheckbox.addEventListener('change', async () => {
      await updateDoc(doc(db, "alumnos", person.id), {
        paid: paidCheckbox.checked
      });
    });

    nameField.addEventListener('change', async () => {
      await updateDoc(doc(db, "alumnos", person.id), {
        name: nameField.value.trim()
      });
    });

    dayField.addEventListener('change', async () => {
      await updateDoc(doc(db, "alumnos", person.id), {
        day: dayField.value
      });
    });

    scheduleField.addEventListener('change', async () => {
      await updateDoc(doc(db, "alumnos", person.id), {
        schedule: scheduleField.value.trim()
      });
    });

    amountField.addEventListener('change', async () => {
      const nextAmount = Number(amountField.value);
      if (Number.isFinite(nextAmount) && nextAmount >= 0) {
        await updateDoc(doc(db, "alumnos", person.id), {
          amount: nextAmount
        });
      }
    });

    deleteBtn.addEventListener('click', async () => {
      await deleteDoc(doc(db, "alumnos", person.id));
    });

    peopleTableBody.appendChild(row);
  });

  renderPagination(totalPages);
  emptyMessage.style.display = filtered.length === 0 ? 'block' : 'none';
  updateSummary();
}

function renderPagination(totalPages) {
  pagination.innerHTML = '';
  if (totalPages <= 1) return;

  for (let page = 1; page <= totalPages; page++) {
    const btn = document.createElement('button');
    btn.textContent = page;
    btn.className = page === state.filters.page ? 'active' : '';

    btn.addEventListener('click', () => {
      state.filters.page = page;
      render();
    });

    pagination.appendChild(btn);
  }
}

function updateSummary() {
  const expected = state.people.reduce((sum, p) => sum + p.amount, 0);
  const collected = state.people.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
  const pending = expected - collected;

  totalExpected.textContent = `$${expected.toLocaleString('es-AR')}`;
  totalPaid.textContent = `$${collected.toLocaleString('es-AR')}`;
  totalPending.textContent = `$${pending.toLocaleString('es-AR')}`;
}