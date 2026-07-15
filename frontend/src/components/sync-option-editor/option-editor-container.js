import React, { forwardRef, useCallback, useEffect, useState, useImperativeHandle, useRef } from 'react';
import axios from 'axios';
import classnames from 'classnames';
import SearchInput from '../search-input';
import { KeyCodes } from '../../constants';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import Options from '../option-editor/options';

const OptionEditorContainer = forwardRef(({
  isMultiple = false,
  placeholder,
  emptyTip,
  value: propsValue = '',
  checkPlacement = 'right',
  className,
  optionClassName,
  maxHeight = 240,
  optionHeight = 30,
  onChange,
  onToggle,
  onPressTab,
  onSearch,
  isShowSearchIcon,
}, ref) => {
  const [value, setValue] = useState(propsValue || (isMultiple ? [] : ''));
  const [searchValue, setSearchValue] = useState('');
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchCleared, setIsSearchCleared] = useState(false);

  const abortControllerRef = useRef(null);
  const timer = useRef(null);
  const lastSearchValue = useRef('');

  const onSearchValueChange = useCallback((newSearchValue) => {
    if (searchValue === newSearchValue) return;
    setIsSearchCleared(false);
    setSearchValue(newSearchValue);
  }, [searchValue]);

  const clearSearch = useCallback(() => {
    setIsSearchCleared(true);
    setSearchValue('');
    setOptions([]);
    setIsLoading(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    timer.current && clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const toggleOption = useCallback((optionValue) => {
    if (isMultiple) {
      let newValue = Array.isArray(value) ? value.slice(0) : [];
      const optionIndex = newValue.findIndex(v => v === optionValue);
      if (optionIndex === -1) {
        newValue.push(optionValue);
      } else {
        newValue.splice(optionIndex, 1);
      }
      setValue(newValue);
      onChange && onChange(newValue);
      return;
    }
    const newValue = optionValue === value ? '' : optionValue;
    setValue(newValue);
    onChange && onChange(newValue);
    onToggle && onToggle();
  }, [isMultiple, value, onChange, onToggle]);

  const onKeyDown = useCallback((event) => {
    if (
      event.keyCode === KeyCodes.ChineseInputMethod ||
      event.keyCode === KeyCodes.LeftArrow ||
      event.keyCode === KeyCodes.RightArrow
    ) {
      event.stopPropagation();
    }
  }, []);

  useEffect(() => {
    if (isSearchCleared) {
      return;
    }
    if (lastSearchValue.current === searchValue) return;
    lastSearchValue.current = searchValue;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    timer.current && clearTimeout(timer.current);

    if (!searchValue) {
      setOptions([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    timer.current = setTimeout(() => {
      abortControllerRef.current = new AbortController();
      timer.current = null;
      onSearch(searchValue, abortControllerRef.current.signal).then(options => {
        setOptions(options);
        setIsLoading(false);
      }).catch(error => {
        if (!axios.isCancel(error)) {
          const errorMessage = Utils.getErrorMsg(error);
          toaster.danger(gettext(errorMessage));
        }
        setIsLoading(false);
      }).finally(() => {
        abortControllerRef.current = null;
      });
    }, 300);
  }, [searchValue, onSearch, isSearchCleared]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      timer.current && clearTimeout(timer.current);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    getValue: () => {
      return value;
    },
    setValue: (value) => {
      setValue(value);
    }
  }), [value]);

  return (
    <div className={classnames('option-editor-container search-enabled', className)}>
      <div className="option-editor-search-wrapper">
        <SearchInput
          isClearable={true}
          autoFocus={true}
          value={searchValue}
          size={36}
          placeholder={placeholder}
          onKeyDown={onKeyDown}
          onChange={onSearchValueChange}
          clearValue={clearSearch}
          isShowSearchIcon={isShowSearchIcon}
        />
      </div>
      <Options
        isLoading={isLoading}
        hasAvailableOptions={true}
        options={options}
        maxHeight={maxHeight - 26} // 26: padding-top(12) + padding-bottom(12) + border(2)
        isSearchEnabled={true}
        searchValue={searchValue}
        emptyTip={emptyTip}
        value={value}
        checkPlacement={checkPlacement}
        optionHeight={optionHeight}
        optionClassName={optionClassName}
        onToggleOption={toggleOption}
        onPressTab={onPressTab}
        onChange={onChange}
      />
    </div>
  );
});

export default OptionEditorContainer;
