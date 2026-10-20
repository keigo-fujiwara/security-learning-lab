// 共通処理: ヘッダー/フッター、進捗管理、テーマ切替、模擬ターミナル
(function () {
  const LABS = [
    { id: 'phishing', title: 'フィッシング見破り', file: 'labs/phishing.html' },
    { id: 'password', title: 'パスワードとハッシュ', file: 'labs/password.html' },
    { id: 'secure-coding', title: 'セキュアコーディング', file: 'labs/secure-coding.html' },
    { id: 'log-analysis', title: 'ログ分析', file: 'labs/log-analysis.html' },
    { id: 'headers', title: 'セキュリティヘッダー', file: 'labs/headers.html' },
    { id: 'email-auth', title: 'メール認証', file: 'labs/email-auth.html' },
    { id: 'threats', title: '日本を狙う脅威', file: 'labs/threats.html' },
  ];
  const STORE_KEY = 'sll-progress-v1';

  const root = document.currentScript.dataset.root || '.';

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function save(data) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* 保存できない環境では無視 */ }
  }

  const SLL = {
    LABS,
    progress: load,
    isDone(labId, task) {
      const p = load();
      return task ? !!(p[labId] && p[labId][task]) : !!(p[labId] && p[labId].__done);
    },
    markTask(labId, task, total) {
      const p = load();
      p[labId] = p[labId] || {};
      p[labId][task] = true;
      const count = Object.keys(p[labId]).filter(k => k !== '__done').length;
      if (count >= total) p[labId].__done = true;
      save(p);
      SLL.renderTaskStatus(labId, total);
    },
    taskCount(labId) {
      const p = load()[labId] || {};
      return Object.keys(p).filter(k => k !== '__done').length;
    },
    renderTaskStatus(labId, total) {
      const el = document.getElementById('lab-progress');
      if (!el) return;
      const n = Math.min(SLL.taskCount(labId), total);
      const pct = Math.round(n / total * 100);
      el.innerHTML = `<span>進捗 ${n} / ${total}</span><div class="meter"><span style="width:${pct}%;background:var(--ok)"></span></div>` +
        (n >= total ? '<span class="pill green">完了</span>' : '');
    },
    reset() {
      try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    },
    escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
  };
  window.SLL = SLL;

  // テーマ
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }
  let theme = null;
  try { theme = localStorage.getItem('sll-theme'); } catch (e) {}
  applyTheme(theme);

  document.addEventListener('DOMContentLoaded', () => {
    const current = location.pathname.split('/').pop() || 'index.html';
    const header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML = `<div class="inner">
      <a class="brand" href="${root}/index.html"><span class="logo">盾</span>セキュリティ対策ラボ</a>
      <nav>${LABS.map(l => `<a href="${root}/${l.file}" class="${l.file.endsWith(current) ? 'active' : ''}">${l.title}</a>`).join('')}</nav>
      <button class="theme-btn" type="button" aria-label="テーマ切替">◐</button>
    </div>`;
    document.body.prepend(header);
    header.querySelector('.theme-btn').addEventListener('click', () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
        (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
      const next = dark ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('sll-theme', next); } catch (e) {}
    });

    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = 'すべての演習はブラウザ内の模擬環境で動作し、外部への通信は行いません。学んだ知識は、自分が管理する環境や許可を得た環境の防御にのみ使用してください。';
    document.body.append(footer);
  });

  // 模擬ターミナル: handler(cmdline) は出力文字列（または {text, cls}）の配列を返す
  SLL.Terminal = class {
    constructor(el, { prompt = '$ ', handler, banner = [] }) {
      this.el = el; this.prompt = prompt; this.handler = handler;
      this.history = []; this.hIdx = 0;
      el.classList.add('terminal');
      el.innerHTML = '';
      this.out = document.createElement('div');
      el.append(this.out);
      const row = document.createElement('div');
      row.className = 'input-row';
      row.innerHTML = `<span class="prompt"></span><input type="text" spellcheck="false" autocomplete="off" aria-label="コマンド入力">`;
      row.querySelector('.prompt').textContent = prompt;
      el.append(row);
      this.input = row.querySelector('input');
      el.addEventListener('click', () => this.input.focus());
      this.input.addEventListener('keydown', e => this.onKey(e));
      banner.forEach(b => this.print(b));
    }
    print(line, cls) {
      const d = document.createElement('div');
      d.className = 'line' + (cls ? ' ' + cls : '');
      if (typeof line === 'object' && line !== null) { d.textContent = line.text; if (line.cls) d.classList.add(line.cls); }
      else d.textContent = line;
      this.out.append(d);
      this.el.scrollTop = this.el.scrollHeight;
    }
    run(cmd) {
      const p = document.createElement('div');
      p.className = 'line';
      p.innerHTML = `<span class="prompt">${SLL.escapeHtml(this.prompt)}</span>${SLL.escapeHtml(cmd)}`;
      this.out.append(p);
      if (cmd.trim()) {
        this.history.push(cmd); this.hIdx = this.history.length;
        if (cmd.trim() === 'clear') { this.out.innerHTML = ''; return; }
        const res = this.handler(cmd.trim()) || [];
        res.forEach(r => this.print(r));
      }
      this.el.scrollTop = this.el.scrollHeight;
    }
    onKey(e) {
      if (e.key === 'Enter') { const v = this.input.value; this.input.value = ''; this.run(v); }
      else if (e.key === 'ArrowUp') { if (this.hIdx > 0) { this.hIdx--; this.input.value = this.history[this.hIdx]; } e.preventDefault(); }
      else if (e.key === 'ArrowDown') { if (this.hIdx < this.history.length - 1) { this.hIdx++; this.input.value = this.history[this.hIdx]; } else { this.hIdx = this.history.length; this.input.value = ''; } e.preventDefault(); }
    }
  };
})();
