/* PDF / Excel 書き出し */
(function (global) {
  'use strict';

  const calc = global.GENKA.calc;

  function safeName(s) {
    return String(s || '企画書').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
  }

  // ---- PDF（企画書の見た目をそのまま画像化して A4 に配置）----
  async function exportPDF(plan, projName) {
    const sheetEl = document.getElementById('sheet');
    if (!sheetEl) return;
    // 選択枠を消してから撮影
    sheetEl.querySelectorAll('.placed-img.selected').forEach((n) => n.classList.remove('selected'));

    const canvas = await html2canvas(sheetEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: sheetEl.scrollWidth,
    });

    const { jsPDF } = global.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
      heightLeft -= pageH;
    }
    pdf.save(safeName(projName || plan.productName) + '.pdf');
  }

  // ---- Excel（原価表＋企画書サマリー）----
  function exportExcel(plan, projName) {
    const c = calc.computeCost(plan.cost);
    const ci = c.inputs;
    const r1 = (n) => Math.round(n * 10) / 10;

    // --- シート1: 原価表 ---
    const aoa = [];
    aoa.push(['原価表', plan.productName || '']);
    aoa.push([]);
    aoa.push(['入力項目', '値', 'メモ']);
    aoa.push(['セット総数', ci.setTotal, '生産予定数']);
    aoa.push(['売価（税別）', ci.price, '目標売価']);
    aoa.push(['金型総額', ci.moldTotal, '別途発生時']);
    aoa.push(['金型償却/セット', Math.round(c.moldPerSet), '金型総額 ÷ セット総数']);
    aoa.push(['目標粗利率(%)', r1(ci.targetGrossRate * 100), '任意入力']);
    aoa.push(['税率(%)', r1(ci.taxRate * 100), '税込計算用']);
    aoa.push([]);
    aoa.push(['サマリー']);
    aoa.push(['セット原価', Math.round(c.setCostTotal), '金型償却込原価', Math.round(c.costWithMold)]);
    aoa.push(['粗利額', Math.round(c.grossProfit), '総発注金額', Math.round(c.totalOrderAmount)]);
    aoa.push(['粗利率(%)', r1(c.grossRate * 100), '原価率(%)', r1(c.costRate * 100)]);
    aoa.push(['損益分岐原価', Math.round(c.breakEvenCost), '粗利率目標差(%)', r1(c.grossRateVsTarget * 100)]);
    aoa.push([]);
    aoa.push(['区分', '品目', '仕様・メモ', '数量/セット', '単価', 'セット原価', '発注数', '発注金額', '仕入先', 'ステータス', '備考']);
    plan.cost.rows.forEach((row, i) => {
      const rc = c.rows[i];
      aoa.push([
        row.category, row.item, row.memo,
        calc.num(row.qtyPerSet), calc.num(row.unitPrice), Math.round(rc.setCost),
        calc.num(row.orderQty), Math.round(rc.orderAmount),
        row.supplier, row.status, row.remark,
      ]);
    });
    aoa.push(['合計', '', '', '', '', Math.round(c.setCostTotal), '', Math.round(c.totalOrderAmount), '', '', '']);

    const ws1 = XLSX.utils.aoa_to_sheet(aoa);
    ws1['!cols'] = [
      { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 11 }, { wch: 10 },
      { wch: 12 }, { wch: 11 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 14 },
    ];

    // --- シート2: 企画書 ---
    const pb = c.priceBox;
    const p2 = [
      ['商品企画書'],
      [],
      ['商品名', plan.productName || ''],
      ['発売時期', plan.releaseDate || ''],
      ['担当', plan.person || ''],
      [],
      ['ヘッドコピー', plan.headCopy || ''],
      ['他社にない訴求点', plan.sellingPoints || ''],
      ['商品説明', plan.description || ''],
      [],
      ['カラー', plan.color || ''],
      ['同梱品', plan.included || ''],
      ['仕様', plan.specsText || ''],
      ['電源', plan.power || ''],
      ['素材', plan.material || ''],
      ['原産地', plan.origin || ''],
      ['承認等', plan.approval || ''],
      [],
      ['目標売価（税別）', pb.retailExcl],
      ['目標売価（税込）', pb.retailIncl],
      ['粗利額（税別）', pb.grossExcl],
      ['粗利額（税込）', pb.grossIncl],
      ['掛け率(%)', r1(pb.kakeritsu * 100)],
      ['MOQ', pb.moq],
      [],
      ['試験情報', plan.testInfo || ''],
      ['別売品', plan.optional || ''],
      ['その他・特記事項', plan.notes || ''],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(p2);
    ws2['!cols'] = [{ wch: 20 }, { wch: 60 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, '原価表');
    XLSX.utils.book_append_sheet(wb, ws2, '企画書');
    XLSX.writeFile(wb, safeName(projName || plan.productName) + '.xlsx');
  }

  global.GENKA = global.GENKA || {};
  global.GENKA.exporter = { exportPDF: exportPDF, exportExcel: exportExcel };
})(window);
