const { describe } = require('node:test');

describe('Wiki navigation', () => {
  const assert = require('node:assert/strict');
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  const test = require('node:test');
  const { JSDOM } = require(require.resolve('jsdom', {
    paths: [resolve(__dirname, '../../../frontend')],
  }));

  const template = readFileSync(resolve(__dirname,
    '../../../seahub/templates/wiki/wiki_publish_ssr.html'), 'utf8');
  const script = template.match(/<script>\s*(function getElement[\s\S]*?)<\/script>/)[1];

  function fixture(context, { mobile = false, empty = false } = {}) {
    const dom = new JSDOM(`
      <nav id="wiki-side-panel">
        <button id="side-panel-close">Close navigation</button>
        <ul id="wiki-nav-tree">
          <li class="wiki-page-item-wrapper">
            <div class="wiki-page-item selected-page">
              <span class="wiki-nav-item-icon wiki-nav-item-icon-placeholder"></span>
              <a id="home" class="wiki-page-item-main" href="/wiki/publish/fixture/HOME/"
                 data-page-id="HOME" aria-current="page"><span class="wiki-page-title">Home</span></a>
            </div>
          </li>
          <li class="wiki-page-item-wrapper">
            <div class="wiki-page-item">
              <button id="toggle" class="wiki-nav-item-icon" aria-controls="children" aria-expanded="false">Toggle section</button>
              <a id="branch" class="wiki-page-item-main" href="/wiki/publish/fixture/BRCH/"
                 data-page-id="BRCH"><span class="wiki-page-title">Branch</span></a>
            </div>
            <ul id="children" class="wiki-nav-children collapsed" style="height: 0;" inert aria-hidden="true">
              <li class="wiki-page-item-wrapper">
                <div class="wiki-page-item">
                  <span class="wiki-nav-item-icon wiki-nav-item-icon-placeholder"></span>
                  <a id="leaf" class="wiki-page-item-main" href="/wiki/publish/fixture/LEAF/"
                     data-page-id="LEAF"><span class="wiki-page-title">Leaf</span></a>
                </div>
              </li>
            </ul>
          </li>
        </ul>
      </nav>
      <div id="wiki-resize-handle"></div>
      <main id="wiki-main-panel">
        <button id="menu-toggle-btn" aria-expanded="false" aria-controls="wiki-side-panel">Open navigation</button>
        <nav id="wiki-breadcrumb"></nav>
        <h1 id="wiki-page-title">Home</h1><a id="reading" href="#reading">Reading</a>
      </main>
      <div id="wiki-mobile-overlay" aria-hidden="true"></div>
      <div id="wiki-search-modal" class="hidden"><input id="search-input"></div>
    `, { url: 'https://wiki.test/wiki/publish/fixture/HOME/', runScripts: 'outside-only' });
    context.after(() => dom.window.close());
    const { window } = dom;
    const { document } = window;
    const viewport = new window.EventTarget();
    viewport.matches = mobile;
    window.matchMedia = query => {
      assert.equal(query, '(max-width: 767px)');
      return viewport;
    };
    window.requestAnimationFrame = callback => callback();
    window.HTMLElement.prototype.scrollIntoView = function () {};
    if (empty) document.getElementById('wiki-nav-tree').textContent = '';
    window.eval(script);
    const byId = id => document.getElementById(id);
    function resize(matches) {
      viewport.matches = matches;
      viewport.dispatchEvent(new window.Event('change'));
    }
    function escape(target = document.activeElement, prevented = false) {
      const event = new window.KeyboardEvent('keydown', {
        key: 'Escape', bubbles: true, cancelable: true,
      });
      if (prevented) event.preventDefault();
      target.dispatchEvent(event);
      return event;
    }
    return { window, document, byId, resize, escape, viewport };
  }

  test('mobile starts inert while desktop navigation remains available', context => {
    for (const mobile of [false, true]) {
      const { byId, document } = fixture(context, { mobile });
      assert.equal(byId('wiki-side-panel').inert, mobile);
      assert.equal(byId('menu-toggle-btn').getAttribute('aria-expanded'), 'false');
      assert.equal(document.activeElement, document.body);
    }
  });

  test('opening focuses the existing close control without trapping or disabling reading', context => {
    const { byId, document } = fixture(context, { mobile: true });
    byId('menu-toggle-btn').click();
    assert.equal(document.activeElement, byId('side-panel-close'));
    assert.equal(byId('wiki-side-panel').inert, false);
    assert.equal(byId('menu-toggle-btn').getAttribute('aria-expanded'), 'true');
    assert.ok(byId('wiki-mobile-overlay').classList.contains('visible'));
    assert.equal(byId('wiki-mobile-overlay').getAttribute('aria-hidden'), 'true');
    assert.notEqual(byId('wiki-main-panel').inert, true);
    byId('reading').focus();
    assert.equal(document.activeElement, byId('reading'));
    assert.ok(byId('wiki-side-panel').classList.contains('mobile-open'));
  });

  test('close button, backdrop and Escape restore the trigger and disable the closed drawer', context => {
    for (const action of ['side-panel-close', 'wiki-mobile-overlay', 'Escape']) {
      const { byId, document, escape } = fixture(context, { mobile: true });
      byId('menu-toggle-btn').click();
      if (action === 'Escape') assert.equal(escape().defaultPrevented, true);
      else byId(action).click();
      assert.equal(document.activeElement, byId('menu-toggle-btn'));
      assert.equal(byId('wiki-side-panel').inert, true);
      assert.equal(byId('menu-toggle-btn').getAttribute('aria-expanded'), 'false');
      assert.ok(!byId('wiki-side-panel').classList.contains('mobile-open'));
      assert.ok(!byId('wiki-mobile-overlay').classList.contains('visible'));
    }
  });

  test('closed/desktop Escape never steals focus or marks desktop navigation inert', context => {
    const { byId, document, escape } = fixture(context);
    byId('reading').focus();
    byId('menu-toggle-btn').click();
    assert.equal(escape().defaultPrevented, false);
    assert.equal(document.activeElement, byId('reading'));
    assert.equal(byId('wiki-side-panel').inert, false);
  });

  test('search and already-handled Escape take precedence over closing navigation', context => {
    const { byId, escape } = fixture(context, { mobile: true });
    byId('menu-toggle-btn').click();
    escape(undefined, true);
    assert.ok(byId('wiki-side-panel').classList.contains('mobile-open'));
    byId('wiki-search-modal').classList.remove('hidden');
    byId('search-input').focus();
    escape();
    assert.ok(byId('wiki-side-panel').classList.contains('mobile-open'));
  });

  test('native button activation toggles once and keeps the height animation', context => {
    const { byId, window } = fixture(context);
    byId('toggle').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.equal(byId('toggle').getAttribute('aria-expanded'), 'false');
    byId('toggle').click();
    assert.equal(byId('toggle').getAttribute('aria-expanded'), 'true');
    assert.equal(byId('children').inert, false);
    assert.equal(byId('children').getAttribute('aria-hidden'), 'false');
    assert.ok(!byId('children').classList.contains('collapsed'));
    byId('children').dispatchEvent(new window.Event('transitionend'));
    assert.equal(byId('children').style.height, 'auto');
    byId('toggle').click();
    assert.equal(byId('toggle').getAttribute('aria-expanded'), 'false');
    assert.equal(byId('children').inert, true);
    assert.equal(byId('children').getAttribute('aria-hidden'), 'true');
    assert.ok(byId('children').classList.contains('collapsed'));
    assert.equal(byId('children').style.height, '0px');
    assert.equal(byId('children').hidden, false);
  });

  test('collapsing a branch returns focus before its descendants become inert', context => {
    const { byId, document } = fixture(context);
    byId('toggle').click();
    byId('leaf').focus();
    byId('toggle').click();
    assert.equal(document.activeElement, byId('toggle'));
    assert.equal(byId('children').inert, true);
  });

  test('in-page navigation clears stale current state and unlocks collapsed ancestors', context => {
    const { byId, document } = fixture(context);
    byId('leaf').click();
    assert.equal(byId('home').getAttribute('aria-current'), null);
    assert.equal(byId('leaf').getAttribute('aria-current'), 'page');
    assert.equal(byId('toggle').getAttribute('aria-expanded'), 'true');
    assert.equal(byId('children').inert, false);
    assert.equal(byId('children').getAttribute('aria-hidden'), 'false');
    assert.equal(byId('children').style.height, 'auto');
    assert.equal(document.querySelector('.wiki-page-item-wrapper[aria-expanded]'), null);
    assert.equal(document.querySelector('.wiki-nav-item-icon-placeholder[aria-expanded]'), null);
    assert.equal(byId('wiki-page-title').textContent, 'Leaf');
  });

  test('entering the mobile breakpoint moves focus out of newly hidden navigation', context => {
    const { byId, document, resize } = fixture(context);
    byId('home').focus();
    resize(true);
    assert.equal(document.activeElement, byId('menu-toggle-btn'));
    assert.equal(byId('wiki-side-panel').inert, true);
  });

  test('leaving the mobile breakpoint clears drawer state and rescues hidden-control focus', context => {
    for (const opened of [false, true]) {
      const { byId, document, resize } = fixture(context, { mobile: true });
      byId('menu-toggle-btn').focus();
      if (opened) byId('menu-toggle-btn').click();
      resize(false);
      assert.equal(document.activeElement, byId('home'));
      assert.equal(byId('wiki-side-panel').inert, false);
      assert.equal(byId('menu-toggle-btn').getAttribute('aria-expanded'), 'false');
      assert.ok(!byId('wiki-side-panel').classList.contains('mobile-open'));
      resize(true);
      assert.equal(document.activeElement, byId('menu-toggle-btn'));
      assert.equal(byId('wiki-side-panel').inert, true);
    }
  });

  test('breakpoint changes preserve reading focus and handle empty navigation', context => {
    const { byId, document, resize } = fixture(context, { mobile: true, empty: true });
    byId('menu-toggle-btn').click();
    resize(false);
    assert.equal(document.activeElement, byId('wiki-page-title'));
    assert.equal(byId('wiki-page-title').getAttribute('tabindex'), '-1');
    byId('reading').focus();
    resize(true);
    assert.equal(document.activeElement, byId('reading'));
  });

  test('desktop focus recovery avoids a current page inside a collapsed branch', context => {
    const { byId, document, resize } = fixture(context, { mobile: true });
    byId('home').removeAttribute('aria-current');
    byId('leaf').setAttribute('aria-current', 'page');
    byId('menu-toggle-btn').click();
    resize(false);
    assert.equal(document.activeElement, byId('home'));
  });

  test('breakpoint focus recovery also handles native blur before the media-query event', context => {
    for (const opened of [false, true]) {
      const { byId, document, viewport, window } = fixture(context, { mobile: true });
      byId('menu-toggle-btn').focus();
      if (opened) byId('menu-toggle-btn').click();
      viewport.matches = false;
      document.activeElement.blur();
      viewport.dispatchEvent(new window.Event('change'));
      assert.equal(document.activeElement, byId('home'));
      assert.equal(byId('wiki-side-panel').inert, false);
    }
  });
});

describe('Wiki search', () => {
  const assert = require('node:assert/strict');
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  const test = require('node:test');
  const { JSDOM } = require(require.resolve('jsdom', {
    paths: [resolve(__dirname, '../../../frontend')],
  }));

  const templates = resolve(__dirname, '../../../seahub/templates/wiki');
  const shell = readFileSync(resolve(templates, 'wiki_publish_ssr.html'), 'utf8');
  const script = shell.match(/<script>\s*(function getElement[\s\S]*?)<\/script>/)[1];
  const partial = readFileSync(resolve(templates, '_wiki_publish_ssr_search.html'), 'utf8');
  const trigger = partial.split("{% if placement == 'trigger' %}")[1]
    .split("{% elif placement == 'modal' %}")[0];
  const modal = partial.split("{% elif placement == 'modal' %}")[1].split('{% endif %}')[0];
  const translate = html => html.replace(/\{% trans (['"])(.*?)\1 %\}/g, (match, quote, text) => text)
    .replace(/\{\{ MEDIA_URL \}\}/g, '/media/');

  function fixture(context, { mobile = false, drawerOpen = false } = {}) {
    const dom = new JSDOM(`
      <style>.hidden,[hidden]{display:none}</style>
      <div id="wiki-ssr-root">
        <nav id="wiki-side-panel">
          <button id="side-panel-close">Close navigation</button>${translate(trigger)}
          <ul id="wiki-nav-tree">
            <li class="wiki-page-item-wrapper"><div class="wiki-page-item selected-page">
              <a class="wiki-page-item-main" href="/wiki/publish/fixture/HOME/" data-page-id="HOME" aria-current="page"><span class="wiki-page-title">Home</span></a>
            </div></li>
            <li class="wiki-page-item-wrapper"><div class="wiki-page-item">
              <a class="wiki-page-item-main" href="/wiki/publish/fixture/NEXT/" data-page-id="NEXT"><span class="wiki-page-title">Next page</span></a>
            </div></li>
          </ul>
        </nav>
        <div id="wiki-resize-handle"></div>
        <main id="wiki-main-panel">
          <button id="menu-toggle-btn" aria-expanded="false">Navigation</button>
          <nav id="wiki-breadcrumb"></nav><h1 id="wiki-page-title" tabindex="-1">Home</h1>
          <a id="reading" href="#reading">Reading</a>
        </main>
      </div>
      <div id="wiki-mobile-overlay" aria-hidden="true"></div>
      <div id="wiki-navigation-status" class="sr-only" role="status"></div>
      ${translate(modal)}
    `, { url: 'https://wiki.test/wiki/publish/fixture/HOME/', runScripts: 'outside-only' });
    context.after(() => dom.window.close());
    const { window } = dom;
    const { document } = window;
    const viewport = new window.EventTarget();
    viewport.matches = mobile;
    window.matchMedia = () => viewport;
    window.requestAnimationFrame = callback => callback();
    window.HTMLElement.prototype.scrollIntoView = function () {};
    window.HTMLElement.prototype.getClientRects = function () {
      return this.closest('.hidden,[hidden]') ? [] : [this.getBoundingClientRect()];
    };
    window.wiki = { config: { wikiId: 'fixture', repoName: 'Synthetic wiki', pageMeta: {
      HOME: { docUuid: 'home-doc', name: 'Home' },
      NEXT: { docUuid: 'next-doc', name: 'Next page' },
    } } };
    const timers = new Map();
    let timerId = 0;
    window.setTimeout = (callback, delay) => {
      timers.set(++timerId, { callback, delay });
      return timerId;
    };
    window.clearTimeout = identifier => timers.delete(identifier);
    const requests = [];
    window.fetch = (url, options) => new Promise((resolve, reject) => {
      requests.push({ url, options, resolve, reject });
    });
    window.eval(script);
    const byId = id => document.getElementById(id);
    function runTimers(delay) {
      for (const [identifier, timer] of [...timers]) {
        if (timer.delay !== delay) continue;
        timers.delete(identifier);
        timer.callback();
      }
    }
    function open(opener = 'wiki-search-trigger') {
      byId(opener).focus();
      if (opener === 'wiki-search-trigger') byId(opener).click();
      else document.dispatchEvent(new window.KeyboardEvent('keydown', {
        key: 'k', ctrlKey: true, bubbles: true, cancelable: true,
      }));
      runTimers(0);
    }
    function key(value, { shiftKey = false, target = byId('wiki-search-input') } = {}) {
      const event = new window.KeyboardEvent('keydown', {
        key: value, shiftKey, bubbles: true, cancelable: true,
      });
      target.dispatchEvent(event);
      return event;
    }
    function input(value) {
      byId('wiki-search-input').value = value;
      byId('wiki-search-input').dispatchEvent(new window.Event('input', { bubbles: true }));
    }
    async function respond(results, { index = requests.length - 1, ok = true } = {}) {
      requests[index].resolve({ ok, json: () => Promise.resolve({ results }) });
      for (let count = 0; count < 6; count++) await Promise.resolve();
    }
    if (drawerOpen) byId('menu-toggle-btn').click();
    return { window, document, byId, open, key, input, runTimers, requests, respond };
  }

  test('modal focus and background inert state are restored on cancel', context => {
    const { byId, document, open, key } = fixture(context);
    byId('wiki-mobile-overlay').inert = true;
    open();
    assert.equal(document.activeElement, byId('wiki-search-input'));
    assert.equal(byId('wiki-ssr-root').inert, true);
    assert.equal(key('Tab').defaultPrevented, true);
    assert.equal(document.activeElement, byId('wiki-search-input'));
    key('Escape');
    assert.equal(document.activeElement, byId('wiki-search-trigger'));
    assert.equal(byId('wiki-ssr-root').inert, false);
    assert.equal(byId('wiki-mobile-overlay').inert, true);
    assert.equal(byId('wiki-search-modal').getAttribute('aria-hidden'), 'true');
  });

  test('Ctrl+K restores its actual opener and Tab wraps between existing controls', context => {
    const { byId, document, open, input, key } = fixture(context);
    open('reading');
    input('query');
    key('Tab', { shiftKey: true });
    assert.equal(document.activeElement, byId('wiki-search-clear'));
    key('Tab', { target: byId('wiki-search-clear') });
    assert.equal(document.activeElement, byId('wiki-search-input'));
    key('Escape');
    assert.equal(document.activeElement, byId('reading'));
  });

  test('results expose stable active descendants without moving input focus', async context => {
    const { byId, document, open, input, key, runTimers, requests, respond } = fixture(context);
    open(); input('query'); runTimers(300);
    assert.equal(requests[0].options.method, 'POST');
    assert.equal(JSON.parse(requests[0].options.body).search_wiki, 'fixture');
    assert.equal(byId('wiki-search-input').getAttribute('aria-busy'), 'true');
    assert.equal(byId('wiki-search-announcement').textContent, 'Searching...');
    await respond([{ doc_uuid: 'home-doc' }, { doc_uuid: 'next-doc' }]);
    const field = byId('wiki-search-input');
    const firstId = field.getAttribute('aria-activedescendant');
    assert.equal(byId(firstId).getAttribute('aria-selected'), 'true');
    assert.equal(field.getAttribute('aria-expanded'), 'true');
    assert.equal(field.getAttribute('aria-busy'), 'false');
    key('ArrowDown');
    assert.notEqual(field.getAttribute('aria-activedescendant'), firstId);
    assert.equal(byId(field.getAttribute('aria-activedescendant')).dataset.pageId, 'NEXT');
    assert.equal(document.activeElement, field);
    assert.match(byId('wiki-search-announcement').textContent, /2/);
    key('ArrowUp');
    assert.equal(field.getAttribute('aria-activedescendant'), firstId);
  });

  test('no-result and failure states announce existing messages without dangling options', async context => {
    const { byId, open, input, runTimers, respond } = fixture(context);
    open(); input('none'); runTimers(300); await respond([]);
    assert.equal(byId('wiki-search-announcement').textContent, 'No result');
    assert.equal(byId('wiki-search-input').getAttribute('aria-activedescendant'), null);
    assert.equal(byId('wiki-search-input').getAttribute('aria-expanded'), 'false');
    input('failure'); runTimers(300); await respond([], { ok: false });
    assert.equal(byId('wiki-search-announcement').textContent, 'Search failed');
    assert.equal(byId('wiki-search-input').getAttribute('aria-busy'), 'false');
  });

  test('clear aborts pending work and removes active descendants without changing its focus target', async context => {
    const { byId, document, open, input, runTimers, requests, respond } = fixture(context);
    open(); input('query'); runTimers(300); await respond([{ doc_uuid: 'next-doc' }]);
    input('pending'); runTimers(300);
    byId('wiki-search-clear').click();
    assert.equal(requests[1].options.signal.aborted, true);
    assert.equal(document.activeElement, byId('wiki-search-input'));
    assert.equal(byId('wiki-search-input').getAttribute('aria-activedescendant'), null);
    await respond([{ doc_uuid: 'home-doc' }]);
    assert.equal(byId('wiki-search-result-list').children.length, 0);
  });

  test('desktop selection focuses the shell heading and updates title/current-page announcement', async context => {
    const { byId, document, open, input, key, runTimers, respond } = fixture(context);
    open(); input('next'); runTimers(300); await respond([{ doc_uuid: 'next-doc' }]);
    key('Enter');
    assert.equal(document.activeElement, byId('wiki-page-title'));
    assert.equal(document.title, 'Next page - Synthetic wiki');
    assert.equal(byId('wiki-navigation-status').textContent, 'Next page');
    assert.equal(byId('wiki-ssr-root').inert, false);
  });

  test('mobile selection preserves the existing open drawer and returns to its visible search trigger', async context => {
    const { byId, document, open, input, key, runTimers, respond } = fixture(context, { mobile: true, drawerOpen: true });
    open(); input('next'); runTimers(300); await respond([{ doc_uuid: 'next-doc' }]);
    key('Enter');
    assert.equal(document.activeElement, byId('wiki-search-trigger'));
    assert.ok(byId('wiki-side-panel').classList.contains('mobile-open'));
    assert.equal(byId('menu-toggle-btn').getAttribute('aria-expanded'), 'true');
    assert.equal(byId('wiki-navigation-status').textContent, 'Next page');
  });

  test('cancelled/older responses cannot reopen results or overwrite a later query', async context => {
    const { byId, open, input, key, runTimers, requests, respond } = fixture(context);
    open(); input('old'); runTimers(300);
    input('new'); runTimers(300);
    assert.equal(requests[0].options.signal.aborted, true);
    await respond([{ doc_uuid: 'next-doc' }]);
    await respond([{ doc_uuid: 'home-doc' }], { index: 0 });
    assert.equal(byId('wiki-search-result-list').firstElementChild.dataset.pageId, 'NEXT');
    input('pending'); runTimers(300); key('Escape');
    await respond([{ doc_uuid: 'home-doc' }]);
    assert.equal(byId('wiki-search-result-list').children.length, 0);
    assert.equal(byId('wiki-search-input').getAttribute('aria-activedescendant'), null);
  });
});

describe('Wiki splitter', () => {
  const assert = require('node:assert/strict');
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  const test = require('node:test');
  const { JSDOM } = require(require.resolve('jsdom', {
    paths: [resolve(__dirname, '../../../frontend')],
  }));

  const template = readFileSync(resolve(__dirname,
    '../../../seahub/templates/wiki/wiki_publish_ssr.html'), 'utf8');
  const script = template.match(/<script>\s*(function getElement[\s\S]*?)<\/script>/)[1];
  const handle = template.match(/<div\s+id="wiki-resize-handle"[\s\S]*?><\/div>/)[0]
    .replace(/\{% trans (['"])(.*?)\1 %\}/g, (match, quote, text) => text);
  const storageKey = 'sf_wiki_side_panel_width';

  function fixture(context, { mobile = false, saved, denied = false } = {}) {
    const dom = new JSDOM(`
      <nav id="wiki-side-panel"><button id="side-panel-close">Close</button></nav>
      ${handle}
      <main id="wiki-main-panel"><button id="menu-toggle-btn">Navigation</button>
        <h1 id="wiki-page-title">Synthetic page</h1></main>
      <div id="wiki-mobile-overlay"></div>
    `, { url: 'https://wiki.test/wiki/publish/fixture/HOME/', runScripts: 'outside-only' });
    context.after(() => dom.window.close());
    const { window } = dom;
    const { document } = window;
    const viewport = new window.EventTarget();
    viewport.matches = mobile;
    window.innerWidth = mobile ? 320 : 1280;
    window.matchMedia = () => viewport;
    window.requestAnimationFrame = callback => callback();
    if (saved !== undefined) window.localStorage.setItem(storageKey, saved);
    if (denied) Object.defineProperty(window, 'localStorage', { get() { throw new Error('Denied'); } });
    window.eval(script);
    const splitter = document.getElementById('wiki-resize-handle');
    const panel = document.getElementById('wiki-side-panel');
    function key(value, options = {}) {
      const event = new window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options });
      splitter.dispatchEvent(event);
      return event;
    }
    function resize(matches) {
      viewport.matches = matches;
      window.innerWidth = matches ? 320 : 1280;
      viewport.dispatchEvent(new window.Event('change'));
    }
    return { window, document, splitter, panel, key, resize };
  }

  test('initial/persisted widths are clamped and exposed by a named focusable separator', context => {
    for (const [saved, expected] of [[undefined, 260], ['bad', 260], ['100', 160], ['999', 520], ['285', 285]]) {
      const { splitter, panel } = fixture(context, { saved });
      assert.equal(splitter.tabIndex, 0);
      assert.equal(splitter.getAttribute('role'), 'separator');
      assert.equal(splitter.getAttribute('aria-controls'), 'wiki-side-panel');
      assert.equal(splitter.getAttribute('aria-valuemin'), '160');
      assert.equal(splitter.getAttribute('aria-valuemax'), '520');
      assert.equal(splitter.getAttribute('aria-valuenow'), String(expected));
      assert.equal(panel.style.width, expected + 'px');
    }
  });

  test('Left/Right and Home/End resize, clamp, expose and persist the same width', context => {
    const { splitter, panel, key, window } = fixture(context);
    for (const [value, expected] of [['ArrowRight', 270], ['ArrowLeft', 260], ['Home', 160], ['ArrowLeft', 160], ['End', 520], ['ArrowRight', 520]]) {
      assert.equal(key(value).defaultPrevented, true);
      assert.equal(panel.style.width, expected + 'px');
      assert.equal(splitter.getAttribute('aria-valuenow'), String(expected));
      assert.equal(window.localStorage.getItem(storageKey), String(expected));
      assert.equal(window.document.documentElement.style.getPropertyValue('--wiki-side-width'), expected + 'px');
    }
  });

  test('unrelated and modified keys retain their native behavior', context => {
    const { panel, key } = fixture(context);
    assert.equal(key('Tab').defaultPrevented, false);
    assert.equal(key('ArrowRight', { ctrlKey: true }).defaultPrevented, false);
    assert.equal(key('ArrowLeft', { metaKey: true }).defaultPrevented, false);
    assert.equal(key('End', { altKey: true }).defaultPrevented, false);
    assert.equal(panel.style.width, '260px');
  });

  test('existing pointer dragging updates the same state and persistence without new controls', context => {
    const { splitter, panel, document, window } = fixture(context);
    splitter.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    document.dispatchEvent(new window.MouseEvent('mousemove', { clientX: 333 }));
    assert.equal(panel.style.width, '333px');
    assert.equal(splitter.getAttribute('aria-valuenow'), '333');
    document.dispatchEvent(new window.MouseEvent('mouseup'));
    assert.equal(window.localStorage.getItem(storageKey), '333');
    assert.ok(!splitter.classList.contains('dragging'));
    assert.equal(document.body.style.cursor, '');
  });

  test('mobile separator is inert and omitted from Tab/AX while breakpoint changes rescue focus', context => {
    const { splitter, panel, key, resize, document } = fixture(context, { mobile: true });
    assert.equal(splitter.tabIndex, -1);
    assert.equal(splitter.inert, true);
    assert.equal(splitter.getAttribute('aria-hidden'), 'true');
    assert.equal(key('ArrowRight').defaultPrevented, false);
    assert.equal(panel.style.width, '260px');
    resize(false);
    assert.equal(splitter.tabIndex, 0);
    assert.equal(splitter.inert, false);
    assert.equal(splitter.getAttribute('aria-hidden'), 'false');
    splitter.focus();
    resize(true);
    assert.equal(document.activeElement.id, 'menu-toggle-btn');
  });

  test('storage restrictions do not prevent keyboard resizing', context => {
    const { splitter, panel, key } = fixture(context, { denied: true });
    key('ArrowRight');
    assert.equal(panel.style.width, '270px');
    assert.equal(splitter.getAttribute('aria-valuenow'), '270');
  });
});
