/* バックエンド API ラッパー（Supabase Edge Function / トークン認証） */
(function (global) {
  'use strict';

  const TOKEN_KEY = 'genka_token';
  function cfg() { return global.GENKA.config; }
  function getToken() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function setToken(t) {
    try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
  }

  async function req(method, path, body) {
    const c = cfg();
    const headers = { apikey: c.anonKey };
    const tok = getToken();
    if (tok) headers['x-genka-token'] = tok;
    const opt = { method, headers };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      opt.body = JSON.stringify(body);
    }
    const res = await fetch(c.apiBase + path, opt);
    let data = null;
    try { data = await res.json(); } catch (e) { /* no body */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || ('エラー (' + res.status + ')'));
      err.status = res.status;
      throw err;
    }
    return data;
  }

  global.GENKA = global.GENKA || {};
  global.GENKA.api = {
    getToken,
    setToken,
    me: () => req('GET', '/me'),
    login: async (username, password) => {
      const r = await req('POST', '/login', { username, password });
      setToken(r.token);
      return r;
    },
    register: async (username, password) => {
      const r = await req('POST', '/register', { username, password });
      setToken(r.token);
      return r;
    },
    logout: async () => { setToken(''); return { ok: true }; },
    changePassword: (currentPassword, newPassword) =>
      req('POST', '/change-password', { currentPassword, newPassword }),
    listProjects: () => req('GET', '/projects'),
    getProject: (id) => req('GET', '/projects/' + id),
    createProject: (name, data) => req('POST', '/projects', { name, data }),
    updateProject: (id, name, data) => req('PUT', '/projects/' + id, { name, data }),
    deleteProject: (id) => req('DELETE', '/projects/' + id),
  };
})(window);
