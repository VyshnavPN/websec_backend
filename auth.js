import express from 'express';
import bcrypt from 'bcrypt';
import { Low, JSONFile } from 'lowdb';
import { nanoid } from 'nanoid';

const router = express.Router();
const adapter = new JSONFile('users.json');
const db = new Low(adapter);

async function initDb() {
  await db.read();
  db.data ||= { users: [], suggestions: [] };
  await db.write();
}
initDb();

// helper to authenticate by token
async function getUserFromToken(token) {
  if (!token) return null;
  await db.read();
  return db.data.users.find(u => u.token === token);
}

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('invalid');
  await db.read();
  const existing = db.data.users.find(u => u.username === username);
  if (existing) return res.status(409).send('exists');
  const hash = await bcrypt.hash(password, 10);
  const user = { username, password: hash, role: 'user', suggestions: [] };
  db.data.users.push(user);
  await db.write();
  res.json({ username: user.username, role: user.role });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  await db.read();
  const user = db.data.users.find(u => u.username === username);
  if (!user) return res.status(401).send('no_user');
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).send('bad_pass');
  const token = nanoid();
  user.token = token;
  await db.write();
  res.json({ username: user.username, role: user.role, token });
});

router.post('/suggest', async (req, res) => {
  const { token, suggestion } = req.body;
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).send('unauth');
  user.suggestions ||= [];
  user.suggestions.push(suggestion);
  db.data.suggestions ||= [];
  db.data.suggestions.push({ id: nanoid(), username: user.username, suggestion, date: new Date().toISOString() });
  await db.write();
  res.json({ status: 'ok' });
});

router.get('/users', async (req, res) => {
  const token = req.headers.token;
  const authUser = await getUserFromToken(token);
  if (!authUser || authUser.role !== 'admin') return res.status(403).send('denied');
  await db.read();
  const safeUsers = db.data.users.map(u => ({ username: u.username, role: u.role, suggestions: u.suggestions || [] }));
  res.json(safeUsers);
});

router.get('/suggestions', async (req, res) => {
  const token = req.headers.token;
  const authUser = await getUserFromToken(token);
  if (!authUser || authUser.role !== 'admin') return res.status(403).send('denied');
  await db.read();
  res.json(db.data.suggestions || []);
});

router.post('/users/role', async (req, res) => {
  const token = req.headers.token;
  const { username, role } = req.body;
  const authUser = await getUserFromToken(token);
  if (!authUser || authUser.role !== 'admin') return res.status(403).send('denied');
  await db.read();
  const target = db.data.users.find(u => u.username === username);
  if (target) { target.role = role; await db.write(); }
  res.json({ status: 'ok' });
});

router.post('/suggestions/delete', async (req, res) => {
  const token = req.headers.token;
  const { id } = req.body;
  const authUser = await getUserFromToken(token);
  if (!authUser || authUser.role !== 'admin') return res.status(403).send('denied');
  await db.read();
  db.data.suggestions = (db.data.suggestions || []).filter(s => s.id !== id);
  await db.write();
  res.json({ status: 'ok' });
});

export default router;
