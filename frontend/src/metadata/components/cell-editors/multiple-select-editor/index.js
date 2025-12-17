import React, { forwardRef, useMemo, useImperativeHandle, useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import CommonAddTool from '../../../../components/common-add-tool';
import SearchInput from '../../../../components/search-input';
import DeleteOption from './delete-options';
import { Utils } from '../../../../utils/utils';
import { getColumnOptionIdsByNames } from '../../../utils/cell';
import { getColumnOptions, generateNewOption } from '../../../utils/column';
import { KeyCodes } from '../../../../constants';
import { gettext } from '../../../../utils/constants';
import Icon from '../../../../components/icon';

const MultipleSelectEditor = forwardRef(({
  height,
  saveImmediately,
  column,
  value: oldValue,
  editorPosition = { left: 0, top: 0 },
  onCommit,
  onPressTab,
  modifyColumnData,
}, ref) => {
  const [value, setValue] = useState(getColumnOptionIdsByNames(column, oldValue));
  const [searchValue, setSearchValue] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [maxItemNum, setMaxItemNum] = useState(0);
  const itemHeight = 30;
  const editorContainerRef = useRef(null);
  const editorRef = useRef(null);
  const selectItemRef = useRef(null);
  const canEditData = window.sfMetadataContext.canModifyColumnData(column);

  const options = useMemo(() => {
    return getColumnOptions(column);
  }, [column]);

  const displayOptions = useMemo(() => {
    if (!searchValue) return options;
    const value = searchValue.toLowerCase().trim();
    if (!value) return options;
    return options.filter((item) => item.name && item.name.toLowerCase().indexOf(value) > -1);
  }, [searchValue, options]);

  const isShowCreateBtn = useMemo(() => {
    if (!canEditData || !searchValue) return false;
    return displayOptions.findIndex(option => option.name === searchValue) === -1 ? true : false;
  }, [canEditData, displayOptions, searchValue]);

  const style = useMemo(() => {
    return { width: column.width };
  }, [column]);

  const blur = useCallback(() => {
    onCommit && onCommit(value);
  }, [value, onCommit]);

  const onChangeSearch = useCallback((newSearchValue) => {
    if (searchValue === newSearchValue) return;
    setSearchValue(newSearchValue);
  }, [searchValue]);

  const onSelectOption = useCallback((optionId) => {
    const newValue = value.slice(0);
    let optionIdx = value.indexOf(optionId);
    if (optionIdx > -1) {
      newValue.splice(optionIdx, 1);
    } else {
      newValue.push(optionId);
    }
    setValue(newValue);
    if (saveImmediately) {
      onCommit && onCommit(newValue);
    }
  }, [saveImmediately, value, onCommit]);

  const onMenuMouseEnter = useCallback((highlightIndex) => {
    setHighlightIndex(highlightIndex);
  }, []);

  const onMenuMouseLeave = useCallback((index) => {
    setHighlightIndex(-1);
  }, []);

  const createOption = useCallback((event) => {
    event && event.stopPropagation();
    event && event.nativeEvent.stopImmediatePropagation();
    const newOption = generateNewOption(options, searchValue?.trim() || '');
    let newOptions = options.slice(0);
    newOptions.push(newOption);
    modifyColumnData(column.key, { options: newOptions }, { options: column.data.options || [] });
    onSelectOption(newOption.id);
  }, [column, searchValue, options, onSelectOption, modifyColumnData]);

  const onDeleteOption = useCallback((optionId) => {
    const newValue = value.slice(0);
    const index = newValue.indexOf(optionId);
    if (index > -1) {
      newValue.splice(index, 1);
    }
    setValue(newValue);
    if (saveImmediately) {
      onCommit && onCommit(newValue);
    }
  }, [saveImmediately, value, onCommit]);

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
      const newOptionId = option.id;
      onSelectOption(newOptionId);
      return;
    }
    let isShowCreateBtn = false;
    if (searchValue) {
      isShowCreateBtn = canEditData && displayOptions.findIndex(option => option.name === searchValue) === -1 ? true : false;
    }
    if (!isShowCreateBtn || displayOptions.length > 0) return;
    createOption();
  }, [canEditData, displayOptions, highlightIndex, searchValue, onSelectOption, createOption]);

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
      if (Utils.isFunction(onPressTab)) {
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
        editorRef.current.style.top = 'unset';
        editorRef.current.style.bottom = editorPosition.top + height - window.innerHeight + 'px';
      }
    }
    if (editorContainerRef.current && selectItemRef.current) {
      setMaxItemNum(getMaxItemNum());
    }
    document.addEventListener('keydown', onHotKey, true);
    return () => {
      document.removeEventListener('keydown', onHotKey, true);
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

    return displayOptions.map((option, i) => {
      const isSelected = value.includes(option.id);
      return (
        <div key={option.id} className="sf-metadata-single-select-item" ref={selectItemRef}>
          <div
            className={classnames('single-select-container', { 'single-select-container-highlight': i === highlightIndex })}
            onMouseDown={() => onSelectOption(option.id)}
            onMouseEnter={() => onMenuMouseEnter(i)}
            onMouseLeave={() => onMenuMouseLeave(i)}
          >
            <div className="single-select">
              <span
                className="single-select-name"
                style={{ backgroundColor: option.color, color: option.textColor || null }}
                title={option.name}
                aria-label={option.name}
              >
                {option.name}
              </span>
            </div>
            <div className="single-select-check-icon">
              {isSelected && <Icon symbol="tick" />}
            </div>
          </div>
        </div>
      );
    });

  }, [displayOptions, searchValue, value, highlightIndex, onMenuMouseEnter, onMenuMouseLeave, onSelectOption]);

  return (
    <div className="sf-metadata-single-select-editor sf-metadata-multiple-select-editor" style={style} ref={editorRef}>
      <DeleteOption value={value} options={options} onDelete={onDeleteOption} />
      <div className="sf-metadata-search-single-select-options">
        <SearchInput
          placeholder={gettext('Search option')}
          onKeyDown={onKeyDown}
          onChange={onChangeSearch}
          autoFocus={true}
          className="sf-metadata-search-options"
        />
      </div>
      <div className="sf-metadata-single-select-editor-container" ref={editorContainerRef}>
        {renderOptions()}
      </div>
      {isShowCreateBtn && (
        <CommonAddTool
          callBack={createOption}
          footerName={`${gettext('Add option')} ${searchValue}`}
          className="add-search-result"
        />
      )}
    </div>
  );
});

MultipleSelectEditor.propTypes = {
  height: PropTypes.number,
  column: PropTypes.object,
  value: PropTypes.array,
  editorPosition: PropTypes.object,
  onCommit: PropTypes.func,
  onPressTab: PropTypes.func,
};

export default MultipleSelectEditor;
