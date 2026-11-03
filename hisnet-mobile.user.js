// ==UserScript==
// @name         히즈넷 모바일
// @namespace    hisnet-mobile
// @version      0.1.1
// @description  폰에서 히즈넷을 글씨 크고 옆으로 밀 일 없는 화면으로 바꿔 줍니다. 학교 공식 도구가 아니며, 개인정보를 모으거나 보내지 않습니다.
// @match        https://hisnet.handong.edu/*
// @run-at       document-start
// @grant        none
// @updateURL    https://raw.githubusercontent.com/junsea23/hisnet-mobile/main/hisnet-mobile.user.js
// @downloadURL  https://raw.githubusercontent.com/junsea23/hisnet-mobile/main/hisnet-mobile.user.js
// ==/UserScript==

/*
 * 구조 (PRD 8절)
 *  1. 설정         바로가기·고위험 화면·그림 버튼 이름
 *  2. 시작         폰인지 확인 → 고위험 화면 확인 → hm-mode 확인 → 공통 CSS
 *  3. 도구         노드 옮기기(복제 X, 원래 화면에서는 제자리로) · 우리 요소 만들기 · 아이콘
 *  4. 화면별 꾸미기  F3 로그인 / F0 공통 틀 + F2 ☰ 메뉴 + 전체 메뉴 검색 (하나가 고장 나도 다른 건 동작)
 *  5. 공통 UI      원래 화면 버튼(F1)
 *  6. 안전망       기능마다 try/catch, 실패하면 그 기능만 원래대로
 *
 * 안전 규칙 (PRD 7절): 네트워크 요청 0, 저장은 hm-mode 하나, 원래 폼·전역 변수 안 건드림,
 * 우리 버튼은 새 동작을 만들지 않고 원래 <a>·버튼을 대신 눌러 준다.
 */
(function () {
  'use strict';

  // ---- 1. 설정 ----
  var PHONE_MAX = 768;

  // F10 고위험 화면: 동작이 중요하므로 아직 전혀 손대지 않는다 (F10에서 CSS만 적용 예정)
  var HIGH_RISK = [
    '/GS/lecture/HLEC200M.php',
    '/haksa/lecture/HLEC130M.php',
    '/haksa/lecture/HLEC140M.php',
    '/haksa/lecture/HLEC120M.php',
    '/haksa/lecture/HLEC125M.php',
    '/haksa/record/HREC180M.php'
  ];

  // F2 바로가기 (조사로 확인된 주소만)
  var SHORTCUTS = [
    { name: '공지사항', href: '/myboard/list.php?Board=NB0001' },
    { name: '신청·예약', href: '/prof/booking/PSTU420M.php' },
    { name: '수업정보', href: '/for_student/course/01.php' },
    { name: '학사정보', href: '/for_student/haksa_info/01.php' },
    { name: '카피킬러', href: '/inc/login.php', newTab: true }
  ];

  // 사이트맵 분류 제목 그림 → 이름
  var SITEMAP_TITLES = [
    [/sitemap_title01_01/, '공지사항'],
    [/sitemap_title01_02/, '캠퍼스정보'],
    [/sitemap_title02_03/, '신청·예약'],
    [/sitemap_title02_04/, '원클릭민원'],
    [/sitemap_title02_05/, '수업정보'],
    [/sitemap_title02_06/, '학사정보']
  ];

  // 그림 버튼 파일 이름 → 글자 이름 (확인한 그림만. 모르는 그림은 추측하지 않고 그림 그대로 둠)
  var IMG_LABELS = [
    [/dung_print/, '등록금 관련 출력'],
    [/subtab02_(on|off)_01_01/, '학생식당'],
    [/subtab02_(on|off)_01_02/, '맘스키친'],
    [/subtab02_(on|off)_01_03/, '한동라운지'],
    [/subtab02_(on|off)_01_04/, '더그레이스테이블'],
    [/tab03_(on|off)_01_login/, '주요공지'],
    [/tab03_(on|off)_02_login/, '일반공지'],
    [/intro\/more\.png/, '더보기'],
    [/line_txt1_2/, '회원가입'],
    [/line_txt2_2/, '아이디 찾기'],
    [/line_txt3_2/, '비밀번호 찾기'],
    [/tbtn_home/, '홈'],
    [/tbtn_logout/, '로그아웃'],
    [/tbtn_myaccount/, '나의 계정'],
    [/tbtn_sitemap/, '전체 메뉴'],
    [/languagechg/, 'Language'],
    [/tmenu1\./, '공지사항'],
    [/tmenu2\./, '캠퍼스정보'],
    [/tmenu3\./, '신청·예약'],
    [/tmenu4\./, '원클릭민원'],
    [/tmenu5\./, '수업정보'],
    [/tmenu6\./, '학사정보'],
    [/allmenu_open/, '모두 펼치기'],
    [/allmenu_close/, '모두 접기'],
    [/icon_file\./, '첨부'],
    [/sexual\.png/, '성희롱·성폭력 신고'],
    [/btn_bo_search|btn_search2|seach_btn/, '검색'],
    [/\/view\.gif/, '보기'],
    [/btn_list1\./, '목록'],
    [/ico_atten\./, '출결'],
    [/campus_info\/.*prev\.jpg|\/prev\.jpg/, '이전'],
    [/campus_info\/.*next\.jpg|\/next\.jpg/, '다음'],
    [/btn_say_first/, '처음'],
    [/btn_say_prev/, '이전'],
    [/btn_say_next/, '다음'],
    [/btn_say_last/, '마지막'],
    // 아래는 그림을 직접 보고 확인 (2026-11-03). 화면마다 뜻이 다를 수 있어 경로까지 넣음
    [/myboard\/images\/btn_bo_write\./, '글쓰기'],
    [/myboard\/images\/btn_bo_ok\./, '확인'],
    [/\/images\/new_btn\/btn_next\.|\/haksa\/images\/next\.gif|\/prof\/images\/next\.gif/, '다음'],
    [/\/images\/new_btn\/btn_reg2?\./, '등록'],
    [/\/images\/new_btn\/btn_delete\./, '삭제'],
    [/\/images\/new_btn\/btn_save\.|\/haksa\/images\/save\.gif/, '저장'],
    [/\/GS\/images\/list\.gif/, '검색'], // 파일 이름은 list지만 그림 글자는 "Search"
    [/\/for_student\/course\/excel_download\./, '엑셀 다운로드'],
    [/\/sobi\/book2012\/images\/BBS_Search\./i, '검색'],
    [/\/sobi\/book2012\/images\/Service_Apply\./i, '신청하기'],
    [/\/campus_info\/img\/btn_go\./, '바로가기'],
    [/\/schedule\/tab01_/, '전체일정'],
    [/\/schedule\/tab02_/, '학부일정'],
    [/\/schedule\/tab03_/, '대학원일정'],
    [/\/schedule\/tab04_/, '개인일정'],
    [/\/schedule\/tab05_/, '과제일정'],
    [/\/schedule\/month_/, '월간'],
    [/\/schedule\/list_/, '목록형'],
    [/\/schedule\/btn01\.jpg/, '일정 등록'],
    [/\/itsupport\/image\/bt_(on|off)_01\./, '장애신고'],
    [/\/itsupport\/image\/bt_(on|off)_02\./, 'E-mail 계정 신청'],
    [/\/itsupport\/image\/bt_(on|off)_03\./, 'IP 신청'],
    [/\/itsupport\/image\/bt_(on|off)_04\./, 'DNS 신청'],
    [/\/itsupport\/image\/bt_(on|off)_05\./, '방화벽 허용 신청'],
    [/\/itsupport\/image\/bt_(on|off)_06\./, 'E-mail 2단계 신청'],
    [/\/itsupport\/image\/bt_(on|off)_07\./, '전산실습실 사용 신청'],
    [/\/booking\/tabmenu01/, '예약신청내역'],
    [/\/booking\/tabmenu02/, '예약취소내역'],
    [/\/booking\/tabmenu03/, '사용완료내역'],
    [/\/booking\/tabmenu04/, '미사용취소내역']
  ];

  var FONT = '"Pretendard GOV", "Pretendard", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

  // ---- 2. 시작 ----
  var root = document.documentElement;
  if (!root || root.classList.contains('hm-applied')) return;

  function deviceWidth() {
    try {
      // 페이지가 그려지기 전에는 innerWidth가 980으로 나오는 폰이 있어 기기 화면 크기로 판단
      return Math.min(screen.width, screen.height);
    } catch (e) {
      return 9999;
    }
  }
  if (deviceWidth() >= PHONE_MAX) return;

  var PATH = location.pathname;
  var IS_SITEMAP = PATH === '/sitemap.php' || PATH === '/for_student/sitemap_stu.php'; // 학생은 sitemap_stu.php로 넘어감
  if (HIGH_RISK.indexOf(PATH) !== -1) return;
  root.classList.add('hm-applied');

  function readMode() {
    try {
      return localStorage.getItem('hm-mode') === 'original' ? 'original' : 'mobile';
    } catch (e) {
      return 'mobile';
    }
  }

  function saveMode(mode) {
    try {
      localStorage.setItem('hm-mode', mode);
    } catch (e) { /* 저장 실패해도 동작 */ }
  }

  function isTop() {
    try {
      return window.top === window;
    } catch (e) {
      return false;
    }
  }

  function frameKind() {
    try {
      return window.frameElement ? window.frameElement.tagName : '';
    } catch (e) {
      return 'OTHER';
    }
  }
  // 화면 설정(viewport)을 정하는 문서: 바깥 문서 또는 프레임 묶음 안의 프레임 (숨은 칸 iframe은 아님)
  var OWNS_VIEWPORT = isTop() || frameKind() === 'FRAME';

  // 화면 설정은 맨 바깥 문서의 것이 쓰이므로, 프레임 안에서 바꿀 때도 바깥 문서를 고친다
  function setViewport(doc, mode, pageWidth) {
    var meta = doc.querySelector('meta[name="viewport"]');
    if (meta && !meta.hasAttribute('data-hm')) return; // 원래 있던 설정은 건드리지 않음
    if (!meta) {
      meta = doc.createElement('meta');
      meta.name = 'viewport';
      meta.setAttribute('data-hm', '1');
      (doc.head || doc.documentElement).appendChild(meta);
    } else if (doc.head && meta.parentNode !== doc.head) {
      doc.head.appendChild(meta); // 머리 영역이 생긴 뒤 제자리로 옮김
    }
    if (mode === 'original') {
      meta.setAttribute('content', 'width=' + Math.max(980, pageWidth || 0));
    } else {
      meta.setAttribute('content', 'width=device-width, initial-scale=1');
    }
  }

  function setOwnViewport(mode, pageWidth) {
    if (!OWNS_VIEWPORT) return;
    try {
      setViewport(document, mode, pageWidth);
      if (!isTop()) setViewport(window.top.document, mode, pageWidth);
    } catch (e) { /* 바깥 문서에 못 닿아도 계속 */ }
  }

  // ---- 3. 도구 ----
  // 떠난 자리(from)와 도착한 자리(to)에 표시(주석)를 남겨 두고, 모드를 바꿀 때마다 그 자리로 오간다.
  var moves = [];

  function moveTo(node, parent, feature, before) {
    if (!node || !node.parentNode || !parent) return;
    var from = document.createComment('hm-from');
    var to = document.createComment('hm-to');
    node.parentNode.insertBefore(from, node);
    parent.insertBefore(to, before || null);
    parent.insertBefore(node, to);
    moves.push({ node: node, from: from, to: to, feature: feature });
  }

  function moveChildren(from, parent, feature) {
    var kids = [].slice.call(from.childNodes);
    for (var i = 0; i < kids.length; i++) moveTo(kids[i], parent, feature);
  }

  function putBack(feature) {
    for (var i = moves.length - 1; i >= 0; i--) {
      var m = moves[i];
      if (feature && m.feature !== feature) continue;
      if (m.from.parentNode) m.from.parentNode.insertBefore(m.node, m.from);
    }
  }

  function putForward() {
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      if (m.to.parentNode) m.to.parentNode.insertBefore(m.node, m.to);
    }
  }

  function forget(feature) {
    moves = moves.filter(function (m) {
      if (m.feature !== feature) return true;
      [m.from, m.to].forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); });
      return false;
    });
  }

  // 우리가 만드는 요소는 모두 hm-ui (원래 화면에서는 숨김)
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    e.className = 'hm-ui' + (cls ? ' ' + cls : '');
    if (text) e.textContent = text;
    return e;
  }

  var ICONS = {
    menu: 'M4 6h16M4 12h16M4 18h16',
    close: 'M6 6l12 12M18 6L6 18',
    home: 'M4 11l8-7 8 7M6 9.5V20h12V9.5',
    search: 'M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13zM20 20l-4.8-4.8',
    right: 'M9 6l6 6-6 6',
    down: 'M6 9l6 6 6-6'
  };

  function icon(name, cls) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'hm-ui hm-icon' + (cls ? ' ' + cls : ''));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', ICONS[name]);
    svg.appendChild(p);
    return svg;
  }

  function chevron() {
    return icon('right', 'hm-chevron');
  }

  function imgLabel(img) {
    var src = img.getAttribute('src') || '';
    var full = img.src || ''; // 상대 주소(images/save.gif 등)도 경로로 비교
    for (var j = 0; j < IMG_LABELS.length; j++) {
      if (IMG_LABELS[j][0].test(src) || IMG_LABELS[j][0].test(full)) return IMG_LABELS[j][1];
    }
    return (img.getAttribute('alt') || img.getAttribute('title') || '').trim();
  }

  // 원래 <a>를 대신 눌러 주는 우리 버튼 (javascript: 링크·새 창 링크도 원래대로 동작)
  function proxy(original, text, cls) {
    var b = el('button', cls || 'hm-proxy');
    b.type = 'button';
    b.appendChild(document.createTextNode(text));
    b.addEventListener('click', function () { original.click(); });
    return b;
  }

  // 그림 버튼 안에 글자 이름을 덧붙인다 (원래 <a>와 그림은 그대로, 모바일에서만 그림을 숨김)
  function labelImageLinks(scope, extraClass) {
    var links = scope.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var img = a.querySelector('img');
      if (!img || a.querySelector('.hm-img-label')) continue;
      if (a.textContent.trim()) continue; // 이미 글자가 있는 링크
      var label = imgLabel(img);
      if (!label) continue;
      a.classList.add('hm-labeled');
      if (extraClass) a.classList.add(extraClass);
      a.appendChild(el('span', 'hm-img-label', label));
    }
    // 그림 제출 버튼(input type=image)·onclick 달린 그림(학사일정 탭 등): 바로 뒤에 글자 버튼을 두고 원래 것을 대신 누름 (onclick·폼 제출 그대로)
    var imgInputs = scope.querySelectorAll('input[type="image"], img[onclick]');
    for (var k = 0; k < imgInputs.length; k++) {
      var inp = imgInputs[k];
      if (inp.classList.contains('hm-has-proxy') || (inp.tagName === 'IMG' && inp.closest('a'))) continue;
      var name = imgLabel(inp);
      if (!name) continue;
      inp.classList.add('hm-has-proxy');
      inp.parentNode.insertBefore(proxy(inp, name, 'hm-img-proxy'), inp.nextSibling);
    }
  }

  // 페이지 번호 줄: 숫자 링크(…?Page=2)가 2개 이상 모인 곳을 44px 버튼 줄로 (원래 링크 그대로, 모양만 바꿈)
  // 게시판(/myboard/list.php): <div> 안에 ‹처음›‹이전› 그림 · 현재 쪽 <span> · ㆍ<strong> · 숫자 <a> · ‹다음›‹마지막› 링크
  var PAGE_HREF = /[?&](page|pg|nowpage|curpage|pageno)=\d+/i;
  var PAGE_NUM = /^\d{1,4}$/;

  function markPagers(scope) {
    var links = scope.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var box = links[i].parentNode;
      if (box.classList.contains('hm-pager') || !PAGE_NUM.test(textOf(links[i])) || !PAGE_HREF.test(links[i].getAttribute('href'))) continue;
      // 숫자 칸(현재 쪽 <span> 포함)이 2개 이상이면 페이지 번호 줄 (2쪽짜리 게시판은 숫자 링크가 하나뿐)
      var nums = [].filter.call(box.children, function (c) { return PAGE_NUM.test(textOf(c)); });
      if (nums.length < 2) continue;
      box.classList.add('hm-pager');
      [].forEach.call(box.children, function (c) {
        if (c.tagName === 'A') return;
        var t = textOf(c);
        if (PAGE_NUM.test(t)) {
          c.classList.add('hm-pager-cur');
          c.setAttribute('aria-current', 'page');
        } else if (!t || /^[ㆍ·|\[\]\s]+$/.test(t)) {
          c.classList.add('hm-pager-sep'); // 구분 점, 첫 쪽에서 눌리지 않는 ‹처음›‹이전› 그림
        }
      });
    }
  }

  // 문장 속이 아니라 따로 선 글자 링크(다운로드 링크, 링크만 모인 줄 등)는 44px 버튼 모양으로.
  // 양옆이 빈칸·구분 기호·다른 요소뿐이면 "따로 선" 것으로 본다 (문장 속 링크는 양옆에 글자가 있음)
  var LOOSE_TEXT = /^[\s ㆍ·|,\/]*$/;

  function looseSide(n) {
    return !n || n.nodeType !== 3 || LOOSE_TEXT.test(n.nodeValue);
  }

  function markLooseLinks(scope) {
    var links = scope.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (a.classList.contains('hm-btnlink') || a.classList.contains('hm-labeled') || a.querySelector('img') || !textOf(a)) continue;
      if (a.closest('.hm-ui, .hm-pager') || isHidden(a)) continue;
      if (/menu|nav/i.test(a.className + ' ' + a.parentNode.className)) continue; // 사이트 자체 메뉴(IT 지원 모바일 메뉴 등)는 그 모양 그대로
      if (a.parentNode.matches('td, th, li') || (a.parentNode.tagName === 'FONT' && a.parentNode.parentNode.matches('td'))) continue; // CSS가 이미 44px로
      if (looseSide(a.previousSibling) && looseSide(a.nextSibling)) a.classList.add('hm-btnlink');
    }
  }

  // 검색어 비교: 띄어쓰기·가운뎃점·빗금 무시, 영어 대소문자 무시 (PRD F2)
  function norm(s) {
    return (s || '').replace(/[\s·ㆍ\/]/g, '').toLowerCase();
  }

  function textOf(node) {
    return (node && node.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function isHidden(e) {
    return !e.offsetParent && getComputedStyle(e).position !== 'fixed';
  }

  // ---- 공통 CSS ----
  var CSS_BASE = [
    'html:not(.hm-on) .hm-ui { display: none !important; }',
    'html.hm-wait > body { visibility: hidden !important; }',
    'html.hm-on { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }',
    'html.hm-on a.hm-labeled > img { display: none !important; }',
    'html.hm-on .hm-orig-hidden { display: none !important; }',
    '.hm-icon { width: 24px; height: 24px; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }',
    '.hm-chevron { width: 20px; height: 20px; color: #6D7882; }',

    // F1 원래 화면 버튼 (모든 모드에서 보임). 원래 화면에서는 페이지가 축소되므로 --hm-z 배로 키움
    '#hm-toggle { all: initial; position: fixed; right: 12px; bottom: 12px; z-index: 2147483647; box-sizing: border-box;',
    '  min-width: 48px; height: 48px; padding: 0 16px; border-radius: 999px; font-family: ' + FONT + ';',
    '  background: #FFFFFF; color: #131416; border: 1px solid #CDD1D5; font-size: 15px; font-weight: 700; line-height: 46px; cursor: pointer;',
    '  box-shadow: 0 6px 16px rgba(19,20,22,0.10), 0 2px 4px rgba(19,20,22,0.05);',
    '  transform: scale(var(--hm-z, 1)); transform-origin: 100% 100%; }',
    '#hm-toggle:focus-visible { outline: 2px solid #256EF4; outline-offset: 2px; }',

    // 카드·탭·버튼 (DESIGN.md 히즈넷 모바일 적용 규칙)
    'html.hm-on .hm-card { box-sizing: border-box; background: #FFFFFF; border: 1px solid #CDD1D5; border-radius: 8px; padding: 20px 16px; margin: 0 0 12px; }',
    'html.hm-on .hm-card-title { display: block; margin: 0 0 12px; font-size: 19px; font-weight: 700; line-height: 1.3; color: #131416; }',
    'html.hm-on a.hm-tab { display: inline-flex !important; align-items: center; min-height: 44px; padding: 0 12px; margin: 0 4px 0 0;',
    '  font-size: 17px !important; color: #6D7882 !important; text-decoration: none !important; border-bottom: 3px solid transparent; white-space: nowrap; }',
    'html.hm-on a.hm-tab:has(img[src*="_on"]) { color: #0B50D0 !important; border-bottom-color: #256EF4; font-weight: 700; }',
    'html.hm-on .hm-btn-primary { display: block; width: 100%; height: 56px; margin: 4px 0 0; border: 0; border-radius: 8px;',
    '  background: #256EF4; color: #FFFFFF; font: 700 19px/56px ' + FONT + '; cursor: pointer; }',
    'html.hm-on .hm-btn-primary:active { background: #0B50D0; }',
    'html.hm-on .hm-ui:focus-visible, html.hm-on .hm-card a:focus-visible, html.hm-on .hm-card input:focus-visible { outline: 2px solid #256EF4 !important; outline-offset: 2px; }'
  ].join('\n');

  // F3 로그인 화면
  var CSS_LOGIN = [
    'html.hm-on.hm-p-login, html.hm-on.hm-p-login body { background: #F4F5F6 !important; margin: 0 !important; padding: 0 !important; min-width: 0 !important; width: auto !important; overflow-x: hidden !important; }',
    'html.hm-on.hm-p-login body > :not(.hm-ui):not(#hm-toggle) { display: none !important; }',
    '.hm-login { box-sizing: border-box; max-width: 480px; margin: 0 auto; padding: 0 16px 88px; font-family: ' + FONT + '; font-size: 17px; line-height: 1.55; color: #131416; }',
    '.hm-login * { box-sizing: border-box; }',
    '.hm-login img { max-width: 100% !important; }',
    '.hm-login td { min-width: 0 !important; }',
    '.hm-login-head { display: flex; align-items: center; height: 56px; overflow: hidden; }',
    '.hm-login-head img { display: block; height: 40px !important; width: auto !important; max-width: 100% !important; object-fit: contain; object-position: left center; }',
    '.hm-login-photo { margin: 0 -16px 16px; height: 88px; overflow: hidden; }',
    '.hm-login-photo #apDiv1, .hm-login-photo #apDiv1 > div { position: static !important; width: auto !important; height: auto !important; margin: 0 !important; }',
    '.hm-login-photo img { display: block; width: 100% !important; height: 88px !important; object-fit: cover; }',

    // 로그인 폼: 배치용 표를 세로로 풀고 장식 그림은 숨김
    '.hm-login-card table, .hm-login-card tbody, .hm-login-card tr, .hm-login-card td { display: block !important; width: auto !important; height: auto !important;',
    '  padding: 0 !important; margin: 0 !important; border: 0 !important; background: none !important; text-align: left !important; }',
    '.hm-login-card img { display: none !important; }',
    '.hm-login-card input[type="text"], .hm-login-card input[type="password"] { display: block; width: 100% !important; height: 48px !important; margin: 0 0 12px !important;',
    '  padding: 0 14px !important; border: 1px solid #CDD1D5 !important; border-radius: 6px !important; background: #FFFFFF !important; color: #131416 !important;',
    '  font: 400 17px/46px ' + FONT + ' !important; -webkit-appearance: none; appearance: none; }',
    '.hm-login-card input[type="text"]:focus, .hm-login-card input[type="password"]:focus { border-color: #256EF4 !important; box-shadow: 0 0 0 2px #D8E5FD; outline: none; }',
    '.hm-login-card input[type="image"] { position: absolute !important; width: 1px !important; height: 1px !important; opacity: 0 !important; overflow: hidden; clip: rect(0 0 0 0); }',
    '.hm-field-label { display: block; margin: 0 0 6px; font-size: 15px; font-weight: 700; color: #464C53; }',
    '.hm-login-card input[type="radio"], .hm-login-card input[type="checkbox"] { width: 22px !important; height: 22px !important; margin: 0 !important; flex: none; accent-color: #256EF4; }',
    '.hm-login-card .hm-row { display: flex !important; align-items: center; flex-wrap: wrap; gap: 0 20px; min-height: 44px; margin: 0 0 8px !important; font-size: 0 !important; }',
    // 장식 그림·빈칸만 있는 줄(위아래 테두리 그림, &nbsp; 줄, 옮기고 남은 링크 줄)은 접음
    '.hm-login-card tr:not(:has(input, button, label)) { display: none !important; }',
    '.hm-login-card .hm-row > a { display: none !important; }',
    'html.hm-on .hm-hide-on-mobile { display: none !important; }',
    '.hm-choice { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; font-size: 17px; color: #131416; cursor: pointer; }',

    // 공지
    '.hm-login-notice table, .hm-login-notice tbody { display: block !important; width: 100% !important; }',
    '.hm-login-notice tr { display: flex !important; width: 100% !important; }',
    '.hm-login-notice td { display: block !important; width: auto !important; height: auto !important; border: 0 !important; background: none !important; padding: 0 !important; }',
    '.hm-login-notice #td_box23 { margin-left: auto !important; }',
    '.hm-login-notice tr:has(> #td_box21) { border-bottom: 1px solid #CDD1D5; margin: 0 0 4px; overflow-x: auto; }',
    '.hm-login-notice [id^="tr_box_2"] tr { border-bottom: 1px solid #E6E8EA; align-items: baseline; gap: 12px; }',
    '.hm-login-notice [id^="tr_box_2"] td:first-child { flex: 1 1 auto; min-width: 0; }',
    '.hm-login-notice [id^="tr_box_2"] td:last-child { flex: none; }',
    '.hm-login-notice [id^="tr_box_2"] div { width: auto !important; height: auto !important; padding: 0 !important; line-height: 1.5 !important; overflow: visible !important; white-space: normal !important; }',
    '.hm-login-notice [id^="tr_box_2"] a { display: block !important; padding: 12px 0; font-size: 16px !important; color: #131416 !important; text-decoration: none; }',
    '.hm-login-notice [id^="tr_box_2"] td:last-child, .hm-login-notice [id^="tr_box_2"] td:last-child * { font-size: 13px !important; color: #6D7882 !important; font-variant-numeric: tabular-nums; }',
    '.hm-login-notice [id^="tr_box_2"] td:last-child a { min-height: 44px; }',

    // 식단
    // 식단: 옮겨 온 칸 자체도 블록으로 (표 칸이면 식당 탭 폭만큼 늘어나 카드 밖으로 넘침 — S24에서 확인)
    '.hm-login-food > td { display: block !important; }',
    '.hm-login-food div[style*="height"] { width: auto !important; height: auto !important; border: 0 !important; overflow: visible !important; }',
    '.hm-login-food table { width: 100% !important; height: auto !important; background: none !important; table-layout: fixed; }',
    '.hm-login-food td { width: auto !important; height: auto !important; background: none !important; }',
    '.hm-login-food tr { height: auto !important; }',
    '.hm-login-food #tr_box_11 { height: auto !important; background: none !important; }',
    // 메뉴 표(아침·점심·저녁)만 표로 두고, 나머지 배치용 표는 줄을 가로로 나눠 담음.
    // !important를 안 써서 원래 스크립트의 숨김(id 규칙·인라인 display)은 그대로 이김
    '.hm-login-food table:not(:has(> tbody > tr > .cls_td_food_text)), .hm-login-food table:not(:has(> tbody > tr > .cls_td_food_text)) > tbody { display: block; width: 100% !important; table-layout: auto; }',
    '.hm-login-food table:not(:has(> tbody > tr > .cls_td_food_text)) > tbody > tr { display: flex; flex-wrap: wrap; width: 100% !important; }',
    '.hm-login-food table:not(:has(> tbody > tr > .cls_td_food_text)) > tbody > tr > td { display: block; flex: 1 1 0%; min-width: 0 !important; }',
    // 식당 탭: 줄어들면 글자가 겹치므로 줄어들지 않게 하고 넘치면 옆으로 밀기
    '.hm-login-food tr[height="24"] > td { flex: none !important; width: auto !important; }',
    '.hm-login-food tr[height="24"] { display: flex !important; flex-wrap: nowrap !important; overflow-x: auto; border-bottom: 1px solid #CDD1D5; margin: 0 0 8px; }',
    '.hm-login-food a.hm-tab { font-size: 16px !important; padding: 0 10px; }',
    '.hm-login-food .cls_td_food_title, .hm-login-food .FoodTitle { font-size: 15px !important; height: auto !important; min-height: 44px; padding: 12px 2px !important; line-height: 1.4; }',
    '.hm-login-food .cls_td_food_text, .hm-login-food .cls_td_food_text * { font-size: 16px !important; line-height: 1.5 !important; color: #464C53 !important; }',

    // 계정·출력 링크
    '.hm-login-links a.hm-labeled { display: flex !important; align-items: center; justify-content: space-between; min-height: 52px;',
    '  border-bottom: 1px solid #E6E8EA; font-size: 17px; color: #131416 !important; text-decoration: none !important; }',
    '.hm-login-links a.hm-labeled:last-child { border-bottom: 0; }',

    // 바닥글: 한 열로 (공통 틀 화면도 같이 씀)
    '.hm-login-foot, html.hm-on .hm-foot { padding: 8px 0 0; font-size: 13px; color: #464C53; text-align: center; }',
    '.hm-login-foot table, .hm-login-foot tbody, .hm-login-foot tr, .hm-login-foot td,',
    'html.hm-on .hm-foot, html.hm-on .hm-foot table, html.hm-on .hm-foot tbody, html.hm-on .hm-foot tr, html.hm-on .hm-foot td {',
    '  display: block !important; width: auto !important; height: auto !important; padding: 0 !important; text-align: center !important; }',
    '.hm-login-foot td, html.hm-on .hm-foot td { margin: 0 0 8px !important; font-size: 13px !important; }',
    '.hm-login-foot img, html.hm-on .hm-foot img { max-width: 100% !important; height: auto !important; }',
    '.hm-login-foot img[src*="logo"], html.hm-on .hm-foot img[src*="logo"] { height: 32px !important; width: auto !important; }',
    '.hm-login-foot button, html.hm-on .hm-foot button { min-height: 44px; margin: 4px; padding: 0 12px; font-size: 13px !important; }',
    '.hm-login-foot select, html.hm-on .hm-foot select { width: 100% !important; height: 44px !important; font-size: 15px !important; }'
  ].join('\n');

  // F0 공통 틀 + F2 ☰ 메뉴
  var CSS_FRAME = [
    'html.hm-on.hm-frame { overflow-x: hidden !important; }',
    'html.hm-on.hm-frame body { margin: 0 !important; padding: 0 !important; min-width: 0 !important; width: auto !important; background: #F4F5F6 !important; }',
    'html.hm-on.hm-frame #div_TopmenuBg, html.hm-on.hm-frame #div_quick { display: none !important; }',
    'html.hm-on.hm-drawer-open { overflow: hidden !important; }',
    'html.hm-drawer-open #hm-toggle { display: none !important; }', // 서랍 위에 겹치지 않게 (S24에서 확인)

    // 위쪽 바
    '.hm-topbar { position: sticky; top: 0; z-index: 2147483000; display: flex; align-items: center; gap: 4px; height: 56px; padding: 0 4px;',
    '  background: #FFFFFF; border-bottom: 1px solid #CDD1D5; font-family: ' + FONT + '; box-sizing: border-box; }',
    '.hm-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; flex: none; margin: 0; padding: 0;',
    '  border: 0; border-radius: 6px; background: transparent; color: #33363D; cursor: pointer; }',
    '.hm-icon-btn:active { background: #F4F5F6; }',
    '.hm-topbar-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center;',
    '  font-size: 19px; font-weight: 700; line-height: 1.3; color: #131416; }',

    // 서랍 메뉴
    '.hm-scrim { position: fixed; inset: 0; z-index: 2147483400; background: rgba(19,20,22,0.5); opacity: 0; visibility: hidden; transition: opacity 200ms ease-out, visibility 200ms; }',
    '.hm-drawer { position: fixed; top: 0; bottom: 0; left: 0; z-index: 2147483500; width: min(320px, 86vw); overflow-y: auto; overscroll-behavior: contain;',
    '  background: #FFFFFF; box-shadow: 0 12px 28px rgba(19,20,22,0.14); transform: translateX(-105%); transition: transform 240ms ease-out; visibility: hidden;',
    '  font-family: ' + FONT + '; font-size: 17px; line-height: 1.55; color: #131416; box-sizing: border-box; padding: 0 0 24px; }',
    'html.hm-drawer-open .hm-scrim { opacity: 1; visibility: visible; }',
    'html.hm-drawer-open .hm-drawer { transform: none; visibility: visible; }',
    '.hm-drawer * { box-sizing: border-box; }',
    '.hm-drawer-head { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; height: 56px; padding: 0 4px 0 16px; background: #FFFFFF; border-bottom: 1px solid #CDD1D5; }',
    '.hm-drawer-head strong { flex: 1; font-size: 19px; }',
    '.hm-sec { padding: 16px 16px 4px; border-bottom: 1px solid #E6E8EA; }',
    '.hm-sec-title { margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #6D7882; }',
    '.hm-shortcuts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 0 12px; }',
    '.hm-shortcuts a, .hm-shortcuts button { display: flex; align-items: center; min-height: 48px; padding: 0 12px; border: 1px solid #CDD1D5; border-radius: 6px;',
    '  background: #FFFFFF; color: #131416 !important; font: 700 16px/1.3 ' + FONT + ' !important; text-decoration: none !important; text-align: left; cursor: pointer; }',
    '.hm-shortcuts a:active, .hm-shortcuts button:active { background: #ECF2FE; }',
    '.hm-list { display: flex; flex-direction: column; margin: 0 0 8px; }',
    '.hm-list .hm-proxy { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 48px; margin: 0; padding: 0 4px;',
    '  border: 0; border-bottom: 1px solid #E6E8EA; background: transparent; color: #131416; font: 400 17px/1.4 ' + FONT + '; text-align: left; cursor: pointer; }',
    '.hm-list .hm-proxy:last-child { border-bottom: 0; }',

    // 서랍 안으로 옮긴 왼쪽 메뉴: 표 구조(숨김 줄 포함)는 그대로 두고 폭·글자만
    '.hm-drawer-left table { width: 100% !important; height: auto !important; background: none !important; border: 0 !important; }',
    '.hm-drawer-left td { width: auto !important; height: auto !important; padding: 0 !important; background: none !important; border: 0 !important; text-align: left !important; }',
    '.hm-drawer-left img { display: none !important; }',
    '.hm-drawer-left a { display: flex !important; align-items: center; min-height: 48px; padding: 0 8px !important; border-bottom: 1px solid #E6E8EA;',
    '  font-size: 17px !important; color: #131416 !important; text-decoration: none !important; }',
    '.hm-drawer-left [class^="submenu_"] a, .hm-drawer-left [class*=" submenu_"] a { padding-left: 28px !important; font-size: 16px !important; color: #464C53 !important; }',
    '.hm-drawer-left a.hm-current { background: #ECF2FE; color: #0B50D0 !important; font-weight: 700; }',
    '.hm-drawer-left a.hm-labeled { color: #464C53 !important; font-size: 15px !important; }',
    '.hm-drawer-quick table, .hm-drawer-quick tbody, .hm-drawer-quick tr, .hm-drawer-quick td { display: block !important; width: auto !important; height: auto !important; padding: 0 !important; background: none !important; border: 0 !important; }',
    '.hm-drawer-quick a { display: flex !important; align-items: center; gap: 8px; min-height: 48px; border-bottom: 1px solid #E6E8EA; font-size: 16px !important; color: #131416 !important; text-decoration: none !important; }',
    '.hm-drawer-quick img { max-height: 24px; width: auto; }',

    // 본문 틀: 1000px 표 → 한 열
    'html.hm-on .hm-main, html.hm-on .hm-main > tbody, html.hm-on .hm-main > tbody > tr, html.hm-on .hm-main > tbody > tr > td,',
    'html.hm-on .hm-main-inner, html.hm-on .hm-main-inner > tbody, html.hm-on .hm-main-inner > tbody > tr, html.hm-on .hm-main-inner > tbody > tr > td {',
    '  display: block !important; width: auto !important; height: auto !important; min-width: 0 !important; margin: 0 !important; padding: 0 !important; }',
    'html.hm-on .hm-left, html.hm-on .hm-spacer { display: none !important; }',
    'html.hm-on .hm-main-inner > tbody > tr > td.hm-content { padding: 16px !important; background: #FFFFFF; border-bottom: 1px solid #CDD1D5; overflow-wrap: anywhere; font-family: ' + FONT + '; color: #131416; }',
    'html.hm-on .hm-main > tbody > tr > td.hm-subrow { padding: 0 16px !important; }',

    // F0 자동 정리: 고정 폭 풀기, 글자 16px, 누르는 곳 44px
    'html.hm-on .hm-fw { width: auto !important; max-width: 100% !important; min-width: 0 !important; }',
    // 고정 배치: 나중에 그림이 불러와져도 표가 화면 밖으로 늘어나지 않음
    'html.hm-on table.hm-fw { width: 100% !important; table-layout: fixed; }',
    'html.hm-on .hm-fit img { max-width: 100% !important; height: auto !important; }',
    'html.hm-on .hm-fit iframe { max-width: 100% !important; }',
    'html.hm-on .hm-fit td, html.hm-on .hm-fit th, html.hm-on .hm-fit a, html.hm-on .hm-fit span, html.hm-on .hm-fit font, html.hm-on .hm-fit div,',
    'html.hm-on .hm-fit p, html.hm-on .hm-fit li, html.hm-on .hm-fit b, html.hm-on .hm-fit strong, html.hm-on .hm-fit label, html.hm-on .hm-fit u, html.hm-on .hm-fit caption {',
    '  font-size: 16px !important; line-height: 1.55 !important; }',
    'html.hm-on .hm-fit h1, html.hm-on .hm-fit h2, html.hm-on .hm-fit h3, html.hm-on .hm-fit h4, html.hm-on .hm-fit h5, html.hm-on .hm-fit h6 {',
    '  font-size: 17px !important; line-height: 1.45 !important; }',
    'html.hm-on .hm-fit input[type="text"], html.hm-on .hm-fit input[type="password"], html.hm-on .hm-fit input[type="number"], html.hm-on .hm-fit input[type="search"],',
    'html.hm-on .hm-fit input[type="tel"], html.hm-on .hm-fit input[type="email"], html.hm-on .hm-fit input[type="date"], html.hm-on .hm-fit input:not([type]), html.hm-on .hm-fit select {',
    '  min-height: 44px !important; min-width: 44px !important; max-width: 100% !important; font-size: 16px !important; box-sizing: border-box !important; }',
    'html.hm-on .hm-fit select { min-width: 64px !important; }', // "01" 같은 짧은 값도 펼침 화살표까지 들어가게
    'html.hm-on .hm-fit textarea { max-width: 100% !important; font-size: 16px !important; box-sizing: border-box !important; }',
    'html.hm-on .hm-fit input[type="checkbox"], html.hm-on .hm-fit input[type="radio"] { width: 22px !important; height: 22px !important; }',
    'html.hm-on .hm-fit input[type="button"], html.hm-on .hm-fit input[type="submit"], html.hm-on .hm-fit input[type="reset"], html.hm-on .hm-fit button:not(.hm-ui) {',
    '  min-height: 44px !important; padding: 0 14px !important; font-size: 16px !important; }',
    // PC용 큰 왼쪽 여백·줄바꿈 금지 풀기 (입력 칸 이름이 화면 밖으로 밀리던 원인)
    'html.hm-on .hm-fit [style*="margin-left"] { margin-left: 0 !important; }',
    'html.hm-on .hm-fit [nowrap], html.hm-on .hm-fit [style*="nowrap"] { white-space: normal !important; }',
    // 표 칸·목록에 혼자 있는 링크(분류 탭, 페이지 번호 등)는 누르기 쉽게 44px
    'html.hm-on .hm-fit td > a, html.hm-on .hm-fit li > a, html.hm-on .hm-fit td > font > a, html.hm-on .hm-crd a {',
    '  display: inline-flex; align-items: center; min-height: 44px; min-width: 44px; }',
    'html.hm-on .hm-has-proxy { position: absolute !important; width: 1px !important; height: 1px !important; opacity: 0 !important; clip: rect(0 0 0 0); }',
    'html.hm-on .hm-img-proxy { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; margin: 2px; padding: 0 14px;',
    '  border: 1px solid #CDD1D5; border-radius: 6px; background: #FFFFFF; color: #131416; font: 700 16px/1.3 ' + FONT + '; cursor: pointer; }',
    'html.hm-on .hm-fit a:has(> img:only-child) { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; }',
    'html.hm-on .hm-fit a.hm-labeled { display: inline-flex !important; align-items: center; justify-content: center; min-height: 44px; padding: 0 12px;',
    '  margin: 2px; border: 1px solid #CDD1D5; border-radius: 6px; background: #FFFFFF; color: #131416 !important; text-decoration: none !important; }',
    'html.hm-on .hm-fit a.hm-btnlink { display: inline-flex !important; align-items: center; box-sizing: border-box; min-height: 44px; padding: 0 12px !important; margin: 2px;',
    '  border: 1px solid #CDD1D5; border-radius: 6px; background: #FFFFFF; text-decoration: none !important; }',
    // 탭 그림의 선택 상태(…_on.gif / bt_on_01.gif): 원래 스크립트가 그림을 바꾸면 따라 바뀜
    'html.hm-on .hm-fit a.hm-labeled:has(> img[src*="_on."], > img[src*="_on_"]),',
    'html.hm-on .hm-has-proxy[src*="_on."] + .hm-img-proxy, html.hm-on .hm-has-proxy[src*="_on_"] + .hm-img-proxy {',
    '  border-color: #256EF4; background: #ECF2FE; color: #0B50D0 !important; font-weight: 700; }',

    // 페이지 번호 줄 (markPagers)
    'html.hm-on .hm-pager { display: flex !important; flex-wrap: wrap; justify-content: center; align-items: center; gap: 4px; padding: 8px 0; }',
    'html.hm-on .hm-pager > .hm-pager-sep { display: none !important; }',
    'html.hm-on .hm-pager > a, html.hm-on .hm-pager > .hm-pager-cur { display: inline-flex !important; align-items: center; justify-content: center; box-sizing: border-box;',
    '  min-width: 44px; min-height: 44px; margin: 0; padding: 0 8px; border: 1px solid #CDD1D5; border-radius: 6px; background: #FFFFFF; text-decoration: none !important; }',
    'html.hm-on .hm-pager > a, html.hm-on .hm-pager > a * { color: #131416 !important; font-weight: 400 !important; font-variant-numeric: tabular-nums; }',
    'html.hm-on .hm-pager > .hm-pager-cur { background: #256EF4; border-color: #256EF4; }',
    'html.hm-on .hm-pager > .hm-pager-cur, html.hm-on .hm-pager > .hm-pager-cur * { color: #FFFFFF !important; font-weight: 700 !important; }',

    // 옆으로 넘치던 배치용 표: 칸을 세로로 쌓음 (줄의 숨김 상태는 원래 화면 그대로)
    'html.hm-on table.hm-block { width: 100% !important; table-layout: fixed; }',
    'html.hm-on table.hm-block > tbody > tr > td, html.hm-on table.hm-block > tbody > tr > th, html.hm-on table.hm-block > thead > tr > th {',
    // height="20" 같은 칸 높이는 블록이 되면 고정 높이가 되어 44px 버튼이 아래 칸과 겹침 (시설예약 내역에서 확인)
    '  display: block !important; width: auto !important; min-width: 0 !important; height: auto !important; }',
    // 아직 손질 못 한 표 (점검표 B·C): 개발 중 임시로만 표 안에서 옆으로 밀기
    'html.hm-on table.hm-scroll { display: block !important; max-width: 100% !important; overflow-x: auto !important; }',

    // 데이터 표 → 카드
    'html.hm-on .hm-cards { display: flex; flex-direction: column; gap: 12px; margin: 0 0 16px; }',
    'html.hm-on .hm-crd { padding: 16px; border: 1px solid #CDD1D5; border-radius: 8px; background: #FFFFFF; }',
    'html.hm-on .hm-crd.hm-clickable { cursor: pointer; }',
    'html.hm-on .hm-crd-note { background: #F4F5F6; }',
    'html.hm-on .hm-content .hm-crd-title, html.hm-on .hm-content .hm-crd-title * { font-size: 17px !important; font-weight: 700; line-height: 1.45 !important; color: #131416; }',
    'html.hm-on .hm-crd-title { margin: 0 0 8px; }',
    'html.hm-on .hm-crd-title a { display: block; min-height: 44px; }',
    'html.hm-on .hm-crd-fields { display: flex; flex-wrap: wrap; gap: 4px 16px; }',
    'html.hm-on .hm-crd-field { display: inline-flex; align-items: baseline; gap: 6px; min-width: 0; }',
    'html.hm-on .hm-content .hm-crd-label { font-size: 13px !important; color: #6D7882; white-space: nowrap; }',
    'html.hm-on .hm-content .hm-crd-value, html.hm-on .hm-content .hm-crd-value * { font-size: 16px !important; color: #464C53; font-variant-numeric: tabular-nums; }',

    // 전체 메뉴(사이트맵) + 메뉴 검색
    '.hm-sitemap { margin: 0 0 16px; }',
    '.hm-search { display: flex; align-items: center; gap: 4px; height: 52px; padding: 0 4px 0 12px; margin: 0 0 8px; border: 1px solid #CDD1D5; border-radius: 8px; background: #FFFFFF; }',
    '.hm-search:focus-within { border-color: #256EF4; box-shadow: 0 0 0 2px #D8E5FD; }',
    '.hm-search .hm-icon { color: #6D7882; }',
    'html.hm-on .hm-search input { flex: 1; min-width: 0; height: 48px !important; min-height: 0 !important; margin: 0; padding: 0 4px !important; border: 0 !important; outline: none;',
    '  background: transparent; font: 400 17px/1.4 ' + FONT + ' !important; color: #131416; -webkit-appearance: none; appearance: none; }',
    '.hm-search-clear[hidden] { display: none !important; }',
    'html.hm-on .hm-content .hm-search-count { margin: 0 0 8px; font-size: 13px !important; color: #6D7882; }',
    '.hm-cat { border-top: 2px solid #131416; margin: 0 0 8px; }',
    '.hm-cat-head { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 52px; margin: 0; padding: 0 4px; border: 0; background: transparent;',
    '  color: #131416; font: 700 17px/1.3 ' + FONT + '; text-align: left; cursor: pointer; }',
    '.hm-cat-head .hm-icon { transition: transform 200ms ease-out; color: #6D7882; }',
    '.hm-cat-head[aria-expanded="true"] .hm-icon { transform: rotate(180deg); }',
    '.hm-cat-body[hidden] { display: none !important; }',
    'html.hm-on .hm-content .hm-item { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; width: 100%; min-height: 48px; margin: 0; padding: 6px 4px;',
    '  border: 0; border-bottom: 1px solid #E6E8EA; background: transparent; color: #131416; font: 400 17px/1.4 ' + FONT + ' !important; text-align: left; cursor: pointer; }',
    'html.hm-on .hm-content .hm-item small { font-size: 13px !important; color: #6D7882; }',
    'html.hm-on .hm-content .hm-item.hm-sub { padding-left: 20px; }',
    'html.hm-on .hm-content .hm-group-label { padding: 12px 4px 4px; font-size: 13px !important; font-weight: 700; color: #6D7882; }',
    'html.hm-on .hm-content .hm-empty { padding: 24px 4px; font-size: 16px !important; color: #464C53; text-align: center; }'
  ].join('\n');

  function addStyle() {
    var s = document.createElement('style');
    s.id = 'hm-style';
    s.textContent = CSS_BASE + '\n' + CSS_LOGIN + '\n' + CSS_FRAME;
    (document.head || root).appendChild(s);
  }

  // ---- F0 자동 정리 도구 ----

  // 줄 사이 장식선(내용 없는 한 칸 줄)
  function isSeparator(r) {
    return r.cells.length === 1 && !textOf(r) && !r.querySelector('img, input, a, select');
  }

  // 데이터 표인지: 머리글 한 줄 + 같은 칸 수의 줄들, 병합·입력 칸·속 표 없음 (PRD F0)
  function dataTableInfo(t) {
    if (t.querySelector('table')) return null;
    if (t.querySelector('input:not([type="hidden"]), select, textarea, button')) return null;
    if (t.querySelector('[rowspan]:not([rowspan="1"])')) return null;
    var rows = [].slice.call(t.rows).filter(function (r) { return !isSeparator(r); });
    if (rows.length < 2) return null;
    var head = rows[0];
    var n = head.cells.length;
    if (n < 2) return null;
    var labels = [].map.call(head.cells, function (c) { return textOf(c); });
    var named = labels.filter(function (s) { return s && s.length <= 30; }).length;
    if (named < n - 1 || head.querySelector('a, input')) return null;
    var body = rows.slice(1);
    var full = 0;
    for (var i = 0; i < body.length; i++) {
      var r = body[i];
      var spans = [].some.call(r.cells, function (c) { return (c.colSpan || 1) > 1; });
      if (r.cells.length === n && !spans) { full++; continue; }
      if (r.cells.length === 1) continue; // 한 줄 안내 ("자료가 없습니다" 등)
      return null;
    }
    if (!full) return null;
    return { head: head, body: body, labels: labels };
  }

  function pickTitleColumn(info) {
    for (var i = 0; i < info.labels.length; i++) {
      if (/제목|subject|title|과목명|교과목|이름|성명|name|내용|시설/i.test(info.labels[i])) return i;
    }
    var best = 0, bestLen = -1;
    for (var c = 0; c < info.labels.length; c++) {
      var len = 0;
      info.body.forEach(function (r) { if (r.cells[c]) len += textOf(r.cells[c]).length; });
      if (len > bestLen) { bestLen = len; best = c; }
    }
    return best;
  }

  // 데이터 표 → 카드: 칸 내용을 옮겨 담음(복제 X). 원래 표는 모바일에서만 숨김
  function cardify(t, info, F) {
    var titleIdx = pickTitleColumn(info);
    var list = el('div', 'hm-cards');
    t.parentNode.insertBefore(list, t); // 같은 폼 안에 남도록 표 바로 앞에
    F.created.push(list);
    t.classList.add('hm-orig-hidden', 'hm-carded');
    info.body.forEach(function (r) {
      if (getComputedStyle(r).display === 'none') return;
      var card = el('div', 'hm-crd');
      if (r.cells.length === 1) {
        if (!textOf(r.cells[0]) && !r.querySelector('img, a')) return;
        card.classList.add('hm-crd-note');
        moveChildren(r.cells[0], card, F.name);
        list.appendChild(card);
        return;
      }
      var title = el('div', 'hm-crd-title');
      moveChildren(r.cells[titleIdx], title, F.name);
      card.appendChild(title);
      var fields = el('div', 'hm-crd-fields');
      for (var i = 0; i < r.cells.length; i++) {
        if (i === titleIdx) continue;
        var cell = r.cells[i];
        if (!textOf(cell) && !cell.querySelector('img, a')) continue;
        var f = el('div', 'hm-crd-field');
        if (info.labels[i]) f.appendChild(el('span', 'hm-crd-label', info.labels[i]));
        var v = el('span', 'hm-crd-value');
        moveChildren(cell, v, F.name);
        f.appendChild(v);
        fields.appendChild(f);
      }
      if (fields.firstChild) card.appendChild(fields);
      // 줄 전체를 누르면 이동하던 표: 카드를 눌러도 원래 줄을 누름
      if (r.getAttribute('onclick')) {
        card.classList.add('hm-clickable');
        card.addEventListener('click', function (e) {
          if (!e.target.closest('a, button, input, select, label')) r.click();
        });
      }
      list.appendChild(card);
    });
  }

  // 화면 폭에 맞추기: 고정 폭 풀기 → 넘치는 표를 바깥부터 카드/세로 쌓기 → 그래도 넘치면 표 안 스크롤(임시)
  function fitWidth(scope, F) {
    scope.classList.add('hm-fit');
    var all = scope.querySelectorAll('[width], [style*="width"]');
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      if (e.tagName === 'IMG' || e.tagName === 'INPUT' || e.closest('.hm-ui')) continue;
      var w = parseInt(e.getAttribute('width'), 10);
      var sw = /(^|;)\s*width\s*:\s*(\d+)px/i.exec(e.getAttribute('style') || '');
      if ((w && !/%/.test(e.getAttribute('width')) && w >= 120) || (sw && +sw[2] >= 120)) e.classList.add('hm-fw');
    }
    labelImageLinks(scope);
    markPagers(scope);

    var limit = function () {
      var r = scope.getBoundingClientRect();
      var cs = getComputedStyle(scope);
      return r.right - parseFloat(cs.paddingRight) + 1;
    };
    var tables = function () {
      return [].filter.call(scope.querySelectorAll('table'), function (t) {
        return !t.classList.contains('hm-carded') && !t.closest('.hm-ui') && !isHidden(t);
      });
    };

    // 넓지 않아도 열이 4개 이상인 데이터 표는 카드로 (폰에서 칸이 너무 좁음)
    tables().forEach(function (t) {
      var info = dataTableInfo(t);
      if (info && info.labels.length >= 4) cardify(t, info, F);
    });

    // 칸이 너무 좁아 입력 칸·링크가 짓눌리거나 옆 칸으로 삐져나오는 배치용 표(한 줄짜리 검색 조건, 분류 탭 줄 등)는 세로로 쌓음
    [].forEach.call(scope.querySelectorAll('select, textarea, input[type="text"], input:not([type]), td > a, td > font > a'), function (c) {
      var t = c.closest('table');
      var cell = c.closest('td, th');
      if (!t || !cell || !scope.contains(t) || t.classList.contains('hm-block') || t.classList.contains('hm-carded') || isHidden(c)) return;
      var cw = cell.getBoundingClientRect().width;
      if (cw < 44 || c.getBoundingClientRect().width > cw + 1) t.classList.add('hm-block');
    });

    for (var pass = 0; pass < 10; pass++) {
      var right = limit();
      var wide = tables().filter(function (t) {
        return !t.classList.contains('hm-block') && t.getBoundingClientRect().right > right;
      });
      var outer = wide.filter(function (t) {
        return !wide.some(function (o) { return o !== t && o.contains(t); });
      });
      if (!outer.length) break;
      outer.forEach(function (t) {
        var info = dataTableInfo(t);
        if (info) cardify(t, info, F);
        else t.classList.add('hm-block');
      });
    }
    var right2 = limit();
    tables().forEach(function (t) {
      if (t.getBoundingClientRect().right > right2 && !t.querySelector('table.hm-scroll')) t.classList.add('hm-scroll');
    });
    markLooseLinks(scope); // 카드를 만든 뒤에 (카드 안 링크는 이미 44px)
  }

  // ---- 4. 화면별 꾸미기 ----
  // 각 화면 함수는 필요한 요소가 없으면 false를 돌려주고 아무것도 바꾸지 않는다 (PRD 7-5)
  var screens = [];

  // F3 로그인 화면 (/login/login.php — 바깥 문서의 MainFrame 안에서도, 직접 열어도)
  screens.push({
    name: 'login',
    cls: 'hm-p-login',
    match: function () { return PATH === '/login/login.php'; },
    run: function (F) {
      var form = document.forms.login;
      var box = document.getElementById('loginBoxBg');
      if (!form || !box) return false;
      // 입력 칸 이름은 매번 바뀌므로(id_18, id_96 …) 종류로 찾는다
      var idInput = form.querySelector('input[type="text"]');
      var pwInput = form.querySelector('input[type="password"]');
      var imgBtn = form.querySelector('input[type="image"]');
      var tables = box.querySelectorAll(':scope > table');
      if (!idInput || !pwInput || !imgBtn || tables.length < 2) return false;

      var cells = tables[1].rows[0] ? tables[1].rows[0].cells : [];
      var noticeCell = null, foodCell = null;
      for (var i = 0; i < cells.length; i++) {
        if (cells[i].querySelector('form[name="formNoticeBar"]')) noticeCell = cells[i];
        if (cells[i].querySelector('#tr_box_11')) foodCell = cells[i];
      }

      var wrap = el('div', 'hm-login');
      var head = el('div', 'hm-login-head');
      var photo = el('div', 'hm-login-photo');
      var loginCard = el('section', 'hm-card hm-login-card');
      var noticeCard = el('section', 'hm-card hm-login-notice');
      var foodCard = el('section', 'hm-card hm-login-food');
      var linksCard = el('section', 'hm-card hm-login-links');
      var foot = el('div', 'hm-login-foot');
      F.created.push(wrap);

      // 로고(작게) → 사진(낮게) → 로그인 → 공지 → 식단 → 계정·출력 → 바닥글
      var logo = tables[0].querySelector('img[src*="top1"]');
      if (logo) moveTo(logo, head, F.name);
      var photoBox = document.getElementById('apDiv1');
      if (photoBox) moveTo(photoBox, photo, F.name);

      loginCard.appendChild(el('h2', 'hm-card-title', '로그인'));
      moveTo(form, loginCard, F.name);

      // 아이디·비밀번호: 그림 이름표 대신 글자 이름표 (입력 칸 자체는 그대로)
      idInput.parentNode.insertBefore(el('label', 'hm-field-label', '아이디'), idInput);
      pwInput.parentNode.insertBefore(el('label', 'hm-field-label', '비밀번호'), pwInput);
      if (!idInput.getAttribute('aria-label')) idInput.setAttribute('aria-label', '아이디');
      if (!pwInput.getAttribute('aria-label')) pwInput.setAttribute('aria-label', '비밀번호');

      // 큰 "로그인" 버튼: 폼을 새로 보내지 않고 원래 그림 버튼을 누른다 (onsubmit="return comp()" 그대로 거침)
      var loginBtn = el('button', 'hm-btn-primary', '로그인');
      loginBtn.type = 'button';
      loginBtn.addEventListener('click', function () { imgBtn.click(); });
      var btnCell = imgBtn.closest('table') ? imgBtn.closest('table').parentNode : imgBtn.parentNode;
      btnCell.appendChild(loginBtn);

      // 언어 선택: 원래 글자는 <a href="#">라서 눌러도 선택이 안 됨 → 누르기 쉬운 글자 이름표를 붙임
      var radios = form.querySelectorAll('input[type="radio"][name="Language"]');
      if (radios.length) {
        var langRow = radios[0].parentNode;
        langRow.classList.add('hm-row');
        for (var r = 0; r < radios.length; r++) {
          var choice = el('label', 'hm-choice');
          var text = radios[r].value === 'English' ? 'English' : '한국어';
          moveTo(radios[r], choice, F.name);
          choice.appendChild(document.createTextNode(text));
          langRow.appendChild(choice);
        }
      }

      // 아이디 저장
      var save = form.querySelector('#saveid');
      if (save) {
        var saveRow = save.parentNode;
        saveRow.classList.add('hm-row');
        var saveChoice = el('label', 'hm-choice');
        moveTo(save, saveChoice, F.name);
        saveChoice.appendChild(document.createTextNode('아이디 저장'));
        saveRow.insertBefore(saveChoice, saveRow.firstChild);
        // 원래 "아이디저장" 글자는 모바일에서만 숨김
        for (var n = 0; n < saveRow.childNodes.length; n++) {
          var t = saveRow.childNodes[n];
          if (t.nodeType === 3 && /아이디저장/.test(t.nodeValue)) {
            var hide = document.createElement('span');
            hide.className = 'hm-hide-on-mobile';
            moveTo(t, hide, F.name);
            saveRow.insertBefore(hide, saveChoice.nextSibling);
            break;
          }
        }
      }

      if (noticeCell) {
        noticeCard.appendChild(el('h2', 'hm-card-title', '공지사항'));
        labelImageLinks(noticeCell, 'hm-tab');
        moveTo(noticeCell, noticeCard, F.name);
      }
      if (foodCell) {
        foodCard.appendChild(el('h2', 'hm-card-title', '오늘의 식단'));
        labelImageLinks(foodCell, 'hm-tab');
        moveTo(foodCell, foodCard, F.name);
      }

      // 계정·출력: 회원가입 · 아이디 찾기 · 비밀번호 찾기 · 등록금 관련 출력 (원래 <a> 그대로)
      linksCard.appendChild(el('h2', 'hm-card-title', '계정 · 출력'));
      var linkSel = ['a[href*="regist_step1"]', 'a[href*="findID()"]', 'a[href*="findPW()"]', 'a[href*="printDungNotice"]'];
      for (var k = 0; k < linkSel.length; k++) {
        // 회원가입·계정 찾기 링크는 로그인 폼 안에 있음 (폼은 위에서 이미 옮겼으므로 폼에서도 찾음)
        var a = form.querySelector(linkSel[k]) || box.querySelector(linkSel[k]);
        if (!a) continue;
        labelImageLinks(a.parentNode);
        if (!a.classList.contains('hm-labeled')) continue;
        a.appendChild(chevron());
        moveTo(a, linksCard, F.name);
      }

      // 바닥글 (주소·개인정보처리방침·관련사이트)
      var footTable = findFooter();
      if (footTable) moveTo(footTable, foot, F.name);

      wrap.appendChild(head);
      if (photoBox) wrap.appendChild(photo);
      wrap.appendChild(loginCard);
      if (noticeCell) wrap.appendChild(noticeCard);
      if (foodCell) wrap.appendChild(foodCard);
      if (linksCard.querySelector('a')) wrap.appendChild(linksCard);
      if (footTable) wrap.appendChild(foot);
      document.body.insertBefore(wrap, document.body.firstChild);
      return true;
    }
  });

  function findFooter() {
    var bodyTables = document.querySelectorAll('body > table');
    for (var b = bodyTables.length - 1; b >= 0; b--) {
      if (bodyTables[b].querySelector('.btn_sm_tail, img[src*="copyright"]')) return bodyTables[b];
    }
    return null;
  }

  // F0 공통 틀 (위쪽 메뉴 #div_TopmenuBg + 1000px 표[왼쪽 메뉴 | 내용]) + F2 ☰ 메뉴
  var drawerOpen = function () {};
  var closeDrawer = function () {};

  screens.push({
    name: 'frame',
    cls: 'hm-frame',
    match: function () { return PATH !== '/login/login.php'; },
    run: function (F) {
      var topMenu = document.getElementById('div_TopmenuBg');
      // 보통 body 바로 아래지만, 폼 등으로 한 번 감싼 화면도 있음 (등록금 납부 확인서 등)
      var main = null;
      var wides = document.querySelectorAll('table[width="1000"]');
      for (var i = 0; i < wides.length; i++) {
        if (!topMenu || !topMenu.contains(wides[i])) { main = wides[i]; break; }
      }
      if (!topMenu || !main || main.rows.length < 2) return false;
      var inner = main.rows[1].cells[0] && main.rows[1].cells[0].querySelector('table');
      var cells = inner && inner.rows[0] ? inner.rows[0].cells : [];
      if (cells.length < 2) return false;
      var left = cells[0];
      var content = cells[cells.length - 1];
      if (left.getAttribute('width') !== '191') return false;

      main.classList.add('hm-main');
      inner.classList.add('hm-main-inner');
      left.classList.add('hm-left');
      for (var c = 1; c < cells.length - 1; c++) cells[c].classList.add('hm-spacer');
      content.classList.add('hm-content');
      var subCell = main.rows[0].cells[0];
      if (subCell) subCell.classList.add('hm-subrow');
      var foot = findFooter();
      if (foot) foot.classList.add('hm-foot');

      buildChrome(F, topMenu, left);

      if (IS_SITEMAP) {
        try {
          buildSitemap(F, content);
        } catch (e) { /* 전체 메뉴 꾸미기만 포기, 원래 사이트맵 표는 아래 자동 정리로 */ }
      }

      if (subCell) fitWidth(subCell, F);
      fitWidth(content, F);
      if (foot) foot.classList.add('hm-fit');
      // 그림이 나중에 불러와져 폭이 바뀌면 한 번 더 맞춤 (이미 처리한 표는 건너뜀)
      var pending = false;
      var refit = function () {
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () {
          pending = false;
          if (!root.classList.contains('hm-on')) return;
          try {
            if (subCell) fitWidth(subCell, F);
            fitWidth(content, F);
          } catch (e) { /* 무시 */ }
        });
      };
      [].forEach.call(content.querySelectorAll('img'), function (img) {
        if (!img.complete) img.addEventListener('load', refit);
      });
      window.addEventListener('load', refit);
      return true;
    }
  });

  // 현재 화면 이름: 왼쪽 메뉴에서 지금 주소와 같은 링크의 글자
  function sameLink(a) {
    try {
      var u = new URL(a.href, location.href);
      if (u.pathname !== location.pathname) return false;
      var here = new URLSearchParams(location.search).get('Board');
      return (u.searchParams.get('Board') || null) === (here || null);
    } catch (e) {
      return false;
    }
  }

  function buildChrome(F, topMenu, left) {
    var body = document.body;
    var current = null;
    [].some.call(left.querySelectorAll('a[href]'), function (a) {
      if (textOf(a) && sameLink(a)) { current = a; return true; }
      return false;
    });
    if (current) current.classList.add('hm-current');
    var title = IS_SITEMAP ? '전체 메뉴' : (current ? textOf(current) : '히즈넷');

    // 위쪽 바: ☰ · 화면 이름 · 홈
    var bar = el('div', 'hm-topbar');
    var menuBtn = el('button', 'hm-icon-btn');
    menuBtn.type = 'button';
    menuBtn.setAttribute('aria-label', '메뉴 열기');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.appendChild(icon('menu'));
    var titleEl = el('div', 'hm-topbar-title', title);
    bar.appendChild(menuBtn);
    bar.appendChild(titleEl);
    var homeA = topMenu.querySelector('a img[src*="tbtn_home"]');
    homeA = homeA && homeA.closest('a');
    if (homeA) {
      var homeBtn = el('button', 'hm-icon-btn');
      homeBtn.type = 'button';
      homeBtn.setAttribute('aria-label', '홈');
      homeBtn.appendChild(icon('home'));
      homeBtn.addEventListener('click', function () { homeA.click(); });
      bar.appendChild(homeBtn);
    } else {
      bar.appendChild(el('span', 'hm-icon-btn'));
    }
    body.insertBefore(bar, body.firstChild);
    F.created.push(bar);

    // 서랍: 바로가기 → 분류 → 이 분류 메뉴(원래 왼쪽 메뉴를 옮김) → 빠른 링크 → 계정
    var scrim = el('div', 'hm-scrim');
    var drawer = el('nav', 'hm-drawer');
    drawer.setAttribute('aria-label', '메뉴');
    var head = el('div', 'hm-drawer-head');
    head.appendChild(el('strong', '', '메뉴'));
    var closeBtn = el('button', 'hm-icon-btn');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', '메뉴 닫기');
    closeBtn.appendChild(icon('close'));
    head.appendChild(closeBtn);
    drawer.appendChild(head);

    var sc = el('div', 'hm-sec');
    sc.appendChild(el('div', 'hm-sec-title', '바로가기'));
    var grid = el('div', 'hm-shortcuts');
    SHORTCUTS.forEach(function (s) {
      var a = el('a', '', s.name);
      a.href = s.href;
      if (s.newTab) { a.target = '_blank'; a.rel = 'noopener'; }
      grid.appendChild(a);
    });
    var sitemapA = topMenu.querySelector('a[href*="sitemap.php"]');
    if (sitemapA) grid.appendChild(proxy(sitemapA, '전체 메뉴', 'hm-sc-all'));
    sc.appendChild(grid);
    drawer.appendChild(sc);

    var cats = el('div', 'hm-sec');
    cats.appendChild(el('div', 'hm-sec-title', '분류'));
    var catList = el('div', 'hm-list');
    [].forEach.call(topMenu.querySelectorAll('a img[src*="tmenu"]'), function (img) {
      var label = imgLabel(img);
      if (!/^(공지사항|캠퍼스정보|신청·예약|원클릭민원|수업정보|학사정보)$/.test(label)) return;
      var b = proxy(img.closest('a'), label);
      b.appendChild(chevron());
      catList.appendChild(b);
    });
    cats.appendChild(catList);
    if (catList.firstChild) drawer.appendChild(cats);

    var leftSec = el('div', 'hm-sec hm-drawer-left');
    leftSec.appendChild(el('div', 'hm-sec-title', '이 분류 메뉴'));
    labelImageLinks(left);
    [].slice.call(left.children).forEach(function (n) { moveTo(n, leftSec, F.name); });
    drawer.appendChild(leftSec);

    var quick = document.getElementById('div_quick');
    if (quick && quick.querySelector('a')) {
      var qSec = el('div', 'hm-sec hm-drawer-quick');
      qSec.appendChild(el('div', 'hm-sec-title', '빠른 링크'));
      [].slice.call(quick.children).forEach(function (n) { moveTo(n, qSec, F.name); });
      drawer.appendChild(qSec);
    }

    var acct = el('div', 'hm-sec');
    var acctList = el('div', 'hm-list');
    [['tbtn_myaccount', '나의 계정'], ['languagechg', 'Language'], ['tbtn_logout', '로그아웃']].forEach(function (p) {
      var img = topMenu.querySelector('a img[src*="' + p[0] + '"]');
      if (img) acctList.appendChild(proxy(img.closest('a'), p[1]));
    });
    acct.appendChild(acctList);
    if (acctList.firstChild) drawer.appendChild(acct);

    body.appendChild(scrim);
    body.appendChild(drawer);
    F.created.push(scrim, drawer);

    drawerOpen = function () {
      root.classList.add('hm-drawer-open');
      menuBtn.setAttribute('aria-expanded', 'true');
      closeBtn.focus();
    };
    closeDrawer = function () {
      if (!root.classList.contains('hm-drawer-open')) return;
      root.classList.remove('hm-drawer-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    };
    menuBtn.addEventListener('click', drawerOpen);
    closeBtn.addEventListener('click', function () { closeDrawer(); menuBtn.focus(); });
    scrim.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
  }

  // F2 전체 메뉴 + 메뉴 검색: 사이트맵에 이미 있는 링크 글자만 사용 (새 요청 없음, 검색어 저장 안 함)
  function buildSitemap(F, content) {
    var heads = content.querySelectorAll('img[src*="sitemap_title"]');
    if (!heads.length) return;
    var cats = [];
    [].forEach.call(heads, function (img) {
      var name = '';
      var src = img.getAttribute('src') || '';
      SITEMAP_TITLES.forEach(function (p) { if (p[0].test(src)) name = p[1]; });
      var col = img.closest('table');
      var items = [];
      var group = '';
      [].forEach.call(col.querySelectorAll('td.f01 a, td.f02 a'), function (a) {
        var label = textOf(a);
        if (!label) return;
        var sub = !!a.closest('td.f02');
        if (!sub && !(a.getAttribute('href') || '').trim()) { group = label; return; } // 하위 묶음 이름 (학부공지 등)
        if (!sub) group = '';
        items.push({ name: label, group: sub ? group : '', a: a });
      });
      if (items.length) cats.push({ name: name || '기타', items: items });
    });
    if (!cats.length) return;

    var wrap = el('div', 'hm-sitemap');
    var box = el('div', 'hm-search');
    box.appendChild(icon('search'));
    var input = el('input');
    input.type = 'search';
    input.placeholder = '메뉴 이름 검색 (예: 성적)';
    input.setAttribute('aria-label', '메뉴 검색');
    input.autocomplete = 'off';
    var clear = el('button', 'hm-icon-btn hm-search-clear');
    clear.type = 'button';
    clear.setAttribute('aria-label', '검색어 지우기');
    clear.hidden = true;
    clear.appendChild(icon('close'));
    box.appendChild(input);
    box.appendChild(clear);
    wrap.appendChild(box);
    var count = el('div', 'hm-search-count');
    count.setAttribute('aria-live', 'polite');
    wrap.appendChild(count);
    var results = el('div', 'hm-results');
    wrap.appendChild(results);
    var catsBox = el('div', 'hm-cats');
    wrap.appendChild(catsBox);

    function itemButton(it, showCat) {
      var b = el('button', 'hm-item' + (it.group && !showCat ? ' hm-sub' : ''));
      b.type = 'button';
      b.appendChild(document.createTextNode(it.name));
      if (showCat) b.appendChild(el('small', '', it.cat + (it.group ? ' · ' + it.group : '')));
      b.addEventListener('click', function () { it.a.click(); });
      return b;
    }

    cats.forEach(function (cat) {
      var sec = el('section', 'hm-cat');
      var hb = el('button', 'hm-cat-head');
      hb.type = 'button';
      hb.setAttribute('aria-expanded', 'false');
      hb.appendChild(document.createTextNode(cat.name + ' (' + cat.items.length + ')'));
      hb.appendChild(icon('down'));
      var bodyEl = el('div', 'hm-cat-body');
      bodyEl.hidden = true;
      var lastGroup = '';
      cat.items.forEach(function (it) {
        it.cat = cat.name;
        if (it.group && it.group !== lastGroup) bodyEl.appendChild(el('div', 'hm-group-label', it.group));
        lastGroup = it.group;
        bodyEl.appendChild(itemButton(it, false));
      });
      hb.addEventListener('click', function () {
        var open = hb.getAttribute('aria-expanded') !== 'true';
        hb.setAttribute('aria-expanded', open ? 'true' : 'false');
        bodyEl.hidden = !open;
      });
      sec.appendChild(hb);
      sec.appendChild(bodyEl);
      catsBox.appendChild(sec);
    });

    function search() {
      var q = norm(input.value);
      clear.hidden = !input.value;
      results.textContent = '';
      if (!q) {
        catsBox.hidden = false;
        count.textContent = '';
        return;
      }
      catsBox.hidden = true;
      var found = [];
      cats.forEach(function (cat) {
        cat.items.forEach(function (it) {
          if (norm(it.name).indexOf(q) !== -1 || norm(cat.name).indexOf(q) !== -1 || norm(it.group).indexOf(q) !== -1) found.push(it);
        });
      });
      count.textContent = '검색 결과 ' + found.length + '개';
      if (!found.length) {
        results.appendChild(el('div', 'hm-empty', '일치하는 메뉴가 없습니다.'));
        return;
      }
      found.forEach(function (it) { results.appendChild(itemButton(it, true)); });
    }
    input.addEventListener('input', search);
    clear.addEventListener('click', function () { input.value = ''; search(); input.focus(); });

    // 원래 사이트맵 표는 모바일에서만 숨김 (원래 링크는 그대로 있어서 우리 버튼이 대신 누름)
    var top = content.querySelector('table');
    if (top) top.classList.add('hm-orig-hidden', 'hm-carded');
    content.insertBefore(wrap, content.firstChild);
    F.created.push(wrap);
  }

  // ---- 5. 공통 UI: 원래 화면 버튼 (F1) ----
  var built = false;
  var recognized = false;

  function applyMode(mode) {
    var mobile = mode === 'mobile';
    if (!mobile) {
      closeDrawer();
      putBack();
    }
    root.classList.toggle('hm-on', mobile);
    if (mobile) {
      if (!built) build();
      else putForward();
    }
    var pageWidth = root.scrollWidth;
    if (recognized) setOwnViewport(mobile ? 'mobile' : 'original', pageWidth);
    // 원래 화면에서는 페이지가 기기 폭에 맞춰 축소되므로 버튼을 그만큼 키움
    var z = mobile || !recognized ? 1 : Math.max(1, Math.max(980, pageWidth) / deviceWidth());
    root.style.setProperty('--hm-z', String(z));
    var btn = document.getElementById('hm-toggle');
    if (btn) btn.textContent = mobile ? '원래 화면' : '모바일 화면';
  }

  function addToggle() {
    if (!OWNS_VIEWPORT) return; // 숨은 칸에는 넣지 않음
    var btn = document.createElement('button');
    btn.id = 'hm-toggle';
    btn.type = 'button';
    btn.textContent = root.classList.contains('hm-on') ? '원래 화면' : '모바일 화면';
    btn.addEventListener('click', function () {
      var next = root.classList.contains('hm-on') ? 'original' : 'mobile';
      saveMode(next);
      applyMode(next);
    });
    document.body.appendChild(btn);
  }

  // ---- 6. 안전망 ----
  function runScreen(S) {
    var F = { name: S.name, created: [] };
    var ok = false;
    root.classList.add(S.cls);
    try {
      ok = S.run(F) === true;
    } catch (e) {
      ok = false;
    }
    if (!ok) {
      // 실패한 화면만 원래대로: 옮긴 노드 되돌리기 → 만든 요소 지우기 → 화면 CSS 끄기
      try {
        putBack(S.name);
        forget(S.name);
        F.created.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
      } catch (e2) { /* 무시 */ }
      root.classList.remove(S.cls);
    }
    return ok;
  }

  var active = screens.filter(function (S) { return S.match(); });

  function build() {
    built = true;
    for (var i = 0; i < active.length; i++) {
      if (runScreen(active[i])) { recognized = true; break; } // 한 문서에는 한 화면만
    }
  }

  function stopWaiting() {
    root.classList.remove('hm-wait');
  }

  try {
    addStyle();
    if (readMode() === 'mobile' && OWNS_VIEWPORT) {
      // 원래 화면이 잠깐 보였다 바뀌는 깜빡임을 줄이려고 준비될 때까지 가림 (최대 4초)
      root.classList.add('hm-wait');
      setTimeout(stopWaiting, 4000);
    }
  } catch (e) { /* 무시 */ }

  function onReady() {
    try {
      var body = document.body;
      if (!body || body.tagName === 'FRAMESET') return; // 프레임 묶음 문서: 안쪽 프레임이 화면 설정을 정함
      if (readMode() === 'mobile') applyMode('mobile');
      else applyMode('original');
      if (recognized || readMode() === 'original') addToggle();
      // 못 알아본 화면이 프레임 안에 열리면 바깥 화면 설정을 원래대로 (로그인 → 메인 이동 등)
      if (!recognized && frameKind() === 'FRAME') {
        try { setViewport(window.top.document, 'original', root.scrollWidth); } catch (e) { /* 무시 */ }
      }
    } catch (e) {
      var s = document.getElementById('hm-style');
      if (s && !recognized) s.remove();
    } finally {
      stopWaiting();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
