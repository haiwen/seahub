import React, { forwardRef, useMemo, useImperativeHandle, useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { SearchInput, CustomizeAddTool, Icon } from '@seafile/sf-metadata-ui-component';
import { getCellValueByColumn, getColumnByKey, getSelectColumnOptions, getNotDuplicateOption, isFunction } from '../../../_basic';
import { KeyCodes } from '../../../../../constants';
import { gettext } from '../../../../../utils/constants';

import './index.css';

const SingleSelectEditor = forwardRef(({
  height,
  column,
  columns,
  record,
  value: oldValue,
  onCommit,
  onPressTab,
}, ref) => {
  const [value, setValue] = useState(oldValue || '');
  const [searchValue, setSearchValue] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [maxItemNum, setMaxItemNum] = useState(0);
  const [itemHeight, setItemHeight] = useState(0);
  const timerRef = useRef(null);
  const editorContainerRef = useRef(null);
  const editorRef = useRef(null);
  const selectItemRef = useRef(null);
  const canEditData = false;

  const options = useMemo(() => {
    const options = getSelectColumnOptions(column);
    const { data } = column;
    const { cascade_column_key, cascade_settings } = data || {};
    if (cascade_column_key) {
      const cascadeColumn = getColumnByKey(columns, cascade_column_key);
      if (cascadeColumn) {
        const cascadeColumnValue = getCellValueByColumn(record, cascadeColumn);
        if (!cascadeColumnValue) return [];
        const cascadeSetting = cascade_settings[cascadeColumnValue];
        if (!cascadeSetting || !Array.isArray(cascadeSetting) || cascadeSetting.length === 0) return [];
        return options.filter(option => cascadeSetting.includes(option.id));
      }
    }
    return options;
  }, [record, column, columns]);

  const displayOptions = useMemo(() => {
    if (!searchValue) return options;
    const value = searchValue.toLowerCase().trim();
    if (!value) return options;
    return options.filter((item) => item.name && item.name.toLowerCase().indexOf(value) > -1);
  }, [searchValue, options]);

  const isShowCreateBtn = useMemo(() => {
    if (!canEditData) return false;
    if (!searchValue) return false;
    return displayOptions.findIndex(option => option.name === searchValue) === -1 ? true : false;
  }, [canEditData, displayOptions, searchValue]);
  const style = useMemo(() => {
    return { width: column.width, top: height - 2 };
  }, [column, height]);

  const blur = useCallback(() => {
    onCommit && onCommit();
  }, [onCommit]);

  const onChangeSearch = useCallback((newSearchValue) => {
    if (searchValue === newSearchValue) return;
    setSearchValue(newSearchValue);
  }, [searchValue]);

  const onSelectOption = useCallback((optionId) => {
    if (optionId === value) return;
    setValue(optionId);
    onCommit && onCommit();
  }, [value, onCommit]);

  const onMenuMouseEnter = useCallback((highlightIndex) => {
    setHighlightIndex(highlightIndex);
  }, []);

  const onMenuMouseLeave = useCallback((index) => {
    setHighlightIndex(-1);
  }, []);

  const createOption = useCallback((event) => {
    event && event.nativeEvent.stopImmediatePropagation();
    const defaultOption = getNotDuplicateOption(options);
    let newOptions = options.slice(0);
    const newOption = { name: searchValue.trim(), color: defaultOption.COLOR, textColor: defaultOption.TEXT_COLOR };
    newOptions.push(newOption);
    this.setState({ options }, () => {
      onSelectOption(newOption.id);
    });
  }, [searchValue, options, onSelectOption]);

  const getMaxItemNum = useCallback(() => {
    let selectContainerStyle = getComputedStyle(editorContainerRef.current, null);
    let selectItemStyle = getComputedStyle(selectItemRef.current, null);
    let maxSelectItemNum = Math.floor(parseInt(selectContainerStyle.maxHeight) / parseInt(selectItemStyle.height));
    return maxSelectItemNum - 1;
  }, [editorContainerRef, selectItemRef]);

  const onEnter = useCallback((event) => {
    event.preventDefault();
    let option;
    if (displayOptions.length === 1) {
      option = displayOptions[0];
    } else if (highlightIndex > -1) {
      option = displayOptions[highlightIndex];
    }
    if (option) {
      let newOptionId = option.id;
      if (value === option.id) newOptionId = null;
      onSelectOption(newOptionId);
      return;
    }
    let isShowCreateBtn = false;
    if (searchValue) {
      isShowCreateBtn = canEditData && displayOptions.findIndex(option => option.name === searchValue) === -1 ? true : false;
    }
    if (!isShowCreateBtn || displayOptions.length === 0) return;
    createOption();
  }, [canEditData, displayOptions, highlightIndex, value, searchValue, onSelectOption, createOption]);

  const onUpArrow = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (highlightIndex === 0) return;
    setHighlightIndex(highlightIndex - 1);
    if (highlightIndex > displayOptions.length - maxItemNum) {
      editorContainerRef.current.scrollTop -= itemHeight;
    }
  }, [editorContainerRef, highlightIndex, maxItemNum, displayOptions, itemHeight]);

  const onDownArrow = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (highlightIndex === displayOptions.length - 1) return;
    setHighlightIndex(highlightIndex + 1);
    if (highlightIndex >= maxItemNum) {
      editorContainerRef.current.scrollTop += itemHeight;
    }
  }, [editorContainerRef, highlightIndex, maxItemNum, displayOptions, itemHeight]);

  const onHotKey = useCallback((event) => {
    if (event.keyCode === KeyCodes.Enter) {
      onEnter(event);
    } else if (event.keyCode === KeyCodes.UpArrow) {
      onUpArrow(event);
    } else if (event.keyCode === KeyCodes.DownArrow) {
      onDownArrow(event);
    } else if (event.keyCode === KeyCodes.Tab) {
      if (isFunction(onPressTab)) {
        onPressTab(event);
      }
    }
  }, [onEnter, onUpArrow, onDownArrow, onPressTab]);

  const onKeyDown = useCallback((event) => {
    if (
      event.keyCode === KeyCodes.ChineseInputMethod ||
      event.keyCode === KeyCodes.Enter ||
      event.keyCode === KeyCodes.LeftArrow ||
      event.keyCode === KeyCodes.RightArrow
    ) {
      event.stopPropagation();
    }
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      const { bottom } = editorRef.current.getBoundingClientRect();
      if (bottom > window.innerHeight) {
        editorRef.current.style.top = (parseInt(editorRef.current.style.top) - bottom + window.innerHeight) + 'px';
      }
    }
    if (editorContainerRef.current && selectItemRef.current) {
      setMaxItemNum(getMaxItemNum());
      setItemHeight(parseInt(getComputedStyle(selectItemRef.current, null).height));
    }
    document.addEventListener('keydown', onHotKey, true);
    return () => {
      document.removeEventListener('keydown', onHotKey, true);
      timerRef.current && clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onHotKey]);

  useEffect(() => {
    const highlightIndex = displayOptions.length === 0 ? -1 : 0;
    setHighlightIndex(highlightIndex);
  }, [displayOptions]);

  useImperativeHandle(ref, () => ({
    getValue: () => {
      const { key } = column;
      return { [key]: value };
    },
    onBlur: () => blur(),

  }), [column, value, blur]);

  const renderOptions = useCallback(() => {
    if (displayOptions.length === 0) {
      const noOptionsTip = searchValue ? gettext('No options available') : gettext('No option');
      return (<span className="none-search-result">{noOptionsTip}</span>);
    }

    // maxWidth = single-selects-container's width - single-selects-container's padding-left and padding-right - single-select-container's padding-left - single-select-check-icon's width - The gap between the single-select-check-icon and single-select-name or scroll's width
    // maxWidth = column.width > 200 ? column.width - 20 - 12 - 20 - 10 : 200 - 20 - 12 - 20 - 10
    // maxWidth = column.width > 200 ? column.width - 62 : 200 - 62
    const maxWidth = column.width > 200 ? column.width - 62 : 200 - 62;
    return displayOptions.map((option, i) => {
      const isSelected = value === option.name;
      return (
        <div key={option.id} className="sf-metadata-single-select-item" ref={selectItemRef}>
          <div
            className={classnames('single-select-container', { 'single-select-container-highlight': i === highlightIndex })}
            onMouseDown={() => onSelectOption(isSelected ? null : option.id)}
            onMouseEnter={() => onMenuMouseEnter(i)}
            onMouseLeave={() => onMenuMouseLeave(i)}
          >
            <div className="single-select">
              <span
                className="single-select-name"
                style={{ backgroundColor: option.color, color: option.textColor || null, maxWidth }}
                title={option.name}
                aria-label={option.name}
              >
                {option.name}
              </span>
            </div>
            <div className="single-select-check-icon">
              {isSelected && (<Icon iconName="check-mark" />)}
            </div>
          </div>
        </div>
      );
    });

  }, [displayOptions, searchValue, column, value, highlightIndex, onMenuMouseEnter, onMenuMouseLeave, onSelectOption]);

  return (
    <div className="sf-metadata-single-select-editor" style={style} ref={editorRef}>
      <div className="sf-metadata-search-single-select-options">
        <SearchInput
          placeholder={gettext('Search option')}
          onKeyDown={onKeyDown}
          onChange={onChangeSearch}
          autoFocus={true}
        />
      </div>
      <div className="sf-metadata-single-select-editor-container" ref={editorContainerRef}>
        {renderOptions()}
      </div>
      {isShowCreateBtn && (
        <CustomizeAddTool
          callBack={createOption}
          footerName={`${gettext('Add option')} ${searchValue}`}
          className="add-search-result"
        />
      )}
    </div>
  );
});

SingleSelectEditor.propTypes = {
  height: PropTypes.number,
  column: PropTypes.object,
  columns: PropTypes.array,
  record: PropTypes.object,
  value: PropTypes.string,
  onCommit: PropTypes.func,
  onPressTab: PropTypes.func,
};

export default SingleSelectEditor;

