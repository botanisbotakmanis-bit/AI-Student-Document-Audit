/**
 * AI Student Document Audit Assistant
 * Vanilla JS — no external dependencies.
 *
 * Requirement classification:
 *   - Terpenuhi              : doc present, no unverifiable condition, no format mismatch
 *   - Belum dapat ditentukan : doc present BUT condition cannot be verified from the
 *                              provided document details (e.g. IPK value not supplied)
 *   - Belum tersedia         : doc not present at all
 *
 * Ambiguity rule: a requirement line containing " — " or " – " is split into
 * <docName> and <condition>.  If the available list contains <docName> but NOT
 * the full conditioned string, and the condition cannot be verified from the
 * user-supplied catatan, the requirement is ambiguous.
 *
 * Format-mismatch rule: if a requirement explicitly names a format (e.g. "PDF")
 * and the supplied DocInfo for that document has a different format selected,
 * the doc goes to "Potensi Masalah" rather than "Terpenuhi".
 *
 * DocInfo shape: { nama, format, tanggal, catatan }
 *   - nama     : string  (required)
 *   - format   : string  ('PDF'|'JPG'|'PNG'|'Word'|'Lainnya'|'')
 *   - tanggal  : string  (ISO date or '', optional)
 *   - catatan  : string  (free text, optional)
 */

(function () {
  'use strict';

  // ─── Format options shown in each doc-info row ────────────────────────────
  const FORMAT_OPTIONS = ['', 'PDF', 'JPG', 'PNG', 'Word', 'Lainnya'];
  const FORMAT_LABELS  = {
    '':        '— Format —',
    'PDF':     'PDF',
    'JPG':     'JPG / JPEG',
    'PNG':     'PNG',
    'Word':    'Word (.doc/.docx)',
    'Lainnya': 'Lainnya'
  };

  // ─── State ────────────────────────────────────────────────────────────────
  let demoCases = [];
  let presets   = {};

  // ─── DOM refs ─────────────────────────────────────────────────────────────
  const elPresetSelect   = document.getElementById('preset-select');
  const elBtnLoadDemo    = document.getElementById('btn-load-demo');
  const elPresetButtons  = document.getElementById('preset-buttons');
  const elRequirements   = document.getElementById('input-requirements');
  const elDocInfoList    = document.getElementById('doc-info-list');
  const elBtnAddDoc      = document.getElementById('btn-add-doc');
  const elBtnAudit       = document.getElementById('btn-audit');
  const elBtnReset       = document.getElementById('btn-reset');
  const elBtnAuditAgain  = document.getElementById('btn-audit-again');
  const elSectionInput   = document.getElementById('section-input');
  const elSectionResults = document.getElementById('section-results');
  const elResultStatus   = document.getElementById('result-status');
  const elListCompleted  = document.getElementById('list-completed');
  const elListAmbiguous  = document.getElementById('list-ambiguous');
  const elListMissing    = document.getElementById('list-missing');
  const elListIssues     = document.getElementById('list-issues');
  const elListActions    = document.getElementById('list-actions');

  // ─── Bootstrap: load JSON dataset ─────────────────────────────────────────
  fetch('data/demo_cases.json')
    .then(r => r.json())
    .then(data => {
      demoCases = data.cases   || [];
      presets   = data.presets || {};
      populateDemoSelect();
      populatePresetChips();
    })
    .catch(() => {
      demoCases = FALLBACK_CASES;
      presets   = FALLBACK_PRESETS;
      populateDemoSelect();
      populatePresetChips();
    });

  // ─── Populate demo dropdown ───────────────────────────────────────────────
  function populateDemoSelect () {
    demoCases.forEach(c => {
      const opt = document.createElement('option');
      opt.value       = c.id;
      opt.textContent = c.id + ' — ' + c.label;
      elPresetSelect.appendChild(opt);
    });
  }

  // ─── Populate preset chips ────────────────────────────────────────────────
  function populatePresetChips () {
    Object.entries(presets).forEach(([, preset]) => {
      const btn = document.createElement('button');
      btn.className   = 'chip';
      btn.type        = 'button';
      btn.textContent = preset.label;
      btn.addEventListener('click', () => {
        elRequirements.value = preset.requirements.join('\n');
      });
      elPresetButtons.appendChild(btn);
    });
  }

  // ─── Load demo case ───────────────────────────────────────────────────────
  elBtnLoadDemo.addEventListener('click', () => {
    const id = elPresetSelect.value;
    if (!id) { alert('Pilih kasus demo terlebih dahulu.'); return; }

    const c = demoCases.find(x => x.id === id);
    if (!c) return;

    const preset = presets[c.requirementPreset];
    if (preset) {
      elRequirements.value = preset.requirements.join('\n');
    }

    // Populate doc-info rows from availableDocs
    clearDocInfoRows();
    (c.availableDocs || []).forEach(name => {
      // Demo cases may carry structured docInfo; fall back to name-only
      const info = (c.docInfo && c.docInfo[name]) || {};
      addDocInfoRow({
        nama:    name,
        format:  info.format   || '',
        tanggal: info.tanggal  || '',
        catatan: info.catatan  || ''
      });
    });
  });

  // ─── Add-doc button ───────────────────────────────────────────────────────
  elBtnAddDoc.addEventListener('click', () => addDocInfoRow());

  // ─── Audit button ─────────────────────────────────────────────────────────
  elBtnAudit.addEventListener('click', runAudit);

  elBtnReset.addEventListener('click', () => {
    elRequirements.value = '';
    elPresetSelect.value = '';
    clearDocInfoRows();
    showSection('input');
  });

  elBtnAuditAgain.addEventListener('click', () => showSection('input'));

  // =========================================================================
  // DOC-INFO TABLE
  // =========================================================================

  /**
   * Add a single doc-info row to the list.
   * @param {{ nama?:string, format?:string, tanggal?:string, catatan?:string }} defaults
   */
  function addDocInfoRow (defaults) {
    const d = defaults || {};

    const row = document.createElement('div');
    row.className = 'doc-info-row';

    // ── Row header (doc name + remove button) ──
    const rowHead = document.createElement('div');
    rowHead.className = 'doc-info-row-head';

    const nameInput = document.createElement('input');
    nameInput.type        = 'text';
    nameInput.className   = 'doc-info-name';
    nameInput.placeholder = 'Nama dokumen, misal: Transkrip Nilai';
    nameInput.value       = d.nama || '';
    nameInput.setAttribute('aria-label', 'Nama dokumen');

    const removeBtn = document.createElement('button');
    removeBtn.type      = 'button';
    removeBtn.className = 'btn-remove-doc';
    removeBtn.title     = 'Hapus dokumen ini';
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', () => row.remove());

    rowHead.appendChild(nameInput);
    rowHead.appendChild(removeBtn);

    // ── Row detail (format + tanggal + catatan) ──
    const rowDetail = document.createElement('div');
    rowDetail.className = 'doc-info-row-detail';

    // Format select
    const formatWrap = document.createElement('div');
    formatWrap.className = 'doc-info-field';
    const formatLabel = document.createElement('label');
    formatLabel.className   = 'doc-info-field-label';
    formatLabel.textContent = 'Format';
    const formatSelect = document.createElement('select');
    formatSelect.className = 'doc-info-format';
    FORMAT_OPTIONS.forEach(opt => {
      const o = document.createElement('option');
      o.value       = opt;
      o.textContent = FORMAT_LABELS[opt];
      if (opt === (d.format || '')) o.selected = true;
      formatSelect.appendChild(o);
    });
    formatWrap.appendChild(formatLabel);
    formatWrap.appendChild(formatSelect);

    // Tanggal input
    const tanggalWrap = document.createElement('div');
    tanggalWrap.className = 'doc-info-field';
    const tanggalLabel = document.createElement('label');
    tanggalLabel.className   = 'doc-info-field-label';
    tanggalLabel.textContent = 'Tanggal dokumen';
    const tanggalInput = document.createElement('input');
    tanggalInput.type      = 'date';
    tanggalInput.className = 'doc-info-tanggal';
    tanggalInput.value     = d.tanggal || '';
    tanggalInput.setAttribute('aria-label', 'Tanggal dokumen');
    tanggalWrap.appendChild(tanggalLabel);
    tanggalWrap.appendChild(tanggalInput);

    // Catatan input
    const catatanWrap = document.createElement('div');
    catatanWrap.className = 'doc-info-field doc-info-field-wide';
    const catatanLabel = document.createElement('label');
    catatanLabel.className   = 'doc-info-field-label';
    catatanLabel.textContent = 'Catatan';
    const catatanInput = document.createElement('input');
    catatanInput.type        = 'text';
    catatanInput.className   = 'doc-info-catatan';
    catatanInput.placeholder = 'misal: IPK 3.45, sudah dilegalisir, dll.';
    catatanInput.value       = d.catatan || '';
    catatanInput.setAttribute('aria-label', 'Catatan tambahan');
    catatanWrap.appendChild(catatanLabel);
    catatanWrap.appendChild(catatanInput);

    rowDetail.appendChild(formatWrap);
    rowDetail.appendChild(tanggalWrap);
    rowDetail.appendChild(catatanWrap);

    row.appendChild(rowHead);
    row.appendChild(rowDetail);
    elDocInfoList.appendChild(row);

    // Focus the name field when adding manually
    if (!defaults) nameInput.focus();
  }

  /** Remove all doc-info rows. */
  function clearDocInfoRows () {
    elDocInfoList.innerHTML = '';
  }

  /**
   * Read all doc-info rows from the DOM and return DocInfo[].
   * Rows with an empty name are skipped.
   */
  function readDocInfoRows () {
    const rows = elDocInfoList.querySelectorAll('.doc-info-row');
    const result = [];
    rows.forEach(row => {
      const nama = row.querySelector('.doc-info-name').value.trim();
      if (!nama) return;
      result.push({
        nama,
        format:  row.querySelector('.doc-info-format').value,
        tanggal: row.querySelector('.doc-info-tanggal').value,
        catatan: row.querySelector('.doc-info-catatan').value.trim()
      });
    });
    return result;
  }

  // =========================================================================
  // AUDIT LOGIC
  // =========================================================================

  // ─── Core audit runner ────────────────────────────────────────────────────
  function runAudit () {
    const requirements = parseLines(elRequirements.value);
    const docInfoList  = readDocInfoRows();

    if (requirements.length === 0) {
      alert('Harap masukkan setidaknya satu dokumen persyaratan.');
      elRequirements.focus();
      return;
    }
    if (docInfoList.length === 0) {
      alert('Harap tambahkan setidaknya satu dokumen yang tersedia.');
      elBtnAddDoc.focus();
      return;
    }

    const result = audit(requirements, docInfoList);
    renderResults(result);
    showSection('results');
  }

  // ─── Requirement parser ───────────────────────────────────────────────────
  /**
   * Split a requirement line on " — " or " – ".
   * Returns { docName, condition } — condition is null for plain requirements.
   */
  function parseRequirement (line) {
    const match = line.match(/^(.+?)\s+[—–]\s+(.+)$/);
    if (match) {
      return { docName: match[1].trim(), condition: match[2].trim() };
    }
    return { docName: line.trim(), condition: null };
  }

  /**
   * Try to resolve a condition against a DocInfo's catatan.
   * Very lightweight heuristic — only checks numeric thresholds that appear
   * as "keyword angka" patterns (e.g. "IPK minimal 3.00").
   *
   * Returns:
   *   'satisfied'    – condition is verifiably met by catatan content
   *   'not_satisfied'– condition is verifiably NOT met
   *   'unknown'      – cannot determine (catatan empty or no recognisable value)
   */
  function resolveConditionFromCatatan (condition, catatan) {
    if (!catatan) return 'unknown';

    const c  = condition.toLowerCase();
    const ca = catatan.toLowerCase();

    // Pattern: "ipk minimal X.XX" — look for a number in catatan
    const minMatch = c.match(/minimal\s+([\d,.]+)/);
    if (minMatch) {
      const threshold = parseFloat(minMatch[1].replace(',', '.'));
      // Find any decimal number in catatan
      const valMatch = ca.match(/([\d]+[.,][\d]+)/);
      if (valMatch) {
        const val = parseFloat(valMatch[1].replace(',', '.'));
        return val >= threshold ? 'satisfied' : 'not_satisfied';
      }
      return 'unknown';
    }

    // Pattern: "maksimal X" — look for a number in catatan
    const maxMatch = c.match(/maksimal\s+([\d,.]+)/);
    if (maxMatch) {
      const threshold = parseFloat(maxMatch[1].replace(',', '.'));
      const valMatch = ca.match(/([\d]+[.,][\d]+)/);
      if (valMatch) {
        const val = parseFloat(valMatch[1].replace(',', '.'));
        return val <= threshold ? 'satisfied' : 'not_satisfied';
      }
      return 'unknown';
    }

    return 'unknown';
  }

  /**
   * Check whether a requirement's text implies a specific file format.
   * Returns a format string ('PDF', 'JPG', etc.) or null.
   */
  function extractRequiredFormat (reqLine) {
    const upper = reqLine.toUpperCase();
    for (const fmt of ['PDF', 'JPG', 'JPEG', 'PNG', 'WORD']) {
      if (upper.includes(fmt)) return fmt === 'JPEG' ? 'JPG' : fmt;
    }
    return null;
  }

  /**
   * Classify a single requirement against the available DocInfo list.
   *
   * Returns one of:
   *   'completed'        – doc present, condition satisfied or absent, no format conflict
   *   'ambiguous'        – doc present, condition present but cannot be verified
   *   'format_mismatch'  – doc present but format is inconsistent with requirement
   *   'condition_failed' – condition was verifiably NOT met (goes to issues)
   *   'missing'          – doc not present at all
   *
   * @param {string}     req         - requirement line
   * @param {DocInfo[]}  docInfoList - list of user-supplied doc details
   * @param {Set<string>} normNameSet - pre-built normalised name set for fast lookup
   */
  function classifyRequirement (req, docInfoList, normNameSet) {
    const normalize = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const { docName, condition } = parseRequirement(req);
    const normDoc  = normalize(docName);
    const normFull = normalize(req);

    // Find matching DocInfo entry (by bare doc name or full conditioned string)
    const docInfo = docInfoList.find(d => {
      const n = normalize(d.nama);
      return n === normDoc || n === normFull;
    });

    const docPresent  = !!docInfo || normNameSet.has(normDoc);
    const fullPresent = normNameSet.has(normFull);

    if (!docPresent) return 'missing';

    // Check format consistency if requirement mentions a format
    const reqFormat = extractRequiredFormat(req);
    if (reqFormat && docInfo && docInfo.format && docInfo.format !== '' && docInfo.format !== 'Lainnya') {
      // Normalise: Word covers .doc/.docx; treat 'Word' as not matching PDF etc.
      const infoFmt = docInfo.format.toUpperCase().replace('WORD', 'WORD');
      if (infoFmt !== reqFormat) {
        return 'format_mismatch';
      }
    }

    if (condition === null) {
      // Plain requirement — satisfied
      return 'completed';
    }

    // Conditioned requirement — full string explicitly listed → completed
    if (fullPresent) return 'completed';

    // Try to resolve condition from catatan
    const catatan = (docInfo && docInfo.catatan) || '';
    const resolution = resolveConditionFromCatatan(condition, catatan);

    if (resolution === 'satisfied')     return 'completed';
    if (resolution === 'not_satisfied') return 'condition_failed';
    // resolution === 'unknown'
    return 'ambiguous';
  }

  /**
   * Pure audit function — no side-effects.
   * @param {string[]}   requirements
   * @param {DocInfo[]}  docInfoList
   * @returns {AuditResult}
   */
  function audit (requirements, docInfoList) {
    const normalize   = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const normNameSet = new Set(docInfoList.map(d => normalize(d.nama)));

    const completed        = [];
    const ambiguous        = [];
    const missing          = [];
    const formatMismatches = []; // { req, docInfo }
    const condFailed       = []; // { req, condition }

    requirements.forEach(req => {
      const verdict = classifyRequirement(req, docInfoList, normNameSet);
      if      (verdict === 'completed')       completed.push(req);
      else if (verdict === 'ambiguous')       ambiguous.push(req);
      else if (verdict === 'format_mismatch') {
        const { docName } = parseRequirement(req);
        const docInfo = docInfoList.find(d => normalize(d.nama) === normalize(docName));
        formatMismatches.push({ req, docInfo });
        // Format mismatches are surfaced in issues but the doc is NOT in completed
        ambiguous.push(req); // treated as unresolved
      }
      else if (verdict === 'condition_failed') {
        const { condition } = parseRequirement(req);
        condFailed.push({ req, condition });
        ambiguous.push(req); // treated as unresolved
      }
      else missing.push(req);
    });

    // Extra docs (not referenced by any requirement)
    const normReqDocNames = new Set(
      requirements.map(r => normalize(parseRequirement(r).docName))
    );
    const normReqFull = new Set(requirements.map(normalize));
    const extra = docInfoList.filter(d => {
      const n = normalize(d.nama);
      return !normReqDocNames.has(n) && !normReqFull.has(n);
    }).map(d => d.nama);

    // ── Build issues list ──
    const issues = [];

    if (missing.length > 0) {
      issues.push(
        missing.length === 1
          ? 'Terdapat 1 dokumen yang belum tersedia.'
          : `Terdapat ${missing.length} dokumen yang belum tersedia.`
      );
    }

    if (ambiguous.length > 0) {
      issues.push(
        ambiguous.length === 1
          ? 'Terdapat 1 persyaratan yang belum dapat ditentukan pemenuhannya.'
          : `Terdapat ${ambiguous.length} persyaratan yang belum dapat ditentukan pemenuhannya.`
      );
    }

    formatMismatches.forEach(({ req, docInfo }) => {
      const reqFmt  = extractRequiredFormat(req);
      const docFmt  = docInfo ? docInfo.format : '?';
      const { docName } = parseRequirement(req);
      issues.push(
        `Format dokumen "${docName}" tidak sesuai: persyaratan menyebut ${reqFmt}, ` +
        `tapi dokumen yang tersedia berformat ${docFmt || 'tidak diketahui'}. ` +
        'Pastikan Anda menggunakan format yang diminta.'
      );
    });

    condFailed.forEach(({ req, condition }) => {
      const { docName } = parseRequirement(req);
      issues.push(
        `Dokumen "${docName}" tersedia, tapi kondisi "${condition}" tampaknya tidak terpenuhi ` +
        'berdasarkan catatan yang Anda masukkan. Periksa kembali.'
      );
    });

    if (extra.length > 0) {
      issues.push(
        'Dokumen berikut tidak tercantum dalam persyaratan: ' +
        extra.join(', ') + '. Pastikan nama dokumen sudah sesuai.'
      );
    }

    // ── Build actions list ──
    const actions = [];
    const allResolved = missing.length === 0 && ambiguous.length === 0;

    if (allResolved) {
      actions.push('Semua dokumen sudah lengkap. Segera serahkan ke bagian yang dituju sebelum batas waktu.');
      actions.push('Periksa kembali keaslian dan masa berlaku setiap dokumen sebelum diserahkan.');
    } else {
      missing.forEach(doc => {
        actions.push(`Siapkan dokumen: "${doc}".`);
      });

      // Ambiguous that are NOT format mismatches or failed conditions
      const trueAmbiguous = ambiguous.filter(req => {
        const isFmtMismatch = formatMismatches.some(m => m.req === req);
        const isCondFailed  = condFailed.some(m => m.req === req);
        return !isFmtMismatch && !isCondFailed;
      });
      trueAmbiguous.forEach(doc => {
        const { docName, condition } = parseRequirement(doc);
        actions.push(
          `Konfirmasi apakah "${docName}" yang Anda miliki memenuhi syarat: "${condition}". ` +
          'Tambahkan informasi pada kolom Catatan untuk membantu sistem memeriksa kondisi ini.'
        );
      });

      formatMismatches.forEach(({ req }) => {
        const reqFmt = extractRequiredFormat(req);
        const { docName } = parseRequirement(req);
        actions.push(
          `Pastikan "${docName}" tersedia dalam format ${reqFmt} sesuai persyaratan.`
        );
      });

      condFailed.forEach(({ req }) => {
        const { docName, condition } = parseRequirement(req);
        actions.push(
          `Periksa kembali apakah "${docName}" benar-benar memenuhi kondisi: "${condition}".`
        );
      });

      actions.push('Hubungi bagian akademik atau kemahasiswaan untuk konfirmasi persyaratan terbaru.');
      actions.push('Simpan semua dokumen dalam satu folder agar mudah ditemukan saat pengumpulan.');
    }

    if (extra.length > 0) {
      actions.push('Periksa kembali ejaan nama dokumen agar cocok dengan daftar persyaratan.');
    }

    // ── Overall status ──
    let status, statusClass;
    const unresolvedCount = missing.length + ambiguous.length;
    if (unresolvedCount === 0) {
      status      = '✅ Dokumen Lengkap — Semua persyaratan terpenuhi.';
      statusClass = 'ok';
    } else if (missing.length === 0 && ambiguous.length > 0) {
      status      = `🔎 Perlu Verifikasi — ${ambiguous.length} dari ${requirements.length} persyaratan belum dapat ditentukan.`;
      statusClass = 'ambiguous';
    } else if (unresolvedCount < requirements.length / 2) {
      status      = `⚠️ Hampir Lengkap — ${unresolvedCount} dari ${requirements.length} persyaratan belum terpenuhi atau belum dapat ditentukan.`;
      statusClass = 'warn';
    } else {
      status      = `❌ Tidak Lengkap — ${unresolvedCount} dari ${requirements.length} persyaratan belum terpenuhi atau belum dapat ditentukan.`;
      statusClass = 'error';
    }

    return { completed, ambiguous, missing, extra, issues, actions, status, statusClass };
  }

  // =========================================================================
  // RENDER
  // =========================================================================

  function renderResults (r) {
    elResultStatus.textContent = r.status;
    elResultStatus.className   = 'status-banner ' + r.statusClass;

    renderCompletedList(elListCompleted, r.completed);
    renderAmbiguousList(elListAmbiguous, r.ambiguous);
    renderList(elListMissing,  r.missing,  'Tidak ada dokumen yang kurang. 🎉');
    renderList(elListIssues,   r.issues,   'Tidak ada potensi masalah yang terdeteksi.');
    renderList(elListActions,  r.actions,  'Tidak ada rekomendasi khusus.');
  }

  /**
   * Render completed list — show doc name and any extra detail (format, tanggal).
   */
  function renderCompletedList (ulEl, items) {
    ulEl.innerHTML = '';
    if (items.length === 0) {
      const li = document.createElement('li');
      li.className   = 'empty-state';
      li.textContent = 'Belum ada dokumen yang terpenuhi.';
      ulEl.appendChild(li);
      return;
    }
    const docInfoList = readDocInfoRows();
    const normalize   = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
    items.forEach(req => {
      const { docName } = parseRequirement(req);
      const docInfo = docInfoList.find(d => normalize(d.nama) === normalize(docName));
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = docName;
      li.appendChild(name);
      if (docInfo) {
        const parts = [];
        if (docInfo.format)  parts.push(docInfo.format);
        if (docInfo.tanggal) parts.push(docInfo.tanggal);
        if (parts.length > 0) {
          const meta = document.createElement('span');
          meta.className   = 'doc-meta';
          meta.textContent = parts.join(' · ');
          li.appendChild(meta);
        }
      }
      ulEl.appendChild(li);
    });
  }

  /**
   * Render the ambiguous list with a sub-note showing the unverifiable condition.
   */
  function renderAmbiguousList (ulEl, items) {
    ulEl.innerHTML = '';
    if (items.length === 0) {
      const li = document.createElement('li');
      li.className   = 'empty-state';
      li.textContent = 'Tidak ada persyaratan yang belum dapat ditentukan.';
      ulEl.appendChild(li);
      return;
    }
    items.forEach(req => {
      const { docName, condition } = parseRequirement(req);
      const li   = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = docName;
      li.appendChild(name);
      if (condition) {
        const note = document.createElement('span');
        note.className   = 'ambiguous-condition';
        note.textContent = 'Kondisi belum dapat diverifikasi: ' + condition;
        li.appendChild(note);
      }
      ulEl.appendChild(li);
    });
  }

  function renderList (ulEl, items, emptyMsg) {
    ulEl.innerHTML = '';
    if (items.length === 0) {
      const li = document.createElement('li');
      li.className   = 'empty-state';
      li.textContent = emptyMsg;
      ulEl.appendChild(li);
      return;
    }
    items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      ulEl.appendChild(li);
    });
  }

  // ─── Section switching ────────────────────────────────────────────────────
  function showSection (which) {
    if (which === 'input') {
      elSectionInput.removeAttribute('hidden');
      elSectionResults.setAttribute('hidden', '');
    } else {
      elSectionInput.setAttribute('hidden', '');
      elSectionResults.removeAttribute('hidden');
      elSectionResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function parseLines (text) {
    return text
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  // =========================================================================
  // FALLBACK DATA (used when fetch fails, e.g. file:// protocol)
  // =========================================================================
  const FALLBACK_PRESETS = {
    wisuda: {
      label: 'Pendaftaran Wisuda',
      requirements: [
        'Transkrip Nilai', 'Ijazah Sementara', 'Foto 3x4',
        'Kartu Tanda Mahasiswa (KTM)', 'Surat Bebas Pustaka',
        'Surat Bebas Laboratorium', 'Bukti Pembayaran UKT',
        'Formulir Pendaftaran Wisuda'
      ]
    },
    beasiswa: {
      label: 'Pengajuan Beasiswa',
      requirements: [
        'Transkrip Nilai', 'Kartu Tanda Mahasiswa (KTM)',
        'Surat Keterangan Aktif Kuliah', 'Surat Rekomendasi Dosen',
        'Slip Gaji Orang Tua', 'Kartu Keluarga', 'Foto 3x4', 'Esai Motivasi'
      ]
    },
    cuti: {
      label: 'Cuti Akademik',
      requirements: [
        'Kartu Tanda Mahasiswa (KTM)', 'Formulir Pengajuan Cuti',
        'Surat Persetujuan Orang Tua', 'Bukti Pembayaran UKT',
        'Surat Keterangan dari Dosen Pembimbing'
      ]
    },
    beasiswa_kondisi: {
      label: 'Beasiswa (dengan kondisi)',
      requirements: [
        'Transkrip Nilai — IPK minimal 3.00',
        'Kartu Tanda Mahasiswa (KTM)',
        'Surat Keterangan Aktif Kuliah',
        'Surat Rekomendasi Dosen',
        'Slip Gaji Orang Tua — penghasilan di bawah UMR',
        'Kartu Keluarga',
        'Foto 3x4',
        'Esai Motivasi'
      ]
    }
  };

  const FALLBACK_CASES = [
    {
      id: 'DEMO-001', label: 'Pendaftaran Wisuda – Lengkap',
      requirementPreset: 'wisuda',
      availableDocs: [
        'Transkrip Nilai', 'Ijazah Sementara', 'Foto 3x4',
        'Kartu Tanda Mahasiswa (KTM)', 'Surat Bebas Pustaka',
        'Surat Bebas Laboratorium', 'Bukti Pembayaran UKT',
        'Formulir Pendaftaran Wisuda'
      ]
    },
    {
      id: 'DEMO-002', label: 'Pendaftaran Wisuda – Kurang Surat Bebas',
      requirementPreset: 'wisuda',
      availableDocs: [
        'Transkrip Nilai', 'Ijazah Sementara', 'Foto 3x4',
        'Kartu Tanda Mahasiswa (KTM)', 'Bukti Pembayaran UKT',
        'Formulir Pendaftaran Wisuda'
      ]
    },
    {
      id: 'DEMO-003', label: 'Pengajuan Beasiswa – Lengkap',
      requirementPreset: 'beasiswa',
      availableDocs: [
        'Transkrip Nilai', 'Kartu Tanda Mahasiswa (KTM)',
        'Surat Keterangan Aktif Kuliah', 'Surat Rekomendasi Dosen',
        'Slip Gaji Orang Tua', 'Kartu Keluarga', 'Foto 3x4', 'Esai Motivasi'
      ]
    },
    {
      id: 'DEMO-004', label: 'Pengajuan Beasiswa – Kurang Dokumen Keuangan',
      requirementPreset: 'beasiswa',
      availableDocs: [
        'Transkrip Nilai', 'Kartu Tanda Mahasiswa (KTM)',
        'Surat Keterangan Aktif Kuliah', 'Surat Rekomendasi Dosen',
        'Foto 3x4', 'Esai Motivasi'
      ]
    },
    {
      id: 'DEMO-005', label: 'Cuti Akademik – Lengkap',
      requirementPreset: 'cuti',
      availableDocs: [
        'Kartu Tanda Mahasiswa (KTM)', 'Formulir Pengajuan Cuti',
        'Surat Persetujuan Orang Tua', 'Bukti Pembayaran UKT',
        'Surat Keterangan dari Dosen Pembimbing'
      ]
    },
    {
      id: 'DEMO-006', label: 'Cuti Akademik – Tanpa Persetujuan Orang Tua',
      requirementPreset: 'cuti',
      availableDocs: [
        'Kartu Tanda Mahasiswa (KTM)', 'Formulir Pengajuan Cuti',
        'Bukti Pembayaran UKT', 'Surat Keterangan dari Dosen Pembimbing'
      ]
    },
    {
      id: 'DEMO-007', label: 'Beasiswa – Kondisi Belum Dapat Ditentukan',
      requirementPreset: 'beasiswa_kondisi',
      availableDocs: [
        'Transkrip Nilai',
        'Kartu Tanda Mahasiswa (KTM)',
        'Surat Keterangan Aktif Kuliah',
        'Surat Rekomendasi Dosen',
        'Slip Gaji Orang Tua',
        'Kartu Keluarga',
        'Foto 3x4',
        'Esai Motivasi'
      ]
    }
  ];

}());
