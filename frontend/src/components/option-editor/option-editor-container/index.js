import React, { forwardRef, useCallback, useEffect, useState, useImperativeHandle } from 'react';
import classnames from 'classnames';
import SearchInput from '../../search-input';
import CustomizeAddTool from '../../customize-add-tool/index.js';
import { KeyCodes } from '../../../constants';
import { gettext } from '../../../utils/constants';
import { isFunction, isNumber } from '../../../utils/type-detection';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import Options from '../options';
import './index.css';

const searchOptions = (options, searchValue) => {
  if (!searchValue) return options;
  const val = searchValue.toLowerCase();
  return options.filter(option =>
    (option.name && option.name.toLowerCase().includes(val)) ||
    (option.value && option.value.toLowerCase().includes(val))
  );
};

// whole search input height is 32px, bottom border is 1px, so the inner height is 31px
const SEARCH_HEIGHT = 31;

const OptionEditorContainer = forwardRef(({
  id,
  isMultiple = false,
  isSearchEnabled = true,
  checkPlacement = 'right',
  className,
  optionClassName,
  placeholder,
  emptyTip = gettext('No options available'),
  value: propsValue = '',
  options = [],
  maxHeight = 240,
  optionHeight = 32,
  children,
  onChange,
  onToggle,
  onCreate,
  onPressTab,
  addToolText = gettext('Add tag'),
}, ref) => {
  const [value, setValue] = useState(propsValue || (isMultiple ? [] : ''));
  const [searchValue, setSearchValue] = useState('');
  const [isSearchCleared, setIsSearchCleared] = useState(false);
  const [displayOptions, setDisplayOptions] = useState(options);

  const onSearchValueChange = useCallback((newSearchValue) => {
    if (searchValue === newSearchValue) return;
    setIsSearchCleared(false);
    setSearchValue(newSearchValue);
  }, [searchValue]);

  const clearSearch = useCallback(() => {
    setIsSearchCleared(true);
    setSearchValue('');
    setDisplayOptions([]);
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

  const handleCreate = useCallback(() => {
    onCreate(searchValue.trim()).then(option => {
      toggleOption(option.value);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [searchValue, onCreate, toggleOption]);

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
    setDisplayOptions(searchOptions(options, searchValue));
  }, [searchValue, options, isSearchCleared]);

  useImperativeHandle(ref, () => ({
    getValue: () => {
      return value;
    },
    setValue: (value) => {
      setValue(value);
    }
  }), [value]);

  const showCreateBtn = isFunction(onCreate) && searchValue.trim() && !options.find(o => o.name === searchValue.trim());
  let validMaxHeight = maxHeight - (isSearchEnabled ? 26 : 18); // 26: padding-top(12/8) + padding-bottom(12/8) + border(2)
  if (displayOptions.length > 0) {
    // 16px is the padding top and bottom of the options
    validMaxHeight = Math.min(validMaxHeight, displayOptions.length * (isNumber(optionHeight) ? optionHeight : 32) + 16);
  }

  return (
    <div
      id={id}
      className={classnames('option-editor-container', className, {
        'option-editor-container-multiple': isMultiple,
        'option-editor-container-single': !isMultiple,
        'search-enabled': isSearchEnabled,
        'selected-value-display': children,
        'add-search-result-enabled': isSearchEnabled && showCreateBtn,
        'small-size-option': SEARCH_HEIGHT <= 30
      })}
    >
      {children && (
        <div className="option-editor-selected-value-wrapper">
          {typeof children === 'function' ? children({ value, onChange: toggleOption }) : children}
        </div>
      )}
      {isSearchEnabled && (
        <div className="option-editor-search-wrapper">
          <SearchInput
            isShowSearchIcon={true}
            isClearable={true}
            autoFocus={true}
            value={searchValue}
            size={SEARCH_HEIGHT}
            placeholder={placeholder}
            onKeyDown={onKeyDown}
            onChange={onSearchValueChange}
            clearValue={clearSearch}
          />
        </div>
      )}
      <Options
        hasAvailableOptions={options.length > 0}
        options={displayOptions}
        maxHeight={validMaxHeight}
        isSearchEnabled={isSearchEnabled}
        searchValue={searchValue}
        emptyTip={emptyTip}
        value={value}
        checkPlacement={checkPlacement}
        optionHeight={optionHeight}
        optionClassName={optionClassName}
        onToggleOption={toggleOption}
        onPressTab={onPressTab}
        onToggle={onToggle}
      />
      {showCreateBtn && (
        <CustomizeAddTool
          className={classnames('option-editor-add-search-result', { 'mt-2': displayOptions.length === 0 })}
          name={`${addToolText} ${searchValue.trim()}`}
          callBack={handleCreate}
        />
      )}
    </div>
  );
});

export default OptionEditorContainer;
