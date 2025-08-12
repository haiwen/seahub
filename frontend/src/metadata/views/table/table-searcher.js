import React, { useCallback, useMemo, useState } from 'react';
import SFTableSearcher from '../../../components/sf-table/searcher';
import { useMetadataView } from '../../hooks/metadata-view';
import { getSearchRule } from '../../../components/sf-table/utils/search';
import { getFileNameFromRecord } from '../../utils/cell';
import { PRIVATE_COLUMN_KEY } from '../../constants';
import { EVENT_BUS_TYPE } from '../../constants';

// Define which columns are searchable for metadata tables
const SUPPORT_SEARCH_COLUMNS_KEYS = [
  PRIVATE_COLUMN_KEY.FILE_NAME,
  PRIVATE_COLUMN_KEY.FILE_DESCRIPTION,
  PRIVATE_COLUMN_KEY.TAGS,
  PRIVATE_COLUMN_KEY.FILE_KEYWORDS,
];

const MetadataTableSearcher = () => {
  const { metadata } = useMetadataView();
  const [searchResult, setSearchResult] = useState(null);

  const recordIds = useMemo(() => {
    return metadata?.view?.rows || [];
  }, [metadata]);

  const recordsCount = useMemo(() => {
    return recordIds.length;
  }, [recordIds]);

  const getRecordStrContentById = useCallback((recordId) => {
    const record = metadata?.id_row_map?.[recordId];
    if (!record) return null;

    let strContent = {};
    SUPPORT_SEARCH_COLUMNS_KEYS.forEach((columnKey) => {
      switch (columnKey) {
        case PRIVATE_COLUMN_KEY.FILE_NAME: {
          strContent[columnKey] = getFileNameFromRecord(record) || '';
          break;
        }
        case PRIVATE_COLUMN_KEY.FILE_DESCRIPTION: {
          strContent[columnKey] = record[columnKey] || '';
          break;
        }
        case PRIVATE_COLUMN_KEY.FILE_KEYWORDS: {
          strContent[columnKey] = record[columnKey] || '';
          break;
        }
        case PRIVATE_COLUMN_KEY.TAGS: {
          // Handle tags array - convert to searchable string
          const tags = record[columnKey];
          if (Array.isArray(tags)) {
            strContent[columnKey] = tags.map(tag => tag.name || tag).join(' ');
          } else {
            strContent[columnKey] = '';
          }
          break;
        }
        default: {
          strContent[columnKey] = record[columnKey] || '';
          break;
        }
      }
    });
    return strContent;
  }, [metadata]);

  const checkIsCellValueMatchedRegVal = useCallback((recordContent, columnKey, regVal) => {
    const cellValueDisplayString = (recordContent && recordContent[columnKey]) || '';
    const isMatched = regVal.test(cellValueDisplayString);
    return isMatched;
  }, []);

  const handleUpdateSearchResult = useCallback((searchResult) => {
    setSearchResult(searchResult);

    const eventBus = window.sfMetadataContext && window.sfMetadataContext.eventBus;
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_SEARCH_RESULT, searchResult);
  }, []);

  const searchCells = useCallback((searchRegRule) => {
    let searchResult = {};
    let matchedRows = {};
    searchResult.matchedCells = [];
    searchResult.matchedRows = matchedRows;

    recordIds.forEach((recordId, recordIndex) => {
      const recordStrContent = getRecordStrContentById(recordId);
      SUPPORT_SEARCH_COLUMNS_KEYS.forEach((columnKey) => {
        const isMatched = checkIsCellValueMatchedRegVal(recordStrContent, columnKey, searchRegRule);
        if (isMatched) {
          if (matchedRows[recordId]) {
            matchedRows[recordId].push(columnKey);
          } else {
            matchedRows[recordId] = [columnKey];
          }
          searchResult.matchedCells.push({ 
            recordId, 
            recordStrContent, 
            column: columnKey, 
            rowIndex: recordIndex 
          });
        }
      });
    });
    searchResult.currentSelectIndex = 0;
    return searchResult;
  }, [recordIds, getRecordStrContentById, checkIsCellValueMatchedRegVal]);

  const handleSearchRecords = useCallback((searchVal) => {
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

  // Don't render if no metadata
  if (!metadata) return null;

  const columnsCount = metadata.view?.columns?.length || 0;

  return (
    <SFTableSearcher
      recordsCount={recordsCount}
      columnsCount={columnsCount}
      searchResult={searchResult}
      closeSearcher={closeSearcher}
      focusNextMatchedCell={focusNextMatchedCell}
      focusPreviousMatchedCell={focusPreviousMatchedCell}
      searchCells={handleSearchRecords}
    />
  );
};

export default MetadataTableSearcher;