// ==UserScript==
// @name         히즈넷 모바일 (M0 실험판)
// @namespace    hisnet-mobile
// @version      0.0.2
// @description  M0 호환성 실험용입니다. 프레임·숨은 칸 안에서 실행되는지, 업데이트를 받는지 확인합니다. 학교 공식 도구가 아닙니다.
// @match        https://hisnet.handong.edu/*
// @run-at       document-start
// @grant        none
// @updateURL    https://raw.githubusercontent.com/junsea23/hisnet-mobile/main/hisnet-mobile.user.js
// @downloadURL  https://raw.githubusercontent.com/junsea23/hisnet-mobile/main/hisnet-mobile.user.js
// ==/UserScript==

/*
 * M0 실험판이 하는 일 (PRD 10절 M0)
 *  1. 화면 설정(viewport)을 넣는다
 *  2. 오른쪽 아래 "원래 화면" 버튼 (F1 시험)
 *  3. 왼쪽 아래 색 표시: 버전 · 어느 문서(바깥/프레임/숨은 칸)에서 실행됐는지 · 화면 폭
 * 네트워크 요청을 만들지 않고, 저장하는 값은 hm-mode 하나뿐이다 (PRD 7절).
 */
(function () {
  'use strict';

  // ---- 1. 설정 ----
  var VERSION = '0.0.2';
  var MARK_COLOR = '#256EF4'; // 버전마다 색을 바꿔 업데이트가 됐는지 눈으로 확인
  var MARK_NAME = '파랑';
  var PHONE_MAX = 768; // 이보다 좁은 기기에서만 동작

  var root = document.documentElement;
  if (!root || root.classList.contains('hm-applied')) return;

  function isPhone() {
    try {
      // 페이지가 그려지기 전에는 innerWidth가 980으로 나오는 폰이 있어 기기 화면 크기로 판단
      return Math.min(screen.width, screen.height) < PHONE_MAX;
    } catch (e) {
      return false;
    }
  }
  if (!isPhone()) return;
  root.classList.add('hm-applied');

  // ---- 2. 시작 ----
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

  function whereAmI() {
    if (isTop()) return '바깥 문서';
    var kind = '프레임';
    try {
      if (window.frameElement && window.frameElement.tagName === 'IFRAME') kind = '숨은 칸';
    } catch (e) { /* 다른 사이트 칸 */ }
    return kind + ' ' + (window.name || '(이름 없음)');
  }

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
      var w = Math.max(980, pageWidth || 0);
      meta.setAttribute('content', 'width=' + w);
    } else {
      meta.setAttribute('content', 'width=device-width, initial-scale=1');
    }
  }

  function applyMode(mode) {
    root.classList.toggle('hm-on', mode === 'mobile');
    var pageWidth = root.scrollWidth; // 원래 화면일 때 이 폭이 한눈에 들어오게
    try {
      setViewport(document, mode, pageWidth);
      if (!isTop()) setViewport(window.top.document, mode, pageWidth);
    } catch (e) { /* 바깥 문서에 못 닿아도 계속 */ }
    var btn = document.getElementById('hm-toggle');
    if (btn) btn.textContent = mode === 'mobile' ? '원래 화면' : '모바일 화면';
  }

  var CSS = [
    '#hm-mark, #hm-toggle { all: initial; position: fixed; z-index: 2147483647; box-sizing: border-box;',
    '  font-family: "Pretendard GOV", "Pretendard", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif; }',
    '#hm-mark { left: 8px; bottom: 8px; max-width: calc(100% - 140px); padding: 6px 10px; border-radius: 6px;',
    '  background: ' + MARK_COLOR + '; color: #FFFFFF; font-size: 13px; line-height: 1.4; pointer-events: none; }',
    '#hm-toggle { right: 12px; bottom: 12px; min-width: 48px; height: 48px; padding: 0 16px; border-radius: 999px;',
    '  background: #FFFFFF; color: #131416; border: 1px solid #CDD1D5; font-size: 15px; font-weight: 700; cursor: pointer;',
    '  box-shadow: 0 6px 16px rgba(19,20,22,0.10), 0 2px 4px rgba(19,20,22,0.05); }',
    '#hm-toggle:focus-visible { outline: 2px solid #256EF4; outline-offset: 2px; }',
    'html:not(.hm-on) #hm-mark { display: none; }',
    'html.hm-on body { box-shadow: inset 0 0 0 4px ' + MARK_COLOR + '; }'
  ].join('\n');

  function addStyle() {
    var s = document.createElement('style');
    s.id = 'hm-style';
    s.textContent = CSS;
    (document.head || root).appendChild(s);
  }

  function buildUI() {
    var body = document.body;
    if (!body || body.tagName === 'FRAMESET') return; // 프레임 묶음 문서에는 그릴 곳이 없음

    var mark = document.createElement('div');
    mark.id = 'hm-mark';
    mark.textContent = 'M0 ' + VERSION + ' ' + MARK_NAME + ' · ' + whereAmI() + ' · ' +
      location.pathname + ' · 화면 폭 ' + Math.min(screen.width, screen.height) + ' / ' + window.innerWidth;
    body.appendChild(mark);

    // 원래 화면 버튼은 실제로 보이는 문서에만 (숨은 칸에는 넣지 않음)
    var inIframe = false;
    try { inIframe = !!(window.frameElement && window.frameElement.tagName === 'IFRAME'); } catch (e) { inIframe = true; }
    if (inIframe) return;

    var btn = document.createElement('button');
    btn.id = 'hm-toggle';
    btn.type = 'button';
    btn.addEventListener('click', function () {
      var next = root.classList.contains('hm-on') ? 'original' : 'mobile';
      saveMode(next);
      applyMode(next);
    });
    body.appendChild(btn);
  }

  // ---- 6. 안전망: 무엇이 실패해도 히즈넷은 그대로 ----
  try {
    addStyle();
    applyMode(readMode());
  } catch (e) { /* 무시 */ }

  function onReady() {
    try {
      buildUI();
      applyMode(readMode());
    } catch (e) {
      var s = document.getElementById('hm-style');
      if (s) s.remove();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
