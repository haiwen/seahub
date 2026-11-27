const { describe } = require('node:test');

describe('Form validation', () => {
  const assert = require('node:assert/strict');
  const {readFileSync} = require('node:fs');
  const {resolve} = require('node:path');
  const {test} = require('node:test');
  const {runInNewContext} = require('node:vm');

  const source = readFileSync(resolve(__dirname,
    '../../../seahub/templates/snippets/form_validation_js.html'), 'utf8');

  function fixture() {
    const active = {element: null};
    function element(attributes = {}) {
      const values = new Map(Object.entries(attributes));
      const classes = new Set();
      return {
        get id() { return values.get('id') || ''; },
        set id(value) { values.set('id', value); },
        getAttribute: name => values.has(name) ? values.get(name) : null,
        setAttribute: (name, value) => values.set(name, String(value)),
        removeAttribute: name => values.delete(name),
        classList: {
          add: name => classes.add(name),
          remove: name => classes.delete(name),
          contains: name => classes.has(name),
        },
        focus() { active.element = this; },
        innerHTML: '',
        textContent: '',
      };
    }
    function form(id = 'account-form') {
      const container = element({id});
      const fields = {
        password: element({'aria-describedby': 'requirements'}),
        confirmation: element(),
        email: element(),
      };
      const listeners = new Map();
      const error = element({role: 'alert', id: id + '-error'});
      error.classList.add('hide');
      container.elements = {namedItem: name => fields[name] || null};
      container.addEventListener = (name, handler) => listeners.set(name, handler);
      container.querySelector = selector => {
        if (selector === '[data-form-error]') return container.error;
        if (selector === '.errorlist.nonfield, [data-server-error]') return container.summary;
        return Object.values(fields).find(field => field.getAttribute('aria-invalid') === 'true') || null;
      };
      container.edit = (name, event = 'input') => listeners.get(event)?.({target: fields[name]});
      container.error = error;
      return {container, fields, error, listeners};
    }
    const validation = runInNewContext(source + '\nformValidation;');
    return {validation, form, element, active};
  }

  test('setup is opt-in, handles missing forms, and is idempotent', () => {
    const {validation, form, active} = fixture();
    const {container, listeners} = form();
    assert.equal(active.element, null);
    assert.equal(validation.setup(null), null);
    const state = validation.setup(container);
    assert.equal(validation.setup(container), state);
    assert.equal(listeners.size, 2);
    assert.equal(active.element, null);
  });

  test('a client error is scoped, associated, and focuses its field', () => {
    const {validation, form, active} = fixture();
    const first = form('first-form');
    const second = form('second-form');
    assert.equal(validation.showError(first.container, 'password', 'Existing message'), false);
    assert.equal(first.fields.password.getAttribute('aria-invalid'), 'true');
    assert.equal(first.fields.password.getAttribute('aria-describedby'), 'requirements first-form-error');
    assert.equal(active.element, first.fields.password);
    assert.equal(first.error.innerHTML, 'Existing message');
    assert.equal(first.error.getAttribute('role'), 'alert');
    assert.equal(first.error.classList.contains('hide'), false);
    assert.equal(second.error.classList.contains('hide'), true);
    assert.equal(second.fields.password.getAttribute('aria-invalid'), null);
  });

  test('an unrelated edit keeps the error; related input clears only client state', () => {
    const {validation, form} = fixture();
    const {container, fields, error} = form();
    validation.showError(container, 'password', 'Existing message');
    container.edit('email');
    assert.equal(fields.password.getAttribute('aria-invalid'), 'true');
    fields.password.setAttribute('aria-describedby', fields.password.getAttribute('aria-describedby') + ' additional-help');
    container.edit('password');
    assert.equal(fields.password.getAttribute('aria-invalid'), null);
    assert.equal(fields.password.getAttribute('aria-describedby'), 'requirements additional-help');
    assert.equal(error.innerHTML, 'Existing message');
    assert.equal(error.classList.contains('hide'), false);
  });

  test('either mismatched password clears both states while confirmation receives focus', () => {
    const {validation, form, active} = fixture();
    const {container, fields} = form();
    validation.showError(container, ['confirmation', 'password'], 'Existing mismatch');
    assert.equal(active.element, fields.confirmation);
    assert.equal(fields.password.getAttribute('aria-invalid'), 'true');
    container.edit('password', 'change');
    assert.equal(fields.password.getAttribute('aria-invalid'), null);
    assert.equal(fields.confirmation.getAttribute('aria-invalid'), null);
    assert.equal(fields.confirmation.getAttribute('aria-describedby'), null);
  });

  test('replacing an error removes the previous field association', () => {
    const {validation, form} = fixture();
    const {container, fields} = form();
    validation.showError(container, 'email', 'Existing email error');
    validation.showError(container, 'password', 'Existing password error');
    assert.equal(fields.email.getAttribute('aria-invalid'), null);
    assert.equal(fields.email.getAttribute('aria-describedby'), null);
    assert.equal(fields.password.getAttribute('aria-invalid'), 'true');
  });

  test('clearing a client error preserves pre-existing server invalidity and descriptions', () => {
    const {validation, form} = fixture();
    const {container, fields} = form();
    fields.password.setAttribute('aria-invalid', 'true');
    fields.password.setAttribute('aria-describedby', 'requirements server-password-error');
    validation.showError(container, 'password', 'Existing client message');
    container.edit('password');
    assert.equal(fields.password.getAttribute('aria-invalid'), 'true');
    assert.equal(fields.password.getAttribute('aria-describedby'), 'requirements server-password-error');
  });

  test('clearing client metadata does not change the visible message or server associations', () => {
    const {validation, form} = fixture();
    const {container, fields, error} = form();
    error.innerHTML = 'Existing server message';
    error.classList.remove('hide');
    fields.password.setAttribute('aria-invalid', 'true');
    fields.password.setAttribute('aria-describedby', 'requirements account-form-error');
    validation.showError(container, 'password', 'Existing client message');
    container.edit('password');
    assert.equal(error.innerHTML, 'Existing client message');
    assert.equal(error.classList.contains('hide'), false);
    assert.equal(fields.password.getAttribute('aria-invalid'), 'true');
    assert.equal(fields.password.getAttribute('aria-describedby'), 'requirements account-form-error');
  });

  test('generic failures focus and describe the error without blaming any field', () => {
    const {validation, form, active} = fixture();
    const {container, fields, error} = form();
    container.setAttribute('aria-describedby', 'form-instructions');
    validation.showError(container, [], 'Existing AJAX failure');
    assert.equal(active.element, error);
    assert.equal(error.getAttribute('tabindex'), '-1');
    assert.equal(container.getAttribute('aria-describedby'), 'form-instructions account-form-error');
    assert.equal(fields.password.getAttribute('aria-invalid'), null);
    validation.showError(container, 'email', 'Existing field failure');
    assert.equal(container.getAttribute('aria-describedby'), 'form-instructions');
  });

  test('server summaries are focusable, associated once, and do not mark credentials invalid', () => {
    const {validation, form, element, active} = fixture();
    const {container, fields} = form();
    container.summary = element();
    container.summary.textContent = 'Existing server failure';
    validation.setup(container);
    assert.equal(active.element, container.summary);
    assert.equal(container.summary.id, 'account-form-server-error');
    assert.equal(container.getAttribute('aria-describedby'), 'account-form-server-error');
    assert.equal(fields.password.getAttribute('aria-invalid'), null);
    validation.setup(container);
    assert.equal(container.getAttribute('aria-describedby'), 'account-form-server-error');
  });

  test('field-specific server failures focus their invalid field', () => {
    const {validation, form, active} = fixture();
    const {container, fields} = form();
    fields.email.setAttribute('aria-invalid', 'true');
    validation.setup(container);
    assert.equal(active.element, fields.email);
  });

  test('a form without a client error region is not given new markup', () => {
    const {validation, form, active} = fixture();
    const {container, fields} = form();
    container.error = null;
    assert.equal(validation.showError(container, 'email', 'Existing message'), false);
    assert.equal(active.element, null);
    assert.equal(fields.email.getAttribute('aria-invalid'), null);
  });
});

describe('Two-factor setup', () => {
  const assert = require('node:assert/strict');
  const { readFileSync } = require('node:fs');
  const path = require('node:path');
  const test = require('node:test');
  const vm = require('node:vm');

  const templates = path.join(__dirname, '../../../seahub/templates/snippets');
  const validationSource = readFileSync(path.join(templates, 'form_validation_js.html'), 'utf8');
  const setupSource = readFileSync(path.join(templates, 'two_factor_setup_js.html'), 'utf8')
    .replace('{% load i18n %}', '')
    .replace('{% trans "Token" %}', 'Token');

  function fixture(options = {}) {
    const document = { activeElement: null };
    function element(id, attributes = {}) {
      const classes = new Set();
      return {
        id,
        attributes: { ...attributes },
        textContent: '',
        classList: {
          add: (...names) => names.forEach(name => classes.add(name)),
          contains: name => classes.has(name)
        },
        getAttribute(name) { return this.attributes[name] ?? null; },
        setAttribute(name, value) {
          this.attributes[name] = value;
          if (name === 'id') this.id = value;
        },
        removeAttribute(name) { delete this.attributes[name]; },
        focus() { document.activeElement = this; }
      };
    }
    const form = element('two-factor-setup-form');
    const instructions = element('two-factor-setup-instructions',
      options.warning ? { role: 'alert' } : {});
    instructions.textContent = 'Existing setup instructions';
    const field = element(options.phone ? 'id_sms-number' : 'id_generator-token', {
      type: options.method ? 'radio' : options.phone ? 'text' : 'number',
      'aria-describedby': options.description || 'existing-help'
    });
    field.value = '001234';
    const previous = element('existing-label-or-error');
    previous.textContent = options.fieldError ? 'Existing field error' : 'Token:';
    field.previousElementSibling = previous;
    if (options.fieldError) field.setAttribute('aria-invalid', 'true');
    const summary = options.summary ? element('') : null;
    if (summary) summary.textContent = 'Existing form error';
    const hidden = element('id_setup_view-current_step', { type: 'hidden' });
    form.addEventListener = () => {};
    form.querySelectorAll = () => [field];
    form.querySelector = selector => {
      if (selector === '[data-form-error]') return null;
      if (selector.includes('.errorlist.nonfield')) return summary;
      if (selector.includes('aria-invalid')) {
        return field.getAttribute('aria-invalid') === 'true' ? field : null;
      }
      if (selector.includes('input[type="text"]')) return options.method ? null : field;
      throw new Error('Unexpected selector: ' + selector);
    };
    const elements = {
      'two-factor-setup-form': options.missingForm ? null : form,
      'two-factor-setup-instructions': options.noInstructions ? null : instructions,
      'id_generator-token': options.phone || options.method ? null : field
    };
    document.getElementById = id => elements[id] || null;
    const context = vm.createContext({ document });
    vm.runInContext(validationSource, context);
    const run = () => vm.runInContext(setupSource, context);
    return { document, form, instructions, field, previous, summary, hidden, run };
  }

  test('setup is inert when its form is absent', () => {
    const state = fixture({ missingForm: true });
    state.run();
    assert.equal(state.document.activeElement, null);
    assert.equal(state.field.getAttribute('aria-describedby'), 'existing-help');
  });

  test('generator instructions preserve existing descriptions and the first input receives focus', () => {
    const state = fixture();
    state.run();
    assert.equal(state.field.getAttribute('aria-describedby'),
      'existing-help two-factor-setup-instructions');
    assert.equal(state.form.getAttribute('aria-describedby'), 'two-factor-setup-instructions');
    assert.equal(state.hidden.getAttribute('aria-describedby'), null);
    assert.equal(state.document.activeElement, state.field);
    assert.equal(state.field.value, '001234');
    assert.ok(state.previous.classList.contains('sr-only'));
    assert.ok(!state.previous.classList.contains('d-none'));
    assert.ok(state.field.classList.contains('form-control'));
    assert.equal(state.field.getAttribute('placeholder'), 'Token');
  });

  test('the previously hidden server error stays visually hidden but accessible', () => {
    const state = fixture({ fieldError: true, description: 'existing-error existing-help' });
    state.run();
    assert.ok(state.previous.classList.contains('sr-only'));
    assert.ok(!state.previous.classList.contains('d-none'));
    assert.equal(state.previous.textContent, 'Existing field error');
    assert.equal(state.field.getAttribute('aria-invalid'), 'true');
    assert.equal(state.field.getAttribute('aria-describedby'),
      'existing-error existing-help two-factor-setup-instructions');
    assert.equal(state.document.activeElement, state.field);
  });

  test('a non-field error summary takes focus before an invalid input', () => {
    const state = fixture({ summary: true, fieldError: true });
    state.run();
    assert.equal(state.document.activeElement, state.summary);
    assert.equal(state.summary.getAttribute('tabindex'), '-1');
    assert.equal(state.form.getAttribute('aria-describedby'),
      'two-factor-setup-instructions two-factor-setup-form-server-error');
    assert.equal(state.summary.textContent, 'Existing form error');
  });

  test('a failed challenge focuses the existing warning without blaming the token', () => {
    const state = fixture({ warning: true, phone: true });
    state.run();
    assert.equal(state.document.activeElement, state.instructions);
    assert.equal(state.instructions.getAttribute('tabindex'), '-1');
    assert.equal(state.field.getAttribute('aria-invalid'), null);
    assert.equal(state.instructions.textContent, 'Existing setup instructions');
  });

  test('a field-specific error takes priority over the existing challenge warning', () => {
    const state = fixture({ warning: true, fieldError: true, phone: true });
    state.run();
    assert.equal(state.document.activeElement, state.field);
  });

  test('method radios receive instructions without forcing focus or changing values', () => {
    const state = fixture({ method: true });
    state.run();
    assert.equal(state.document.activeElement, null);
    assert.equal(state.field.value, '001234');
    assert.equal(state.field.getAttribute('aria-describedby'),
      'existing-help two-factor-setup-instructions');
    assert.ok(!state.previous.classList.contains('sr-only'));
  });

  test('absent instructions do not create dangling references', () => {
    const state = fixture({ noInstructions: true, phone: true });
    state.run();
    assert.equal(state.form.getAttribute('aria-describedby'), null);
    assert.equal(state.field.getAttribute('aria-describedby'), 'existing-help');
    assert.equal(state.document.activeElement, state.field);
  });

  test('repeated initialization does not duplicate descriptions or replace error focus', () => {
    const state = fixture({ summary: true });
    state.run();
    state.run();
    assert.equal(state.document.activeElement, state.summary);
    assert.equal(state.field.getAttribute('aria-describedby'),
      'existing-help two-factor-setup-instructions');
    assert.equal(state.form.getAttribute('aria-describedby'),
      'two-factor-setup-instructions two-factor-setup-form-server-error');
  });
});
