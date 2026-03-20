const STOCK_STORAGE_KEY = 'picu-stock-tracker-v1';
const STOCK_PAGE_SIZE = 12;
const LOW_STOCK_THRESHOLD = 3;

const stockState = {
  ...loadStockState(),
  filters: {
    query: '',
    unit: '',
    alert: '',
    page: 1,
  },
};

const productForm = document.getElementById('productForm');
const productNameInput = document.getElementById('productNameInput');
const productCategoryInput = document.getElementById('productCategoryInput');
const productUnitInput = document.getElementById('productUnitInput');
const productQuantityInput = document.getElementById('productQuantityInput');
const productSearchInput = document.getElementById('productSearchInput');
const unitFilter = document.getElementById('unitFilter');
const alertFilter = document.getElementById('alertFilter');
const stockTableBody = document.getElementById('stockTableBody');
const stockPagination = document.getElementById('stockPagination');
const stockEmptyMessage = document.getElementById('stockEmptyMessage');
const stockRowTemplate = document.getElementById('stockRowTemplate');
const totalProducts = document.getElementById('totalProducts');
const totalQuantity = document.getElementById('totalQuantity');
const lowStockCount = document.getElementById('lowStockCount');

productForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = productNameInput.value.trim();
  const category = productCategoryInput.value.trim();
  const unit = productUnitInput.value;
  const quantity = Number(productQuantityInput.value);

  if (!name || !unit || !Number.isFinite(quantity) || quantity < 0) {
    return;
  }

  stockState.products.push({
    id: crypto.randomUUID(),
    name,
    category,
    unit,
    quantity,
  });

  productForm.reset();
  productUnitInput.value = 'unidad';
  saveStockState();
  renderStock();
});

productSearchInput.addEventListener('input', () => {
  stockState.filters.query = productSearchInput.value.trim().toLowerCase();
  stockState.filters.page = 1;
  renderStock();
});

unitFilter.addEventListener('change', () => {
  stockState.filters.unit = unitFilter.value;
  stockState.filters.page = 1;
  renderStock();
});

alertFilter.addEventListener('change', () => {
  stockState.filters.alert = alertFilter.value;
  stockState.filters.page = 1;
  renderStock();
});

function loadStockState() {
  const fallback = { products: [] };
  const raw = localStorage.getItem(STOCK_STORAGE_KEY);

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      products: Array.isArray(parsed.products)
        ? parsed.products.map((product) => ({
            id: typeof product.id === 'string' ? product.id : crypto.randomUUID(),
            name: typeof product.name === 'string' ? product.name : '',
            category: typeof product.category === 'string' ? product.category : '',
            unit: ['unidad', 'kg', 'ml'].includes(product.unit) ? product.unit : 'unidad',
            quantity: Number.isFinite(product.quantity) ? product.quantity : 0,
          }))
        : [],
    };
  } catch {
    return fallback;
  }
}

function saveStockState() {
  localStorage.setItem(
    STOCK_STORAGE_KEY,
    JSON.stringify({ products: stockState.products }),
  );
}

function isLowStock(product) {
  return product.quantity < LOW_STOCK_THRESHOLD;
}

function getFilteredProducts() {
  return stockState.products.filter((product) => {
    const haystack = `${product.name} ${product.category}`.toLowerCase();
    const matchesQuery = haystack.includes(stockState.filters.query);
    const matchesUnit = !stockState.filters.unit || product.unit === stockState.filters.unit;
    const low = isLowStock(product);
    const matchesAlert =
      !stockState.filters.alert ||
      (stockState.filters.alert === 'low' && low) ||
      (stockState.filters.alert === 'ok' && !low);

    return matchesQuery && matchesUnit && matchesAlert;
  });
}

function renderStock() {
  const filtered = getFilteredProducts();
  const totalPages = Math.max(1, Math.ceil(filtered.length / STOCK_PAGE_SIZE));

  if (stockState.filters.page > totalPages) {
    stockState.filters.page = totalPages;
  }

  const start = (stockState.filters.page - 1) * STOCK_PAGE_SIZE;
  const visibleProducts = filtered.slice(start, start + STOCK_PAGE_SIZE);

  stockTableBody.innerHTML = '';

  visibleProducts.forEach((product) => {
    const row = stockRowTemplate.content.firstElementChild.cloneNode(true);
    const productNameField = row.querySelector('.productNameField');
    const productCategoryField = row.querySelector('.productCategoryField');
    const productQuantityField = row.querySelector('.productQuantityField');
    const productUnitField = row.querySelector('.productUnitField');
    const stockStatus = row.querySelector('.stock-status');
    const deleteProductBtn = row.querySelector('.deleteProductBtn');

    productNameField.value = product.name;
    productCategoryField.value = product.category;
    productQuantityField.value = normalizeQuantity(product.quantity);
    productUnitField.value = product.unit;

    paintStockStatus(stockStatus, product);

    productNameField.addEventListener('change', () => {
      product.name = productNameField.value.trim();
      saveStockState();
      renderStock();
    });

    productCategoryField.addEventListener('change', () => {
      product.category = productCategoryField.value.trim();
      saveStockState();
      renderStock();
    });

    productQuantityField.addEventListener('change', () => {
      const nextQuantity = Number(productQuantityField.value);
      product.quantity = Number.isFinite(nextQuantity) && nextQuantity >= 0 ? nextQuantity : product.quantity;
      saveStockState();
      renderStock();
    });

    productUnitField.addEventListener('change', () => {
      product.unit = productUnitField.value;
      saveStockState();
      renderStock();
    });

    deleteProductBtn.addEventListener('click', () => {
      stockState.products = stockState.products.filter((item) => item.id !== product.id);
      saveStockState();
      renderStock();
    });

    stockTableBody.appendChild(row);
  });

  renderStockPagination(totalPages);
  stockEmptyMessage.style.display = filtered.length === 0 ? 'block' : 'none';
  updateStockSummary();
}

function paintStockStatus(node, product) {
  const low = isLowStock(product);
  node.className = `stock-status ${low ? 'low' : 'ok'}`;
  node.textContent = low ? 'Stock bajo' : 'Stock normal';
}

function renderStockPagination(totalPages) {
  stockPagination.innerHTML = '';

  if (totalPages <= 1) {
    return;
  }

  for (let page = 1; page <= totalPages; page += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `page-btn ${page === stockState.filters.page ? 'active' : ''}`;
    btn.textContent = String(page);

    btn.addEventListener('click', () => {
      stockState.filters.page = page;
      renderStock();
    });

    stockPagination.appendChild(btn);
  }
}

function updateStockSummary() {
  const productCount = stockState.products.length;
  const quantityCount = stockState.products.reduce((sum, product) => sum + product.quantity, 0);
  const lowCount = stockState.products.filter(isLowStock).length;

  totalProducts.textContent = String(productCount);
  totalQuantity.textContent = formatQuantity(quantityCount);
  lowStockCount.textContent = String(lowCount);
}

function formatQuantity(value) {
  return Number.isInteger(value) ? String(value) : value.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

function normalizeQuantity(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

renderStock();
