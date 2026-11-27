const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const { JSDOM } = require(require.resolve('jsdom', {
  paths: [resolve(__dirname, '../../../frontend')],
}));

assert.ok(process.env.EDITOR_A11Y_FIXTURES,
  'Render test_editor_templates.py --fixtures and set EDITOR_A11Y_FIXTURES to that JSON file.');
const fixtures = JSON.parse(readFileSync(process.env.EDITOR_A11Y_FIXTURES, 'utf8'));

function shell(context, name, { safari = false, width = 1280 } = {}) {
  const dom = new JSDOM(fixtures[name], {
    url: 'https://shell.invalid/fixture', runScripts: 'outside-only',
  });
  context.after(() => dom.window.close());
  const { window } = dom;
  const { document } = window;
  const submissions = [];
  const constructors = [];
  const animationFrames = [];
  const intervals = [];
  Object.defineProperty(window.navigator, 'userAgent', { value: safari ?
    'Version/18.0 Safari/605.1.15' : 'Chrome/157.0 Safari/537.36' });
  Object.defineProperty(window.screen, 'width', { value: width });
  window.HTMLFormElement.prototype.submit = function () {
    submissions.push({
      target: this.target, action: this.action, method: this.method,
      frameClass: document.getElementById(this.target).className,
    });
  };
  window.requestAnimationFrame = callback => animationFrames.push(callback);
  window.setInterval = (callback, delay) => intervals.push({ callback, delay });
  window.DocsAPI = {
    DocEditor: function (placeholder, config) {
      constructors.push({ placeholder, config });
      const frame = document.createElement('iframe');
      frame.title = 'Synthetic SDK-supplied name';
      document.getElementById(placeholder).replaceWith(frame);
    },
  };
  for (const script of document.querySelectorAll('script:not([src])')) {
    window.eval(script.textContent);
  }
  return { window, document, submissions, constructors, animationFrames, intervals };
}

test('owned frames retain their handoff sequence without loading a real editor', context => {
  for (const name of ['view_file_wopi.html', 'view_file_thirdparty_editor.html']) {
    const { document, submissions } = shell(context, name);
    assert.equal(document.documentElement.lang, 'de');
    const frame = document.querySelector('iframe');
    assert.equal(frame.title, 'Résumé "budget" & <script>fixture</script>.docx');
    assert.deepEqual(submissions, [{
      target: 'office_frame', action: 'https://editor.invalid/fixture', method: 'post',
      frameClass: name === 'view_file_wopi.html' ? 'hide' : '',
    }]);
    assert.equal(frame.className, '');
  }
});

test('OnlyOffice keeps immediate desktop/mobile initialization and SDK-owned metadata', context => {
  for (const width of [390, 1280]) {
    const { document, constructors, intervals } = shell(context,
      'view_file_onlyoffice.html', { width });
    assert.equal(document.documentElement.lang, 'de');
    assert.equal(constructors.length, 1);
    assert.equal(constructors[0].placeholder, 'placeholder');
    assert.equal(constructors[0].config.editorConfig.lang, 'de');
    assert.equal(constructors[0].config.type, width < 992 ? 'mobile' : 'desktop');
    assert.equal(constructors[0].config.editorConfig.mode, 'view');
    assert.equal(document.querySelector('iframe').title, 'Synthetic SDK-supplied name');
    assert.equal(intervals.length, 0);
  }
});

test('OnlyOffice Safari still waits for load and animation frame', context => {
  const { window, constructors, animationFrames } = shell(context,
    'view_file_onlyoffice.html', { safari: true });
  assert.equal(constructors.length, 0);
  assert.equal(animationFrames.length, 0);
  window.onload();
  assert.equal(constructors.length, 0);
  assert.equal(animationFrames.length, 1);
  animationFrames[0]();
  assert.equal(constructors.length, 1);
  assert.equal(constructors[0].config.editorConfig.lang, 'de');
});

test('OnlyOffice edit/share configurations preserve lock timer and history handlers', context => {
  for (const name of ['onlyoffice-edit', 'onlyoffice-share']) {
    const { constructors, intervals } = shell(context, name);
    const { config } = constructors[0];
    assert.equal(config.editorConfig.mode, 'edit');
    assert.equal(intervals.length, 1);
    assert.equal(intervals[0].delay, 40 * 60 * 1000);
    if (name === 'onlyoffice-edit') {
      assert.equal(config.token, 'synthetic-jwt');
      assert.equal(typeof config.events.onRequestHistory, 'function');
      assert.equal(typeof config.events.onRequestHistoryData, 'function');
      assert.equal(typeof config.events.onRequestHistoryClose, 'function');
      assert.equal(typeof config.events.onRequestReferenceData, 'function');
      assert.equal(config.document.permissions.download, true);
      assert.equal(config.document.permissions.copy, true);
    }
  }
});
