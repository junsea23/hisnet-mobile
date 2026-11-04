// ==UserScript==
// @name         히즈넷 모바일
// @namespace    hisnet-mobile
// @version      0.4.0
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
 *  4. 화면별 꾸미기  F3 로그인 / F4 메인 / F0 공통 틀 + F2 ☰ 메뉴 + 전체 메뉴 검색 / F5 게시판 / F6 시설예약(달력 칸 포함) (하나가 고장 나도 다른 건 동작)
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
    [/myboard\/images\/btn_bo_list\./, '목록'],
    [/myboard\/images\/btn_bo_cancel\./, '검색 취소'], // 검색한 뒤에만 나옴, 그림 글자 "×Cancel" (S24에서 확인)
    [/myboard\/images\/btn_bookmark_(on|off)\./, '즐겨찾기'], // 원래 alt는 "BOOKMARK". 그림이 _on이면 이미 즐겨찾기한 글 (선택 표시)
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
    [/\/booking\/tabmenu04/, '미사용취소내역'],
    // 메인 화면 (F4, 그림 확인 2026-11-03)
    [/maintab\/student\/tab01_(on|off)_01\./, '나의수업'],
    [/maintab\/student\/tab01_(on|off)_02\./, '알림'],
    [/maintab\/student\/tab01_(on|off)_03\./, '신청승인'],
    [/maintab\/student\/tab01_(on|off)_04\./, '생활관'],
    [/maintab\/student\/tab01_(on|off)_05\./, '쪽지'],
    [/maintab\/student\/tab01_(on|off)_06\./, '도서대여'],
    [/maintab\/member\/+tab02_(on|off)_01\./, '식단정보'],
    [/maintab\/member\/+tab02_(on|off)_02\./, '교직원 연락처'],
    [/maintab\/member\/+tab02_(on|off)_03\./, '편의시설 연락처'],
    [/maintab\/student\/tab03_(on|off)_01\./, '주요공지'],
    [/maintab\/student\/tab03_(on|off)_02\./, '일반공지'],
    [/maintab\/student\/tab03_(on|off)_03\./, '학부/대학원'],
    [/maintab\/student\/tab03_(on|off)_04\./, '장학정보'],
    [/maintab\/student\/tab03_(on|off)_05\./, '취업정보'],
    [/maintab\/student\/tab03_(on|off)_06\./, '성경읽기'],
    [/maintab\/student\/tab03_(on|off)_07\./, 'OIA Info'],
    [/maintab\/student\/tab03_(on|off)_08\./, '즐겨찾기'],
    [/2012_images\/public\/btn_load\./, '불러오기'],
    [/main\/title_kyominfo_more\./, '더보기'],
    [/main\/searchbar_right\./, '검색'],
    // 시설예약 (F6, 그림 확인 2026-11-03). yellow_02(패널티 미적용)는 링크가 아니라서 bookingMain이 글자 표로 바꿈
    [/\/booking\/tab01(_on)?\.jpg/, '운동시설'],
    [/\/booking\/tab02(_on)?\.jpg/, '회의실'],
    [/\/booking\/tab03(_on)?\.jpg/, '편의시설'],
    [/\/booking\/tab04(_on)?\.jpg/, '전용강의실'],
    [/\/booking\/yellow_01\./, '패널티 정보'],
    [/\/booking\/view_guide\./, '안내 보기'],
    [/\/booking\/hide_guide\./, '안내 숨기기'],
    [/\/booking\/prev_btn\./, '이전 두 달'], // 달력이 두 달씩 넘어감
    [/\/booking\/next_btn\./, '다음 두 달'],
    [/\/booking\/10day_prev2\./, '이전 10일'],
    [/\/booking\/10day_next2\./, '다음 10일'],
    [/\/booking\/btn_apply\./, '예약 신청'],
    [/\/2012_images\/public\/picview_excel_e\./, '엑셀로 저장'], // 개설시간표, 그림 글자 "Save as Excel" (2026-11-04)
    // 학사정보 (F8, 그림 확인 2026-11-04)
    [/\/haksa\/images\/list\.gif/, '검색'], // 등록금 납부 확인서 등. 그림 글자 "Search"
    [/\/haksa\/images\/select\.png/, '선택'] // 전체성적조회: 학기별 성적 펼치기
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
  var docWidth = 0; // 출력 서류 화면(doc)이 정함: 서류 폭(px)

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
    } else if (docWidth) {
      // 출력 서류(F11): 원래 모양 그대로 폰 폭에 맞춰 축소, 손가락으로 확대 가능. 배율을 같이 줘야 처음부터 서류 전체가 보임
      meta.setAttribute('content', 'width=' + docWidth + ', initial-scale=' + Math.floor(deviceWidth() / docWidth * 1000) / 1000);
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
    down: 'M6 9l6 6 6-6',
    clip: 'M20 11.5l-8.1 8.1a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8'
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
    'html.hm-on a.hm-labeled img { display: none !important; }', // <a><font><img> 처럼 한 겹 싸인 그림도 (전체성적 "선택")
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
    '@media print { .hm-ui, #hm-toggle { display: none !important; } }', // 인쇄·PDF 저장엔 우리 버튼이 안 나오게

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
    '.hm-notice table, .hm-notice tbody { display: block !important; width: 100% !important; }',
    '.hm-notice tr { display: flex !important; width: 100% !important; }',
    '.hm-notice td { display: block !important; width: auto !important; height: auto !important; border: 0 !important; background: none !important; padding: 0 !important; }',
    '.hm-login-notice #td_box23 { margin-left: auto !important; }',
    '.hm-notice tr:has(> #td_box21) { border-bottom: 1px solid #CDD1D5; margin: 0 0 4px; flex-wrap: wrap; }',
    // 공지 목록 (로그인 tr_box_21~, 메인 공지 tr_box_21~28, 메인 수업공지 tr_box_31)
    '.hm-notice :is([id^="tr_box_2"], #tr_box_31) tr { border-bottom: 1px solid #E6E8EA; align-items: baseline; gap: 12px; }',
    '.hm-notice :is([id^="tr_box_2"], #tr_box_31) td:first-child { flex: 1 1 auto; min-width: 0; }',
    '.hm-notice :is([id^="tr_box_2"], #tr_box_31) td:last-child { flex: none; }',
    '.hm-notice :is([id^="tr_box_2"], #tr_box_31) div { width: auto !important; height: auto !important; padding: 0 !important; line-height: 1.5 !important; overflow: visible !important; white-space: normal !important; }',
    '.hm-notice :is([id^="tr_box_2"], #tr_box_31) a { display: block !important; padding: 12px 0; font-size: 16px !important; color: #131416 !important; text-decoration: none; }',
    '.hm-notice :is([id^="tr_box_2"], #tr_box_31) td:last-child, .hm-notice :is([id^="tr_box_2"], #tr_box_31) td:last-child * { font-size: 13px !important; color: #6D7882 !important; font-variant-numeric: tabular-nums; }',
    '.hm-notice :is([id^="tr_box_2"], #tr_box_31) td:last-child a { min-height: 44px; }',

    // 식단
    // 식단: 옮겨 온 칸 자체도 블록으로 (표 칸이면 식당 탭 폭만큼 늘어나 카드 밖으로 넘침 — S24에서 확인)
    '.hm-food > td { display: block !important; }',
    '.hm-food div[style*="height"] { width: auto !important; height: auto !important; border: 0 !important; overflow: visible !important; }',
    '.hm-food table { width: 100% !important; height: auto !important; background: none !important; table-layout: fixed; }',
    '.hm-food td { width: auto !important; height: auto !important; background: none !important; }',
    '.hm-food tr { height: auto !important; }',
    '.hm-food #tr_box_11 { height: auto !important; background: none !important; }',
    // 메뉴 표(아침·점심·저녁)만 표로 두고, 나머지 배치용 표는 줄을 가로로 나눠 담음.
    // !important를 안 써서 원래 스크립트의 숨김(id 규칙·인라인 display)은 그대로 이김
    '.hm-food table:not(:has(> tbody > tr > .cls_td_food_text)), .hm-food table:not(:has(> tbody > tr > .cls_td_food_text)) > tbody { display: block; width: 100% !important; table-layout: auto; }',
    '.hm-food table:not(:has(> tbody > tr > .cls_td_food_text)) > tbody > tr { display: flex; flex-wrap: wrap; width: 100% !important; }',
    '.hm-food table:not(:has(> tbody > tr > .cls_td_food_text)) > tbody > tr > td { display: block; flex: 1 1 0%; min-width: 0 !important; }',
    // 식당 탭: 줄어들면 글자가 겹치므로 줄어들지 않게 하고, 넘치면 다음 줄로 (옆으로 밀면 뒤쪽 식당이 안 보임)
    '.hm-food tr[height="24"] > td { flex: none !important; width: auto !important; }',
    '.hm-food tr[height="24"] { display: flex !important; flex-wrap: wrap !important; border-bottom: 1px solid #CDD1D5; margin: 0 0 8px; }',
    '.hm-food a.hm-tab { font-size: 16px !important; padding: 0 10px; }',
    '.hm-food .cls_td_food_title, .hm-food .FoodTitle { font-size: 15px !important; height: auto !important; min-height: 44px; padding: 12px 2px !important; line-height: 1.4; }',
    '.hm-food .cls_td_food_text, .hm-food .cls_td_food_text * { font-size: 16px !important; line-height: 1.5 !important; color: #464C53 !important; }',

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
    'html.hm-on .hm-fit iframe.hm-fw { width: 100% !important; }', // width="690" 같은 칸: auto면 300px로 줄어듦 (패널티 창의 벌점 목록)
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
    'html.hm-on .hm-img-proxy { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; margin: 2px; padding: 0 14px; white-space: nowrap;',
    '  border: 1px solid #CDD1D5; border-radius: 6px; background: #FFFFFF; color: #131416; font: 700 16px/1.3 ' + FONT + '; cursor: pointer; }',
    'html.hm-on .hm-fit a:has(> img:only-child) { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; }',
    'html.hm-on .hm-fit a.hm-labeled { display: inline-flex !important; align-items: center; justify-content: center; min-height: 44px; padding: 0 12px;',
    '  margin: 2px; border: 1px solid #CDD1D5; border-radius: 6px; background: #FFFFFF; color: #131416 !important; text-decoration: none !important; white-space: nowrap; }',
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

    // F5 게시판: 분류·검색 줄 + 공지 카드 (위 2px 검정 선, 줄 사이 1px — DESIGN 게시판 규칙)
    'html.hm-on .hm-board-tools { display: flex; flex-direction: column; gap: 8px; margin: 0 0 16px; }',
    'html.hm-on .hm-board-tools form { margin: 0 !important; }',
    'html.hm-on .hm-board-tools select { width: 100% !important; }',
    'html.hm-on .hm-board-tools form[name="form_s"] table, html.hm-on .hm-board-tools form[name="form_s"] tbody { display: block !important; width: 100% !important; }',
    'html.hm-on .hm-board-tools form[name="form_s"] tr { display: flex !important; flex-wrap: wrap; align-items: center; gap: 8px; }',
    'html.hm-on .hm-board-tools form[name="form_s"] td { display: block !important; width: auto !important; padding: 0 !important; }',
    'html.hm-on .hm-board-tools form[name="form_s"] td:has(input[type="text"]) { flex: 1 1 140px; min-width: 0; }', // 검색 뒤 "검색 취소"가 붙으면 버튼은 다음 줄로
    'html.hm-on .hm-board-tools form[name="form_s"] input[type="text"] { width: 100% !important; }',
    'html.hm-on .hm-board-tools form[name="form_s"] select { width: auto !important; }',
    'html.hm-on .hm-posts { margin: 0 0 16px; border-top: 2px solid #131416; }',
    'html.hm-on .hm-post { padding: 14px 4px; border-bottom: 1px solid #E6E8EA; cursor: pointer; }',
    'html.hm-on .hm-post-fixed { background: #F4F5F6; }',
    'html.hm-on .hm-post-note { cursor: default; text-align: center; color: #464C53; }',
    'html.hm-on .hm-content .hm-post-badge { display: inline-block; margin: 0 0 4px; padding: 2px 8px; border-radius: 4px; background: #ECF2FE;',
    '  color: #0B50D0; font-size: 13px !important; font-weight: 700; line-height: 1.4 !important; }',
    'html.hm-on .hm-content .hm-post-title, html.hm-on .hm-content .hm-post-title * { font-size: 17px !important; line-height: 1.45 !important; }',
    'html.hm-on .hm-post-title a { display: block; min-height: 44px; color: #131416 !important; text-decoration: none !important; }',
    'html.hm-on .hm-post-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 12px; margin: 4px 0 0; }',
    'html.hm-on .hm-content .hm-post-meta, html.hm-on .hm-content .hm-post-meta * { font-size: 13px !important; line-height: 1.4 !important; color: #6D7882 !important; font-variant-numeric: tabular-nums; }',
    'html.hm-on .hm-post-meta div { display: inline !important; }',
    'html.hm-on .hm-post-label { margin: 0 4px 0 0; }',
    'html.hm-on .hm-post-files { display: inline-flex; align-items: center; gap: 2px; }',
    'html.hm-on .hm-post-files .hm-icon { width: 16px; height: 16px; stroke-width: 1.8; }',
    // 글 읽기 머리 (제목 | 날짜 / 글쓴이·조회 | 분류·번호): 칸을 줄 바꿈 되는 한 줄로, 제목은 한 줄 전체 (S24에서 날짜가 세 줄로 쪼개졌음)
    'html.hm-on .hm-content td.listTitleBorder > table, html.hm-on .hm-content td.listTitleBorder > table > tbody { display: block !important; width: 100% !important; }',
    'html.hm-on .hm-content td.listTitleBorder > table > tbody > tr { display: flex !important; flex-wrap: wrap; gap: 0 16px; }',
    'html.hm-on .hm-content td.listTitleBorder > table > tbody > tr > td { display: block !important; width: auto !important; flex: 0 1 auto; padding: 0 !important; }',
    'html.hm-on .hm-content td.listTitleBorder > table > tbody > tr > td[width="83%"] { flex: 1 1 100%; }',
    'html.hm-on .hm-content td.listTitleBorder .readText { text-align: left !important; padding: 8px 0 !important; }',
    'html.hm-on .hm-content td.listTitleBorder .readText span { display: inline-block; margin-right: 8px !important; }',
    'html.hm-on .hm-content td.listTitleBorder td[width="83%"] .readText span:last-child { display: inline; font-size: 18px !important; line-height: 1.45 !important; }',
    // 글 읽기: 첨부 줄 (첨부 #1 · 파일 이름 링크)
    'html.hm-on .tdAttach table, html.hm-on .tdAttach tbody { display: block !important; width: 100% !important; }',
    'html.hm-on .tdAttach tr { display: flex !important; flex-wrap: wrap; align-items: center; gap: 0 8px; padding: 4px 0; }',
    'html.hm-on .tdAttach td { display: block !important; width: auto !important; padding: 0 !important; }',
    'html.hm-on .hm-content .tdAttach a { display: inline-flex; align-items: center; min-height: 44px; color: #0B50D0 !important; overflow-wrap: anywhere; }',
    'html.hm-on .hm-content .tdAttach .spnSize, html.hm-on .hm-content .tdAttach .spnSize * { font-size: 13px !important; color: #6D7882 !important; margin-left: 4px; }',

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

  // F4 메인 화면: 위쪽 바·서랍은 공통 틀(hm-frame)과 같이 쓰고, 상자들은 카드로
  var CSS_MAIN = [
    // 원래 980px 표들: 한 열로. 남은 칸(팝업존·학사달력)은 카드 모양, 빈 칸은 숨김(hm-spacer)
    'html.hm-on.hm-p-main body > table:not(.hm-foot), html.hm-on.hm-p-main body > table:not(.hm-foot) > tbody,',
    'html.hm-on.hm-p-main body > table:not(.hm-foot) > tbody > tr, html.hm-on.hm-p-main body > table:not(.hm-foot) > tbody > tr > td:not(.hm-spacer) {',
    '  display: block !important; width: auto !important; height: auto !important; min-width: 0 !important; padding: 0 !important; background: none !important; }',
    'html.hm-on .hm-home-box { box-sizing: border-box; margin: 0 16px 12px !important; padding: 16px !important; background: #FFFFFF !important; border: 1px solid #CDD1D5; border-radius: 8px; }',
    'html.hm-on .hm-home-box table, html.hm-on .hm-home-box tbody { display: block !important; width: 100% !important; height: auto !important; background: none !important; }',
    'html.hm-on .hm-home-box tr, html.hm-on .hm-home-box td { display: block !important; width: auto !important; height: auto !important; background: none !important; }',
    'html.hm-on .hm-home-box img { max-width: 100% !important; height: auto !important; }',
    'html.hm-on .hm-home-box a:has(> img:only-child):not(.hm-dot) { display: block; }', // 팝업존 그림 링크가 글자 줄 높이(12px)로 잡히지 않게
    'html.hm-on .hm-home-box :is(td, div, a, b, font, span, p) { font-size: 16px !important; line-height: 1.5 !important; }',
    'html.hm-on .hm-home-box iframe { display: block; max-width: 100% !important; margin: 0 auto; border: 0; }',
    // 팝업존 번호 버튼 (초록 점 = 지금 보이는 것)
    'html.hm-on .hm-home-box div:has(> a.hm-dot) { display: flex !important; justify-content: center; gap: 8px; padding: 8px 0 !important; }',
    'html.hm-on a.hm-dot { display: inline-flex !important; align-items: center; justify-content: center; width: 44px; height: 44px; border: 1px solid #CDD1D5; border-radius: 999px;',
    '  background: #FFFFFF; color: #131416 !important; font: 400 16px/1 ' + FONT + '; text-decoration: none !important; }',
    'html.hm-on a.hm-dot:has(> img[src*="green"]) { background: #256EF4; border-color: #256EF4; color: #FFFFFF !important; font-weight: 700; }',

    '.hm-home { box-sizing: border-box; padding: 16px 16px 0; font-family: ' + FONT + '; font-size: 17px; line-height: 1.55; color: #131416; }',
    '.hm-home * { box-sizing: border-box; }',
    '.hm-home-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 0 0 8px; }',
    '.hm-home-head .hm-card-title { margin: 0 !important; }',
    'html.hm-on .hm-home-head a.hm-labeled { display: inline-flex; align-items: center; min-height: 44px; padding: 0 4px; font-size: 15px; color: #0B50D0 !important; text-decoration: none !important; }',
    // 장식 그림 (제목 그림은 카드 제목이 대신함)
    '.hm-home img[src*="title_notice"], .hm-home img[src*="title_kyominfo."], .hm-home img[src*="boxbottom"], .hm-home img[src*="box_dot"], .hm-home img[src*="searchbar_left"] { display: none !important; }',

    // 카드 안 배치용 표는 세로로 (식단 카드는 위 .hm-food 규칙을 따름)
    '.hm-home .hm-card:not(.hm-food) table, .hm-home .hm-card:not(.hm-food) tbody { display: block !important; width: 100% !important; height: auto !important; background: none !important; }',
    '.hm-home .hm-card:not(.hm-food):not(.hm-notice) tr:not(:has(> td[id^="td_box"])), .hm-home .hm-card:not(.hm-food):not(.hm-notice) td { display: block !important; width: auto !important; height: auto !important; background: none !important; }',
    '.hm-home .hm-card td, .hm-home .hm-card div, .hm-home .hm-card span, .hm-home .hm-card font, .hm-home .hm-card b, .hm-home .hm-card p { font-size: 16px; line-height: 1.5; }',
    // 탭 줄 (상자마다 td_box숫자): 넘치면 다음 줄로 (옆으로 밀면 뒤쪽 탭이 안 보여 놓치기 쉬움)
    '.hm-home tr:has(> td[id^="td_box"]) { display: flex !important; flex-wrap: wrap !important; border-bottom: 1px solid #CDD1D5; margin: 0 0 4px; }',
    '.hm-home tr:has(> td[id^="td_box"]) > td { display: block !important; flex: none !important; width: auto !important; height: auto !important; padding: 0 !important; background: none !important; }',
    '.hm-home a.hm-tab { font-size: 16px !important; padding: 0 10px; }',
    // 아침·점심·저녁을 세로로 (PRD F4, 로그인 화면 식단도 같이): 제목 줄과 메뉴 줄을 grid 순서로 짝지음 (노드는 그대로).
    // 코너 이름 줄(든든한동 등)도 같은 칸 이름을 쓰지만 링크가 있어서 :not(:has(a))로 뺌
    '.hm-food table:has(> tbody > tr > .cls_td_food_title):not(:has(.cls_td_food_title a)) { display: grid !important; grid-template-columns: 1fr; width: 100% !important; }',
    // 식단 표를 담은 칸(바로 아래 또는 div 한 겹 아래)은 한 줄 전체 폭으로
    // (:has 안에 :has를 못 넣음. 아침·점심·저녁 제목은 td.cls_td_food_title, 코너 이름(든든한동 등)은 div.cls_td_food_title라서 td로 구별)
    '.hm-food td:has(td.cls_td_food_title) { display: block !important; flex: 1 1 100% !important; width: 100% !important; }',
    '.hm-food table:has(> tbody > tr > .cls_td_food_title):not(:has(.cls_td_food_title a)) > tbody, .hm-food table:has(> tbody > tr > .cls_td_food_title):not(:has(.cls_td_food_title a)) > tbody > tr { display: contents !important; }',
    '.hm-food table:has(> tbody > tr > .cls_td_food_title):not(:has(.cls_td_food_title a)) > tbody > tr > td:only-child { display: none !important; }',
    '.hm-food table:has(> tbody > tr > .cls_td_food_title):not(:has(.cls_td_food_title a)) > tbody > tr:first-child > td:nth-child(1) { order: 1; }',
    '.hm-food table:has(> tbody > tr > .cls_td_food_title):not(:has(.cls_td_food_title a)) > tbody > tr:last-child > td:nth-child(1) { order: 2; }',
    '.hm-food table:has(> tbody > tr > .cls_td_food_title):not(:has(.cls_td_food_title a)) > tbody > tr:first-child > td:nth-child(2) { order: 3; }',
    '.hm-food table:has(> tbody > tr > .cls_td_food_title):not(:has(.cls_td_food_title a)) > tbody > tr:last-child > td:nth-child(2) { order: 4; }',
    '.hm-food table:has(> tbody > tr > .cls_td_food_title):not(:has(.cls_td_food_title a)) > tbody > tr:first-child > td:nth-child(3) { order: 5; }',
    '.hm-food table:has(> tbody > tr > .cls_td_food_title):not(:has(.cls_td_food_title a)) > tbody > tr:last-child > td:nth-child(3) { order: 6; }',
    '.hm-food table:has(> tbody > tr > .cls_td_food_title):not(:has(.cls_td_food_title a)) .cls_td_food_title { display: block !important; min-height: 0 !important; padding: 12px 0 4px !important; border-top: 1px solid #E6E8EA;',
    '  text-align: left !important; font-size: 16px !important; font-weight: 700; color: #131416 !important; }',
    '.hm-food table:has(> tbody > tr > .cls_td_food_title):not(:has(.cls_td_food_title a)) > tbody > tr:last-child > td { display: block !important; padding: 0 0 8px !important; text-align: left !important; }',
    // 입력 칸
    'html.hm-on .hm-home select, html.hm-on .hm-home input[type="text"] { min-height: 44px !important; height: auto !important; min-width: 64px; max-width: 100% !important;',
    '  margin: 2px 0; padding: 0 8px; font-size: 16px !important; border: 1px solid #CDD1D5 !important; border-radius: 6px; background: #FFFFFF; box-sizing: border-box !important; }',
    'html.hm-on .hm-home .hm-card button:not(.hm-ui), html.hm-on .hm-home .hm-card input[type="button"], html.hm-on .hm-home .hm-card input[type="submit"] {',
    '  min-height: 44px !important; height: auto !important; padding: 0 14px !important; font-size: 16px !important; }', // 연락처 검색 버튼 등
    'html.hm-on .hm-home .hm-card a.hm-labeled:not(.hm-tab):not(.hm-home-head a) { display: inline-flex !important; align-items: center; justify-content: center; min-height: 44px; padding: 0 12px;',
    '  margin: 2px; border: 1px solid #CDD1D5; border-radius: 6px; background: #FFFFFF; color: #131416 !important; font-size: 15px; text-decoration: none !important; white-space: nowrap; flex: none; }',
    '.hm-notice-search td:has(a) { flex: none; }',

    // 공지 검색
    '.hm-notice-search { margin: 0 0 8px; }',
    '.hm-notice-search tr { align-items: center; gap: 8px; }',
    '.hm-notice-search td:has(input) { flex: 1 1 auto; min-width: 0; }',
    'html.hm-on .hm-notice-search input[type="text"] { width: 100% !important; height: 48px !important; }',

    // 나의수업: 과목 한 줄 = 과목명(강의계획서) + 출결 버튼
    // 메인 공지·수업공지: 날짜를 제목 아래 줄로 (날짜 링크는 제목과 같은 글로 가는 두 번째 링크)
    '.hm-home .hm-notice :is([id^="tr_box_2"], #tr_box_31) tr { flex-direction: column; align-items: stretch; gap: 0; }',
    '.hm-home .hm-notice :is([id^="tr_box_2"], #tr_box_31) td:first-child a { padding: 12px 0 2px; }',
    '.hm-home .hm-notice :is([id^="tr_box_2"], #tr_box_31) td:last-child a { min-height: 0; padding: 0 0 12px; }',
    '.hm-class [id^="tr_box_"] div { width: auto !important; height: auto !important; background: none !important; overflow: visible !important; }',
    '.hm-class #div_box_1 > div { display: flex !important; flex-wrap: wrap; align-items: center; gap: 0 8px; min-height: 48px; padding: 2px 0 !important;',
    '  border-bottom: 1px solid #E6E8EA; font-size: 16px !important; color: #6D7882; font-variant-numeric: tabular-nums; }',
    // 과목명·출결을 첫 줄에, 과목 코드(글자)는 둘째 줄에 (글자 칸은 순서를 못 바꾸므로 링크 쪽을 앞으로)
    '.hm-class #div_box_1 > div > a { order: -1; }',
    '.hm-class #div_box_1 > div > a:not(.hm-labeled) { flex: 1 1 calc(100% - 96px); min-width: 0; display: inline-flex; align-items: center; min-height: 44px;',
    '  font-size: 17px !important; color: #131416 !important; text-decoration: none !important; }',
    '.hm-class #div_box_1 > div > img { order: -2; }',
    '.hm-class form[name="form_box1"] { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin: 8px 0; }'
  ].join('\n');

  // F6 신청&예약: 시설예약 화면(hm-frame) + 달력 칸(hm-p-bkcal) + 안내 칸·패널티 창(hm-p-plain)
  var CSS_BOOK = [
    // 바로가기 앵커(#viewCC)로 내려갈 때 위쪽 바에 가리지 않게
    'html.hm-on.hm-frame a[name] { scroll-margin-top: 64px; }',
    'html.hm-on .hm-content iframe#calFrame, html.hm-on .hm-content iframe#infoFrame { display: block; width: 100% !important; max-width: 100% !important; }',
    // 분류 탭 4개: 2×2 버튼
    'html.hm-on .hm-bk-tabs, html.hm-on .hm-bk-tabs > tbody { display: block !important; width: auto !important; }',
    'html.hm-on .hm-bk-tabs > tbody > tr { display: grid !important; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 0 16px; }',
    'html.hm-on .hm-bk-tabs > tbody > tr > td { display: block !important; width: auto !important; }',
    'html.hm-on .hm-fit .hm-bk-tabs a.hm-labeled { display: flex !important; width: 100%; margin: 0; box-sizing: border-box; }',
    // 시설 묶음: 묶음마다 카드 (이름·패널티 표시 / 시설 버튼들)
    'html.hm-on .hm-bk-list, html.hm-on .hm-bk-list > tbody, html.hm-on .hm-bk-list > tbody > tr, html.hm-on .hm-bk-list > tbody > tr > td {',
    '  display: block !important; width: auto !important; height: auto !important; padding: 0 !important; background: none !important; }',
    'html.hm-on .hm-bk-list > tbody > tr > td:empty, html.hm-on .hm-bk-list > tbody > tr:has(> td > img[src*="/booking/line"]) { display: none !important; }',
    'html.hm-on .hm-bk-group { display: block !important; width: auto !important; margin: 0 0 12px; padding: 16px; border: 1px solid #CDD1D5; border-radius: 8px; background: #FFFFFF; box-sizing: border-box; }',
    'html.hm-on .hm-bk-group > tbody, html.hm-on .hm-bk-group > tbody > tr { display: block !important; }',
    'html.hm-on .hm-bk-group > tbody > tr > td { display: block !important; width: auto !important; padding: 0 !important; text-align: left !important; }',
    'html.hm-on .hm-bk-group > tbody > tr > td:not(.hm-bk-name):not(.hm-bk-btns) { display: none !important; }', // 세로줄 그림 칸
    'html.hm-on .hm-bk-name { margin: 0 0 12px !important; }',
    'html.hm-on .hm-bk-name strong { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }',
    'html.hm-on .hm-content .hm-bk-name strong { font-size: 18px !important; font-weight: 700; color: #131416; }',
    'html.hm-on .hm-content .hm-bk-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #F4F5F6; color: #6D7882; font-size: 13px !important; font-weight: 400; line-height: 1.4 !important; }',
    'html.hm-on .hm-content .hm-bk-name a.hm-labeled { margin: 0; font-size: 15px !important; font-weight: 400; }',
    'html.hm-on .hm-bk-btns table, html.hm-on .hm-bk-btns tbody { display: block !important; width: auto !important; }',
    'html.hm-on .hm-bk-btns > table > tbody > tr { display: flex !important; flex-wrap: wrap; gap: 8px; }',
    'html.hm-on .hm-bk-btns > table > tbody > tr > td { display: none !important; }',
    'html.hm-on .hm-bk-btns > table > tbody > tr > td:has(> table) { display: block !important; width: auto !important; flex: 1 1 auto; }',
    'html.hm-on .hm-bk-btns td:has(> table) > table > tbody > tr { display: block !important; }',
    'html.hm-on .hm-bk-btns td[id$="_left"], html.hm-on .hm-bk-btns td[id$="_right"] { display: none !important; }',
    'html.hm-on .hm-bk-btns td[id$="_center"] { display: block !important; width: auto !important; height: auto !important; padding: 0 !important; background: none !important; }',
    'html.hm-on .hm-content .hm-bk-btns td[id$="_center"] > a { display: flex !important; align-items: center; justify-content: center; box-sizing: border-box; min-height: 48px; padding: 4px 14px;',
    '  border: 1px solid #CDD1D5; border-radius: 6px; background: #FFFFFF; color: #131416 !important; font-size: 16px !important; text-align: center; text-decoration: none !important; }',
    // 고른 시설: 원래 스크립트(changeBtnImg)가 배경 그림을 tab_btn02로 바꿈 → 파랑
    'html.hm-on .hm-content .hm-bk-btns td[id$="_center"][style*="tab_btn02"] > a { border-color: #256EF4; background: #ECF2FE; color: #0B50D0 !important; font-weight: 700; }',
    'html.hm-on .hm-content #div_Point div[id^="ln_"] { text-align: left !important; }',
    'html.hm-on .hm-bk-stack { display: flex !important; flex-direction: column; }',
    'html.hm-on .hm-bk-stack > #caledar, html.hm-on .hm-bk-stack > a[name="viewCC"] { order: 1; }',
    'html.hm-on .hm-bk-stack > #div_Point { order: 2; margin: 16px 0 0; }',

    // 안내 칸·패널티 창: 문서 하나를 폭 맞춤 (fitWidth)
    'html.hm-on.hm-p-plain { overflow-x: hidden !important; }',
    'html.hm-on.hm-p-plain body { margin: 0 !important; padding: 16px !important; min-width: 0 !important; width: auto !important; background: #FFFFFF !important;',
    '  font-family: ' + FONT + '; color: #131416; overflow-wrap: anywhere; }',
    'html.hm-on.hm-p-plain.hm-in-frame body { padding: 8px 0 !important; }',
    'html.hm-on.hm-p-plain td[background], html.hm-on.hm-p-bkcal td[background] { background-image: none !important; }',
    'html.hm-on.hm-p-plain td[width="28"], html.hm-on.hm-p-plain td[width="32"] { width: 0 !important; }', // 장식 테두리용 빈 칸
    // 첫 줄의 빈 칸에 폭이 없는 표도 있어서(패널티 창) 고정 배치면 빈 칸이 절반을 차지함 → 내용대로
    'html.hm-on.hm-p-plain table.hm-fw { table-layout: auto; }',

    // 달력 칸 (PSTU420C)
    'html.hm-on.hm-p-bkcal { overflow-x: hidden !important; }',
    'html.hm-on.hm-p-bkcal body { margin: 0 !important; padding: 0 0 8px !important; min-width: 0 !important; width: auto !important; background: #FFFFFF !important;',
    '  font-family: ' + FONT + '; color: #131416; }',
    // 두 달 달력: [이전 두 달][다음 두 달] / 달력 / 달력
    'html.hm-on .hm-bk-months, html.hm-on .hm-bk-months > tbody { display: block !important; width: 100% !important; height: auto !important; }',
    'html.hm-on .hm-bk-months > tbody > tr:first-child { display: none !important; }',
    'html.hm-on .hm-bk-months > tbody > tr:last-child { display: grid !important; grid-template-columns: 1fr 1fr; gap: 8px; }',
    'html.hm-on .hm-bk-months > tbody > tr:last-child > td { display: block !important; width: auto !important; }',
    'html.hm-on .hm-bk-months > tbody > tr:last-child > td:empty { display: none !important; }',
    'html.hm-on .hm-bk-months td:has(> a > img[src*="prev_btn"]) { order: 1; }',
    'html.hm-on .hm-bk-months td:has(> a > img[src*="next_btn"]) { order: 2; text-align: right; }',
    'html.hm-on .hm-bk-months > tbody > tr:last-child > td:has(> table) { order: 3; grid-column: 1 / -1; margin: 8px 0 0; }',
    'html.hm-on .hm-fit .hm-bk-months a.hm-labeled { display: flex !important; width: 100%; margin: 0; box-sizing: border-box; }',
    'html.hm-on .hm-bk-months td > font, html.hm-on .hm-bk-months td > font * { font-size: 18px !important; }',
    'html.hm-on .hm-bk-months table { width: 100% !important; margin: 4px 0 0; table-layout: fixed; }',
    'html.hm-on .hm-bk-months table td { width: auto !important; height: 44px !important; padding: 2px !important; font-variant-numeric: tabular-nums; }',
    'html.hm-on .hm-bk-months table tr:first-child td, html.hm-on .hm-bk-months table tr:first-child td * { font-size: 13px !important; }',
    // 누를 수 있는 날(예약 가능한 날)은 파란 칸
    'html.hm-on .hm-fit .hm-bk-months table td > a { display: flex; align-items: center; justify-content: center; width: 100%; min-width: 0; height: 100%; min-height: 40px;',
    '  border-radius: 4px; background: #ECF2FE; text-decoration: none !important; }',
    'html.hm-on .hm-bk-months table td > a, html.hm-on .hm-bk-months table td > a * { color: #0B50D0 !important; }',
    // 고른 날짜·남은 시간 요약: 이름 | 값 두 칸
    'html.hm-on.hm-p-bkcal td[background*="table_info_bg"] { height: auto !important; padding: 12px 16px !important; border-radius: 8px; background-color: #F4F5F6 !important; }',
    'html.hm-on .hm-bk-sum { display: grid !important; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px; width: 100% !important; }',
    'html.hm-on .hm-bk-sum > tbody, html.hm-on .hm-bk-sum > tbody > tr { display: contents !important; }',
    'html.hm-on .hm-bk-sum td { display: block !important; width: auto !important; height: auto !important; text-align: left !important; }',
    'html.hm-on .hm-bk-sum td:empty { display: none !important; }',
    'html.hm-on .hm-bk-sum > tbody > tr:first-child > td { grid-column: 1 / -1; margin: 0 0 4px; }',
    'html.hm-on .hm-bk-sum > tbody > tr:nth-child(3) > td:nth-child(1) { order: 1; }',
    'html.hm-on .hm-bk-sum > tbody > tr:nth-child(5) > td:nth-child(1) { order: 2; }',
    'html.hm-on .hm-bk-sum > tbody > tr:nth-child(3) > td:nth-child(3) { order: 3; }',
    'html.hm-on .hm-bk-sum > tbody > tr:nth-child(5) > td:nth-child(3) { order: 4; }',
    'html.hm-on .hm-bk-sum > tbody > tr:nth-child(3) > td:nth-child(5) { order: 5; }',
    'html.hm-on .hm-bk-sum > tbody > tr:nth-child(5) > td:nth-child(5) { order: 6; }',
    'html.hm-on .hm-bk-sum > tbody > tr:nth-child(3) > td, html.hm-on .hm-bk-sum > tbody > tr:nth-child(3) > td * { font-size: 14px !important; font-weight: 400 !important; color: #6D7882; }',
    'html.hm-on .hm-bk-sum > tbody > tr:nth-child(5) > td { text-align: right !important; white-space: nowrap; font-variant-numeric: tabular-nums; }',
    // [이전 10일][다음 10일] / 색 설명
    'html.hm-on .hm-bk-nav, html.hm-on .hm-bk-nav > tbody { display: block !important; width: 100% !important; }',
    'html.hm-on .hm-bk-nav > tbody > tr { display: flex !important; flex-wrap: wrap; align-items: center; gap: 8px; margin: 12px 0 0; }',
    'html.hm-on .hm-bk-nav > tbody > tr:not(:has(a)) { display: none !important; }',
    'html.hm-on .hm-bk-nav > tbody > tr > td { display: block !important; width: auto !important; }',
    'html.hm-on .hm-bk-nav > tbody > tr > td:last-child { margin-left: auto; }',
    'html.hm-on .hm-bk-nav > tbody > tr > td:not(:has(a)) { order: 3; flex: 1 1 100%; }',
    'html.hm-on .hm-bk-nav td:not(:has(a)) > table > tbody > tr { display: grid !important; grid-template-columns: 20px 1fr 20px 1fr; align-items: center; gap: 6px; }',
    'html.hm-on .hm-bk-nav td:not(:has(a)) > table > tbody > tr > td { display: block !important; width: auto !important; height: 20px !important; padding: 0 !important; line-height: 20px !important; }',
    'html.hm-on .hm-bk-nav td:not(:has(a)) > table > tbody > tr > td:nth-child(odd) { border: 1px solid #CDD1D5; border-radius: 4px; }',
    'html.hm-on .hm-bk-nav td:not(:has(a)) > table > tbody > tr > td table { display: none !important; }',
    'html.hm-on .hm-bk-nav td:not(:has(a)) > table > tbody > tr > td:nth-child(1) { background: #E6E8EA !important; }',
    'html.hm-on .hm-bk-nav td:not(:has(a)) > table > tbody > tr > td:nth-child(3) { background: #FFFFFF !important; }',
    'html.hm-on .hm-bk-nav td:not(:has(a)) > table > tbody > tr > td:nth-child(even), html.hm-on .hm-bk-nav td:not(:has(a)) > table > tbody > tr > td:nth-child(even) * { font-size: 14px !important; }',
    // 날짜 고르기 (우리 버튼, 하루씩 보이기만 바꿈): 5칸 × 2줄
    '.hm-bk-days { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin: 16px 0 12px; }',
    '.hm-bk-days button { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 0; min-height: 52px; margin: 0; padding: 4px 0;',
    '  border: 1px solid #CDD1D5; border-radius: 6px; background: #FFFFFF; color: #131416; font: 700 15px/1.25 ' + FONT + '; font-variant-numeric: tabular-nums; cursor: pointer; }',
    '.hm-bk-days small { font-size: 12px; font-weight: 400; color: #6D7882; }',
    '.hm-bk-days button.hm-bk-day-closed { background: #F4F5F6; color: #8A949E; font-weight: 400; }',
    '.hm-bk-days button[aria-pressed="true"] { border: 2px solid #256EF4; background: #ECF2FE; color: #0B50D0; font-weight: 700; }',
    '.hm-bk-days button[aria-pressed="true"] small { color: #0B50D0; }',
    'html.hm-on .hm-bk-grid > tbody > tr > td.hm-bk-day.hm-bk-off { display: none !important; }',
    // 시간표: 하루 = 카드, 시간 줄 = "06시" + 15분 칸 4개
    'html.hm-on .hm-bk-grid, html.hm-on .hm-bk-grid > tbody, html.hm-on .hm-bk-grid > tbody > tr { display: block !important; width: auto !important; }',
    'html.hm-on .hm-bk-grid > tbody > tr > td { display: none !important; }', // 시간 열·사이 칸 (시간은 줄마다 붙임)
    'html.hm-on .hm-bk-grid > tbody > tr > td.hm-bk-day { display: block !important; width: auto !important; margin: 0 0 12px; border: 1px solid #CDD1D5; border-radius: 8px; overflow: hidden; }',
    'html.hm-on .hm-bk-day > table, html.hm-on .hm-bk-day > table > tbody, html.hm-on .hm-bk-day > table > tbody > tr { display: block !important; width: auto !important; height: auto !important; background: none !important; }',
    'html.hm-on .hm-bk-day > table > tbody > tr:first-child > td { display: block !important; width: auto !important; padding: 12px 16px !important;',
    '  background: #F4F5F6 !important; text-align: left !important; font-size: 17px !important; font-weight: 700; }',
    'html.hm-on .hm-bk-day > table > tbody > tr:first-child > td br { display: none; }',
    'html.hm-on.hm-p-bkcal .hm-bk-closed-note { display: block; margin: 2px 0 0; font-size: 14px !important; font-weight: 400; color: #6D7882; }',
    'html.hm-on .hm-bk-closed > table > tbody > tr:not(:first-child) { display: none !important; }',
    'html.hm-on .hm-bk-day > table > tbody > tr:not(:first-child) > td { display: flex !important; align-items: center; gap: 8px; width: auto !important; height: auto !important;',
    '  padding: 6px 8px 6px 16px !important; border-top: 1px solid #E6E8EA; }',
    'html.hm-on.hm-p-bkcal .hm-bk-hour { flex: none; width: 44px; font-size: 16px !important; font-weight: 700; font-variant-numeric: tabular-nums; }',
    'html.hm-on .hm-bk-day td > table { display: grid !important; grid-template-columns: repeat(4, 1fr); gap: 4px; flex: 1 1 auto; width: auto !important; height: auto !important; background: none !important; }',
    'html.hm-on .hm-bk-day td > table > tbody, html.hm-on .hm-bk-day td > table > tbody > tr { display: contents !important; }',
    'html.hm-on .hm-bk-day td > table td[width="1"], html.hm-on .hm-bk-day td > table td[colspan] { display: none !important; }',
    // 15분 칸: 색은 원래 뜻 그대로 (회색 예약불가 · 흰색 예약가능 · 노랑 고른 칸 · 주황 타인예약 · 연두 내 예약)
    'html.hm-on .hm-bk-day td > table td { display: flex !important; align-items: center; justify-content: center; box-sizing: border-box; width: auto !important; height: auto !important; min-height: 44px;',
    '  border: 1px solid transparent; border-radius: 6px; background: #E6E8EA; color: #8A949E; font-size: 0 !important; }',
    'html.hm-on .hm-bk-day td > table td::before { font: 400 13px/1 ' + FONT + '; font-variant-numeric: tabular-nums; }',
    'html.hm-on .hm-bk-day td > table tr:first-child > td:nth-child(1)::before { content: ":00"; }',
    'html.hm-on .hm-bk-day td > table tr:first-child > td:nth-child(3)::before { content: ":15"; }',
    'html.hm-on .hm-bk-day td > table tr:last-child > td:nth-child(1)::before { content: ":30"; }',
    'html.hm-on .hm-bk-day td > table tr:last-child > td:nth-child(3)::before { content: ":45"; }',
    'html.hm-on .hm-bk-day td > table td.bookingactYes { background: #FFFFFF !important; border-color: #8A949E; color: #131416; cursor: pointer; }',
    'html.hm-on .hm-bk-day td > table td.bookingacton { background: #FFE699 !important; border: 2px solid #B88A00; color: #131416; }',
    'html.hm-on .hm-bk-day td > table td.bookingacton::before { font-weight: 700; }',
    'html.hm-on .hm-bk-day td > table td.bookingactNo { background: #FEB39A !important; color: #131416; }',
    'html.hm-on .hm-bk-day td > table td.bookingactNoMy { background: #C4E3AA !important; color: #131416; }',
    // 예약 신청 버튼: 큰 파란 버튼 (원래 그림 버튼을 대신 누름 → 확인 창·제출 그대로)
    'html.hm-on input[src*="/booking/btn_apply"] + .hm-img-proxy { display: flex; width: 100%; height: 56px; margin: 8px 0 0;',
    '  border: 0; border-radius: 8px; background: #256EF4; color: #FFFFFF; font-size: 17px; }'
  ].join('\n');

  // F7 수업정보 · F8 학사정보 · F11 출력 서류
  var CSS_STUDY = [
    // 과목 카드: 핵심 칸(학점·교수·시간·강의실·성적)은 2열로 크게, 나머지는 작게 또는 "자세히" 안에
    'html.hm-on .hm-cards-cap { margin: 8px 0 0; font-size: 17px; font-weight: 700; color: #131416; }',
    'html.hm-on .hm-cards-cap * { font-size: 17px !important; font-weight: 700 !important; color: #131416 !important; }',
    'html.hm-on .hm-crd-main { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; margin: 0 0 8px; }',
    'html.hm-on .hm-crd-main .hm-crd-field { display: flex; flex-direction: column; gap: 0; }',
    'html.hm-on .hm-content .hm-crd-main .hm-crd-value, html.hm-on .hm-content .hm-crd-main .hm-crd-value * { color: #131416; word-break: keep-all; overflow-wrap: anywhere; }',
    'html.hm-on .hm-crd-more > summary { display: flex; align-items: center; min-height: 44px; font-size: 16px; color: #0B50D0; cursor: pointer; }',
    'html.hm-on .hm-crd-more[open] > summary { margin: 0 0 4px; }',
    // 개설시간표 검색 칸: 이름 | 입력 칸을 한 줄씩, 확인은 맨 아래 큰 버튼
    'html.hm-on form.hm-csearch span.style1 { display: grid !important; grid-template-columns: 120px minmax(0, 1fr); align-items: center; gap: 8px; }',
    'html.hm-on form.hm-csearch span.style1 > select, html.hm-on form.hm-csearch span.style1 > input { width: 100% !important; min-width: 0 !important; box-sizing: border-box; }',
    'html.hm-on .hm-fit a.hm-csearch-go { display: flex !important; box-sizing: border-box; width: 100%; height: 48px; margin: 8px 0 16px; border-radius: 8px; background: #256EF4; }',
    'html.hm-on .hm-fit a.hm-csearch-go .hm-img-label { color: #FFFFFF !important; font-weight: 700; font-size: 17px !important; }',
    // 이름|값이 한 줄에 여러 쌍인 표(총 누적 성적 등): 두 쌍씩 한 줄로
    'html.hm-on table.hm-pairs, html.hm-on table.hm-pairs > tbody { display: block !important; width: 100% !important; }',
    'html.hm-on table.hm-pairs > tbody > tr { display: grid !important; height: auto !important; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1fr); }',
    'html.hm-on table.hm-pairs > tbody > tr.hm-pairs-cap { display: block !important; padding: 8px 0; font-weight: 700; }',
    'html.hm-on table.hm-pairs > tbody > tr > td { display: flex !important; align-items: center; justify-content: center; box-sizing: border-box;',
    '  width: auto !important; height: auto !important; min-width: 0 !important; min-height: 44px; padding: 6px 4px !important; word-break: keep-all; overflow-wrap: anywhere; }',

    // 내 시간표: 요일 탭 + 그날 수업 카드 (원래 표를 그대로 두고 보이는 칸만 바꿈)
    'html.hm-on .hm-tt-tabs { display: flex; margin: 0 0 12px; border-bottom: 1px solid #CDD1D5; }',
    'html.hm-on .hm-tt-tabs button { all: unset; box-sizing: border-box; flex: 1 1 0; min-width: 44px; min-height: 48px; text-align: center; cursor: pointer;',
    '  font: 17px/48px ' + FONT + '; color: #6D7882; border-bottom: 3px solid transparent; margin-bottom: -1px; }',
    'html.hm-on .hm-tt-tabs button.hm-tt-none { color: #B1B8BE; }',
    'html.hm-on .hm-tt-tabs button[aria-selected="true"] { color: #0B50D0; border-bottom-color: #256EF4; font-weight: 700; }',
    'html.hm-on .hm-tt-tabs button.hm-tt-all { flex: 1.6 1 0; }',
    'html.hm-on .hm-tt-tabs button:focus-visible { outline: 2px solid #256EF4; outline-offset: -2px; }',
    'html.hm-on .hm-tt-note { margin: 0 0 12px; padding: 12px 16px; border-radius: 8px; background: #F4F5F6; font-size: 16px; line-height: 1.5; color: #464C53; }',
    'html.hm-on table.hm-tt { display: block !important; width: 100% !important; border: 0 !important; }',
    'html.hm-on table.hm-tt > tbody { display: block !important; }',
    'html.hm-on table.hm-tt > tbody > tr { display: none !important; }',
    'html.hm-on table.hm-tt > tbody > tr.hm-tt-show { display: flex !important; gap: 12px; margin: 0 0 8px; padding: 12px 16px;',
    '  border: 1px solid #CDD1D5; border-radius: 8px; background: #FFFFFF; }',
    'html.hm-on table.hm-tt > tbody > tr.hm-tt-show > td { display: none !important; }',
    'html.hm-on table.hm-tt > tbody > tr.hm-tt-show > td:first-child, html.hm-on table.hm-tt > tbody > tr.hm-tt-show > td.hm-tt-sel {',
    '  display: block !important; width: auto !important; height: auto !important; padding: 0 !important; border: 0 !important; background: none !important; text-align: left !important; }',
    'html.hm-on table.hm-tt > tbody > tr.hm-tt-show > td:first-child { flex: 0 0 72px; }',
    'html.hm-on table.hm-tt > tbody > tr.hm-tt-show > td.hm-tt-sel { flex: 1 1 auto; min-width: 0; }',
    'html.hm-on table.hm-tt td:first-child > :not(.hm-ui) { display: none !important; }',
    'html.hm-on .hm-content table.hm-tt .hm-tt-p { display: block; font-size: 16px !important; font-weight: 700; line-height: 1.5 !important; color: #0B50D0; font-variant-numeric: tabular-nums; }',
    'html.hm-on .hm-content table.hm-tt td.hm-tt-sel a { display: block !important; min-height: 44px; text-decoration: none !important; }',
    // 과목 링크 뒤에 붙은 빈 링크 (위 a 규칙보다 우선순위가 높아야 함 — 낮으면 44px 빈칸이 남음, S24에서 발견)
    'html.hm-on .hm-content table.hm-tt td.hm-tt-sel a:not(:has(*)), html.hm-on .hm-content table.hm-tt.hm-tt-week td a:not(:has(*)) { display: none !important; }',
    'html.hm-on .hm-content table.hm-tt td.hm-tt-sel a font { font-size: 16px !important; line-height: 1.5 !important; color: #464C53 !important; }',
    'html.hm-on .hm-content table.hm-tt td.hm-tt-sel a font:first-child { font-size: 17px !important; font-weight: 700; color: #131416 !important; }',
    // 일주일 전체: 폰 폭에 맞춘 작은 표 (과목명만, 3줄까지). 칸을 누르면 그 요일 보기
    'html.hm-on table.hm-tt.hm-tt-week { display: table !important; table-layout: fixed; border-collapse: collapse !important; }',
    'html.hm-on table.hm-tt.hm-tt-week > tbody { display: table-row-group !important; }',
    'html.hm-on table.hm-tt.hm-tt-week > tbody > tr { display: table-row !important; }',
    'html.hm-on table.hm-tt.hm-tt-week > tbody > tr.hm-tt-tail { display: none !important; }',
    'html.hm-on .hm-content table.hm-tt.hm-tt-week > tbody > tr > td { display: table-cell !important; width: auto !important; height: 44px !important; padding: 2px !important;',
    '  vertical-align: middle; border: 1px solid #E6E8EA !important; font-size: 13px !important; line-height: 1.3 !important; overflow: hidden; }',
    'html.hm-on .hm-content table.hm-tt.hm-tt-week > tbody > tr > td * { font-size: 13px !important; line-height: 1.3 !important; }',
    'html.hm-on .hm-content table.hm-tt.hm-tt-week > tbody > tr > td:first-child { width: 28px !important; }',
    'html.hm-on .hm-content table.hm-tt.hm-tt-week > tbody > tr:first-child > td { height: 32px !important; font-weight: 700; }',
    'html.hm-on .hm-content table.hm-tt.hm-tt-week > tbody > tr > td.hm-tt-today { background: #ECF2FE !important; }',
    'html.hm-on table.hm-tt.hm-tt-week.hm-tt-nosat > tbody > tr > td:nth-child(7) { display: none !important; }',
    'html.hm-on table.hm-tt.hm-tt-week tr:first-child > td:first-child > :not(.hm-ui) { display: none !important; }',
    'html.hm-on .hm-content table.hm-tt.hm-tt-week .hm-tt-p { font-size: 13px !important; color: #6D7882; text-align: center; }',
    'html.hm-on .hm-content table.hm-tt.hm-tt-week a { display: block !important; min-height: 0; text-decoration: none !important; }',
    'html.hm-on .hm-content table.hm-tt.hm-tt-week a > font ~ font, html.hm-on table.hm-tt.hm-tt-week a > br { display: none !important; }',
    'html.hm-on .hm-content table.hm-tt.hm-tt-week a > font:first-child { display: -webkit-box !important; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden;',
    '  font-size: 13px !important; line-height: 1.3 !important; color: #131416 !important; word-break: break-all; }',
    'html.hm-on .hm-content table.hm-tt.hm-tt-week td:has(a) { background: #F4F5F6 !important; cursor: pointer; }',

    // 출력 서류 창(F11): 위에 인쇄 버튼 (서류는 원래 모양 그대로 축소)
    'html.hm-on .hm-docbar { display: flex; gap: calc(8px * var(--hm-z, 1)); padding: calc(12px * var(--hm-z, 1)) calc(16px * var(--hm-z, 1)); margin: 0 0 calc(12px * var(--hm-z, 1));',
    '  background: #F4F5F6; border-bottom: 1px solid #CDD1D5; font-family: ' + FONT + '; }',
    'html.hm-on .hm-docbar button { all: unset; box-sizing: border-box; flex: 1 1 0; height: calc(48px * var(--hm-z, 1)); border-radius: calc(8px * var(--hm-z, 1)); text-align: center; cursor: pointer;',
    '  font: 700 calc(17px * var(--hm-z, 1))/calc(48px * var(--hm-z, 1)) ' + FONT + '; background: #FFFFFF; color: #131416; border: 1px solid #CDD1D5; }',
    'html.hm-on .hm-docbar button.hm-doc-print { flex: 2 1 0; background: #256EF4; color: #FFFFFF; border-color: #256EF4; }',
    'html.hm-on .hm-docbar button:focus-visible { outline: 2px solid #256EF4; outline-offset: 2px; }'
  ].join('\n');

  function addStyle() {
    var s = document.createElement('style');
    s.id = 'hm-style';
    s.textContent = CSS_BASE + '\n' + CSS_LOGIN + '\n' + CSS_FRAME + '\n' + CSS_MAIN + '\n' + CSS_BOOK + '\n' + CSS_STUDY;
    (document.head || root).appendChild(s);
  }

  // ---- F0 자동 정리 도구 ----

  // 줄 사이 장식선(내용 없는 한 칸 줄)
  function isSeparator(r) {
    return r.cells.length === 1 && !textOf(r) && !r.querySelector('img, input, a, select');
  }

  // 머리글 칸 이름: 줄바꿈으로 나뉜 글자를 이어 붙임 ("영<br>어" → "영어").
  // 한글 아래 영어 번역이 붙은 머리글("과목명<br>Course Title")은 한글만
  function headLabel(c) {
    var parts = [''];
    var w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    var n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 1) {
        if (n.tagName === 'BR') parts.push('');
      } else {
        parts[parts.length - 1] += n.nodeValue;
      }
    }
    parts = parts.map(function (s) { return s.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
    if (parts.length > 1 && /[가-힣]/.test(parts[0]) && !/[가-힣]/.test(parts.slice(1).join(''))) return parts[0];
    var allHangul = parts.every(function (s) { return /^[가-힣]+$/.test(s); });
    return parts.join(allHangul ? '' : ' ');
  }

  // 데이터 표인지: (표 제목 한 줄) + 머리글 한 줄 + 같은 칸 수의 줄들, 병합·입력 칸·속 표 없음 (PRD F0)
  function dataTableInfo(t) {
    if (t.querySelector('table')) return null;
    if (t.querySelector('input:not([type="hidden"]), select, textarea, button')) return null;
    if (t.querySelector('[rowspan]:not([rowspan="1"])')) return null;
    var rows = [].slice.call(t.rows).filter(function (r) { return !isSeparator(r); });
    var caption = null;
    // 맨 윗줄이 칸 전체를 덮는 제목("2026-1 학기 성적")이고 그 아래가 머리글인 표
    if (rows.length >= 3 && rows[0].cells.length === 1 && rows[1].cells.length >= 2 &&
        rows[0].cells[0].colSpan === rows[1].cells.length && textOf(rows[0])) {
      caption = rows.shift();
    }
    if (rows.length < 2) return null;
    var head = rows[0];
    var n = head.cells.length;
    if (n < 2) return null;
    var labels = [].map.call(head.cells, headLabel);
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
    return { head: head, body: body, labels: labels, caption: caption };
  }

  // 이름|값|이름|값… 이 한 줄에 여러 쌍인 표 (총 누적 성적 등): 이름 칸끼리 같은 배경색, 값 칸은 다른 색
  function pairTable(t) {
    if (t.querySelector('table, input:not([type="hidden"]), select, textarea, button, [rowspan]:not([rowspan="1"])')) return false;
    var rows = [].slice.call(t.rows).filter(function (r) { return !isSeparator(r); });
    if (rows.length && rows[0].cells.length === 1 && textOf(rows[0])) rows.shift(); // 표 제목 줄
    if (!rows.length || !rows[0].cells.length) return false; // 칸 없는 줄(<tr></tr>)이 있는 표 (등록금 납부 확인서 등)
    var bg = function (c) { return (c.getAttribute('bgcolor') || '').toLowerCase() + '|' + c.className.replace(/\bhm-\S+/g, '').trim(); };
    var labelBg = bg(rows[0].cells[0]);
    return rows.every(function (r) {
      var n = r.cells.length;
      if (n < 4 || n % 2) return false;
      for (var i = 0; i < n; i++) {
        var c = r.cells[i];
        if ((c.colSpan || 1) > 1) return false;
        if ((i % 2 === 0) !== (bg(c) === labelBg)) return false;
        if (i % 2 === 0 && !textOf(c)) return false;
      }
      return true;
    });
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
  // opts.main: 이 머리글 칸은 제목 아래 2열로 크게 (과목 카드) / opts.more: 나머지 칸은 "자세히" 안에
  function cardify(t, info, F, opts) {
    opts = opts || {};
    var titleIdx = pickTitleColumn(info);
    var list = el('div', 'hm-cards');
    t.parentNode.insertBefore(list, t); // 같은 폼 안에 남도록 표 바로 앞에
    F.created.push(list);
    t.classList.add('hm-orig-hidden', 'hm-carded');
    if (info.caption) {
      var cap = el('div', 'hm-cards-cap');
      moveChildren(info.caption.cells[0], cap, F.name);
      list.appendChild(cap);
    }
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
      var main = el('div', 'hm-crd-main');
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
        (opts.main && opts.main.test(info.labels[i]) ? main : fields).appendChild(f);
      }
      if (main.firstChild) card.appendChild(main);
      if (fields.firstChild && opts.more) {
        var more = el('details', 'hm-crd-more');
        more.appendChild(el('summary', '', '자세히'));
        more.appendChild(fields);
        card.appendChild(more);
      } else if (fields.firstChild) {
        card.appendChild(fields);
      }
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
  // 고정 폭(width="753", style="width:750px") 풀기
  function unfixWidths(scope) {
    var all = scope.querySelectorAll('[width], [style*="width"]');
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      if (e.tagName === 'IMG' || e.tagName === 'INPUT' || e.closest('.hm-ui')) continue;
      var w = parseInt(e.getAttribute('width'), 10);
      var sw = /(^|;)\s*width\s*:\s*(\d+)px/i.exec(e.getAttribute('style') || '');
      if ((w && !/%/.test(e.getAttribute('width')) && w >= 120) || (sw && +sw[2] >= 120)) e.classList.add('hm-fw');
    }
  }

  // 카드로 바꾼 표(hm-carded)·화면별 코드가 직접 배치한 표(hm-own)는 자동 정리에서 뺌
  function handled(t) {
    return t.classList.contains('hm-carded') || t.classList.contains('hm-own') || t.classList.contains('hm-pairs');
  }

  function fitWidth(scope, F) {
    scope.classList.add('hm-fit');
    unfixWidths(scope);
    labelImageLinks(scope);
    markPagers(scope);

    var limit = function () {
      var r = scope.getBoundingClientRect();
      var cs = getComputedStyle(scope);
      return r.right - parseFloat(cs.paddingRight) + 1;
    };
    var tables = function () {
      return [].filter.call(scope.querySelectorAll('table'), function (t) {
        return !handled(t) && !t.closest('.hm-ui, .hm-own') && !isHidden(t);
      });
    };

    // 넓지 않아도 열이 4개 이상인 데이터 표는 카드로 (폰에서 칸이 너무 좁음). 이름|값 쌍 표는 두 쌍씩 한 줄로
    tables().forEach(function (t) {
      if (pairTable(t)) { // 첫 줄이 머리글처럼 보여도 이름|값 쌍이면 쌍 표로
        t.classList.add('hm-pairs');
        if (t.rows[0].cells.length === 1) t.rows[0].classList.add('hm-pairs-cap');
        return;
      }
      var info = dataTableInfo(t);
      if (info && info.labels.length >= 4) cardify(t, info, F);
    });

    // 칸이 너무 좁아 입력 칸·링크가 짓눌리거나 옆 칸으로 삐져나오는 배치용 표(한 줄짜리 검색 조건, 분류 탭 줄 등)는 세로로 쌓음
    [].forEach.call(scope.querySelectorAll('select, textarea, input[type="text"], input:not([type]), td > a, td > font > a'), function (c) {
      var t = c.closest('table');
      var cell = c.closest('td, th');
      if (!t || !cell || !scope.contains(t) || t.classList.contains('hm-block') || handled(t) || t.closest('.hm-own') || isHidden(c)) return;
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

  // ---- F5 게시판 (/myboard/list.php — Board= 무엇이든) ----
  // 머리글 칸 이름으로 역할을 정함. 모르는 머리글이 하나라도 있거나 번호·제목 칸이 없으면 손대지 않고 F0 자동 정리에 맡김
  // (게시판마다 칸이 다름: 보통 No·Subject·Files·Writer·Date·Read, 졸업은 Files 없음, 원클릭민원은 Category·Status)
  var BOARD_COLS = {
    no: /^(no|번호)$/i,
    subject: /^(subject|제목)$/i,
    files: /^(files?|첨부)$/i,
    writer: /^(writer|글쓴이|작성자)$/i,
    date: /^(date|날짜|작성일|등록일)$/i,
    read: /^(read|조회|조회수)$/i,
    category: /^(category|분류)$/i,
    status: /^(status|상태|처리상태)$/i
  };
  var BOARD_META = [['category', ''], ['date', ''], ['writer', ''], ['read', '조회'], ['status', '']]; // 제목 아래 작은 줄 순서

  function boardColumns(r) {
    if (r.cells.length < 4) return null;
    var cols = {};
    for (var i = 0; i < r.cells.length; i++) {
      var name = textOf(r.cells[i]);
      var role = null;
      for (var k in BOARD_COLS) {
        if (BOARD_COLS[k].test(name)) role = k;
      }
      if (!role || role in cols) return null;
      cols[role] = i;
    }
    return 'no' in cols && 'subject' in cols ? cols : null;
  }

  function boardList(content, F) {
    var head = null, cols = null;
    [].some.call(content.querySelectorAll('tr'), function (r) {
      cols = boardColumns(r);
      if (cols) head = r;
      return !!cols;
    });
    if (!head) return false;
    var n = head.cells.length;
    var t = head.closest('table');
    var list = el('div', 'hm-posts');
    t.parentNode.insertBefore(list, t);
    F.created.push(list);
    t.classList.add('hm-orig-hidden', 'hm-carded');
    [].forEach.call(t.rows, function (r) {
      if (r === head || getComputedStyle(r).display === 'none') return;
      var c = r.cells;
      if (c.length === 1) { // "자료가 없습니다" 같은 한 줄 안내
        if (!textOf(c[0])) return;
        var note = el('div', 'hm-post hm-post-note');
        moveChildren(c[0], note, F.name);
        list.appendChild(note);
        return;
      }
      var titleLink = c.length === n && c[cols.subject].querySelector('a[href]');
      if (!titleLink) return;
      var card = el('div', 'hm-post');
      // 고정 공지: 번호 칸이 숫자가 아님 ("고정공지"). 번호 칸 링크는 제목과 같은 곳이라 옮기지 않고 글자 표시만
      var no = textOf(c[cols.no]);
      if (no && !/^\d+$/.test(no)) {
        card.classList.add('hm-post-fixed');
        card.appendChild(el('span', 'hm-post-badge', no));
      }
      var title = el('div', 'hm-post-title');
      moveChildren(c[cols.subject], title, F.name);
      card.appendChild(title);
      // 분류 · 날짜 · 글쓴이 · 조회 · 처리 상태 · 첨부 (작게, 제목 아래 한 줄)
      var meta = el('div', 'hm-post-meta');
      BOARD_META.forEach(function (p) {
        var cell = p[0] in cols ? c[cols[p[0]]] : null;
        if (!cell || !textOf(cell)) return;
        var s = el('span', 'hm-post-field');
        if (p[1]) s.appendChild(el('span', 'hm-post-label', p[1]));
        moveChildren(cell, s, F.name);
        meta.appendChild(s);
      });
      if ('files' in cols) {
        var fc = c[cols.files];
        var files = textOf(fc.querySelector('div') || fc); // 보이는 첫 칸 = 첨부 개수 ("-"면 없음)
        if (/^\d+$/.test(files) && +files > 0) {
          var f = el('span', 'hm-post-files');
          f.setAttribute('aria-label', '첨부 ' + files + '개');
          f.appendChild(icon('clip'));
          f.appendChild(document.createTextNode(files));
          meta.appendChild(f);
        }
      }
      card.appendChild(meta);
      // 카드 어디를 눌러도 글 읽기 (원래 제목 링크를 누름)
      card.addEventListener('click', function (e) {
        if (!e.target.closest('a, button')) titleLink.click();
      });
      list.appendChild(card);
    });
    // 글이 하나도 없는 게시판(원래는 머리글 줄만 보임, 과목 공지에 많음)
    if (!list.firstChild) list.appendChild(el('div', 'hm-post hm-post-note', '등록된 글이 없습니다.'));
    return true;
  }

  // 분류 선택·검색을 목록 위로
  function boardTools(content, F) {
    var box = el('div', 'hm-board-tools');
    var cate = document.forms.formCateL;
    var find = document.forms.form_s;
    if (cate && content.contains(cate)) {
      var sel = cate.querySelector('select');
      if (sel && !sel.getAttribute('aria-label')) sel.setAttribute('aria-label', '분류');
      moveTo(cate, box, F.name);
    }
    if (find && content.contains(find)) {
      var q = find.querySelector('input[type="text"]');
      if (q && !q.getAttribute('aria-label')) q.setAttribute('aria-label', '검색어');
      moveTo(find, box, F.name);
    }
    if (!box.firstChild) return;
    content.insertBefore(box, content.firstChild);
    F.created.push(box);
  }

  // ---- F6 시설예약 (/prof/booking/PSTU420M.php) ----
  // 분류 탭(그림) → 시설 묶음(이름 | 시설 버튼) → 이용안내 칸(infoFrame) → 달력 칸(calFrame, 안쪽 문서는 bookingCal 화면이 맡음).
  // 원래 버튼(viewCaleder·changeBtnImg 링크)은 그대로 두고 배치·크기만 바꿈. 직접 배치한 표는 hm-own (자동 정리에서 뺌)
  function own(t) {
    t.classList.add('hm-own');
    [].forEach.call(t.querySelectorAll('table'), function (x) { x.classList.add('hm-own'); });
  }

  function bookingMain(content, F) {
    var title = content.querySelector('img[src*="/student/title_s_"]');
    if (title) {
      // 큰 제목 그림 줄과 그 위 빈 줄 (위쪽 바에 화면 이름이 있음)
      var tr = title.closest('tr');
      tr.classList.add('hm-orig-hidden');
      if (tr.previousElementSibling && !textOf(tr.previousElementSibling)) tr.previousElementSibling.classList.add('hm-orig-hidden');
    }

    var tab = content.querySelector('a[href*="PSTU420M.php?gubun="]');
    var tabs = tab && tab.closest('table');
    if (tabs) {
      tabs.classList.add('hm-bk-tabs');
      own(tabs);
    }

    // 시설 묶음 표(748px)가 모인 표. 시설 버튼이 하나도 없는 묶음도 있음 (회의실 탭의 미디어랩)
    var first = content.querySelector('a[href^="javascript:viewCaleder"]');
    var firstGroup = first && first.closest('table[width="748"]');
    var list = firstGroup && firstGroup.parentNode.closest('table');
    if (list) {
      [].forEach.call(list.querySelectorAll('table[width="748"]'), function (group) {
        var cells = group.rows[0] && group.rows[0].cells;
        if (!cells || cells.length < 2 || group.parentNode.closest('table[width="748"]')) return;
        group.classList.add('hm-bk-group');
        cells[0].classList.add('hm-bk-name');
        cells[cells.length - 1].classList.add('hm-bk-btns');
      });
      list.classList.add('hm-bk-list');
      own(list);
    }

    // 달력을 이용안내보다 위로: 폰에선 안내가 길어서(약 1,100px) 시설을 누르면 내려간 자리(#viewCC)가 안내 칸이 늘면서 밀려남.
    // 칸(iframe)은 옮기면 처음 주소로 다시 불러와지므로 노드는 그대로 두고 CSS 순서(order)로만 바꿈
    var point = document.getElementById('div_Point');
    if (point && document.getElementById('caledar') && content.contains(point)) point.parentNode.classList.add('hm-bk-stack');

    // "패널티 미적용" 그림(링크 아님) → 글자 표시
    [].forEach.call(content.querySelectorAll('img[src*="/booking/yellow_02"]'), function (img) {
      var badge = el('span', 'hm-bk-badge', '패널티 미적용');
      img.classList.add('hm-orig-hidden');
      img.parentNode.insertBefore(badge, img.nextSibling);
      F.created.push(badge);
    });
  }

  // 숨은 칸(iframe) 안 문서: 모양이 바뀌면 내용 높이도 바뀌므로 칸 높이를 내용에 맞춤 (같은 사이트라 가능, PRD F6).
  // 원래 화면도 칸이 열릴 때 한 번 높이를 맞추는데(reSize), 그 뒤에 우리 것이 한 번 더 맞춤.
  // 크기 알림(ResizeObserver)은 화면이 그려질 때만 오므로 모드를 바꿀 때·날짜를 바꿀 때도 직접 부름 (fitFrame)
  var fitFrame = function () {};

  function syncFrameHeight() {
    var fe;
    try {
      fe = window.frameElement;
    } catch (e) {
      return;
    }
    if (!fe || fe.tagName !== 'IFRAME') return;
    var update = function () {
      var h = 0;
      [].forEach.call(document.body.children, function (c) {
        var r = c.getBoundingClientRect();
        if (r.height) h = Math.max(h, r.bottom);
      });
      h = Math.ceil(h + window.scrollY);
      if (h > 0 && Math.abs(fe.getBoundingClientRect().height - h) > 2) fe.style.height = h + 'px';
    };
    fitFrame = update;
    update();
    window.addEventListener('load', function () { setTimeout(update, 50); });
    if (window.ResizeObserver) new ResizeObserver(update).observe(document.body);
  }

  // 달력 칸 안 시간표: 하루(열) = 카드, 시간 줄마다 "06시" 글자를 붙이고 15분 칸 4개를 한 줄로 (CSS).
  // 15분 칸은 원래 칸(onclick=selectDate) 그대로라 고르는 규칙·확인 창·제출이 원래와 같음
  function bookingGrid(form, F) {
    var timeCell = [].filter.call(form.querySelectorAll('td'), function (td) { return textOf(td) === 'Time'; })[0];
    var timeTable = timeCell && timeCell.closest('table');
    var row = timeTable && timeTable.closest('td') && timeTable.closest('td').parentNode;
    if (!row) return false;
    var hours = [].slice.call(timeTable.rows, 1).map(function (r) {
      var m = /^(\d{1,2}):(\d{2})/.exec(textOf(r));
      if (!m) return textOf(r);
      return (m[2] === '00' ? m[1] + '시' : m[1] + ':' + m[2]);
    });
    var days = [].filter.call(row.cells, function (td) {
      var t = td.querySelector(':scope > table');
      return t && t !== timeTable && t.rows.length === hours.length + 1;
    });
    if (!days.length) return false;
    var grid = row.closest('table');
    grid.classList.add('hm-bk-grid');
    own(grid);

    // 날짜 고르기: 10일을 다 펼치면 매우 길어서(회의실은 하루 18시간 × 10일 ≈ 12,000px) 하루씩 보여 줌.
    // 보이기만 바꾸는 우리 버튼이라 원래 동작과 상관없음 (숨긴 날에 골라 둔 칸도 그대로)
    var nav = el('div', 'hm-bk-days');
    nav.setAttribute('role', 'group');
    nav.setAttribute('aria-label', '날짜 고르기');
    var buttons = [];
    var show = function (idx) {
      days.forEach(function (td, k) { td.classList.toggle('hm-bk-off', k !== idx); });
      buttons.forEach(function (b, k) { b.setAttribute('aria-pressed', k === idx ? 'true' : 'false'); });
      fitFrame();
    };
    days.forEach(function (td, idx) {
      var t = td.querySelector(':scope > table');
      td.classList.add('hm-bk-day');
      for (var i = 1; i < t.rows.length; i++) {
        var cell = t.rows[i].cells[0];
        if (!cell) continue;
        var hour = el('span', 'hm-bk-hour', hours[i - 1]);
        cell.insertBefore(hour, cell.firstChild);
        F.created.push(hour);
      }
      var head = t.rows[0].cells[0];
      var day = [].map.call(head.childNodes, textOf).filter(Boolean).join(' '); // "11-03<br>화요일" → "11-03 화요일"
      var br = head.querySelector('br');
      if (br) {
        var sp = el('span', '', ' '); // 줄바꿈 대신 띄어쓰기 (br은 CSS로 숨김)
        head.insertBefore(sp, br);
        F.created.push(sp);
      }
      var open = !!td.querySelector('td[onclick], .bookingactNo, .bookingactNoMy');
      if (!open) {
        td.classList.add('hm-bk-closed');
        var note = el('span', 'hm-bk-closed-note', '예약할 수 있는 시간이 없어요');
        head.appendChild(note);
        F.created.push(note);
      }
      var parts = day.split(' '); // ["11-04", "수요일"]
      var b = el('button', open ? '' : 'hm-bk-day-closed');
      b.type = 'button';
      b.setAttribute('aria-label', day + (open ? '' : ', 예약할 수 있는 시간 없음'));
      b.appendChild(el('small', '', (parts[1] || '').replace('요일', '')));
      b.appendChild(document.createTextNode(parts[0]));
      b.addEventListener('click', function () { show(idx); });
      nav.appendChild(b);
      buttons.push(b);
    });
    if (days.length > 1) {
      var first = 0;
      while (first < days.length && days[first].classList.contains('hm-bk-closed')) first++;
      show(first < days.length ? first : 0);
      grid.parentNode.insertBefore(nav, grid);
      F.created.push(nav);
    }
    return true;
  }

  // 화면 맨 위 큰 제목 그림 줄 (위쪽 바에 화면 이름이 있으므로 모바일에선 숨김). 그림만 있는 줄일 때만
  function hideTitleBanner(content) {
    var img = content.querySelector('img[src*="/student/title_s_"]');
    var tr = img && img.closest('tr');
    if (!tr || !content.contains(tr) || textOf(tr) || tr.querySelectorAll('img').length !== 1) return;
    tr.classList.add('hm-orig-hidden');
    var prev = tr.previousElementSibling;
    if (prev && !textOf(prev) && !prev.querySelector('img, input, select, a')) prev.classList.add('hm-orig-hidden');
  }

  // ---- F7 수업정보 · F8 학사정보 ----
  // 과목 카드: 과목명이 제목, 학점·교수·시간·강의실·성적은 크게 (PRD F7·F8). more: 나머지 칸을 "자세히" 안에
  var COURSE_TITLE = /^(과목명|교과목명|course title)$/i;
  var COURSE_MAIN = /^(분반|학점|담당교수|교수|수업시간|시간|강의실|성적|평점|section|credits?|professor|period|classroom|grade)$/i;
  var COURSE_PAGES = {
    '/haksa/lecture/HLEC110M.php': { more: false }, // 수강내역
    '/for_student/course/PLES330M.php': { more: true }, // 개설시간표 (19칸)
    '/for_student/course/PLES330M_GS.php': { more: true },
    '/haksa/record/HREC110M.php': { more: false } // 전체성적: 학기별 성적 (처음엔 숨어 있음)
  };

  function courseCards(content, F, opts) {
    if (opts.more) {
      // 개설시간표: 검색 칸 9개(3×3 표)와 안내 | 엑셀 줄을 세로로 (PRD F7)
      var form = document.forms.form1;
      if (form && content.contains(form)) {
        [].forEach.call(form.querySelectorAll('table'), function (t) { t.classList.add('hm-block'); });
        form.classList.add('hm-csearch');
        var go = form.querySelector('a[href="javascript:sendit()"]'); // "확인": 원래는 칸 사이에 있음 → 검색 칸 맨 아래로
        if (go) {
          go.classList.add('hm-csearch-go');
          moveTo(go, form, F.name);
        }
      }
      var excel = content.querySelector('img[src*="picview_excel"]');
      if (excel && excel.closest('table')) excel.closest('table').classList.add('hm-block');
    }
    [].forEach.call(content.querySelectorAll('table'), function (t) {
      if (handled(t) || t.closest('.hm-ui')) return;
      var info = dataTableInfo(t);
      if (!info || info.labels.length < 4 || !info.labels.some(function (s) { return COURSE_TITLE.test(s); })) return;
      cardify(t, info, F, { main: COURSE_MAIN, more: opts.more });
    });
  }

  // 내 시간표 (/for_student/course/HLES110M.php): 교시(줄) × 요일(칸) 표.
  // 원래 표·링크는 그대로 두고 보이는 칸만 바꿈 → 요일 탭(오늘 먼저) + 그날 수업 카드, "일주일 전체"는 폰 폭에 맞춘 작은 표
  var DAY_HEAD = [/^(시간|time)$/i, /^(월|mon)/i, /^(화|tue)/i, /^(수|wed)/i, /^(목|thu)/i, /^(금|fri)/i, /^(토|sat)/i];
  var DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

  function timetable(content, F) {
    var t = [].filter.call(content.querySelectorAll('table'), function (x) {
      var h = x.rows[0];
      return h && h.cells.length === 7 && [].every.call(h.cells, function (c, i) { return DAY_HEAD[i].test(textOf(c)); });
    })[0];
    if (!t || t.rows.length < 2) return false;
    var rows = [].slice.call(t.rows, 1);
    if (!rows.every(function (r) { return r.cells.length === 7; })) return false;
    var key = function (cell) {
      var a = cell.querySelector('a[href]');
      return a ? a.getAttribute('href') + '|' + textOf(cell) : '';
    };
    var labels = rows.map(function (r) {
      var s = el('span', 'hm-tt-p');
      r.cells[0].insertBefore(s, r.cells[0].firstChild);
      F.created.push(s);
      return { span: s, name: textOf(r.cells[0]).replace(/\s+/g, ''), num: (/\d+/.exec(textOf(r.cells[0])) || [''])[0] };
    });
    var has = [false];
    var last = 0;
    for (var d = 1; d <= 6; d++) {
      has[d] = false;
      for (var i = 0; i < rows.length; i++) {
        if (!key(rows[i].cells[d])) continue;
        has[d] = true;
        last = Math.max(last, i);
      }
    }
    // 일주일 표: 마지막 수업 뒤 빈 교시는 숨김, 토요일 수업이 없으면 토요일 칸도
    rows.forEach(function (r, i) { if (i > last) r.classList.add('hm-tt-tail'); });
    if (!has[6]) t.classList.add('hm-tt-nosat');
    var today = new Date().getDay(); // 0 = 일요일, 1~6 = 월~토 = 표의 칸 번호
    if (today >= 1 && today <= 6) {
      [].forEach.call(t.rows, function (r) { if (r.cells[today]) r.cells[today].classList.add('hm-tt-today'); });
    }

    var tabs = el('div', 'hm-tt-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', '요일');
    var note = el('p', 'hm-tt-note');
    var buttons = [];
    var week = false;
    var cur = 0;

    var show = function (day, msg) {
      cur = day;
      week = !day;
      t.classList.toggle('hm-tt-week', week);
      buttons.forEach(function (b) { b.setAttribute('aria-selected', String(+b.getAttribute('data-day') === day)); });
      var shown = 0;
      rows.forEach(function (r, i) {
        var cell = r.cells[day];
        [].forEach.call(r.cells, function (c) { c.classList.remove('hm-tt-sel'); });
        var k = week ? '' : key(cell);
        var cont = k && i > 0 && key(rows[i - 1].cells[day]) === k; // 앞 교시와 같은 수업 → 한 카드로
        r.classList.toggle('hm-tt-show', !!k && !cont);
        if (week) {
          labels[i].span.textContent = labels[i].num;
          return;
        }
        if (!k || cont) return;
        cell.classList.add('hm-tt-sel');
        var end = i;
        while (end + 1 < rows.length && key(rows[end + 1].cells[day]) === k) end++;
        labels[i].span.textContent = end > i ? labels[i].num + '–' + labels[end].name : labels[i].name;
        shown++;
      });
      var text = msg || (!week && !shown ? DAY_NAMES[day] + '요일에는 수업이 없습니다.' : '');
      note.textContent = text;
      note.hidden = !text;
    };

    for (var day = 1; day <= 6; day++) {
      if (day === 6 && !has[6]) continue;
      var b = el('button', has[day] ? '' : 'hm-tt-none', DAY_NAMES[day]);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('data-day', String(day));
      b.setAttribute('aria-label', DAY_NAMES[day] + '요일' + (has[day] ? '' : ', 수업 없음'));
      b.addEventListener('click', function (e) { show(+e.currentTarget.getAttribute('data-day')); });
      tabs.appendChild(b);
      buttons.push(b);
    }
    var all = el('button', 'hm-tt-all', '일주일');
    all.type = 'button';
    all.setAttribute('role', 'tab');
    all.setAttribute('data-day', '0');
    all.setAttribute('aria-label', '일주일 전체 보기');
    all.addEventListener('click', function () { show(0); });
    tabs.appendChild(all);
    buttons.push(all);

    // 일주일 표에서 칸을 누르면 그 요일 보기 (과목 공지 링크는 요일 보기의 카드에서 누름)
    t.addEventListener('click', function (e) {
      if (!week) return;
      var cell = e.target.closest('td');
      if (!cell || cell.cellIndex < 1 || !key(cell)) return;
      e.preventDefault();
      show(cell.cellIndex);
      tabs.scrollIntoView({ block: 'nearest' });
    }, true);

    t.parentNode.insertBefore(tabs, t);
    t.parentNode.insertBefore(note, t);
    F.created.push(tabs, note);

    // 오늘 먼저. 오늘 수업이 없으면 다음 수업일을 보여 주고 안내
    var first = today >= 1 && today <= 6 && has[today] ? today : 0;
    if (!first) {
      for (var k = 1; k <= 6 && !first; k++) {
        var cand = (today + k) % 7;
        if (cand >= 1 && has[cand]) first = cand;
      }
      if (first) show(first, '오늘(' + DAY_NAMES[today] + ')은 수업이 없습니다. 다음 수업일인 ' + DAY_NAMES[first] + '요일을 보여 드립니다.');
      else show(0);
    } else {
      show(first);
    }
    // 다 만든 뒤에 표 모양을 바꿈 (중간에 실패하면 표는 자동 정리로)
    t.classList.add('hm-tt');
    own(t);
    return true;
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
      var noticeCard = el('section', 'hm-card hm-notice hm-login-notice');
      var foodCard = el('section', 'hm-card hm-food');
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

  // 바닥글: 보통 body 바로 아래 표, 폼·div로 감싼 화면도 있음 (등록금 납부 확인서). 바닥글 표시를 품은 가장 바깥 표
  function findFooter() {
    var marks = document.querySelectorAll('.btn_sm_tail, img[src*="copyright"]');
    for (var b = marks.length - 1; b >= 0; b--) {
      var t = marks[b].closest('table');
      while (t && t.parentNode.closest('table')) t = t.parentNode.closest('table');
      if (t && !t.querySelector('#div_TopmenuBg, table[width="1000"]')) return t;
    }
    return null;
  }

  var drawerOpen = function () {};
  var closeDrawer = function () {};

  // F4 메인 화면 (/for_student/main.php — 로그인 뒤 MainFrame 안에서도, 직접 열어도)
  // 공지 → 나의수업 → 수업공지 → 식단·연락처 → 바로가기 카드. 팝업존·학사달력은 제자리에서 아래로
  // (iframe은 옮기면 다시 불러와지므로 옮기지 않음). 숨은 칸 MyIFrame·MyIFrame2는 건드리지 않음
  var MAIN_PATH = '/for_student/main.php';

  // 맨 바깥 표(body > table)에서 node가 들어 있는 칸
  function topCell(node) {
    var tables = document.querySelectorAll('body > table');
    for (var i = 0; i < tables.length; i++) {
      var rows = tables[i].rows;
      for (var r = 0; r < rows.length; r++) {
        for (var c = 0; c < rows[r].cells.length; c++) {
          if (rows[r].cells[c].contains(node)) return rows[r].cells[c];
        }
      }
    }
    return null;
  }

  function cardHead(card, title, more, F) {
    var head = el('div', 'hm-home-head');
    head.appendChild(el('h2', 'hm-card-title', title));
    if (more && more.classList.contains('hm-labeled')) moveTo(more, head, F.name);
    card.appendChild(head);
  }

  screens.push({
    name: 'main',
    cls: 'hm-frame hm-p-main',
    match: function () { return PATH === MAIN_PATH; },
    run: function (F) {
      var topMenu = document.getElementById('div_TopmenuBg');
      var noticeTab = document.getElementById('td_box21');
      var classTab = document.getElementById('td_box1');
      if (!topMenu || !noticeTab || !classTab) return false;
      var noticeCell = topCell(noticeTab);
      var classCell = topCell(classTab);
      if (!noticeCell || !classCell || noticeCell === classCell) return false;

      buildChrome(F, topMenu, null, '홈');
      var wrap = el('div', 'hm-home');
      F.created.push(wrap);

      // 탭(td_box숫자 칸)·식당 탭은 밑줄 탭 모양으로 먼저 이름표 (뒤의 일반 이름표보다 먼저)
      [].forEach.call(document.querySelectorAll('td[id^="td_box"]'), function (td) { labelImageLinks(td, 'hm-tab'); });
      var meals = document.getElementById('tr_box_11');
      if (meals) labelImageLinks(meals, 'hm-tab');
      // 새 글 표시 그림
      [].forEach.call(document.querySelectorAll('img[src*="main/icon_new"]'), function (img) {
        if (!img.getAttribute('alt')) img.setAttribute('alt', '새 글');
      });

      // ① 공지사항: 더보기 · 공지 검색 · 탭 8개 · 목록
      var notice = el('section', 'hm-card hm-notice');
      labelImageLinks(noticeCell);
      cardHead(notice, '공지사항', noticeCell.querySelector('a[href*="goNotice"]'), F);
      var search = document.forms.form_Search;
      if (search && !noticeCell.contains(search)) {
        labelImageLinks(search);
        var q = search.querySelector('input[type="text"]');
        if (q && !q.getAttribute('aria-label')) q.setAttribute('aria-label', '공지 검색');
        if (q && !q.getAttribute('placeholder')) q.setAttribute('placeholder', '공지 검색');
        var sbox = el('div', 'hm-notice-search');
        moveTo(search, sbox, F.name);
        notice.appendChild(sbox);
      }
      [].slice.call(noticeCell.children).forEach(function (n) { moveTo(n, notice, F.name); });
      wrap.appendChild(notice);

      // ② 나의수업 · 알림 · 신청승인 · 생활관 · 도서대여 (탭 + 내용 tr_box_1~6)
      var cls = el('section', 'hm-card hm-class');
      cardHead(cls, '내 수업 · 알림', null, F);
      labelImageLinks(classCell);
      moveTo(classTab.closest('table'), cls, F.name);
      [].slice.call(classCell.children).forEach(function (n) {
        if (/^tr_box_\d$/.test(n.id)) moveTo(n, cls, F.name);
      });
      wrap.appendChild(cls);

      // ③ 수업공지
      var kyomList = document.getElementById('tr_box_31');
      var kyomCell = kyomList && topCell(kyomList);
      if (kyomCell && kyomCell !== noticeCell && kyomCell !== classCell) {
        var kyom = el('section', 'hm-card hm-notice hm-kyom');
        labelImageLinks(kyomCell);
        cardHead(kyom, '수업공지', kyomCell.querySelector('a[href*="goKyomNotice"]'), F);
        [].slice.call(kyomCell.children).forEach(function (n) { moveTo(n, kyom, F.name); });
        wrap.appendChild(kyom);
      }

      // ④ 식단정보 · 교직원 연락처 · 편의시설 연락처
      var foodTab = document.getElementById('td_box11');
      var foodBox = foodTab && foodTab.closest('table') && foodTab.closest('table').parentNode;
      if (foodBox && foodBox !== classCell && classCell.contains(foodBox)) {
        var food = el('section', 'hm-card hm-food');
        food.appendChild(el('h2', 'hm-card-title', '식단 · 연락처'));
        moveTo(foodBox, food, F.name);
        wrap.appendChild(food);
      }

      // ⑤ 바로가기 (서랍과 같은 목록)
      var sc = el('section', 'hm-card');
      sc.appendChild(el('h2', 'hm-card-title', '바로가기'));
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
      wrap.appendChild(sc);

      // 팝업존 번호 버튼: 그림(초록·회색 점)에 번호 글자
      [].forEach.call(document.querySelectorAll('a[href*="setPopupzone0("]'), function (a) {
        var m = /setPopupzone0\((\d+)\)/.exec(a.getAttribute('href'));
        if (!m || a.querySelector('.hm-img-label')) return;
        a.classList.add('hm-labeled', 'hm-dot');
        a.setAttribute('aria-label', '알림판 ' + m[1]);
        a.appendChild(el('span', 'hm-img-label', m[1]));
      });

      // 남은 칸: 내용(팝업존·학사달력)이 있으면 카드 모양, 비었으면 숨김
      var foot = findFooter();
      if (foot) foot.classList.add('hm-foot');
      var firstTable = null;
      [].forEach.call(document.querySelectorAll('body > table'), function (t) {
        if (t === foot) return;
        if (!firstTable) firstTable = t;
        [].forEach.call(t.rows, function (row) {
          [].forEach.call(row.cells, function (cell) {
            cell.classList.add(cell.querySelector('iframe, a[href], input:not([type="hidden"]), select') ? 'hm-home-box' : 'hm-spacer');
          });
        });
      });
      document.body.insertBefore(wrap, firstTable || foot || null);
      return true;
    }
  });

  // F0 공통 틀 (위쪽 메뉴 #div_TopmenuBg + 1000px 표[왼쪽 메뉴 | 내용]) + F2 ☰ 메뉴
  // F6 시설예약 달력 칸 (/prof/booking/PSTU420C.php — 시설예약 화면의 calFrame 안. 날짜를 누르면 이 칸만 새로 열림)
  // 공통 틀이 없는 문서라 표 정리는 직접: 두 달 달력은 세로로, 요약은 이름|값, 시간표는 하루씩 카드 (bookingGrid)
  screens.push({
    name: 'bookingCal',
    cls: 'hm-p-bkcal',
    match: function () { return PATH === '/prof/booking/PSTU420C.php'; },
    run: function (F) {
      var form = document.forms.bookingform;
      if (!form || !bookingGrid(form, F)) return false;
      var body = document.body;
      body.classList.add('hm-fit'); // 글자 16px·누르는 곳 44px·그림 버튼 글자 (fitWidth의 표 정리는 쓰지 않음)
      unfixWidths(body);
      var prev = body.querySelector('a > img[src*="/booking/prev_btn"]');
      if (prev) prev.closest('table').classList.add('hm-bk-months');
      var sum = body.querySelector('td[background*="table_info_bg"] > table');
      if (sum) sum.classList.add('hm-bk-sum');
      var ten = body.querySelector('a > img[src*="/booking/10day_"]');
      if (ten) ten.closest('table').classList.add('hm-bk-nav');
      labelImageLinks(body);
      syncFrameHeight();
      return true;
    }
  });

  // F11 출력 서류 새 창 (등록금 고지서): 서류는 원래 모양이 중요하므로 재배치하지 않고
  // 화면 설정 폭을 서류 폭으로 → 폰 폭에 맞춰 축소, 손가락으로 확대 가능. 위에 인쇄(PDF 저장) 버튼.
  // HREG220P는 고지서 선택 창(HREG210M)의 "등록금 고지서 출력"(POST 제출)으로만 열려 아직 실제 화면 확인 전 (폭을 못 정하면 손대지 않음)
  var DOC_PAGES = ['/haksa/regist/HREG220P.php'];
  screens.push({
    name: 'doc',
    cls: 'hm-p-doc',
    match: function () { return DOC_PAGES.indexOf(PATH) !== -1 && isTop(); },
    run: function (F) {
      var body = document.body;
      if (!body.querySelector('table')) return false;
      var w = 0;
      [].forEach.call(body.querySelectorAll('[width], [style*="width"]'), function (e) {
        var a = e.getAttribute('width') || '';
        var s = /(^|;)\s*width\s*:\s*(\d+)px/i.exec(e.getAttribute('style') || '');
        if (!/%/.test(a)) w = Math.max(w, parseInt(a, 10) || 0);
        if (s) w = Math.max(w, +s[2]);
      });
      if (w < 320 || w > 1200) return false;
      docWidth = w + 24;
      var bar = el('div', 'hm-docbar');
      var print = el('button', 'hm-doc-print', '인쇄 · PDF 저장');
      print.type = 'button';
      print.addEventListener('click', function () { window.print(); });
      bar.appendChild(print);
      if (window.opener) { // 히즈넷이 띄운 창이면 닫기 (폰에선 새 탭으로 열림)
        var close = el('button', '', '닫기');
        close.type = 'button';
        close.addEventListener('click', function () { window.close(); });
        bar.appendChild(close);
      }
      body.insertBefore(bar, body.firstChild);
      F.created.push(bar);
      return true;
    }
  });

  // 문서 하나를 폭 맞춤하는 새 창·칸: 시설예약의 이용안내 칸(infoFrame)·패널티 정보 창·벌점 목록,
  // 로그인 화면의 아이디·비밀번호 찾기 창, 등록금 고지서 선택 창(HREG210M, 예전 것 HREG200M)
  var PLAIN_PAGES = ['/prof/booking/PSTU420N.php', '/prof/booking/PSTU422P.php', '/prof/booking/PSTU422L.php', '/login/findID.php', '/login/resetPwd.php',
    '/haksa/regist/HREG210M.php', '/haksa/regist/HREG200M.php'];
  screens.push({
    name: 'plain',
    cls: 'hm-p-plain',
    match: function () { return PLAIN_PAGES.indexOf(PATH) !== -1; },
    run: function (F) {
      if (!document.body.querySelector('table')) return false;
      if (frameKind() === 'IFRAME') root.classList.add('hm-in-frame');
      fitWidth(document.body, F);
      syncFrameHeight();
      return true;
    }
  });

  screens.push({
    name: 'frame',
    cls: 'hm-frame',
    match: function () { return PATH !== '/login/login.php' && PATH !== MAIN_PATH; },
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
      // 공지 게시판 + (v0.4.0) 과목 공지 게시판(/cis/, 내 시간표·메인의 과목 링크) — 머리글이 같음
      if (/^\/(myboard|cis)\/(list|read)\.php$/.test(PATH)) {
        try {
          if (/\/list\.php$/.test(PATH)) boardTools(content, F); // 글 읽기 화면에선 검색이 글 위로 오면 안 됨
          boardList(content, F); // 글 읽기 화면 아래에도 같은 목록이 있음
        } catch (e) { /* 게시판 꾸미기만 포기, 목록 표는 아래 자동 정리로 */ }
      }
      if (PATH === '/prof/booking/PSTU420M.php') {
        try {
          bookingMain(content, F);
        } catch (e) { /* 시설예약 꾸미기만 포기, 아래 자동 정리로 */ }
      }
      if (PATH === '/for_student/course/HLES110M.php') {
        try {
          timetable(content, F);
        } catch (e) { /* 시간표 꾸미기만 포기, 아래 자동 정리로 */ }
      }
      if (COURSE_PAGES[PATH]) {
        try {
          courseCards(content, F, COURSE_PAGES[PATH]);
        } catch (e) { /* 과목 카드만 포기, 아래 자동 정리로 */ }
      }
      try {
        hideTitleBanner(content);
      } catch (e) { /* 무시 */ }

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
      // 숨어 있던 부분이 원래 스크립트로 보이게 되면(display 바꿈) 그 안의 표도 맞춤 (전체성적의 학기별 성적 등)
      if (window.MutationObserver) {
        new MutationObserver(function (list) {
          for (var m = 0; m < list.length; m++) {
            if (!list[m].target.closest('.hm-ui')) { refit(); return; }
          }
        }).observe(content, { attributes: true, attributeFilter: ['style'], subtree: true });
      }
      return true;
    }
  });

  // 현재 화면 이름: 왼쪽 메뉴에서 지금 주소와 같은 링크의 글자
  function sameLink(a) {
    try {
      var u = new URL(a.href, location.href);
      var here0 = location.pathname.replace(/^\/(myboard|cis)\/read\.php$/, '/$1/list.php'); // 글 읽기도 그 게시판 이름으로
      if (u.pathname !== here0) return false;
      var here = new URLSearchParams(location.search).get('Board');
      return (u.searchParams.get('Board') || null) === (here || null);
    } catch (e) {
      return false;
    }
  }

  // left: 원래 왼쪽 메뉴 칸 (메인 화면처럼 없으면 null), fixedTitle: 위쪽 바 이름을 정해 줄 때
  function buildChrome(F, topMenu, left, fixedTitle) {
    var body = document.body;
    var current = null;
    if (left) {
      [].some.call(left.querySelectorAll('a[href]'), function (a) {
        if (textOf(a) && sameLink(a)) { current = a; return true; }
        return false;
      });
    }
    if (current) current.classList.add('hm-current');
    var title = fixedTitle || (IS_SITEMAP ? '전체 메뉴' : (current ? textOf(current) : '히즈넷'));

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

    if (left) {
      var leftSec = el('div', 'hm-sec hm-drawer-left');
      leftSec.appendChild(el('div', 'hm-sec-title', '이 분류 메뉴'));
      labelImageLinks(left);
      [].slice.call(left.children).forEach(function (n) { moveTo(n, leftSec, F.name); });
      drawer.appendChild(leftSec);
    }

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
    // 원래 화면(과 축소해서 보여 주는 출력 서류)에서는 페이지가 기기 폭에 맞춰 축소되므로 버튼을 그만큼 키움
    var z = !recognized ? 1 : mobile ? Math.max(1, (docWidth || 0) / deviceWidth()) : Math.max(1, Math.max(980, pageWidth) / deviceWidth());
    root.style.setProperty('--hm-z', String(z));
    var btn = document.getElementById('hm-toggle');
    if (btn) btn.textContent = mobile ? '원래 화면' : '모바일 화면';
    fitFrame();
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
    var classes = S.cls.split(' '); // 메인 화면은 공통 틀 CSS도 같이 씀 ('hm-frame hm-p-main')
    classes.forEach(function (c) { root.classList.add(c); });
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
      classes.forEach(function (c) { root.classList.remove(c); });
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
      // 숨은 칸(달력 칸 등)에는 버튼이 없으므로 바깥 문서에서 모드를 바꾸면 따라 바꿈 (같은 탭의 다른 문서에서 저장하면 storage 알림이 옴)
      if (!OWNS_VIEWPORT) {
        window.addEventListener('storage', function (e) {
          if (e.key === 'hm-mode') applyMode(readMode());
        });
      }
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
