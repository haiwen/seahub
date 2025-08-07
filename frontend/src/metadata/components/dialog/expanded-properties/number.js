import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { formatStringToNumber, getCellValueByColumn, getNumberDisplayString, replaceNumberNotAllowInput } from '../../../utils/cell';
import { DEFAULT_NUMBER_FORMAT, PRIVATE_COLUMN_KEYS } from '../../../constants';
import { KeyCodes } from '../../../../constants';
import { Utils } from '../../../../utils/utils';

const Number = ({ record, column, onCommit }) => {
  const [inputValue, setInputValue] = useState('');

  const inputRef = useRef(null);

  const data = useMemo(() => {
    const { data } = column;
    return data || { format: DEFAULT_NUMBER_FORMAT };
  }, [column]);
  const value = useMemo(() => getCellValueByColumn(record, column), [record, column]);
  const displayValue = useMemo(() => getNumberDisplayString(value, column.data), [value, column]);

  const onChange = useCallback((e) => {
    const format = data?.format || DEFAULT_NUMBER_FORMAT;
    const currency_symbol = format === 'custom_currency' ? data['currency_symbol'] : null;
    const initValue = e.target.value.trim();
    // Prevent the repetition of periods bug in the Chinese input method of the Windows system
    if (!Utils.isMac() && initValue.indexOf('.。') > -1) return;
    const newValue = replaceNumberNotAllowInput(initValue, format, currency_symbol);
    if (newValue === value) return;
    setInputValue(newValue);
  }, [data, value]);

  const onBlur = useCallback(() => {
    const newValue = formatStringToNumber(inputValue, data);
    onCommit(column, newValue);
  }, [data, inputValue, column, onCommit]);

  const onKeyDown = useCallback((e) => {
    if (e.keyCode === KeyCodes.Esc) {
      e.stopPropagation();
      setTimeout(() => {
        inputRef.current && inputRef.current.blur();
      }, 1);
      return;
    }
    const { selectionStart, selectionEnd, value } = e.currentTarget;
    if (
      e.keyCode === KeyCodes.ChineseInputMethod ||
        e.keyCode === KeyCodes.LeftArrow && selectionStart === 0 ||
        e.keyCode === KeyCodes.RightArrow && selectionEnd === value.length
    ) {
      e.stopPropagation();
    }
  }, []);

  useEffect(() => {
    const validValue = value || value === 0 ? value : '';
    const data = column?.data || {};
    const newValue = getNumberDisplayString(validValue, data) || '';
    setInputValue(newValue);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (PRIVATE_COLUMN_KEYS.includes(column.key)) {
    return (
      <div className="form-control disabled shrink">
        {displayValue}
      </div>
    );
  }

  return (
    <input
      className="form-control shrink"
      type="text"
      ref={inputRef}
      value={inputValue}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onCut={(e) => e.stopPropagation()}
      onPaste={(e) => e.stopPropagation()}
    />
  );
};

Number.propTypes = {
  record: PropTypes.object.isRequired,
  column: PropTypes.object.isRequired,
};

export default Number;
