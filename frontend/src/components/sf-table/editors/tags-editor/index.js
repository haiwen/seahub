import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import CommonAddTool from '../../../common-add-tool';
import SearchInput from '../../../search-input';
import Icon from '../../../icon';
import DeleteTags from './delete-tags';
import { Utils } from '../../../../utils/utils';
import { KeyCodes } from '../../../../constants';
import { gettext } from '../../../../utils/constants';
import { getTagColor, getTagId, getTagName, getTagsByName } from '../../../../tag/utils/cell';
import { getRecordIdFromRecord } from '../../../../metadata/utils/cell';
import { SELECT_OPTION_COLORS } from '../../../../metadata/constants';
import { getRowById } from '../../utils/table';

import './index.css';

const TagsEditor = ({
  tagsTable,
  height,
  column,
  record,
  value: oldValue,
  editorPosition = { left: 0, top: 0 },
  canAddTag = true,
  onPressTab,
  addNewTag,
  selectTag,
  deselectTag,
}) => {
  const [value, setValue] = useState((oldValue || []).map(item => item.row_id).filter(item => getRowById(tagsTable, item)));
  const [searchValue, setSearchValue] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [maxItemNum, setMaxItemNum] = useState(0);
  const itemHeight = 30;
  const allTagsRef = useRef((tagsTable && tagsTable.rows) || []);
  const editorContainerRef = useRef(null);
  const editorRef = useRef(null);
  const selectItemRef = useRef(null);

  const displayTags = useMemo(() => getTagsByName(allTagsRef.current, searchValue), [searchValue, allTagsRef]);

  const isShowCreateBtn = useMemo(() => {
    if (!canAddTag || !searchValue || !Utils.isFunction(addNewTag)) return false;
    return displayTags.length === 0;
  }, [displayTags, searchValue, canAddTag, addNewTag]);

  const style = useMemo(() => {
    return { width: column.width };
  }, [column]);

  const onChangeSearch = useCallback((newSearchValue) => {
    if (searchValue === newSearchValue) return;
    setSearchValue(newSearchValue);
  }, [searchValue]);

  const onSelectTag = useCallback((tagId) => {
    const recordId = getRecordIdFromRecord(record);
    const newValue = value.slice(0);
    let optionIdx = value.indexOf(tagId);
    if (optionIdx > -1) {
      newValue.splice(optionIdx, 1);
      deselectTag && deselectTag(tagId, recordId);
    } else {
      newValue.push(tagId);
      selectTag && selectTag(tagId, recordId);
    }
    setValue(newValue);
  }, [value, record, selectTag, deselectTag]);

  const onDeleteTag = useCallback((tagId) => {
    const recordId = getRecordIdFromRecord(record);
    const newValue = value.slice(0);
    let optionIdx = value.indexOf(tagId);
    if (optionIdx > -1) {
      newValue.splice(optionIdx, 1);
    }
    deselectTag && deselectTag(tagId, recordId);
    setValue(newValue);
  }, [value, record, deselectTag]);

  const onMenuMouseEnter = useCallback((highlightIndex) => {
    setHighlightIndex(highlightIndex);
  }, []);

  const onMenuMouseLeave = useCallback((index) => {
    setHighlightIndex(-1);
  }, []);

  const createTag = useCallback((event) => {
    event && event.stopPropagation();
    event && event.nativeEvent.stopImmediatePropagation();
    const defaultOptions = SELECT_OPTION_COLORS.slice(0, 24);
    const defaultOption = defaultOptions[Math.floor(Math.random() * defaultOptions.length)];
    addNewTag({ tagName: searchValue, tagColor: defaultOption.COLOR }, {
      success_callback: (newTag) => {
        const recordId = getRecordIdFromRecord(record);
        const newValue = [...value, newTag];
        selectTag && selectTag(newTag._id, recordId);
        setValue(newValue);
      },
      fail_callback: () => {},
    });
  }, [value, searchValue, record, addNewTag, selectTag]);

  const getMaxItemNum = useCallback(() => {
    let selectContainerStyle = getComputedStyle(editorContainerRef.current, null);
    let selectItemStyle = getComputedStyle(selectItemRef.current, null);
    let maxSelectItemNum = Math.floor(parseInt(selectContainerStyle.maxHeight) / parseInt(selectItemStyle.height));
    return maxSelectItemNum - 1;
  }, [editorContainerRef, selectItemRef]);

  const onEnter = useCallback((event) => {
    event.preventDefault();
    let tag;
    if (displayTags.length === 1) {
      tag = displayTags[0];
    } else if (highlightIndex > -1) {
      tag = displayTags[highlightIndex];
    }
    if (tag) {
      const newTagId = getTagId(tag);
      onSelectTag(newTagId);
      return;
    }
    if (isShowCreateBtn) {
      createTag();
    }
  }, [displayTags, highlightIndex, isShowCreateBtn, onSelectTag, createTag]);

  const onUpArrow = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (highlightIndex === 0) return;
    setHighlightIndex(highlightIndex - 1);
    if (highlightIndex > displayTags.length - maxItemNum) {
      editorContainerRef.current.scrollTop -= itemHeight;
    }
  }, [editorContainerRef, highlightIndex, maxItemNum, displayTags, itemHeight]);

  const onDownArrow = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (highlightIndex === displayTags.length - 1) return;
    setHighlightIndex(highlightIndex + 1);
    if (highlightIndex >= maxItemNum) {
      editorContainerRef.current.scrollTop += itemHeight;
    }
  }, [editorContainerRef, highlightIndex, maxItemNum, displayTags, itemHeight]);

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
    const highlightIndex = displayTags.length === 0 ? -1 : 0;
    setHighlightIndex(highlightIndex);
  }, [displayTags]);

  const renderOptions = useCallback(() => {
    if (displayTags.length === 0) {
      const noOptionsTip = searchValue ? gettext('No tags available') : gettext('No tag');
      return (<span className="none-search-result">{noOptionsTip}</span>);
    }

    return displayTags.map((tag, i) => {
      const tagId = getTagId(tag);
      const tagName = getTagName(tag);
      const tagColor = getTagColor(tag);
      const isSelected = Array.isArray(value) ? value.includes(tagId) : false;
      return (
        <div key={tagId} className="sf-metadata-tags-editor-tag-item" ref={selectItemRef}>
          <div
            className={classnames('sf-metadata-tags-editor-tag-container pl-2', { 'sf-metadata-tags-editor-tag-container-highlight': i === highlightIndex })}
            onMouseDown={() => onSelectTag(tagId)}
            onMouseEnter={() => onMenuMouseEnter(i)}
            onMouseLeave={() => onMenuMouseLeave(i)}
          >
            <div className="sf-metadata-tag-color-and-name">
              <div className="sf-metadata-tag-color" style={{ backgroundColor: tagColor }}></div>
              <div className="sf-metadata-tag-name">{tagName}</div>
            </div>
            <div className="sf-metadata-tags-editor-tag-check-icon">
              {isSelected && (<Icon className="sf-metadata-icon" symbol="check-mark" />)}
            </div>
          </div>
        </div>
      );
    });

  }, [displayTags, searchValue, value, highlightIndex, onMenuMouseEnter, onMenuMouseLeave, onSelectTag]);

  return (
    <div className="sf-metadata-tags-editor" style={style} ref={editorRef}>
      <DeleteTags value={value} tagsTable={tagsTable} onDelete={onDeleteTag} />
      <div className="sf-metadata-search-tags-container">
        <SearchInput
          placeholder={gettext('Search tag')}
          onKeyDown={onKeyDown}
          onChange={onChangeSearch}
          autoFocus={true}
          className="sf-metadata-search-tags"
        />
      </div>
      <div className="sf-metadata-tags-editor-container" ref={editorContainerRef}>
        {renderOptions()}
      </div>
      {isShowCreateBtn && (
        <CommonAddTool
          callBack={createTag}
          footerName={`${gettext('Add tag')} ${searchValue}`}
          className="add-search-result"
        />
      )}
    </div>
  );
};

TagsEditor.propTypes = {
  tagsTable: PropTypes.object,
  height: PropTypes.number,
  record: PropTypes.object,
  column: PropTypes.object,
  value: PropTypes.array,
  editorPosition: PropTypes.object,
  canAddTag: PropTypes.bool,
  onPressTab: PropTypes.func,
  addNewTag: PropTypes.func,
  selectTag: PropTypes.func,
  deselectTag: PropTypes.func,
};

export default TagsEditor;
