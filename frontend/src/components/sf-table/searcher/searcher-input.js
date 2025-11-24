import React, { useRef, useState } from 'react';
import { gettext } from '../../../utils/constants';

const SFTableSearcherInput = ({ recordsCount, columnsCount, setHasSearchValue, searchCells, onKeyDown }) => {
  const [searchValue, setSearchValue] = useState('');

  const isInputtingChinese = useRef(false);
  const inputTimer = useRef(null);

  const getSearchDelayTime = () => {
    const viewCellsCount = (recordsCount || 0) * (columnsCount || 0);
    let delayTime = viewCellsCount * 0.1;
    delayTime = delayTime > 500 ? 500 : Math.floor(delayTime);
    if (delayTime < 100) {
      delayTime = 100;
    }
    return delayTime;
  };

  const onChangeSearchValue = (e) => {
    inputTimer.current && clearTimeout(inputTimer.current);
    const text = e.target.value;
    const wait = getSearchDelayTime();
    const currSearchValue = text || '';
    const trimmedSearchValue = currSearchValue.trim();
    setSearchValue(currSearchValue);
    setHasSearchValue(!!trimmedSearchValue);
    if (!isInputtingChinese.current) {
      inputTimer.current = setTimeout(() => {
        searchCells && searchCells(trimmedSearchValue);
      }, wait);
    }
  };

  const onCompositionStart = () => {
    isInputtingChinese.current = true;
  };

  const onCompositionEnd = (e) => {
    isInputtingChinese.current = false;
    onChangeSearchValue(e);
  };

  return (
    <input
      className='sf-table-searcher-input form-control'
      name='sf-table-search-input'
      type='text'
      autoFocus
      value={searchValue}
      onChange={onChangeSearchValue}
      placeholder={gettext('Search')}
      onKeyDown={onKeyDown}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={onCompositionEnd}
    />
  );
};

export default SFTableSearcherInput;
