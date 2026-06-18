/* 企画書シート＋原価表のレンダリングとデータバインド */
(function (global) {
  'use strict';

  const fmt = global.GENKA.fmt;
  const calc = global.GENKA.calc;

  let plan = null;
  let hooks = {};
  let selImg = -1;
  let mounted = false;

  // ---- ユーティリティ ----
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function getPath(o, p) {
    return p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
  }
  function setPath(o, p, v) {
    const ks = p.split('.');
    let a = o;
    for (let i = 0; i < ks.length - 1; i++) {
      if (a[ks[i]] == null) a[ks[i]] = {};
      a = a[ks[i]];
    }
    a[ks[ks.length - 1]] = v;
  }
  function inp(path, value, cls, type) {
    return `<input class="fld ${cls || ''}" data-bind="${path}"${type ? ' type="' + type + '"' : ''} value="${esc(value)}">`;
  }
  function area(path, value, cls) {
    return `<div class="editable ${cls || ''}" data-bind="${path}" contenteditable="true">${esc(value)}</div>`;
  }

  // =========================================================================
  // 企画書ビュー
  // =========================================================================
  function renderSheet() {
    const p = plan;
    const master = global.GENKA.master;

    const janRows = (p.jan || [])
      .map(
        (r, i) =>
          `<tr><td>${inp('jan.' + i + '.model', r.model, 'cell')}</td>` +
          `<td>${inp('jan.' + i + '.color', r.color, 'cell')}</td>` +
          `<td>${inp('jan.' + i + '.jan', r.jan, 'cell')}</td></tr>`
      )
      .join('');

    function sizeRow(label, key) {
      const o = p[key] || {};
      return (
        `<tr><td class="head">${label}</td>` +
        `<td>${inp(key + '.size', o.size, 'cell')}</td>` +
        `<td>${inp(key + '.qty', o.qty, 'cell')}</td>` +
        `<td>${inp(key + '.weight', o.weight, 'cell')}</td></tr>`
      );
    }

    document.getElementById('sheet').innerHTML = `
      <div class="sheet-title">${esc(p.title || '商　品　企　画　書')}</div>

      <div class="row-product">
        <div class="pname-label">商 品 名</div>
        <div class="pname-value">${inp('productName', p.productName, '')}</div>
        <div class="pinfo">
          <div class="line"><b>発売時期：</b>${inp('releaseDate', p.releaseDate, '')}</div>
          <div class="line"><b>担当：</b>${inp('person', p.person, '')}</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="col">
          <div class="band">商 品 画 像</div>
          <div class="image-stage" id="imageStage"></div>
          <div class="stage-tools">
            <button type="button" class="mini" id="addImgBtn">＋ 画像を追加</button>
            <span class="hint">ドラッグで移動 / 右下■でサイズ変更</span>
          </div>
          <div class="band">ヘ ッ ド コ ピ ー</div>
          ${area('headCopy', p.headCopy, 'headcopy')}
        </div>

        <div class="col">
          <div class="band">他 社 に な い 訴 求 点</div>
          ${area('sellingPoints', p.sellingPoints, 'selling-points')}
          <div class="band">商 品 説 明</div>
          ${area('description', p.description, 'description')}
        </div>
      </div>

      <div class="grid-2">
        <div class="col">
          <div class="band">商 品 仕 様</div>
          <div class="spec-row"><div class="k">カラー</div><div class="v">${inp('color', p.color, '')}</div></div>
          <div class="spec-row"><div class="k">同梱品</div><div class="v">${inp('included', p.included, '')}</div></div>
          <div class="spec-row tall"><div class="k">仕様</div><div class="v">${area('specsText', p.specsText, '')}</div></div>
          <div class="spec-row"><div class="k">電源</div><div class="v">${inp('power', p.power, '')}</div></div>
          <div class="spec-row"><div class="k">素材</div><div class="v">${inp('material', p.material, '')}</div></div>
          <div class="spec-row"><div class="k">原産地</div><div class="v">${inp('origin', p.origin, '')}</div></div>
          <div class="spec-row"><div class="k">承認等</div><div class="v">${inp('approval', p.approval, '')}</div></div>

          <div class="band" style="margin-top:10px">サ イ ズ ・ 梱 包 ・ 重 量</div>
          <table class="grid-table">
            <tr><th></th><th>サイズ（W×D×H mm）</th><th>入数</th><th>重量</th></tr>
            ${sizeRow('本体', 'sizeBody')}
            ${sizeRow('パッケージ', 'sizePackage')}
            ${sizeRow('インナー', 'sizeInner')}
            ${sizeRow('アウター', 'sizeOuter')}
            <tr><td class="head">備考</td><td colspan="3" class="left">${inp('sizeRemark', p.sizeRemark, '')}</td></tr>
          </table>
        </div>

        <div class="col">
          <div class="band">商 品 価 格</div>
          <div class="price-box">
            <div class="lab">目標売価（税別）</div><div class="val big" id="pbRetailExcl"></div>
            <div class="lab">目標売価（税込）</div><div class="val big" id="pbRetailIncl"></div>
            <div class="lab">粗利額（税別）</div><div class="val" id="pbGrossExcl"></div>
            <div class="lab">粗利額（税込）</div><div class="val" id="pbGrossIncl"></div>
            <div class="lab">掛 け 率</div><div class="val" id="pbKakeritsu"></div>
            <div class="lab">MOQ</div><div class="val" id="pbMoq"></div>
          </div>
          <div class="price-note">※ 価格は「原価表」タブの入力から自動計算されます（掛け率＝粗利率）。</div>

          <div class="band" style="margin-top:10px">商 品 バ ー コ ー ド ・ J A N</div>
          <table class="grid-table">
            <tr><th>型番</th><th>カラー</th><th>JAN</th></tr>
            ${janRows}
          </table>

          <div class="band" style="margin-top:10px">試 験 情 報</div>
          ${area('testInfo', p.testInfo, 'panel')}

          <div class="band" style="margin-top:10px">別 売 品</div>
          ${area('optional', p.optional, 'panel')}
        </div>
      </div>

      <div class="band" style="margin-top:12px">そ の 他 ・ 特 記 事 項 ・ 詳 細 画 像 等</div>
      ${area('notes', p.notes, 'panel tall')}

      <div class="footer-note">${area('footerNote', p.footerNote, '')}</div>
      <div class="footer-company">
        <img class="logo" src="${(global.GENKA.assets && global.GENKA.assets.logo) || '/assets/logo.png'}" alt="SHOWA">
        <div class="addr">${area('company', p.company, '')}</div>
      </div>
    `;

    renderStage();
  }

  function renderStage() {
    const stage = document.getElementById('imageStage');
    if (!stage) return;
    const imgs = plan.images || [];
    let html = '';
    if (imgs.length === 0) {
      html += '<div class="placeholder">「＋ 画像を追加」から商品画像を配置できます</div>';
    }
    imgs.forEach((im, i) => {
      html +=
        `<div class="placed-img${i === selImg ? ' selected' : ''}" data-idx="${i}" ` +
        `style="left:${im.x}px;top:${im.y}px;width:${im.w}px;height:${im.h}px">` +
        `<img src="${esc(im.src)}" alt="">` +
        `<div class="rm" title="削除">×</div><div class="handle"></div></div>`;
    });
    stage.innerHTML = html;
  }

  function applyImgStyle(el, rec) {
    el.style.left = rec.x + 'px';
    el.style.top = rec.y + 'px';
    el.style.width = rec.w + 'px';
    el.style.height = rec.h + 'px';
  }

  // =========================================================================
  // 原価表ビュー
  // =========================================================================
  function renderCost() {
    const p = plan;
    const ci = p.cost.inputs;
    const master = global.GENKA.master;

    const rows = p.cost.rows
      .map((r, i) => {
        const catOpts = master.CATEGORIES.map(
          (c) => `<option${c === r.category ? ' selected' : ''}>${c}</option>`
        ).join('');
        const stOpts = master.STATUSES.map(
          (s) => `<option${s === r.status ? ' selected' : ''}>${s}</option>`
        ).join('');
        return `
        <tr>
          <td><select data-bind="cost.rows.${i}.category">${catOpts}</select></td>
          <td>${inp('cost.rows.' + i + '.item', r.item, '')}</td>
          <td>${inp('cost.rows.' + i + '.memo', r.memo, '')}</td>
          <td>${inp('cost.rows.' + i + '.qtyPerSet', r.qtyPerSet, 'num', 'number')}</td>
          <td>${inp('cost.rows.' + i + '.unitPrice', r.unitPrice, 'num', 'number')}</td>
          <td class="calc" id="ct-set-${i}"></td>
          <td>${inp('cost.rows.' + i + '.orderQty', r.orderQty, 'num', 'number')}</td>
          <td class="calc" id="ct-ord-${i}"></td>
          <td>${inp('cost.rows.' + i + '.supplier', r.supplier, '')}</td>
          <td><select data-bind="cost.rows.${i}.status" data-status class="cost-status-${esc(r.status)}">${stOpts}</select></td>
          <td>${inp('cost.rows.' + i + '.remark', r.remark, '')}</td>
          <td class="rm"><button type="button" data-rmrow="${i}" title="行を削除">×</button></td>
        </tr>`;
      })
      .join('');

    document.getElementById('costRoot').innerHTML = `
      <div class="cost-title">原 価 表　<span id="costProdName">${esc(p.productName)}</span></div>

      <div class="cost-inputs">
        <div class="ci"><div class="k">セット総数</div><div class="v">${inp('cost.inputs.setTotal', ci.setTotal, '', 'number')}</div><div class="note">生産予定数</div></div>
        <div class="ci"><div class="k">売価（税別）</div><div class="v">${inp('cost.inputs.price', ci.price, '', 'number')}</div><div class="note">目標売価</div></div>
        <div class="ci"><div class="k">金型総額</div><div class="v">${inp('cost.inputs.moldTotal', ci.moldTotal, '', 'number')}</div><div class="note">別途発生時</div></div>
        <div class="ci"><div class="k">目標粗利率(%)</div><div class="v"><input class="fld" data-bind-pct="cost.inputs.targetGrossRate" type="number" value="${(calc.num(ci.targetGrossRate) * 100)}"></div><div class="note">任意入力</div></div>
        <div class="ci"><div class="k">税率(%)</div><div class="v"><input class="fld" data-bind-pct="cost.inputs.taxRate" type="number" value="${(calc.num(ci.taxRate) * 100)}"></div><div class="note">税込計算用</div></div>
      </div>

      <div class="summary-grid">
        <div class="summary-card"><div class="k">セット原価</div><div class="v" id="sumSetCost"></div></div>
        <div class="summary-card"><div class="k">金型償却/セット</div><div class="v" id="sumMoldPerSet"></div></div>
        <div class="summary-card"><div class="k">金型償却込原価</div><div class="v" id="sumMoldCost"></div></div>
        <div class="summary-card"><div class="k">総発注金額</div><div class="v" id="sumOrderTotal"></div></div>
        <div class="summary-card accent"><div class="k">売価（税別）</div><div class="v" id="sumPrice"></div></div>
        <div class="summary-card accent"><div class="k">粗利額</div><div class="v" id="sumGross"></div></div>
        <div class="summary-card accent"><div class="k">粗利率</div><div class="v" id="sumGrossRate"></div></div>
        <div class="summary-card warn"><div class="k">原価率</div><div class="v" id="sumCostRate"></div></div>
        <div class="summary-card"><div class="k">損益分岐原価</div><div class="v" id="sumBreakEven"></div></div>
        <div class="summary-card"><div class="k">粗利率目標差</div><div class="v" id="sumGrossVsTarget"></div></div>
      </div>

      <div class="cost-actions">
        <button type="button" class="mini" id="addRowBtn">＋ 行を追加</button>
      </div>

      <table class="cost-table">
        <thead>
          <tr>
            <th>区分</th><th>品目</th><th>仕様・メモ</th><th>数量/セット</th><th>単価</th>
            <th>セット原価</th><th>発注数</th><th>発注金額</th><th>仕入先</th><th>ステータス</th><th>備考</th><th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="5" class="lab">合計</td>
            <td class="calc" id="ct-total-set"></td>
            <td></td>
            <td class="calc" id="ct-total-order"></td>
            <td colspan="4"></td>
          </tr>
        </tfoot>
      </table>

      <div class="cost-memo">
        ・黄色＝入力項目（セット総数・売価・金型総額・目標粗利率・税率・各行の数量/単価/発注数）。編集すると原価・粗利・発注金額が自動再計算されます。<br>
        ・「セット原価」「発注金額」「合計」「サマリー」は自動計算（編集不可）。<br>
        ・パッケージ費用や追加部材は「＋ 行を追加」で入力してください。
      </div>
    `;
  }

  // =========================================================================
  // 再計算（派生値のみ更新。入力欄は再描画しないのでカーソルは保持される）
  // =========================================================================
  function recalc() {
    if (!plan) return;
    const c = calc.computeCost(plan.cost);

    // --- 企画書 価格欄 ---
    set('pbRetailExcl', fmt.yen(c.priceBox.retailExcl));
    set('pbRetailIncl', fmt.yen(c.priceBox.retailIncl));
    set('pbGrossExcl', fmt.yen(c.priceBox.grossExcl));
    set('pbGrossIncl', fmt.yen(c.priceBox.grossIncl));
    set('pbKakeritsu', fmt.pct(c.priceBox.kakeritsu));
    set('pbMoq', fmt.int(c.priceBox.moq));

    // --- 原価表 サマリー ---
    set('sumSetCost', fmt.yen(c.setCostTotal));
    set('sumMoldPerSet', fmt.yen(c.moldPerSet));
    set('sumMoldCost', fmt.yen(c.costWithMold));
    set('sumOrderTotal', fmt.yen(c.totalOrderAmount));
    set('sumPrice', fmt.yen(c.inputs.price));
    set('sumGross', fmt.yen(c.grossProfit));
    set('sumGrossRate', fmt.pct(c.grossRate));
    set('sumCostRate', fmt.pct(c.costRate));
    set('sumBreakEven', fmt.yen(c.breakEvenCost));
    const diff = c.grossRateVsTarget;
    set('sumGrossVsTarget', (diff >= 0 ? '+' : '') + fmt.pct(diff));

    // --- 行ごとの計算セル ---
    c.rows.forEach((r, i) => {
      set('ct-set-' + i, fmt.int(r.setCost));
      set('ct-ord-' + i, fmt.int(r.orderAmount));
    });
    set('ct-total-set', fmt.int(c.setCostTotal));
    set('ct-total-order', fmt.int(c.totalOrderAmount));

    // 原価表タイトルの商品名
    set('costProdName', plan.productName || '');
  }
  function set(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // =========================================================================
  // イベント
  // =========================================================================
  function onInput(e) {
    const t = e.target;
    if (!t) return;
    const pctPath = t.getAttribute && t.getAttribute('data-bind-pct');
    if (pctPath) {
      setPath(plan, pctPath, calc.num(t.value) / 100);
      recalc();
      changed();
      return;
    }
    const path = t.getAttribute && t.getAttribute('data-bind');
    if (!path) return;
    let val;
    if (t.isContentEditable) val = t.innerText;
    else if (t.type === 'number') val = calc.num(t.value);
    else val = t.value;
    setPath(plan, path, val);
    if (t.hasAttribute('data-status')) t.className = 'cost-status-' + val;
    recalc();
    changed();
  }

  function onSheetClick(e) {
    if (e.target.closest('#addImgBtn')) {
      hooks.pickImage && hooks.pickImage();
      return;
    }
    const rm = e.target.closest('.placed-img .rm');
    if (rm) {
      const idx = +rm.parentElement.getAttribute('data-idx');
      plan.images.splice(idx, 1);
      selImg = -1;
      renderStage();
      changed();
    }
  }

  function onStageMouseDown(e) {
    const stage = document.getElementById('imageStage');
    if (!stage) return;
    const imgEl = e.target.closest('.placed-img');
    if (!imgEl) {
      if (selImg !== -1) {
        selImg = -1;
        renderStage();
      }
      return;
    }
    if (e.target.classList.contains('rm')) return; // 削除はクリックで処理
    const idx = +imgEl.getAttribute('data-idx');
    selImg = idx;
    Array.from(stage.querySelectorAll('.placed-img')).forEach((n, i) =>
      n.classList.toggle('selected', i === idx)
    );
    const isHandle = e.target.classList.contains('handle');
    e.preventDefault();
    const rec = plan.images[idx];
    const sx = e.clientX, sy = e.clientY;
    const ox = rec.x, oy = rec.y, ow = rec.w, oh = rec.h;
    let moved = false;
    function move(ev) {
      moved = true;
      if (isHandle) {
        rec.w = Math.max(30, ow + (ev.clientX - sx));
        rec.h = Math.max(30, oh + (ev.clientY - sy));
      } else {
        rec.x = ox + (ev.clientX - sx);
        rec.y = oy + (ev.clientY - sy);
      }
      applyImgStyle(imgEl, rec);
    }
    function up() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      if (moved) changed();
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  function onCostClick(e) {
    if (e.target.closest('#addRowBtn')) {
      plan.cost.rows.push({
        category: 'その他', item: '', memo: '', qtyPerSet: 1, unitPrice: 0,
        orderQty: plan.cost.inputs.setTotal || 0, supplier: '', status: '未発注', remark: '',
      });
      renderCost();
      recalc();
      changed();
      return;
    }
    const rm = e.target.closest('[data-rmrow]');
    if (rm) {
      const idx = +rm.getAttribute('data-rmrow');
      plan.cost.rows.splice(idx, 1);
      renderCost();
      recalc();
      changed();
    }
  }

  function changed() {
    hooks.onChange && hooks.onChange();
  }

  // 画像を追加（app.js のファイル選択から呼ばれる）
  function addImage(dataUrl) {
    plan.images = plan.images || [];
    // ステージ内に収まる初期サイズ
    const w = 240, h = 180;
    const x = 16 + (plan.images.length % 3) * 18;
    const y = 16 + (plan.images.length % 3) * 18;
    plan.images.push({ src: dataUrl, x, y, w, h });
    selImg = plan.images.length - 1;
    renderStage();
    changed();
  }

  // =========================================================================
  // 公開 API
  // =========================================================================
  function mount(h) {
    hooks = h || {};
    if (!mounted) {
      const sheet = document.getElementById('sheet');
      const cost = document.getElementById('costRoot');
      sheet.addEventListener('input', onInput);
      sheet.addEventListener('change', onInput);
      sheet.addEventListener('click', onSheetClick);
      sheet.addEventListener('mousedown', onStageMouseDown);
      cost.addEventListener('input', onInput);
      cost.addEventListener('change', onInput);
      cost.addEventListener('click', onCostClick);
      mounted = true;
    }
  }

  function load(p) {
    plan = p;
    selImg = -1;
    renderSheet();
    renderCost();
    recalc();
  }

  global.GENKA.sheet = {
    mount: mount,
    load: load,
    recalc: recalc,
    addImage: addImage,
    getPlan: () => plan,
  };
})(window);
