import React, { useCallback, useMemo, useState } from 'react';
import SFTableSearcher from '../../../../components/sf-table/searcher';
import { PRIVATE_COLUMN_KEY, VISIBLE_COLUMNS_KEYS } from '../../../constants';
import { useTags } from '../../../hooks';
import { getSearchRule } from '../../../../components/sf-table/utils/search';
import { getTreeNodeId, getTreeNodeKey } from '../../../../components/sf-table/utils/tree';
import { getRowById } from '../../../../components/sf-table/utils/table';
import EventBus from '../../../../components/common/event-bus';
import { EVENT_BUS_TYPE } from '../../../../metadata/constants';

const SUPPORT_SEARCH_COLUMNS_KEYS = [PRIVATE_COLUMN_KEY.TAG_NAME];

const TagsTableSearcher = () => {
  const { tagsData } = useTags();
  const [searchResult, setSearchResult] = useState(null);

  const recordsTree = useMemo(() => {
    return (tagsData && tagsData.rows_tree) || [];
  }, [tagsData]);

  const recordsCount = useMemo(() => {
    return recordsTree.length;
  }, [recordsTree]);

  const getTagStrContentByNode = useCallback((tagNode) => {
    const tagId = getTreeNodeId(tagNode);
    const tag = getRowById(tagsData, tagId);
    if (!tag) return null;
    let strContent = {};
    VISIBLE_COLUMNS_KEYS.forEach((columnKey) => {
      switch (columnKey) {
        case PRIVATE_COLUMN_KEY.TAG_NAME: {
          strContent[columnKey] = tag[columnKey] || '';
          break;
        }
        default: {
          break;
        }
      }
    });
    return strContent;
  }, [tagsData]);

  const checkIsCellValueMatchedRegVal = useCallback((tagContent, columnKey, regVal) => {
    const cellValueDisplayString = (tagContent && tagContent[columnKey]) || '';
    const isMatched = regVal.test(cellValueDisplayString);
    return isMatched;
  }, []);

  const handleUpdateSearchResult = useCallback((searchResult) => {
    setSearchResult(searchResult);

    const eventBus = EventBus.getInstance();
    eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_SEARCH_RESULT, searchResult);
  }, []);

  const searchCells = useCallback((searchRegRule) => {
    let searchResult = {};
    let matchedRows = {};
    searchResult.matchedCells = [];
    searchResult.matchedRows = matchedRows;
    recordsTree.forEach((tagNode, nodeIndex) => {
      const nodeKey = getTreeNodeKey(tagNode);
      const tagStrContent = getTagStrContentByNode(tagNode);
      SUPPORT_SEARCH_COLUMNS_KEYS.forEach((columnKey) => {
        const isMatched = checkIsCellValueMatchedRegVal(tagStrContent, columnKey, searchRegRule);
        if (isMatched) {
          if (matchedRows[nodeKey]) {
            matchedRows[nodeKey].push(columnKey);
          } else {
            matchedRows[nodeKey] = [columnKey];
          }
          searchResult.matchedCells.push({ nodeKey, tagStrContent, column: columnKey, rowIndex: nodeIndex });
        }
      });
    });
    searchResult.currentSelectIndex = 0;
    return searchResult;
  }, [recordsTree, getTagStrContentByNode, checkIsCellValueMatchedRegVal]);


  const handleSearchTags = useCallback((searchVal) => {
    if (searchVal.length === 0) {
      handleUpdateSearchResult(null);
    } else {
      const searchRegRule = getSearchRule(searchVal);
      const searchResult = searchRegRule ? searchCells(searchRegRule) : null;
      handleUpdateSearchResult(searchResult);
    }
  }, [searchCells, handleUpdateSearchResult]);

  const focusNextMatchedCell = useCallback(() => {
    if (!searchResult) return;
    const matchedCellsLength = searchResult.matchedCells.length;
    let currentSelectIndex = searchResult.currentSelectIndex;
    currentSelectIndex++;
    if (currentSelectIndex === matchedCellsLength) {
      currentSelectIndex = 0;
    }
    const nextSearchResult = Object.assign({}, searchResult, { currentSelectIndex: currentSelectIndex });
    handleUpdateSearchResult(nextSearchResult);
  }, [searchResult, handleUpdateSearchResult]);

  const focusPreviousMatchedCell = useCallback(() => {
    if (!searchResult) return;
    const matchedCellsLength = searchResult.matchedCells.length;
    let currentSelectIndex = searchResult.currentSelectIndex;
    currentSelectIndex--;
    if (currentSelectIndex === -1) {
      currentSelectIndex = matchedCellsLength - 1;
    }
    const nextSearchResult = Object.assign({}, searchResult, { currentSelectIndex: currentSelectIndex });
    handleUpdateSearchResult(nextSearchResult);
  }, [searchResult, handleUpdateSearchResult]);

  const closeSearcher = useCallback(() => {
    handleUpdateSearchResult(null);
  }, [handleUpdateSearchResult]);

  return (
    <SFTableSearcher
      recordsCount={recordsCount}
      columnsCount={VISIBLE_COLUMNS_KEYS.length}
      searchResult={searchResult}
      closeSearcher={closeSearcher}
      focusNextMatchedCell={focusNextMatchedCell}
      focusPreviousMatchedCell={focusPreviousMatchedCell}
      searchCells={handleSearchTags}
    />
  );
};

export default TagsTableSearcher;
