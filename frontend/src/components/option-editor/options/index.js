import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import classnames from 'classnames';
import { isEnter } from '../../../utils/hotkey';
import { isFunction, isNumber } from '../../../utils/type-detection';
import CenteredLoading from '../../centered-loading';
import Tip from '../tip';
import Option from './option';
import './index.css';

const isUpArrow = (e) => e.key === 'ArrowUp';
const isDownArrow = (e) => e.key === 'ArrowDown';
const isTab = (e) => e.key === 'Tab';
const isEsc = (e) => e.key === 'Escape';

const Options = ({
  isLoading = false,
  hasAvailableOptions = false,
  options,
  maxHeight,
  isSearchEnabled,
  searchValue,
  emptyTip,
  value,
  checkPlacement,
  optionHeight,
  optionClassName,
  onToggleOption,
  onPressTab,
  onToggle,
}) => {
  const maxItemNum = useMemo(() => isNumber(optionHeight) ? Math.floor(parseInt(maxHeight) / parseInt(optionHeight)) - 1 : 30, [maxHeight, optionHeight]);

  const optionsRef = useRef(null);

  const [highlightIndex, setHighlightIndex] = useState(-1);

  const onOptionMouseEnter = useCallback((highlightIndex) => {
    setHighlightIndex(highlightIndex);
  }, []);

  const onOptionMouseLeave = useCallback(() => {
    setHighlightIndex(-1);
  }, []);

  const onEnter = useCallback((event) => {
    event.preventDefault();
    let option;
    if (options.length === 1) {
      option = options[0];
    } else if (highlightIndex > -1) {
      option = options[highlightIndex];
    }
    if (!option) return;
    onToggleOption(option.value);
  }, [options, highlightIndex, onToggleOption]);

  const onUpArrow = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (highlightIndex > 0) {
      setHighlightIndex(highlightIndex - 1);
      if (highlightIndex < options.length - maxItemNum) {
        optionsRef.current.scrollTop -= (isNumber(optionHeight) ? optionHeight : 30);
      }
    } else {
      setHighlightIndex(options.length - 1);
      optionsRef.current.scrollTop = optionsRef.current.scrollHeight;
    }
  }, [optionsRef, highlightIndex, maxItemNum, options, optionHeight]);

  const onDownArrow = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (highlightIndex < options.length - 1) {
      setHighlightIndex(highlightIndex + 1);
      if (highlightIndex >= maxItemNum) {
        optionsRef.current.scrollTop += (isNumber(optionHeight) ? optionHeight : 30);
      }
    } else {
      setHighlightIndex(0);
      optionsRef.current.scrollTop = 0;
    }
  }, [optionsRef, highlightIndex, maxItemNum, options, optionHeight]);

  const onEsc = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    onToggle && onToggle();
  }, [onToggle]);

  const onHotKey = useCallback((event) => {
    if (isEnter(event)) {
      onEnter(event);
    } else if (isUpArrow(event)) {
      onUpArrow(event);
    } else if (isDownArrow(event)) {
      onDownArrow(event);
    } else if (isTab(event)) {
      if (isFunction(onPressTab)) {
        onPressTab(event);
      }
    } else if (isEsc(event)) {
      onEsc(event);
    }
  }, [onEnter, onUpArrow, onDownArrow, onPressTab, onEsc]);

  useEffect(() => {
    document.addEventListener('keydown', onHotKey, true);
    return () => {
      document.removeEventListener('keydown', onHotKey, true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onHotKey]);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [options]);

  return (
    <div
      className={classnames('option-editor-content', { 'empty': options.length === 0 })}
      style={{ maxHeight, minHeight: isNumber(optionHeight) ? optionHeight : 20 }}
      ref={optionsRef}
    >
      {isLoading && (
        <CenteredLoading style={{ minHeight: '100px' }} />
      )}
      {!isLoading && options.length === 0 && (
        <Tip isSearchEnabled={isSearchEnabled} hasAvailableOptions={hasAvailableOptions} searchValue={searchValue} tip={emptyTip} />
      )}
      {!isLoading && options.length > 0 && (
        <>
          {options.map((option, i) => {
            const isSelected = value && Array.isArray(value) ? value.includes(option.value) : value === option.value;
            return (
              <Option
                key={option.value}
                className={optionClassName}
                checkPlacement={checkPlacement}
                highlight={highlightIndex === i}
                isSelected={isSelected}
                option={option}
                height={optionHeight}
                index={i}
                onChange={onToggleOption}
                onMouseEnter={onOptionMouseEnter}
                onMouseLeave={onOptionMouseLeave}
              />
            );
          })}
        </>
      )}
    </div>
  );
};

export default Options;
