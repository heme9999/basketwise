const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const storageKey = 'basketwise-planner-v1';
const rowsHost = document.getElementById('basket-rows');
const budgetInput = document.getElementById('budget');
const starterRows = [{ name: '', qty: 1, price: '' }, { name: '', qty: 1, price: '' }, { name: '', qty: 1, price: '' }];
let planner = { budget: 75, rows: starterRows };
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved && Array.isArray(saved.rows) && Number.isFinite(Number(saved.budget))) planner = { budget: saved.budget, rows: saved.rows.slice(0, 100) };
} catch (_) {}
function savePlanner() { try { localStorage.setItem(storageKey, JSON.stringify(planner)); } catch (_) {} }
function updatePlanner() {
  const budget = Math.max(0, Number(budgetInput.value) || 0);
  const total = planner.rows.reduce((sum, row) => sum + Math.max(0, Number(row.qty) || 0) * Math.max(0, Number(row.price) || 0), 0);
  const difference = budget - total;
  document.getElementById('basket-total').textContent = money(total);
  document.getElementById('basket-balance').textContent = money(Math.abs(difference));
  document.getElementById('basket-balance').classList.toggle('over', difference < 0);
  document.getElementById('balance-label').textContent = difference < 0 ? 'Over budget' : 'Left in budget';
  document.getElementById('budget-note').textContent = total === 0 ? 'Enter your list to see how it fits your budget.' : difference < 0 ? `Your basket is ${money(-difference)} over budget. Review quantities or compare unit prices.` : `Your planned basket fits the budget with ${money(difference)} left.`;
  planner.budget = budgetInput.value;
  savePlanner();
}
function renderRows() {
  rowsHost.replaceChildren();
  planner.rows.forEach((row, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'basket-row';
    const name = document.createElement('input');
    name.type = 'text'; name.placeholder = 'e.g. oats'; name.value = row.name || ''; name.setAttribute('aria-label', `Item ${index + 1} name`);
    const qty = document.createElement('input');
    qty.type = 'number'; qty.min = '0'; qty.step = '1'; qty.value = row.qty ?? 1; qty.setAttribute('aria-label', `Item ${index + 1} quantity`);
    const price = document.createElement('input');
    price.type = 'number'; price.min = '0'; price.step = '0.01'; price.placeholder = '$0.00'; price.value = row.price ?? ''; price.setAttribute('aria-label', `Item ${index + 1} price each`);
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remove item ${index + 1}`);
    name.addEventListener('input', () => { row.name = name.value; savePlanner(); });
    qty.addEventListener('input', () => { row.qty = qty.value; updatePlanner(); });
    price.addEventListener('input', () => { row.price = price.value; updatePlanner(); });
    remove.addEventListener('click', () => { planner.rows.splice(index, 1); renderRows(); updatePlanner(); });
    wrapper.append(name, qty, price, remove);
    rowsHost.append(wrapper);
  });
  updatePlanner();
}
if (rowsHost) {
  budgetInput.value = planner.budget;
  renderRows();
  budgetInput.addEventListener('input', updatePlanner);
  document.getElementById('add-item').addEventListener('click', () => { planner.rows.push({ name: '', qty: 1, price: '' }); renderRows(); rowsHost.lastElementChild.querySelector('input').focus(); });
  const undoButton = document.getElementById('undo-list');
  let clearedRows = null;
  document.getElementById('clear-list').addEventListener('click', () => {
    if (!planner.rows.some(row => row.name || Number(row.price) > 0)) return;
    clearedRows = planner.rows.map(row => ({ ...row }));
    planner.rows = [{ name: '', qty: 1, price: '' }];
    renderRows();
    undoButton.hidden = false;
    undoButton.focus();
  });
  undoButton.addEventListener('click', () => {
    if (!clearedRows) return;
    planner.rows = clearedRows;
    clearedRows = null;
    undoButton.hidden = true;
    renderRows();
  });
  document.getElementById('print-list').addEventListener('click', () => window.print());
}
const unitFields = ['a-price', 'a-size', 'a-unit', 'b-price', 'b-size', 'b-unit'].map(id => document.getElementById(id));
function compareUnits() {
  const [aPrice, aSize, aUnit, bPrice, bSize, bUnit] = unitFields.map(field => field.tagName === 'SELECT' ? field.value : Number(field.value));
  const message = document.getElementById('compare-verdict');
  if (!(aPrice > 0 && bPrice > 0 && aSize > 0 && bSize > 0)) { document.getElementById('a-result').textContent = '—'; document.getElementById('b-result').textContent = '—'; message.textContent = 'Enter prices and package sizes greater than zero.'; return; }
  const mass = unit => unit === 'oz' || unit === 'lb';
  if (aUnit !== bUnit && !(mass(aUnit) && mass(bUnit))) { document.getElementById('a-result').textContent = '—'; document.getElementById('b-result').textContent = '—'; message.textContent = 'Choose matching units, or compare ounces with pounds.'; return; }
  const unit = mass(aUnit) ? 'oz' : aUnit === 'fl-oz' ? 'fl oz' : 'item';
  const aAmount = aUnit === 'lb' ? aSize * 16 : aSize;
  const bAmount = bUnit === 'lb' ? bSize * 16 : bSize;
  const a = aPrice / aAmount, b = bPrice / bAmount;
  document.getElementById('a-result').textContent = `$${a.toFixed(3)} / ${unit}`;
  document.getElementById('b-result').textContent = `$${b.toFixed(3)} / ${unit}`;
  if (Math.abs(a - b) < 0.0005) message.textContent = 'The unit prices are nearly equal. Choose the package size you will use and can afford today.';
  else {
    const winner = a < b ? 'A' : 'B';
    const extra = (winner === 'A' ? aPrice : bPrice) - (winner === 'A' ? bPrice : aPrice);
    message.textContent = `Option ${winner} has the lower unit price${extra > 0 ? `, but costs ${money(extra)} more at checkout` : ` and costs ${money(-extra)} less at checkout`}.`;
  }
}
if (unitFields.every(Boolean)) { unitFields.forEach(field => field.addEventListener('input', compareUnits)); compareUnits(); }
const promoFields = ['price', 'quantity', 'discount', 'needed'].map(id => document.getElementById(id));
function calculatePromotion() {
  const [price, quantity, discount, needed] = promoFields.map(field => Number(field.value));
  const verdict = document.getElementById('verdict');
  if (!(price > 0 && Number.isInteger(quantity) && quantity >= 2 && discount >= 0 && discount < price * quantity && Number.isInteger(needed) && needed >= 1)) { ['promo-total', 'needed-total', 'extra-total'].forEach(id => document.getElementById(id).textContent = '—'); verdict.textContent = 'Enter a valid price, required quantity, discount, and number of items needed.'; return; }
  const checkoutQty = Math.max(quantity, needed), promo = price * checkoutQty - discount, baseline = price * needed, extra = promo - baseline;
  document.getElementById('promo-total').textContent = money(promo);
  document.getElementById('needed-total').textContent = money(baseline);
  document.getElementById('extra-total').textContent = extra >= 0 ? money(extra) : '−' + money(-extra);
  verdict.textContent = extra > 0 ? `The offer lowers the unit price, but you would spend ${money(extra)} more today for ${checkoutQty - needed} extra item${checkoutQty - needed === 1 ? '' : 's'}.` : `If you need all ${needed} items, this offer saves ${money(-extra)} versus regular price.`;
}
if (promoFields.every(Boolean)) { promoFields.forEach(field => field.addEventListener('input', calculatePromotion)); calculatePromotion(); }
