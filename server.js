const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'educonsult-dev-secret-change-me';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- helpers ----------
const sign = u => jwt.sign({ id: u.id, role: u.role, name: u.name }, SECRET, { expiresIn: '7d' });
const publicUser = u => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, qualification: u.qualification, percentage: u.percentage, interest: u.interest });

function auth(required = true) {
  return (req, res, next) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return required ? res.status(401).json({ error: 'Please log in to continue.' }) : next();
    try { req.user = jwt.verify(token, SECRET); next(); }
    catch { return required ? res.status(401).json({ error: 'Session expired. Please log in again.' }) : next(); }
  };
}
const adminOnly = (req, res, next) => (req.user && req.user.role === 'admin') ? next() : res.status(403).json({ error: 'Admin access required.' });
const clean = v => (typeof v === 'string' ? v.trim() : v);
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');

// ---------- auth ----------
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!clean(name) || !emailOk(email) || !password || password.length < 6)
    return res.status(400).json({ error: 'Provide a name, valid email and a password of at least 6 characters.' });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase()))
    return res.status(409).json({ error: 'An account with this email already exists.' });
  const info = db.prepare('INSERT INTO users (name,email,password,phone) VALUES (?,?,?,?)')
    .run(clean(name), email.toLowerCase(), bcrypt.hashSync(password, 10), clean(phone) || '');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.json({ token: sign(user), user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get((email || '').toLowerCase());
  if (!user || !bcrypt.compareSync(password || '', user.password))
    return res.status(401).json({ error: 'Incorrect email or password.' });
  res.json({ token: sign(user), user: publicUser(user) });
});

app.get('/api/me', auth(), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json(publicUser(user));
});

app.put('/api/me', auth(), (req, res) => {
  const { name, phone, qualification, percentage, interest } = req.body;
  db.prepare('UPDATE users SET name=?, phone=?, qualification=?, percentage=?, interest=? WHERE id=?')
    .run(clean(name) || 'Student', clean(phone) || '', clean(qualification) || '', Number(percentage) || 0, clean(interest) || '', req.user.id);
  res.json(publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)));
});

// ---------- colleges ----------
app.get('/api/colleges', (req, res) => {
  const { q, state, type, maxFees, sort, featured } = req.query;
  let sql = 'SELECT * FROM colleges WHERE 1=1';
  const p = [];
  if (q) { sql += ' AND (name LIKE ? OR courses LIKE ? OR city LIKE ?)'; p.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (state) { sql += ' AND state = ?'; p.push(state); }
  if (type) { sql += ' AND type = ?'; p.push(type); }
  if (maxFees) { sql += ' AND fees <= ?'; p.push(Number(maxFees)); }
  if (featured) sql += ' AND featured = 1';
  const order = { rating: 'rating DESC', fees_low: 'fees ASC', fees_high: 'fees DESC', name: 'name ASC' }[sort] || 'featured DESC, rating DESC';
  sql += ` ORDER BY ${order}`;
  res.json(db.prepare(sql).all(...p));
});

app.get('/api/colleges/meta', (req, res) => {
  res.json({
    states: db.prepare('SELECT DISTINCT state FROM colleges ORDER BY state').all().map(r => r.state),
    types: db.prepare('SELECT DISTINCT type FROM colleges ORDER BY type').all().map(r => r.type)
  });
});

app.get('/api/colleges/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM colleges WHERE id = ?').get(req.params.id);
  c ? res.json(c) : res.status(404).json({ error: 'College not found.' });
});

function collegeFields(b) {
  return [clean(b.name), clean(b.city), clean(b.state), clean(b.type), clean(b.courses), Number(b.fees) || 0,
    Number(b.rating) || 4, Number(b.established) || 2000, Number(b.seats) || 100, clean(b.deadline) || '',
    Number(b.min_percentage) || 60, clean(b.description) || '', clean(b.highlights) || '', b.featured ? 1 : 0];
}
app.post('/api/colleges', auth(), adminOnly, (req, res) => {
  const b = req.body;
  if (!clean(b.name) || !clean(b.city) || !clean(b.state) || !clean(b.type) || !clean(b.courses))
    return res.status(400).json({ error: 'Name, city, state, type and courses are required.' });
  const info = db.prepare(`INSERT INTO colleges (name,city,state,type,courses,fees,rating,established,seats,deadline,min_percentage,description,highlights,featured)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(...collegeFields(b));
  res.json(db.prepare('SELECT * FROM colleges WHERE id = ?').get(info.lastInsertRowid));
});
app.put('/api/colleges/:id', auth(), adminOnly, (req, res) => {
  db.prepare(`UPDATE colleges SET name=?,city=?,state=?,type=?,courses=?,fees=?,rating=?,established=?,seats=?,deadline=?,min_percentage=?,description=?,highlights=?,featured=? WHERE id=?`)
    .run(...collegeFields(req.body), req.params.id);
  res.json(db.prepare('SELECT * FROM colleges WHERE id = ?').get(req.params.id));
});
app.delete('/api/colleges/:id', auth(), adminOnly, (req, res) => {
  db.prepare('DELETE FROM colleges WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- applications ----------
const APP_STATUSES = ['Submitted', 'Under Review', 'Documents Required', 'Shortlisted', 'Admitted', 'Rejected'];

app.post('/api/applications', auth(), (req, res) => {
  const { college_id, course, statement } = req.body;
  const college = db.prepare('SELECT * FROM colleges WHERE id = ?').get(college_id);
  if (!college) return res.status(404).json({ error: 'College not found.' });
  if (!college.courses.split(',').includes(course)) return res.status(400).json({ error: 'Please choose a valid course.' });
  const dup = db.prepare('SELECT id FROM applications WHERE user_id=? AND college_id=? AND course=?').get(req.user.id, college_id, course);
  if (dup) return res.status(409).json({ error: 'You have already applied for this course.' });
  const info = db.prepare('INSERT INTO applications (user_id,college_id,course,statement) VALUES (?,?,?,?)')
    .run(req.user.id, college_id, course, clean(statement) || '');
  res.json({ id: info.lastInsertRowid });
});

app.get('/api/applications', auth(), (req, res) => {
  const base = `SELECT a.*, c.name AS college_name, c.city, c.state, u.name AS student_name, u.email AS student_email
    FROM applications a JOIN colleges c ON c.id=a.college_id JOIN users u ON u.id=a.user_id`;
  const rows = req.user.role === 'admin'
    ? db.prepare(base + ' ORDER BY a.created_at DESC').all()
    : db.prepare(base + ' WHERE a.user_id = ? ORDER BY a.created_at DESC').all(req.user.id);
  res.json(rows);
});

app.put('/api/applications/:id', auth(), adminOnly, (req, res) => {
  const { status, admin_note } = req.body;
  if (!APP_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  db.prepare("UPDATE applications SET status=?, admin_note=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .run(status, clean(admin_note) || '', req.params.id);
  res.json({ ok: true });
});

app.delete('/api/applications/:id', auth(), (req, res) => {
  const a = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found.' });
  if (req.user.role !== 'admin' && (a.user_id !== req.user.id || a.status !== 'Submitted'))
    return res.status(403).json({ error: 'Only unreviewed applications can be withdrawn.' });
  db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- consultations ----------
const CONSULT_STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];

app.post('/api/consultations', auth(false), (req, res) => {
  const { name, email, phone, topic, date, slot, mode, message } = req.body;
  if (!clean(name) || !emailOk(email) || !clean(phone) || !clean(topic) || !date || !slot)
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  if (new Date(date) < new Date(new Date().toDateString()))
    return res.status(400).json({ error: 'Please choose a future date.' });
  const taken = db.prepare("SELECT id FROM consultations WHERE date=? AND slot=? AND status!='Cancelled'").get(date, slot);
  if (taken) return res.status(409).json({ error: 'That slot is already booked. Please pick another.' });
  const info = db.prepare('INSERT INTO consultations (user_id,name,email,phone,topic,date,slot,mode,message) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(req.user ? req.user.id : null, clean(name), email.toLowerCase(), clean(phone), clean(topic), date, slot, mode || 'Online', clean(message) || '');
  res.json({ id: info.lastInsertRowid });
});

app.get('/api/consultations/slots', (req, res) => {
  const all = ['10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];
  const taken = db.prepare("SELECT slot FROM consultations WHERE date=? AND status!='Cancelled'").all(req.query.date || '').map(r => r.slot);
  res.json(all.map(s => ({ slot: s, available: !taken.includes(s) })));
});

app.get('/api/consultations', auth(), (req, res) => {
  const rows = req.user.role === 'admin'
    ? db.prepare('SELECT * FROM consultations ORDER BY date DESC, created_at DESC').all()
    : db.prepare('SELECT * FROM consultations WHERE user_id = ? ORDER BY date DESC').all(req.user.id);
  res.json(rows);
});

app.put('/api/consultations/:id', auth(), (req, res) => {
  const c = db.prepare('SELECT * FROM consultations WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found.' });
  const { status } = req.body;
  if (!CONSULT_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const isOwner = c.user_id === req.user.id;
  if (req.user.role !== 'admin' && !(isOwner && status === 'Cancelled'))
    return res.status(403).json({ error: 'Not allowed.' });
  db.prepare('UPDATE consultations SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ ok: true });
});

// ---------- inquiries ----------
app.post('/api/inquiries', (req, res) => {
  const { name, email, message } = req.body;
  if (!clean(name) || !emailOk(email) || !clean(message)) return res.status(400).json({ error: 'Please complete all fields.' });
  db.prepare('INSERT INTO inquiries (name,email,message) VALUES (?,?,?)').run(clean(name), email.toLowerCase(), clean(message));
  res.json({ ok: true });
});
app.get('/api/inquiries', auth(), adminOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM inquiries ORDER BY created_at DESC').all());
});
app.delete('/api/inquiries/:id', auth(), adminOnly, (req, res) => {
  db.prepare('DELETE FROM inquiries WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- users / stats ----------
app.get('/api/users', auth(), adminOnly, (req, res) => {
  res.json(db.prepare(`SELECT u.id,u.name,u.email,u.role,u.phone,u.qualification,u.percentage,u.created_at,
    (SELECT COUNT(*) FROM applications a WHERE a.user_id=u.id) AS applications FROM users u ORDER BY u.created_at DESC`).all());
});

app.get('/api/stats/public', (req, res) => {
  res.json({
    colleges: db.prepare('SELECT COUNT(*) c FROM colleges').get().c,
    students: db.prepare("SELECT COUNT(*) c FROM users WHERE role='student'").get().c,
    admitted: db.prepare("SELECT COUNT(*) c FROM applications WHERE status='Admitted'").get().c
  });
});

app.get('/api/stats/admin', auth(), adminOnly, (req, res) => {
  const count = (sql) => db.prepare(sql).get().c;
  res.json({
    students: count("SELECT COUNT(*) c FROM users WHERE role='student'"),
    colleges: count('SELECT COUNT(*) c FROM colleges'),
    applications: count('SELECT COUNT(*) c FROM applications'),
    admitted: count("SELECT COUNT(*) c FROM applications WHERE status='Admitted'"),
    pendingConsults: count("SELECT COUNT(*) c FROM consultations WHERE status='Pending'"),
    inquiries: count('SELECT COUNT(*) c FROM inquiries'),
    byStatus: db.prepare('SELECT status, COUNT(*) count FROM applications GROUP BY status').all(),
    topColleges: db.prepare(`SELECT c.name, COUNT(a.id) count FROM colleges c LEFT JOIN applications a ON a.college_id=c.id
      GROUP BY c.id ORDER BY count DESC LIMIT 5`).all()
  });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

app.listen(PORT, () => {
  console.log(`\n  Educonsult is running → http://localhost:${PORT}`);
  console.log('  Admin:   admin@educonsult.com / admin123');
  console.log('  Student: student@educonsult.com / student123\n');
});
