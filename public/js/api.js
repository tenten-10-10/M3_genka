/* サーバー API ラッパー */
(function (global) {
  'use strict';

  async function req(method, url, body) {
    const opt = { method: method, headers: {}, credentials: 'same-origin' };
    if (body !== undefined) {
      opt.headers['Content-Type'] = 'application/json';
      opt.body = JSON.stringify(body);
    }
    const res = await fetch(url, opt);
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
    me: () => req('GET', '/api/me'),
    login: (username, password) => req('POST', '/api/login', { username, password }),
    register: (username, password) => req('POST', '/api/register', { username, password }),
    logout: () => req('POST', '/api/logout'),
    changePassword: (currentPassword, newPassword) =>
      req('POST', '/api/change-password', { currentPassword, newPassword }),
    listProjects: () => req('GET', '/api/projects'),
    getProject: (id) => req('GET', '/api/projects/' + id),
    createProject: (name, data) => req('POST', '/api/projects', { name, data }),
    updateProject: (id, name, data) => req('PUT', '/api/projects/' + id, { name, data }),
    deleteProject: (id) => req('DELETE', '/api/projects/' + id),
  };
})(window);
