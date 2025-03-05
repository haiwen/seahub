import React, { forwardRef, useMemo, useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import CommonAddTool from '../../../../components/common-add-tool';
import SearchInput from '../../../../components/search-input';
import Icon from '../../../../components/icon';
import DeleteTags from './delete-tags';
import { Utils } from '../../../../utils/utils';
import { KeyCodes } from '../../../../constants';
import { gettext } from '../../../../utils/constants';
import { useTags } from '../../../../tag/hooks';
import { getTagColor, getTagId, getTagName, getTagsByNameOrColor, getTagByNameOrColor } from '../../../../tag/utils/cell';
import { getRecordIdFromRecord } from '../../../utils/cell';
import { getRowById } from '../../../../components/sf-table/utils/table';
import { SELECT_OPTION_COLORS } from '../../../constants';
import { PRIVATE_COLUMN_KEY as TAG_PRIVATE_COLUMN_KEY } from '../../../../tag/constants';

import './index.css';

const TagsEditor = forwardRef(({
  height,
  column,
  record,
  value: oldValue,
  editorPosition = { left: 0, top: 0 },
  onPressTab,
  updateFileTags,
}, ref) => {
  const { tagsData, addTag, context } = useTags();

  const canAddTag = context.canAddTag();

  const [value, setValue] = useState((oldValue || []).map(item => item.row_id).filter(item => getRowById(tagsData, item)));
  const [searchValue, setSearchValue] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [maxItemNum, setMaxItemNum] = useState(0);
  const itemHeight = 30;
  const editorContainerRef = useRef(null);
  const editorRef = useRef(null);
  const selectItemRef = useRef(null);
  const canEditData = window.sfMetadataContext.canModifyColumnData(column);

  const tags = useMemo(() => {
    if (!tagsData) return [];
    return tagsData?.rows || [];
  }, [tagsData]);

  const displayTags = useMemo(() => getTagsByNameOrColor(tags, searchValue), [searchValue, tags]);

  const isShowCreateBtn = useMemo(() => {
    if (!canAddTag) return false;
    if (!canEditData || !searchValue) return false;
    return !getTagByNameOrColor(displayTags, searchValue);
  }, [canEditData, displayTags, searchValue, canAddTag]);

  const style = useMemo(() => {
    return { width: column.width };
  }, [column]);

  const onChangeSearch = useCallback((newSearchValue) => {
    if (searchValue === newSearchValue) return;
    setSearchValue(newSearchValue);
  }, [searchValue]);

  const onSelectTag = useCallback((tagId) => {
    const newValue = value.slice(0);
    let optionIdx = value.indexOf(tagId);
    if (optionIdx > -1) {
      newValue.splice(optionIdx, 1);
    } else {
      newValue.push(tagId);
    }
    setValue(newValue);
    const recordId = getRecordIdFromRecord(record);
    updateFileTags([{ record_id: recordId, tags: newValue, old_tags: value }]);
  }, [value, record, updateFileTags]);

  const onDeleteTag = useCallback((tagId) => {
    const newValue = value.slice(0);
    let optionIdx = value.indexOf(tagId);
    if (optionIdx > -1) {
      newValue.splice(optionIdx, 1);
    }
    setValue(newValue);
    const recordId = getRecordIdFromRecord(record);
    updateFileTags([{ record_id: recordId, tags: newValue, old_tags: value }]);
  }, [value, record, updateFileTags]);

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
    addTag({ [TAG_PRIVATE_COLUMN_KEY.TAG_NAME]: searchValue, [TAG_PRIVATE_COLUMN_KEY.TAG_COLOR]: defaultOption.COLOR }, {
      success_callback: (operation) => {
        const tags = operation.tags?.map(tag => getTagId(tag));
        const recordId = getRecordIdFromRecord(record);
        const newValue = [...value, ...tags];
        updateFileTags([{ record_id: recordId, tags: newValue, old_tags: value }]);
        setValue(newValue);
      },
      fail_callback: () => {

      },
    });
  }, [value, searchValue, record, addTag, updateFileTags]);

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
      <DeleteTags value={value} tags={tagsData} onDelete={onDeleteTag} />
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
});

TagsEditor.propTypes = {
  height: PropTypes.number,
  column: PropTypes.object,
  value: PropTypes.array,
  editorPosition: PropTypes.object,
  onPressTab: PropTypes.func,
  updateFileTags: PropTypes.func,
};

export default TagsEditor;
