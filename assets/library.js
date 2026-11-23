// 라이브러리형 포트폴리오 페이지(index.html, 메인)
//   화면: 상단바(작은 메뉴 줄 + 큰 탭 줄) · 왼쪽 라이브러리(맨 위 "내 소개" + 프로젝트 칸) · 오른쪽 화면
//   #home = 내 소개(이름 → 연락 링크 → 자기소개 → 기술 스택 → 프로젝트 선반 → 연락처) · #p-<폴더> = 그 프로젝트(배너 → 버튼 → 게임 소개 → 기능 소개 | 정보)
//   모든 글은 data/ 값 그대로. 게임 한 줄 설명은 pitch(없으면 tagline)
(() => {
  const root = document.getElementById('app');
  const html = document.documentElement;
  const { esc, inline, isUrl, shortUrl, link, t } = PF;
  const T = (k, v) => esc(t(k, v));
  const pad2 = (n) => String(n).padStart(2, '0');
  const CLASSIC = 'classic.html';                                         // 아래로 읽는 한 페이지(인쇄 = 제출 PDF)
  const info = { errors: [], views: [], projects: 0 };
  let pf = null, projects = [], byId = {};
  html.dataset.pfReady = 'no';
  let resolveReady;
  const ready = new Promise((r) => { resolveReady = r; });
  window.PFPage = { whenReady: () => ready, report };

  const I = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
    doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z M14 3v5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="currentColor"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fwd: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v12H3z M3 7l9 6 9-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    gh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 2.9.8.1-.7.4-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.5 9.5 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7 1 .7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/></svg>',
  };

  start().catch((err) => {
    info.errors.push(String(err && err.stack || err));
    PF.notice(root, '페이지를 그리지 못했습니다', `<p>${esc(err && err.message || err)}</p>`);
  }).finally(settle);

  async function start() {
    if (PF.guardFileProtocol(root)) { info.errors.push('file:// — 로컬 서버로 열어야 합니다'); return; }
    const strings = PF.loadStrings();
    try { pf = await PF.loadJSON('data/portfolio.json'); }
    catch (err) { info.errors.push(`data/portfolio.json: ${err && err.message || err}`); PF.noData(root, err); return; }
    PF.applyTheme(pf.settings?.accent);
    projects = (await Promise.all((pf.projects || []).map((id) => PF.loadJSON(`data/projects/${encodeURIComponent(id)}.json`)
      .catch((err) => { info.errors.push(`data/projects/${id}.json: ${err && err.message || err}`); return null; })))).filter(Boolean);
    byId = Object.fromEntries(projects.map((p) => [p.id, p]));
    info.projects = projects.length;
    await strings;
    shell();
    route();
    addEventListener('hashchange', route);
  }

  const prof = () => pf.profile || {};
  const pitch = (p) => p.pitch || p.tagline || '';
  const metaOf = (p, ...labels) => (p.meta || []).find((m) => labels.some((l) => m.label.includes(l)))?.value || '';
  const slot = (p, cls) => (p.cover
    ? `<figure class="${cls}"><img src="${esc(PF.srcPath(p.id, p.cover))}" alt="${esc(p.title)} 대표 화면"></figure>`
    : `<figure class="${cls} slot" aria-hidden="true"><span>${slotText()}</span></figure>`);
  const slotText = () => { const s = t('page.cover-slot'); return esc(!s || s === 'page.cover-slot' ? '대표 이미지 자리' : s); };
  const contactLinks = (cls = 'lk') => {
    const me = prof();
    return [me.email && `<a class="${cls}" href="mailto:${esc(me.email)}">${I.mail}<span>${esc(me.email)}</span></a>`,
      isUrl(me.github) && link({ href: me.github, label: `${I.gh}<span>GitHub</span>`, kind: 'external', cls }),
      ...(me.links || []).filter((l) => isUrl(l.url)).map((l) => link({ href: l.url, label: `<span>${esc(l.label)}</span>`, kind: 'external', cls }))].filter(Boolean).join('');
  };

  // ── 틀: 상단바 · 왼쪽 라이브러리 · 오른쪽 화면 · 아래 띠 ──
  function shell() {
    const me = prof();
    const name = me.name || t('name.portfolio');
    document.title = `${me.name ? me.name + ' · ' : ''}${t('name.portfolio')}`;
    const items = projects.map((p, j) => `<li style="--pc:${pcolor(p)}"><a class="li" href="#p-${esc(p.id)}" data-v="p-${esc(p.id)}">
        ${slot(p, 'li-th')}
        <span class="li-t"><b>${esc(p.title)}</b><span class="li-s">${esc(pitch(p))}</span>
        <span class="li-m">${esc(PF.teamLabel(p.team))}</span></span></a></li>`).join('');
    root.innerHTML = `
      <header class="top">
        <div class="bar1"><div class="b1-l"><span class="mono">${esc((me.nameEn || name).split(/\s+/).map((w) => w[0]).join('').toUpperCase())}</span>
          <nav class="menu" aria-label="주요 링크">${contactLinks('mi')}${link({ href: CLASSIC, label: '<span>PDF용 페이지</span>', kind: 'page', cls: 'mi' })}</nav></div>
          <div class="b1-r"><span class="me">${esc(name)}</span></div></div>
        <div class="bar2">
          <div class="hist"><button type="button" data-hist="-1" aria-label="뒤로">${I.back}</button><button type="button" data-hist="1" aria-label="앞으로">${I.fwd}</button></div>
          <nav class="tabs" aria-label="화면 이동">
            <a href="#home" data-tab="home" data-jump="top">소개</a><a href="#p-${esc(projects[0]?.id || '')}" data-tab="lib">라이브러리</a>
            <a href="#home" data-tab="stack" data-jump="stack">기술 스택</a><a href="#home" data-tab="contact" data-jump="contact">연락처</a></nav>
          <span class="brand" lang="en">${esc((me.nameEn || name).toUpperCase())}</span></div>
      </header>
      <div class="body">
        <aside class="side" aria-label="프로젝트 라이브러리">
          <a class="home-btn" href="#home" data-v="home">${I.home}<span><b>내 소개</b><span class="li-s">이름 · 자기소개 · 기술 스택</span></span><i>${I.grid}</i></a>
          <p class="grp">— 프로젝트 <span>(${projects.length})</span></p>
          <ul class="lib">${items}</ul>
        </aside>
        <main id="view" tabindex="-1"></main>
      </div>
      <footer class="bot"><span>프로젝트 ${projects.length}개</span><span>${pf.generatedAt ? `업데이트 ${esc(pf.generatedAt)}` : ''}</span>
        <a href="#home" data-jump="contact">연락처</a></footer>`;
    const top = root.querySelector('.top');
    const fit = () => html.style.setProperty('--top-h', getComputedStyle(top).position === 'sticky' ? `${top.offsetHeight}px` : '0px');
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(top);
    root.addEventListener('click', (e) => {
      const h = e.target.closest('[data-hist]');
      if (h) { history.go(+h.dataset.hist); return; }
      const j = e.target.closest('[data-jump]');
      if (j) { e.preventDefault(); jump(j.dataset.jump); }
    });
  }

  function jump(id) {
    if (location.hash !== '#home') { pendingJump = id; location.hash = '#home'; return; }
    if (id === 'top') { scrollTo({ top: 0, behavior: smooth() }); mark('home'); return; }
    document.getElementById(id)?.scrollIntoView({ behavior: smooth(), block: 'start' });
    mark(id);
  }
  let pendingJump = '';
  const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth');   // 탭으로 절 이동은 스르륵

  function route() {
    let h = location.hash.slice(1);
    try { h = decodeURIComponent(h); } catch { /* 그대로 */ }
    const view = document.getElementById('view');
    const pid = /^p-(.+?)(-core)?$/.exec(h)?.[1];
    const p = pid && byId[pid];
    const sub = ['intro', 'stack', 'glance', 'contact', 'cover'].includes(h) ? h : '';   // 한 페이지판(classic.html)의 예전 절 주소도 받음
    view.innerHTML = p ? projectView(p) : homeView();
    view.querySelectorAll('img').forEach((i) => { i.loading = 'lazy'; i.decoding = 'async'; });
    const v = p ? `p-${p.id}` : 'home';
    root.querySelectorAll('[data-v]').forEach((a) => { const on = a.dataset.v === v; a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
    root.querySelector(`.lib [data-v="${v}"]`)?.scrollIntoView({ block: 'nearest' });
    const target = (pendingJump === 'top' ? '' : pendingJump) || (sub && sub !== 'cover' ? (sub === 'intro' ? '' : sub) : '');
    pendingJump = '';
    if (target) {
      scrollTo({ top: 0, behavior: 'instant' });
      requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ behavior: smooth(), block: 'start' }));
      mark(target);
    }
    else { scrollTo({ top: 0, behavior: 'instant' }); mark(p ? 'lib' : 'home'); }
    if (!info.views.includes(v)) info.views.push(v);
    if (document.activeElement?.closest?.('.side, .shelf, .tabs')) view.focus({ preventScroll: true });
  }
  function mark(tab) {
    root.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
  }

  // ── 내 소개 ──
  function homeView() {
    const me = prof();
    const skills = pf.skills || [];
    const sh = (title, note = '') => `<h2 class="sh"><span>${title}</span>${note ? `<small>${note}</small>` : ''}</h2>`;
    return `<div class="band-up">
      <section class="hero">
        <p class="eb" lang="en">${T('en.portfolio')}</p>
        <h1>${esc(me.name || '')}${me.nameEn ? `<span lang="en">${esc(me.nameEn)}</span>` : ''}</h1>
        ${me.headline ? `<p class="hl">${inline(me.headline)}</p>` : ''}
        <div class="links">${contactLinks('btn')}</div>
      </section>
      </div>
      <div class="band-down">
      ${me.intro ? `<section class="pane" id="intro">${sh(T('page.intro'))}<div class="about"><p>${inline(me.intro.replace(/\s*\n+\s*/g, ' '))}</p></div></section>` : ''}
      ${skills.length ? `<section class="pane" id="stack">${sh(T('page.stack'), '오른쪽은 근거 프로젝트')}
        <ul class="skills">${skills.map((s) => `<li><h3>${esc(s.name)}</h3><ul>${(s.evidence || []).map((e) => {
          const p = byId[e.project];
          return `<li><span>${inline(e.text)}</span>${p ? `<a class="src" href="#p-${esc(p.id)}">${esc(p.title)}</a>` : ''}</li>`;   // 기술 설명이 본문, 프로젝트는 끝에 붙는 출처
        }).join('')}</ul></li>`).join('')}</ul></section>` : ''}
      <section class="pane contact" id="contact">${sh(T('page.nav-contact'))}
        <div class="ct"><p>함께 이야기 나누고 싶으시면 편하게 연락해 주세요.</p><div class="links">${contactLinks('btn')}
        ${link({ href: CLASSIC, label: '<span>한 페이지로 보기 · PDF 저장</span>', kind: 'page', cls: 'btn' })}</div></div></section>
      </div>`;
  }
  const PCOLORS = ['#4FC3A1', '#E8A33D', '#E06B6B', '#8FB8FF', '#C792EA', '#F2D16B'];   // 프로젝트 순서대로(목록·선반·기술 근거에 같은 색)
  const pcolor = (p) => PCOLORS[projects.indexOf(p) % PCOLORS.length];
  const shortPeriod = (s) => s.replace(/\s*\(.*$/, '').replace(/^커밋 기준\s*/, '');

  // ── 프로젝트 화면 ──
  function projectView(p) {
    const j = projects.indexOf(p);
    const extra = (p.links?.extra || []).filter((l) => isUrl(l.url));
    const btns = [link({ href: PF.projectUrl(p.id), label: `${I.play}<span>${T('name.deck')}</span>`, kind: 'page', cls: 'play' }),
      link({ href: PF.docUrl(p.id), label: `${I.doc}<span>${T('name.doc')}</span>`, kind: 'page', cls: 'btn' }),
      isUrl(p.links?.github) && link({ href: p.links.github, label: `${I.gh}<span>GitHub</span>`, kind: 'external', cls: 'btn' }),
      isUrl(p.links?.video) && link({ href: p.links.video, label: `<span>${T('name.video')}</span>`, kind: 'external', cls: 'btn' }),
      ...extra.map((l) => link({ href: l.url, label: `<span>${esc(l.label)}</span>`, kind: 'external', cls: 'btn' }))].filter(Boolean);
    const stats = [['인원', PF.teamLabel(p.team)], ['기간', shortPeriod(metaOf(p, '기간'))]].filter((x) => x[1]);
    const meta = (p.meta || []).map((m) => `<div><dt>${esc(m.label)}</dt><dd>${inline(m.value)}</dd></div>`);
    if (p.team?.role) meta.push(`<div><dt>${T('name.role')}</dt><dd>${inline(p.team.role)}</dd></div>`);
    const hl = (p.highlights || []).slice(0, 4);
    return `<section class="banner">${slot(p, 'ban')}<div class="ban-t"><p class="eb" lang="en">PROJECT ${pad2(j + 1)} / ${pad2(projects.length)}</p><h1>${esc(p.title)}</h1>${pitch(p) ? `<p class="ban-s">${inline(pitch(p))}</p>` : ''}</div></section>
      <div class="act"><div class="act-b">${btns.join('')}</div>
        <dl class="stats">${stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>
      <div class="pcol">
        <section class="pane info"><h2 class="sh">정보</h2><dl class="meta">${meta.join('')}</dl></section>
        ${p.tagline ? `<section class="pane"><h2 class="sh">프로젝트 소개</h2><p class="pitch">${inline(p.tagline)}</p></section>` : ''}
        ${p.intent?.text ? `<section class="pane"><h2 class="sh">${T('name.intent')}</h2><p class="intent">${inline(p.intent.text)}</p></section>` : ''}
        ${hl.length ? `<section class="pane"><h2 class="sh">${T('page.features')}</h2><ol class="feats">${hl.map((h, i) => `<li>
          ${h.image?.src ? `<figure><img src="${esc(PF.srcPath(p.id, h.image.src))}" alt="${esc(h.title)}"></figure>` : ''}
          <p class="fk" lang="en">FEATURE ${pad2(i + 1)}</p><h3>${inline(h.title)}</h3>${h.what ? `<p>${inline(h.what)}</p>` : ''}
          ${link({ href: PF.projectUrl(p.id, PF.deckSceneFor(p, h.section)), label: T('page.see-in-deck'), kind: 'page', cls: 'more' })}</li>`).join('')}</ol></section>` : ''}
        ${(p.tags || []).length ? `<section class="pane"><h2 class="sh">태그</h2><ul class="tags">${p.tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}
        <nav class="pn" aria-label="다른 프로젝트">${j > 0 ? `<a href="#p-${esc(projects[j - 1].id)}">← ${esc(projects[j - 1].title)}</a>` : '<span></span>'}
          ${j < projects.length - 1 ? `<a href="#p-${esc(projects[j + 1].id)}">${esc(projects[j + 1].title)} →</a>` : ''}</nav>
      </div>`;
  }

  // ── 점검 ──
  async function settle() {
    if (document.fonts) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]);
    html.dataset.pfReady = 'yes';
    resolveReady(report());
  }
  function report() {
    const imgs = [...document.images];
    return {
      page: 'library', ready: html.dataset.pfReady, view: location.hash || '#home', views: info.views, projects: info.projects,
      images: { total: imgs.length, broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')) },
      overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      errors: info.errors, strings: PF.stringsReport(),
    };
  }
})();
