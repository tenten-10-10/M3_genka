/* アプリ全体の制御（認証・プロジェクト管理・保存・書き出し・UI） */
(function (global) {
  'use strict';

  const api = global.GENKA.api;
  const sheet = global.GENKA.sheet;
  const exporter = global.GENKA.exporter;

  let currentUser = null;
  let currentProjectId = null;
  let dirty = false;
  let autosaveTimer = null;
  let projects = [];

  const $ = (id) => document.getElementById(id);

  // ---------------- トースト ----------------
  function toast(msg, isErr) {
    const wrap = $('toastWrap');
    const t = document.createElement('div');
    t.className = 'toast' + (isErr ? ' err' : '');
    t.textContent = msg;
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 250);
    }, 2200);
  }

  // ---------------- 画面切替 ----------------
  function showAuth() {
    $('authScreen').style.display = 'flex';
    $('app').classList.remove('active');
  }
  function showApp() {
    $('authScreen').style.display = 'none';
    $('app').classList.add('active');
    $('userLabel').textContent = currentUser ? currentUser.username + ' さん' : '';
  }

  // ---------------- 保存状態 ----------------
  function markDirty() {
    dirty = true;
    const el = $('saveState');
    el.textContent = '● 未保存';
    el.className = 'save-state dirty';
    if (currentProjectId) {
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => save(true), 1800);
    }
  }
  function markClean() {
    dirty = false;
    const el = $('saveState');
    el.textContent = '✓ 保存済み';
    el.className = 'save-state saved';
  }

  // ---------------- プロジェクト ----------------
  async function loadProjects(selectId) {
    const res = await api.listProjects();
    projects = res.projects || [];
    renderProjectList(selectId);
  }

  function renderProjectList(activeId) {
    const ul = $('projList');
    ul.innerHTML = '';
    if (projects.length === 0) {
      ul.innerHTML = '<li style="color:#aaa;cursor:default">（まだありません）</li>';
      return;
    }
    projects.forEach((p) => {
      const li = document.createElement('li');
      if (p.id === (activeId || currentProjectId)) li.className = 'active';
      const d = new Date(p.updatedAt);
      const date = isNaN(d) ? '' : `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      li.innerHTML = `<span class="name">${escapeHtml(p.name)}<div class="meta">${date}</div></span>` +
        `<button class="del" title="削除" data-del="${p.id}">🗑</button>`;
      li.addEventListener('click', (e) => {
        if (e.target.closest('[data-del]')) return;
        switchProject(p.id);
      });
      ul.appendChild(li);
    });
    ul.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteProject(b.getAttribute('data-del'));
      })
    );
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function newProject() {
    currentProjectId = null;
    const plan = global.GENKA.defaultPlan();
    sheet.load(plan);
    $('projName').value = plan.productName || '無題の企画書';
    markClean();
    renderProjectList();
    setView('sheet');
  }

  async function openProject(id) {
    const res = await api.getProject(id);
    currentProjectId = id;
    const plan = normalizePlan(res.project.data);
    sheet.load(plan);
    $('projName').value = res.project.name || '';
    markClean();
    renderProjectList(id);
  }

  // 旧データ／欠損キーを既定値で補完
  function normalizePlan(data) {
    const base = global.GENKA.defaultPlan();
    const plan = Object.assign({}, base, data || {});
    plan.cost = Object.assign({}, base.cost, data && data.cost);
    plan.cost.inputs = Object.assign({}, base.cost.inputs, data && data.cost && data.cost.inputs);
    if (!Array.isArray(plan.cost.rows)) plan.cost.rows = base.cost.rows;
    if (!Array.isArray(plan.images)) plan.images = [];
    if (!Array.isArray(plan.jan)) plan.jan = base.jan;
    return plan;
  }

  // 別の操作へ移る前に、未保存の変更を安全に処理する。
  // 既存プロジェクト: 自動保存し、失敗したら中断（編集を失わない）。
  // 未保存の新規: 破棄の確認を取る。
  // 続行してよいときだけ true を返す。
  async function guardUnsaved(actionLabel) {
    if (!dirty) return true;
    if (currentProjectId) {
      const ok = await save(true);
      if (!ok) {
        toast('保存に失敗したため' + actionLabel + 'を中止しました', true);
      }
      return ok;
    }
    return confirm('保存していない新規企画書があります。破棄して' + actionLabel + 'しますか？');
  }

  async function switchProject(id) {
    if (id === currentProjectId) return;
    if (!(await guardUnsaved('切り替え'))) return;
    try {
      await openProject(id);
    } catch (e) {
      toast('読み込みに失敗しました', true);
    }
  }

  async function save(silent) {
    clearTimeout(autosaveTimer);
    const plan = sheet.getPlan();
    if (!plan) return false;
    const name = $('projName').value.trim() || plan.productName || '無題の企画書';
    try {
      if (currentProjectId) {
        await api.updateProject(currentProjectId, name, plan);
      } else {
        const res = await api.createProject(name, plan);
        currentProjectId = res.project.id;
      }
      markClean();
      await loadProjects(currentProjectId);
      if (!silent) toast('保存しました');
      return true;
    } catch (e) {
      toast('保存に失敗しました: ' + e.message, true);
      return false;
    }
  }

  async function deleteProject(id) {
    const p = projects.find((x) => x.id === id);
    if (!confirm(`「${p ? p.name : 'この企画書'}」を削除しますか？`)) return;
    try {
      await api.deleteProject(id);
      if (id === currentProjectId) {
        currentProjectId = null;
        newProject();
      }
      await loadProjects();
      toast('削除しました');
    } catch (e) {
      toast('削除に失敗しました', true);
    }
  }

  // ---------------- 画像追加 ----------------
  function pickImage() {
    $('imgInput').click();
  }
  function onImgInput(e) {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => sheet.addImage(reader.result);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  // ---------------- タブ ----------------
  function setView(name) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === name));
    $('viewSheet').classList.toggle('active', name === 'sheet');
    $('viewCost').classList.toggle('active', name === 'cost');
  }

  // ---------------- 認証 ----------------
  function authError(msg) {
    const el = $('authError');
    if (!msg) { el.classList.remove('show'); return; }
    el.textContent = msg;
    el.classList.add('show');
  }

  async function doLogin() {
    authError('');
    try {
      const res = await api.login($('loginUser').value, $('loginPass').value);
      currentUser = res.user;
      await enterApp();
    } catch (e) {
      authError(e.message);
    }
  }
  async function doRegister() {
    authError('');
    try {
      const res = await api.register($('regUser').value, $('regPass').value);
      currentUser = res.user;
      await enterApp();
    } catch (e) {
      authError(e.message);
    }
  }

  async function enterApp() {
    showApp();
    await loadProjects();
    if (projects.length > 0) {
      await openProject(projects[0].id);
    } else {
      newProject();
    }
  }

  async function doLogout() {
    if (!(await guardUnsaved('ログアウト'))) return;
    await api.logout();
    currentUser = null;
    currentProjectId = null;
    projects = [];
    showAuth();
  }

  // ---------------- パスワード変更 ----------------
  function openPwModal() { $('pwModal').classList.add('show'); }
  function closePwModal() { $('pwModal').classList.remove('show'); $('pwCurrent').value = ''; $('pwNew').value = ''; }
  async function savePw() {
    try {
      await api.changePassword($('pwCurrent').value, $('pwNew').value);
      closePwModal();
      toast('パスワードを変更しました');
    } catch (e) {
      toast(e.message, true);
    }
  }

  // ---------------- 初期化 ----------------
  function bindUI() {
    // 認証
    $('loginBtn').addEventListener('click', doLogin);
    $('registerBtn').addEventListener('click', doRegister);
    $('toRegister').addEventListener('click', () => { $('loginForm').style.display = 'none'; $('registerForm').style.display = 'block'; authError(''); });
    $('toLogin').addEventListener('click', () => { $('registerForm').style.display = 'none'; $('loginForm').style.display = 'block'; authError(''); });
    [$('loginPass'), $('loginUser')].forEach((el) => el.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); }));
    [$('regPass'), $('regUser')].forEach((el) => el.addEventListener('keydown', (e) => { if (e.key === 'Enter') doRegister(); }));

    // ツールバー
    $('saveBtn').addEventListener('click', () => save(false));
    $('newBtn').addEventListener('click', async () => {
      if (!(await guardUnsaved('新規作成'))) return;
      newProject();
    });
    $('logoutBtn').addEventListener('click', doLogout);
    $('projName').addEventListener('input', markDirty);

    $('pdfBtn').addEventListener('click', async () => {
      setView('sheet');
      toast('PDFを生成しています…');
      try {
        await exporter.exportPDF(sheet.getPlan(), $('projName').value);
      } catch (e) {
        toast('PDF生成に失敗しました: ' + e.message, true);
      }
    });
    $('excelBtn').addEventListener('click', () => {
      try {
        exporter.exportExcel(sheet.getPlan(), $('projName').value);
      } catch (e) {
        toast('Excel生成に失敗しました: ' + e.message, true);
      }
    });
    $('printBtn').addEventListener('click', () => { setView('sheet'); setTimeout(() => window.print(), 100); });

    // パスワード
    $('pwBtn').addEventListener('click', openPwModal);
    $('pwCancel').addEventListener('click', closePwModal);
    $('pwSave').addEventListener('click', savePw);

    // タブ
    document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => setView(t.dataset.view)));

    // 画像入力
    $('imgInput').addEventListener('change', onImgInput);

    // 離脱警告
    global.addEventListener('beforeunload', (e) => {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  async function init() {
    // 埋め込みロゴを適用（バイナリ非依存）
    const assets = global.GENKA && global.GENKA.assets;
    if (assets && assets.logo) {
      const ll = $('loginLogo');
      if (ll) ll.src = assets.logo;
    }
    bindUI();
    sheet.mount({ onChange: markDirty, pickImage: pickImage });
    try {
      const res = await api.me();
      if (res.user) {
        currentUser = res.user;
        await enterApp();
      } else {
        showAuth();
      }
    } catch (e) {
      showAuth();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
