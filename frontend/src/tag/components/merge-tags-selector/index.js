import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import ClickOutside from '../../../components/click-outside';
import ModalPortal from '../../../components/modal-portal';
import { KeyCodes } from '../../../constants';
import { gettext } from '../../../utils/constants';
import { getRowsByIds } from '../../../components/sf-table/utils/table';
import { getTagColor, getTagId, getTagName } from '../../utils/cell';
import { EDITOR_CONTAINER as Z_INDEX_EDITOR_CONTAINER } from '../../../components/sf-table/constants/z-index';
import { useTags } from '../../hooks';

import './index.css';

const getInitTags = (mergeTagsIds, tagsData) => {
  if (!Array.isArray(mergeTagsIds) || mergeTagsIds.length === 0 || !tagsData || !Array.isArray(tagsData.row_ids)) return [];
  const sortedTagsIds = tagsData.row_ids.filter((tagId) => mergeTagsIds.includes(tagId));
  if (sortedTagsIds.length === 0) return [];
  return getRowsByIds(tagsData, sortedTagsIds);
};

const MergeTagsSelector = ({
  mergeTagsIds,
  position = { left: 0, top: 0 },
  closeSelector,
  mergeTags,
}) => {
  const { tagsData } = useTags();
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [maxItemNum, setMaxItemNum] = useState(0);
  const itemHeight = 30;
  const allTagsRef = useRef(getInitTags(mergeTagsIds, tagsData));
  const editorContainerRef = useRef(null);
  const editorRef = useRef(null);
  const selectItemRef = useRef(null);

  const displayTags = useMemo(() => allTagsRef.current, [allTagsRef]);

  const onSelectTag = useCallback((targetTagId) => {
    const mergedTagsIds = mergeTagsIds.filter((tagId) => tagId !== targetTagId);
    mergeTags(targetTagId, mergedTagsIds);
    closeSelector();
  }, [mergeTagsIds, closeSelector, mergeTags]);

  const onMenuMouseEnter = useCallback((highlightIndex) => {
    setHighlightIndex(highlightIndex);
  }, []);

  const onMenuMouseLeave = useCallback((index) => {
    setHighlightIndex(-1);
  }, []);

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
  }, [displayTags, highlightIndex, onSelectTag]);

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
    }
  }, [onEnter, onUpArrow, onDownArrow]);

  useEffect(() => {
    if (editorRef.current) {
      const { bottom } = editorRef.current.getBoundingClientRect();
      if (bottom > window.innerHeight) {
        editorRef.current.style.top = 'unset';
        editorRef.current.style.bottom = '10px';
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
    return displayTags.map((tag, i) => {
      const tagId = getTagId(tag);
      const tagName = getTagName(tag);
      const tagColor = getTagColor(tag);
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
          </div>
        </div>
      );
    });

  }, [displayTags, highlightIndex, onMenuMouseEnter, onMenuMouseLeave, onSelectTag]);

  return (
    <ModalPortal>
      <ClickOutside onClickOutside={closeSelector}>
        <div className="sf-metadata-merge-tags-selector" style={{ ...position, position: 'fixed', width: 300, zIndex: Z_INDEX_EDITOR_CONTAINER }} ref={editorRef}>
          <div className="sf-metadata-merge-tags-selector-header">{gettext('Merge tags to')}</div>
          <div className="sf-metadata-merge-tags-selector-container" ref={editorContainerRef}>
            {renderOptions()}
          </div>
        </div>
      </ClickOutside>
    </ModalPortal>
  );
};

MergeTagsSelector.propTypes = {
  mergeTagsIds: PropTypes.array.isRequired,
  tagsTable: PropTypes.object,
  tags: PropTypes.array,
  position: PropTypes.object,
};

export default MergeTagsSelector;
