import React, { forwardRef, useMemo, useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import CommonAddTool from '../../../../components/common-add-tool';
import SearchInput from '../../../../components/search-input';
import { Utils } from '../../../../utils/utils';
import { KeyCodes } from '../../../../constants';
import { gettext } from '../../../../utils/constants';
import { useTags } from '../../../../tag/hooks';
import { getTagId, getTagName, getTagsByName, getTagByName, getTagColor } from '../../../../tag/utils/cell';
import { getRowById } from '../../../../components/sf-table/utils/table';
import { SELECT_OPTION_COLORS } from '../../../constants';
import { PRIVATE_COLUMN_KEY as TAG_PRIVATE_COLUMN_KEY, RECENTLY_USED_TAG_IDS } from '../../../../tag/constants';
import { checkIsTreeNodeShown, checkTreeNodeHasChildNodes, getNodesWithAncestors, getTreeNodeDepth, getTreeNodeId, getTreeNodeKey } from '../../../../components/sf-table/utils/tree';
import TagItem from './tag-item';
import DeleteTag from './delete-tags';

import './index.css';

const TagsEditor = forwardRef(({
  height,
  column,
  value: oldValue,
  editorPosition = { left: 0, top: 0 },
  onPressTab,
  onSelect,
  onDeselect,
  showTagsAsTree,
  canEditData = false,
  canAddTag = false,
  showDeletableTags = false,
  showRecentlyUsed = true,
}, ref) => {
  const { tagsData, context, addTag } = useTags();

  const [value, setValue] = useState((oldValue || []).map(item => item.row_id).filter(item => getRowById(tagsData, item)));
  const [searchValue, setSearchValue] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [highlightNodeIndex, setHighlightNodeIndex] = useState(-1);
  const [maxItemNum, setMaxItemNum] = useState(0);
  const [nodes, setNodes] = useState([]);
  const [keyNodeFoldedMap, setKeyNodeFoldedMap] = useState({});
  const [searchedKeyNodeFoldedMap, setSearchedKeyNodeFoldedMap] = useState({});
  const [recentlyUsed, setRecentlyUsed] = useState([]);
  const itemHeight = 30;
  const editorContainerRef = useRef(null);
  const editorRef = useRef(null);

  const localStorage = context.localStorage;

  const tags = useMemo(() => {
    if (!tagsData) return [];
    return tagsData?.rows || [];
  }, [tagsData]);

  const displayTags = useMemo(() => getTagsByName(tags, searchValue), [searchValue, tags]);
  const recentlyUsedTags = useMemo(() => recentlyUsed, [recentlyUsed]);

  const isShowCreateBtn = useMemo(() => {
    if (!canAddTag) return false;
    if (!canEditData || !searchValue) return false;
    return !getTagByName(displayTags, searchValue);
  }, [canEditData, displayTags, searchValue, canAddTag]);

  const style = useMemo(() => {
    return { width: column.width };
  }, [column]);

  const onChangeSearch = useCallback((newSearchValue) => {
    if (searchValue === newSearchValue) return;
    setSearchValue(newSearchValue);
  }, [searchValue]);

  const handleSelectTags = useCallback((tagId) => {
    const newValue = value.slice(0);
    let optionIdx = value.indexOf(tagId);
    if (optionIdx > -1) {
      newValue.splice(optionIdx, 1);
      onDeselect(tagId);
    } else {
      newValue.push(tagId);
      onSelect(tagId);
    }
    setValue(newValue);

    const ids = recentlyUsed.map(item => getTagId(item));
    if (ids.indexOf(tagId) > -1) return;
    const tag = getRowById(tagsData, tagId);
    const updated = [tag, ...recentlyUsed.filter(item => getTagId(item) !== tagId)].slice(0, 10);
    setRecentlyUsed(updated);

    const newIds = updated.map(tag => getTagId(tag));
    localStorage.setItem(RECENTLY_USED_TAG_IDS, JSON.stringify(newIds));
  }, [value, tagsData, recentlyUsed, localStorage, onSelect, onDeselect]);

  const onMenuMouseEnter = useCallback((i, id) => {
    setHighlightIndex(i);
  }, []);

  const onMenuMouseLeave = useCallback(() => {
    setHighlightIndex(-1);
  }, []);

  const onTreeMenuMouseEnter = useCallback((i) => {
    setHighlightNodeIndex(i);
  }, []);

  const onTreeMenuMouseLeave = useCallback(() => {
    setHighlightNodeIndex(-1);
  }, []);

  const createTag = useCallback((event) => {
    event && event.stopPropagation();
    event && event.nativeEvent.stopImmediatePropagation();
    const defaultOptions = SELECT_OPTION_COLORS.slice(0, 24);
    const defaultOption = defaultOptions[Math.floor(Math.random() * defaultOptions.length)];
    addTag({ [TAG_PRIVATE_COLUMN_KEY.TAG_NAME]: searchValue, [TAG_PRIVATE_COLUMN_KEY.TAG_COLOR]: defaultOption.COLOR }, {
      success_callback: (operation) => {
        const tags = operation.tags?.map(tag => getTagId(tag));
        const newValue = [...value, ...tags];
        onSelect(tags[0]);
        setValue(newValue);

        const updatedRecentlyUsed = [...tags.map(tag => getRowById(tagsData, tag)), ...recentlyUsed].slice(0, 10);
        setRecentlyUsed(updatedRecentlyUsed);
        const ids = updatedRecentlyUsed.map(item => getTagId(item));
        localStorage && localStorage.setItem(RECENTLY_USED_TAG_IDS, JSON.stringify(ids));
      },
      fail_callback: () => {

      },
    });
  }, [value, searchValue, tagsData, localStorage, recentlyUsed, addTag, onSelect]);

  const getMaxItemNum = useCallback(() => {
    let selectContainerStyle = getComputedStyle(editorContainerRef.current, null);
    let maxSelectItemNum = Math.floor(parseInt(selectContainerStyle.maxHeight) / parseInt(itemHeight));
    return maxSelectItemNum - 1;
  }, [editorContainerRef]);

  const onEnter = useCallback((event) => {
    event.preventDefault();
    let tag;
    if (showTagsAsTree) {
      if (highlightNodeIndex > -1 && nodes[highlightNodeIndex]) {
        const tagId = getTreeNodeId(nodes[highlightNodeIndex]);
        tag = getRowById(tagsData, tagId);
      }
    } else {
      if (displayTags.length === 1) {
        tag = displayTags[0];
      } else if (highlightIndex > -1) {
        tag = displayTags[highlightIndex];
      }
    }
    if (tag) {
      const newTagId = getTagId(tag);
      handleSelectTags(newTagId);
      return;
    }
    if (isShowCreateBtn) {
      createTag();
    }
  }, [displayTags, highlightIndex, isShowCreateBtn, handleSelectTags, createTag, showTagsAsTree, tagsData, highlightNodeIndex, nodes]);

  const updateScroll = useCallback((index) => {
    const visibleStart = Math.floor(editorContainerRef.current.scrollTop / itemHeight);
    const visibleEnd = visibleStart + maxItemNum;

    if (index < visibleStart) {
      editorContainerRef.current.scrollTop -= itemHeight;
    } else if (index >= visibleEnd) {
      editorContainerRef.current.scrollTop += itemHeight;
    }
  }, [maxItemNum]);

  const onUpArrow = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();

    if (showTagsAsTree) {
      const newIndex = highlightNodeIndex - 1;
      if (newIndex < 0) return;
      const pos = recentlyUsedTags.length > 0 ? newIndex + recentlyUsedTags.length + 2 : newIndex;
      updateScroll(pos);
      setHighlightNodeIndex(newIndex);
    } else {
      const newIndex = highlightIndex - 1;
      if (newIndex < 0) return;
      updateScroll(highlightIndex, displayTags.length, setHighlightIndex);
      setHighlightIndex(newIndex);
    }
  }, [highlightIndex, displayTags, showTagsAsTree, recentlyUsedTags, highlightNodeIndex, updateScroll]);

  const onDownArrow = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();

    if (showTagsAsTree) {
      const newIndex = highlightNodeIndex + 1;
      if (newIndex >= nodes.length) return;
      const pos = recentlyUsedTags.length > 0 ? newIndex + recentlyUsedTags.length + 2 : newIndex;
      updateScroll(pos);
      setHighlightNodeIndex(newIndex);
    } else {
      const newIndex = highlightIndex + 1;
      if (newIndex >= displayTags.length) return;
      updateScroll(newIndex);
      setHighlightIndex(newIndex);
    }
  }, [highlightIndex, displayTags, showTagsAsTree, nodes, recentlyUsedTags, highlightNodeIndex, updateScroll]);

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
      event.keyCode === KeyCodes.RightArrow ||
      event.keyCode === KeyCodes.Space
    ) {
      event.stopPropagation();
    }
  }, []);

  const getShownNodes = useCallback(() => {
    const tree = tagsData?.rows_tree;
    if (!Array.isArray(tree)) {
      return [];
    }
    let shownNodes = [];

    tree.forEach((node, index) => {
      const nodeId = getTreeNodeId(node);
      const row = getRowById(tagsData, nodeId);
      if (!row) return;
      const nodeKey = getTreeNodeKey(node);
      if (row && checkIsTreeNodeShown(nodeKey, keyNodeFoldedMap)) {
        shownNodes.push({
          ...node,
          node_index: index,
        });
      }
    });
    return shownNodes;
  }, [tagsData, keyNodeFoldedMap]);

  const getSearchedNodes = useCallback(() => {
    const tree = tagsData?.rows_tree;
    if (!Array.isArray(tree)) {
      return [];
    }
    let searchedNodes = [];
    const processedNodes = new Set();

    tree.forEach((node) => {
      const nodeId = getTreeNodeId(node);
      const row = getRowById(tagsData, nodeId);
      if (!row) return;

      const value = searchValue.toLowerCase();
      const tagName = getTagName(row).toLowerCase();
      if (!tagName.includes(value)) return;

      const nodesWithAncestors = getNodesWithAncestors(node, tree);

      nodesWithAncestors.forEach(ancestor => {
        const ancestorKey = getTreeNodeKey(ancestor);

        if (!processedNodes.has(ancestorKey)) {
          if (checkIsTreeNodeShown(ancestorKey, searchedKeyNodeFoldedMap)) {
            searchedNodes.push(ancestor);
            processedNodes.add(ancestorKey);
          }
        }
      });

      const currentNodeKey = getTreeNodeKey(node);
      if (!processedNodes.has(currentNodeKey)) {
        searchedNodes.push(node);
        processedNodes.add(currentNodeKey);
      }
    });

    return searchedNodes;
  }, [tagsData, searchValue, searchedKeyNodeFoldedMap]);

  const toggleExpandTreeNode = useCallback((e, nodeKey) => {
    e.preventDefault();
    e.stopPropagation();
    if (!searchValue) {
      const updatedKeyNodeFoldedMap = { ...keyNodeFoldedMap };
      if (updatedKeyNodeFoldedMap[nodeKey]) {
        delete updatedKeyNodeFoldedMap[nodeKey];
      } else {
        updatedKeyNodeFoldedMap[nodeKey] = true;
      }
      setKeyNodeFoldedMap(updatedKeyNodeFoldedMap);
    } else {
      const updatedSearchedKeyNodeFoldedMap = { ...searchedKeyNodeFoldedMap };
      if (updatedSearchedKeyNodeFoldedMap[nodeKey]) {
        delete updatedSearchedKeyNodeFoldedMap[nodeKey];
      } else {
        updatedSearchedKeyNodeFoldedMap[nodeKey] = true;
      }
      setSearchedKeyNodeFoldedMap(updatedSearchedKeyNodeFoldedMap);
    }
  }, [keyNodeFoldedMap, searchedKeyNodeFoldedMap, searchValue]);

  useEffect(() => {
    if (editorRef.current) {
      const { bottom } = editorRef.current.getBoundingClientRect();
      if (bottom > window.innerHeight) {
        editorRef.current.style.top = 'unset';
        editorRef.current.style.bottom = editorPosition.top + height - window.innerHeight + 'px';
      }
    }
    if (editorContainerRef.current) {
      setMaxItemNum(getMaxItemNum());
    }
    document.addEventListener('keydown', onHotKey, true);
    return () => {
      document.removeEventListener('keydown', onHotKey, true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onHotKey]);

  useEffect(() => {
    const saved = localStorage && localStorage.getItem(RECENTLY_USED_TAG_IDS);
    const ids = saved ? JSON.parse(saved) : [];
    const tags = ids.map(id => getRowById(tagsData, id)).filter(Boolean);
    setRecentlyUsed(tags);
  }, [tagsData, localStorage]);

  useEffect(() => {
    if (tagsData?.rows_tree && showTagsAsTree) {
      const updatedKeyNodeFoldedMap = tagsData.rows_tree.reduce((acc, node) => {
        const nodeKey = getTreeNodeKey(node);
        if (checkTreeNodeHasChildNodes(node)) {
          acc[nodeKey] = true;
        }
        return acc;
      }, {});
      setKeyNodeFoldedMap(updatedKeyNodeFoldedMap);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tagsData?.rows_tree) {
      const shownNodes = searchValue ? getSearchedNodes() : getShownNodes();
      setNodes(shownNodes);
    }
  }, [tagsData, searchValue, getSearchedNodes, getShownNodes]);

  const renderOptions = useCallback(() => {
    if (displayTags.length === 0) {
      const noOptionsTip = searchValue ? gettext('No tags available') : gettext('No tag');
      return (<span className="none-search-result">{noOptionsTip}</span>);
    }

    return displayTags.map((tag, i) => {
      const tagId = getTagId(tag);
      return (
        <TagItem
          key={tagId}
          tag={tag}
          isSelected={value.includes(tagId)}
          highlight={highlightIndex === i}
          onSelect={handleSelectTags}
          onMouseEnter={() => onMenuMouseEnter(i, tagId)}
          onMouseLeave={onMenuMouseLeave}
        />
      );
    });

  }, [displayTags, searchValue, value, highlightIndex, handleSelectTags, onMenuMouseEnter, onMenuMouseLeave]);

  const renderRecentlyUsed = useCallback(() => {
    if (recentlyUsedTags.length === 0) return null;

    return (
      <div className="sf-metadata-ui-tags-container">
        {recentlyUsedTags.map((tag, i) => {
          const tagId = getTagId(tag);
          const tagName = getTagName(tag);
          const tagColor = getTagColor(tag);
          const isSelected = value.includes(tagId);
          return (
            <div
              key={tagId}
              className={classnames('sf-metadata-ui-tag', {
                'sf-metadata-ui-tag-selected': isSelected,
              })}
              title={tagName}
              onClick={() => handleSelectTags(tagId)}
            >
              <span className="sf-metadata-ui-tag-color" style={{ backgroundColor: tagColor }}></span>
              <span className="sf-metadata-ui-tag-text">{tagName}</span>
            </div>
          );
        })}
      </div>
    );
  }, [recentlyUsedTags, value, handleSelectTags]);

  const renderOptionsAsTree = useCallback(() => {
    if (nodes.length === 0) {
      const noOptionsTip = searchValue ? gettext('No tags available') : gettext('No tag');
      return (<span className="none-search-result px-4">{noOptionsTip}</span>);
    }
    const isRecentlyUsedVisible = showRecentlyUsed && recentlyUsedTags.length > 0 && !searchValue;
    return (
      <>
        {isRecentlyUsedVisible && (
          <>
            <div className="sf-metadata-tags-editor-title">{gettext('Recently used tags')}</div>
            {renderRecentlyUsed()}
            <div className="sf-metadata-tags-editor-divider"></div>
          </>
        )}
        {!searchValue && <div className="sf-metadata-tags-editor-title">{gettext('All tags')}</div>}
        {nodes.map((node, i) => {
          const nodeKey = getTreeNodeKey(node);
          const tagId = getTreeNodeId(node);
          const tag = getRowById(tagsData, tagId);
          if (!tag) return null;

          return (
            <TagItem
              node={node}
              key={`${nodeKey}_${i}`}
              tag={tag}
              isSelected={value.includes(tagId)}
              highlight={highlightNodeIndex === i}
              onSelect={handleSelectTags}
              onMouseEnter={() => onTreeMenuMouseEnter(i)}
              onMouseLeave={onTreeMenuMouseLeave}
              depth={getTreeNodeDepth(node)}
              hasChildren={checkTreeNodeHasChildNodes(node)}
              isFolded={!searchValue ? keyNodeFoldedMap[nodeKey] : searchedKeyNodeFoldedMap[nodeKey]}
              onToggleExpand={(e) => toggleExpandTreeNode(e, nodeKey)}
            />
          );
        })}
      </>
    );
  }, [nodes, tagsData, value, highlightNodeIndex, searchValue, recentlyUsedTags, keyNodeFoldedMap, searchedKeyNodeFoldedMap, showRecentlyUsed, renderRecentlyUsed, toggleExpandTreeNode, handleSelectTags, onTreeMenuMouseEnter, onTreeMenuMouseLeave]);

  return (
    <div className={classnames('sf-metadata-tags-editor', { 'tags-tree-container': showTagsAsTree })} style={style} ref={editorRef}>
      {showDeletableTags && <DeleteTag value={value} tags={tagsData} onDelete={handleSelectTags} />}
      <div className="sf-metadata-search-tags-container">
        <SearchInput
          placeholder={gettext('Search tag')}
          onKeyDown={onKeyDown}
          onChange={onChangeSearch}
          autoFocus={true}
          className="sf-metadata-search-tags"
          isClearable={showTagsAsTree}
          components={{
            ClearIndicator: ({ clearValue }) => (
              <i
                className="search-control attr-action-icon sf3-font sf3-font-x-01"
                aria-label={gettext('Clear')}
                onClick={clearValue}
              />
            )
          }}
          clearValue={() => setSearchValue('')}
        />
      </div>
      <div className="sf-metadata-tags-editor-container" ref={editorContainerRef}>
        {showTagsAsTree ? renderOptionsAsTree() : renderOptions()}
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
  showTagsAsTree: PropTypes.bool,
  onSelect: PropTypes.func,
  onDeselect: PropTypes.func,
  canEditData: PropTypes.bool,
  canAddTag: PropTypes.bool,
};

export default TagsEditor;
