/* Educonsult shared client library */
const Auth = {
  get token() { return localStorage.getItem('ec_token'); },
  get user() { try { return JSON.parse(localStorage.getItem('ec_user')); } catch { return null; } },
  set(token, user) { localStorage.setItem('ec_token', token); localStorage.setItem('ec_user', JSON.stringify(user)); },
  clear() { localStorage.removeItem('ec_token'); localStorage.removeItem('ec_user'); },
  logout() { Auth.clear(); location.href = '/'; }
};

async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (Auth.token) headers.Authorization = 'Bearer ' + Auth.token;
  const res = await fetch('/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = {};
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    if (res.status === 401 && Auth.token) { Auth.clear(); }
    throw new Error(data.error || 'Something went wrong.');
  }
  return data;
}

function toast(msg, type = '') {
  let w = document.querySelector('.toast-wrap');
  if (!w) { w = document.createElement('div'); w.className = 'toast-wrap'; document.body.appendChild(w); }
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.textContent = msg;
  w.appendChild(t);
  setTimeout(() => t.remove(), 4200);
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '₹' + Number(n).toLocaleString('en-IN');
const fdate = d => d ? new Date(d.length <= 10 ? d + 'T00:00:00' : d.replace(' ', 'T') + 'Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const TYPE_STYLE = {
  'Engineering': ['linear-gradient(135deg,#12305A,#2F6BD1)', '⚙️'],
  'Management': ['linear-gradient(135deg,#3B2A6B,#7B5CD6)', '📈'],
  'Medical': ['linear-gradient(135deg,#0E5D4B,#2FAE8A)', '🩺'],
  'Arts & Science': ['linear-gradient(135deg,#7A3E1D,#D08B4A)', '🔬'],
  'Law': ['linear-gradient(135deg,#2B2B2B,#6B6B6B)', '⚖️'],
  'Design': ['linear-gradient(135deg,#8A1F5C,#E0589B)', '🎨'],
  'Pharmacy': ['linear-gradient(135deg,#0B5A7A,#38B2D8)', '💊'],
  'Hospitality': ['linear-gradient(135deg,#8C5A12,#E0A93B)', '🍽️'],
  'Agriculture': ['linear-gradient(135deg,#2D6A1F,#7CC04B)', '🌾']
};
const typeStyle = t => TYPE_STYLE[t] || ['linear-gradient(135deg,#12305A,#1B447F)', '🎓'];

function statusBadge(s) {
  const map = { 'Submitted': 'b-blue', 'Under Review': 'b-amber', 'Documents Required': 'b-purple', 'Shortlisted': 'b-amber', 'Admitted': 'b-green', 'Rejected': 'b-red',
    'Pending': 'b-amber', 'Confirmed': 'b-green', 'Completed': 'b-gray', 'Cancelled': 'b-red' };
  return `<span class="badge ${map[s] || 'b-gray'}">${esc(s)}</span>`;
}

function collegeCard(c) {
  const [bg, emoji] = typeStyle(c.type);
  const courses = c.courses.split(',').slice(0, 3).map(x => `<span class="chip">${esc(x)}</span>`).join('');
  return `<article class="college-card reveal">
    <div class="college-banner" style="background:${bg}">
      <span class="tag">${esc(c.type)}</span><span class="rate">★ ${c.rating.toFixed(1)}</span>
      <span class="emoji">${emoji}</span>
    </div>
    <div class="college-body">
      <h3>${esc(c.name)}</h3>
      <p class="loc">📍 ${esc(c.city)}, ${esc(c.state)} · Est. ${c.established}</p>
      <div class="chips">${courses}</div>
      <div class="college-foot">
        <div class="fee">${money(c.fees)}<small>per year</small></div>
        <a class="btn btn-navy btn-sm" href="/college.html?id=${c.id}">View details</a>
      </div>
    </div></article>`;
}

function renderNav() {
  const u = Auth.user;
  const here = location.pathname.split('/').pop() || 'index.html';
  const link = (href, label) => `<a class="link ${here === href ? 'active' : ''}" href="/${href}">${label}</a>`;
  const dash = u ? (u.role === 'admin' ? '/admin.html' : '/dashboard.html') : '/login.html';
  const cta = u
    ? `<a class="btn btn-outline btn-sm" href="${dash}">${u.role === 'admin' ? 'Admin panel' : 'My dashboard'}</a><button class="btn btn-navy btn-sm" onclick="Auth.logout()">Log out</button>`
    : `<a class="btn btn-outline btn-sm" href="/login.html">Log in</a><a class="btn btn-gold btn-sm" href="/login.html?tab=register">Get started</a>`;
  document.getElementById('nav').innerHTML = `
  <nav class="nav"><div class="container nav-inner">
    <a class="logo" href="/"><span class="logo-mark">E</span><span>Edu<span class="gold">consult</span></span></a>
    <button class="menu-btn" aria-label="Menu" onclick="document.querySelector('.nav-links').classList.toggle('open')">☰</button>
    <div class="nav-links">
      ${link('index.html', 'Home')}${link('colleges.html', 'Colleges')}${u && u.role === 'admin' ? '' : link('book.html', 'Free Counselling') + link('contact.html', 'Contact')}
      <div class="nav-cta">${cta}</div>
    </div></div></nav>`;
}

function renderFooter() {
  const el = document.getElementById('footer');
  if (!el) return;
  el.innerHTML = `<footer class="footer"><div class="container">
    <div class="footer-grid">
      <div><a class="logo" href="/"><span class="logo-mark">E</span><span>Educonsult</span></a>
        <p>Expert guidance for every step of your admission journey — from choosing the right course to securing your seat.</p></div>
      <div><h4>Explore</h4><a href="/colleges.html">Find colleges</a><a href="/book.html">Book counselling</a><a href="/login.html?tab=register">Create account</a></div>
      <div><h4>Streams</h4><a href="/colleges.html?type=Engineering">Engineering</a><a href="/colleges.html?type=Medical">Medical</a><a href="/colleges.html?type=Management">Management</a><a href="/colleges.html?type=Law">Law</a></div>
      <div><h4>Get in touch</h4><a href="mailto:hello@educonsult.com">hello@educonsult.com</a><a href="tel:+919000000000">+91 90000 00000</a><a href="/contact.html">Mon–Sat, 10am – 6pm IST</a></div>
    </div>
    <div class="footer-bottom"><span>© ${new Date().getFullYear()} Educonsult. All rights reserved.</span><span>Crafted for students who dream bigger.</span></div>
  </div></footer>`;
}

function initReveal() {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  const scan = () => document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
  scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
}

function requireAuth(role) {
  const u = Auth.user;
  if (!u || !Auth.token) { location.href = '/login.html'; return null; }
  if (role && u.role !== role) { location.href = u.role === 'admin' ? '/admin.html' : '/dashboard.html'; return null; }
  return u;
}

function openModal(html) {
  let m = document.getElementById('modal');
  if (!m) { m = document.createElement('div'); m.id = 'modal'; m.className = 'modal-back'; document.body.appendChild(m); m.addEventListener('click', e => { if (e.target === m) closeModal(); }); }
  m.innerHTML = `<div class="modal">${html}</div>`;
  m.classList.add('show');
}
function closeModal() { const m = document.getElementById('modal'); if (m) m.classList.remove('show'); }

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('nav')) renderNav();
  renderFooter();
  initReveal();
});
