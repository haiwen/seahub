import React, { useCallback, useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../../utils/constants';
import { KeyCodes } from '../../../../constants';
import { DEFAULT_NUMBER_FORMAT } from '../../../constants';
import { Utils } from '../../../../utils/utils';
import ObjectUtils from '../../../../utils/object';
import { isCellValueChanged, getNumberDisplayString, replaceNumberNotAllowInput, formatStringToNumber } from '../../../utils/cell';

import './index.css';

const NumberEditor = React.memo(({ value: oldValue, field, onChange: onChangeAPI }) => {
  const [value, setValue] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const validValue = oldValue || oldValue === 0 ? oldValue : '';
    const data = field?.data || {};
    const value = getNumberDisplayString(validValue, data) || '';
    setValue(value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oldValue, field]);

  const valueChange = useCallback((event) => {
    const format = field?.data?.format || DEFAULT_NUMBER_FORMAT;
    const currency_symbol = format === 'custom_currency' ? field.data['currency_symbol'] : null;
    const initValue = event.target.value.trim();
    // Prevent the repetition of periods bug in the Chinese input method of the Windows system
    if (!Utils.isMac() && initValue.indexOf('.。') > -1) return;
    const newValue = replaceNumberNotAllowInput(initValue, format, currency_symbol);
    if (newValue === value) return;
    setValue(newValue);
  }, [field, value]);

  const onBlur = useCallback(() => {
    const newValue = formatStringToNumber(value, field.data);
    if (newValue === oldValue) return;
    onChangeAPI(newValue);
  }, [oldValue, value, field, onChangeAPI]);

  const onPaste = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const onCut = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const onKeyDown = useCallback((event) => {
    const { selectionStart, selectionEnd, value } = event.currentTarget;
    if (event.keyCode === KeyCodes.Enter) {
      event.preventDefault();
      ref.current && ref.current.blur();
    } else if (
      (event.keyCode === KeyCodes.ChineseInputMethod) ||
      (event.keyCode === KeyCodes.LeftArrow && selectionStart === 0) ||
      (event.keyCode === KeyCodes.RightArrow && selectionEnd === value.length)
    ) {
      event.stopPropagation();
    }
  }, []);

  const onCompositionEnd = useCallback((event) => {
    valueChange(event);
  }, [valueChange]);

  return (
    <input
      ref={ref}
      type="text"
      className="sf-metadata-number-property-detail-editor form-control"
      placeholder={gettext('Empty') || ''}
      onBlur={onBlur}
      onCut={onCut}
      onPaste={onPaste}
      value={value}
      name={field.name}
      title={field.name}
      aria-label={field.name}
      onChange={valueChange}
      onKeyDown={onKeyDown}
      onCompositionEnd={onCompositionEnd}
    />
  );


}, (props, nextProps) => {
  const isChanged = isCellValueChanged(props.value, nextProps.value, nextProps.field.type) ||
    !ObjectUtils.isSameObject(props.field, nextProps.field) ||
    props.onChange !== nextProps.onChange
    ;
  return !isChanged;
});

NumberEditor.propTypes = {
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  field: PropTypes.object.isRequired,
  onChange: PropTypes.func,
};

export default NumberEditor;
