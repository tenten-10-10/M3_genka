/**
 * 商品企画書 Web アプリ — サーバー
 *
 * 機能:
 *   - ログイン / ユーザー登録（bcrypt + セッション）
 *   - 企画書プロジェクトの保存・読み込み・一覧・削除（ユーザーごと）
 *   - 静的フロントエンドと PDF/Excel 用クライアントライブラリの配信
 *
 * 保存先は data/db.json（単一 JSON ファイル）。外部 DB 不要で完結する。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// ---------------------------------------------------------------------------
// 簡易 JSON ストア
// ---------------------------------------------------------------------------
fs.mkdirSync(DATA_DIR, { recursive: true });

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return { users: [], projects: [] };
  }
}

let writeChain = Promise.resolve();
function saveDB(db) {
  // 直列化して書き込み、同時更新による破損を防ぐ
  writeChain = writeChain.then(
    () =>
      new Promise((resolve, reject) => {
        const tmp = DB_FILE + '.tmp';
        fs.writeFile(tmp, JSON.stringify(db, null, 2), (err) => {
          if (err) return reject(err);
          fs.rename(tmp, DB_FILE, (err2) => (err2 ? reject(err2) : resolve()));
        });
      })
  );
  return writeChain;
}

function uid() {
  return crypto.randomBytes(9).toString('base64url');
}

// 初回起動時にデモ用アカウントを作成（パスワードは変更可能）
(function seed() {
  const db = loadDB();
  if (db.users.length === 0) {
    const now = new Date().toISOString();
    db.users.push({
      id: uid(),
      username: 'admin',
      passwordHash: bcrypt.hashSync('admin1234', 10),
      createdAt: now,
    });
    saveDB(db);
    console.log('--------------------------------------------------------');
    console.log(' 初期ユーザーを作成しました');
    console.log('   ユーザー名: admin');
    console.log('   パスワード: admin1234');
    console.log('   ※ 運用前に必ずパスワードを変更してください');
    console.log('--------------------------------------------------------');
  }
})();

// ---------------------------------------------------------------------------
// ミドルウェア
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '30mb' }));
app.use(
  session({
    name: 'genka.sid',
    secret: process.env.SESSION_SECRET || crypto.randomBytes(24).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 14, // 14日
      secure: process.env.COOKIE_SECURE === '1',
    },
  })
);

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ error: '認証が必要です' });
}

function publicUser(u) {
  return { id: u.id, username: u.username, createdAt: u.createdAt };
}

// ---------------------------------------------------------------------------
// 認証 API
// ---------------------------------------------------------------------------
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password || String(password).length < 6) {
    return res.status(400).json({ error: 'ユーザー名と6文字以上のパスワードを入力してください' });
  }
  const db = loadDB();
  if (db.users.some((u) => u.username.toLowerCase() === String(username).toLowerCase())) {
    return res.status(409).json({ error: 'このユーザー名は既に使用されています' });
  }
  const user = {
    id: uid(),
    username: String(username).trim(),
    passwordHash: bcrypt.hashSync(String(password), 10),
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  await saveDB(db);
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const db = loadDB();
  const user = db.users.find((u) => u.username.toLowerCase() === String(username || '').toLowerCase());
  if (!user || !bcrypt.compareSync(String(password || ''), user.passwordHash)) {
    return res.status(401).json({ error: 'ユーザー名またはパスワードが違います' });
  }
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  if (!req.session || !req.session.userId) return res.json({ user: null });
  const db = loadDB();
  const user = db.users.find((u) => u.id === req.session.userId);
  res.json({ user: user ? publicUser(user) : null });
});

app.post('/api/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: '新しいパスワードは6文字以上で入力してください' });
  }
  const db = loadDB();
  const user = db.users.find((u) => u.id === req.session.userId);
  if (!user || !bcrypt.compareSync(String(currentPassword || ''), user.passwordHash)) {
    return res.status(401).json({ error: '現在のパスワードが違います' });
  }
  user.passwordHash = bcrypt.hashSync(String(newPassword), 10);
  await saveDB(db);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// プロジェクト API
// ---------------------------------------------------------------------------
app.get('/api/projects', requireAuth, (req, res) => {
  const db = loadDB();
  const list = db.projects
    .filter((p) => p.ownerId === req.session.userId)
    .map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt, createdAt: p.createdAt }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  res.json({ projects: list });
});

app.get('/api/projects/:id', requireAuth, (req, res) => {
  const db = loadDB();
  const p = db.projects.find((x) => x.id === req.params.id && x.ownerId === req.session.userId);
  if (!p) return res.status(404).json({ error: '見つかりません' });
  res.json({ project: p });
});

app.post('/api/projects', requireAuth, async (req, res) => {
  const { name, data } = req.body || {};
  const db = loadDB();
  const now = new Date().toISOString();
  const project = {
    id: uid(),
    ownerId: req.session.userId,
    name: (name && String(name).trim()) || '無題の企画書',
    data: data || {},
    createdAt: now,
    updatedAt: now,
  };
  db.projects.push(project);
  await saveDB(db);
  res.json({ project });
});

app.put('/api/projects/:id', requireAuth, async (req, res) => {
  const db = loadDB();
  const p = db.projects.find((x) => x.id === req.params.id && x.ownerId === req.session.userId);
  if (!p) return res.status(404).json({ error: '見つかりません' });
  const { name, data } = req.body || {};
  if (typeof name === 'string' && name.trim()) p.name = name.trim();
  if (data !== undefined) p.data = data;
  p.updatedAt = new Date().toISOString();
  await saveDB(db);
  res.json({ project: p });
});

app.delete('/api/projects/:id', requireAuth, async (req, res) => {
  const db = loadDB();
  const idx = db.projects.findIndex((x) => x.id === req.params.id && x.ownerId === req.session.userId);
  if (idx === -1) return res.status(404).json({ error: '見つかりません' });
  db.projects.splice(idx, 1);
  await saveDB(db);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// 静的配信
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));
// PDF / Excel 用クライアントライブラリ（node_modules から配信）
app.use('/vendor/jspdf', express.static(path.join(__dirname, 'node_modules/jspdf/dist')));
app.use('/vendor/html2canvas', express.static(path.join(__dirname, 'node_modules/html2canvas/dist')));
app.use('/vendor/xlsx', express.static(path.join(__dirname, 'node_modules/xlsx/dist')));

app.listen(PORT, () => {
  console.log(`商品企画書アプリを起動しました: http://localhost:${PORT}`);
});
