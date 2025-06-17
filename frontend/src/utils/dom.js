export const getEventClassName = (e) => {
  // svg mouseEvent event.target.className is an object
  if (!e || !e.target) return '';
  return e.target.getAttribute('class') || '';
};

export const addClassName = (originClassName, targetClassName) => {
  const originClassNames = originClassName.split(' ');
  if (originClassNames.indexOf(targetClassName) > -1) return originClassName;
  return originClassName + ' ' + targetClassName;
};

export const removeClassName = (originClassName, targetClassName) => {
  let originClassNames = originClassName.split(' ');
  const targetClassNameIndex = originClassNames.indexOf(targetClassName);
  if (targetClassNameIndex < 0) return originClassName;
  originClassNames.splice(targetClassNameIndex, 1);
  return originClassNames.join(' ');
};

const isReactRefObj = (target) => {
  if (target && typeof target === 'object') return 'current' in target;
  return false;
};

const isObject = (value) => {
  const type = typeof value;
  return value != null && (type === 'object' || type === 'function');
};

const getTag = (value) => {
  if (value == null) return value === undefined ? '[object Undefined]' : '[object Null]';
  return Object.prototype.toString.call(value);
};

const isFunction = (value) => {
  if (!isObject(value)) return false;

  const tag = getTag(value);
  return (
    tag === '[object Function]' ||
    tag === '[object AsyncFunction]' ||
    tag === '[object GeneratorFunction]' ||
    tag === '[object Proxy]'
  );
};

export const canUseDOM = !!(
  typeof window !== 'undefined' &&
  window.document &&
  window.document.createElement
);

export const findDOMElements = (target) => {
  if (isReactRefObj(target)) return target.current;
  if (isFunction(target)) return target();

  if (typeof target === 'string' && canUseDOM) {
    let selection = document.querySelectorAll(target);
    if (!selection.length) {
      selection = document.querySelectorAll(`#${target}`);
    }
    if (!selection.length) {
      throw new Error(
        `The target '${target}' could not be identified in the dom, tip: check spelling`,
      );
    }
    return selection;
  }
  return target;
};

const isArrayOrNodeList = (els) => {
  if (els === null) return false;
  return Array.isArray(els) || (canUseDOM && typeof els.length === 'number');
};

export const getTarget = (target, allElements) => {
  const els = findDOMElements(target);
  if (allElements) {
    if (isArrayOrNodeList(els)) return els;
    if (els === null) return [];
    return [els];
  }
  if (isArrayOrNodeList(els)) return els[0];
  return els;
};
