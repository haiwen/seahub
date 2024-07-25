import React, { forwardRef, useMemo, useImperativeHandle, useCallback, useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import {
  getNumberDisplayString, DEFAULT_NUMBER_FORMAT, formatStringToNumber, replaceNumberNotAllowInput, isMac,
  isFunction
} from '../../_basic';
import { KeyCodes } from '../../../../constants';

const NumberEditor = forwardRef(({
  readOnly,
  column,
  value: oldValue,
  onCommit,
  onChange: propsOnchange,
  selectDownCell,
}, ref) => {
  const data = useMemo(() => {
    const { data } = column; // data maybe 'null'
    return data || { format: DEFAULT_NUMBER_FORMAT };
  }, [column]);
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const validValue = oldValue || oldValue === 0 ? oldValue : '';
    const data = column?.data || {};
    const value = getNumberDisplayString(validValue, data) || '';
    setValue(value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = useCallback((event) => {
    const format = data?.format || DEFAULT_NUMBER_FORMAT;
    const currency_symbol = format === 'custom_currency' ? data['currency_symbol'] : null;
    const initValue = event.target.value.trim();
    // Prevent the repetition of periods bug in the Chinese input method of the Windows system
    if (!isMac() && initValue.indexOf('.。') > -1) return;
    const newValue = replaceNumberNotAllowInput(initValue, format, currency_symbol);
    if (newValue === value) return;
    setValue(newValue);
    propsOnchange && propsOnchange(event, newValue);
  }, [data, value, propsOnchange]);

  const onBlur = useCallback(() => {
    isFunction(onCommit) && onCommit();
  }, [onCommit]);

  const onKeyDown = useCallback((event) => {
    let { selectionStart, selectionEnd, value } = event.currentTarget;
    if (event.keyCode === KeyCodes.Enter || event.keyCode === KeyCodes.Esc) {
      event.preventDefault();
      onBlur();
      isFunction(selectDownCell) && selectDownCell();
    } else if ((event.keyCode === KeyCodes.LeftArrow && selectionStart === 0) ||
      (event.keyCode === KeyCodes.RightArrow && selectionEnd === value.length)
    ) {
      event.stopPropagation();
    }
  }, [onBlur, selectDownCell]);

  const onPaste = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const onCut = useCallback((event) => {
    event.stopPropagation();
  }, []);

  useImperativeHandle(ref, () => ({
    getValue: () => {
      const { key } = column;
      return { [key]: formatStringToNumber(value, data) };
    },
    getInputNode: () => {
      const domNode = ReactDOM.findDOMNode(inputRef.current);
      if (domNode.tagName === 'INPUT') return domNode;
      return domNode.querySelector('input:not([type=hidden])');
    },
  }), [column, value, data]);

  return (
    <input
      ref={inputRef}
      type="text"
      className="form-control"
      value={value}
      onBlur={onBlur}
      onPaste={onPaste}
      onCut={onCut}
      onKeyDown={onKeyDown}
      onChange={onChange}
      style={{ textAlign: 'right' }}
      disabled={readOnly}
    />
  );
});

NumberEditor.propTypes = {
  readOnly: PropTypes.bool,
  column: PropTypes.object,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onCommit: PropTypes.func,
  onChange: PropTypes.func,
  selectDownCell: PropTypes.func,
};

export default NumberEditor;
