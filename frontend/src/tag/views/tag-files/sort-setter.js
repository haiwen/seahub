import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SortMenu from '../../../components/sort-menu';
import { EVENT_BUS_TYPE } from '../../../metadata/constants';
import { TAG_FILES_SORT, TAG_FILES_DEFAULT_SORT } from '../../constants/sort';
import { getSortBy, getSortOrder } from '../../utils/sort';

const SortSetter = () => {
  const [sort, setSort] = useState(TAG_FILES_DEFAULT_SORT);

  const eventBus = useMemo(() => window.sfTagsDataContext?.eventBus, []);
  const localStorage = useMemo(() => window.sfTagsDataContext?.localStorage, []);

  const onSelectSortOption = useCallback((item) => {
    const [sortBy, order] = item.value.split('-');
    const newSort = { sort_by: sortBy, order };
    setSort(newSort);
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_TAG_FILES_SORT, newSort);
  }, [eventBus]);

  useEffect(() => {
    const storedSort = localStorage && localStorage.getItem(TAG_FILES_SORT);
    const sort = storedSort ? JSON.parse(storedSort) : TAG_FILES_DEFAULT_SORT;
    setSort(sort);

    const unsubscribeSort = eventBus && eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_TAG_FILES_SORT, (newSort) => {
      setSort(newSort);
    });
    return () => {
      unsubscribeSort && unsubscribeSort();
    };
  }, [localStorage, eventBus]);

  return (
    <SortMenu sortBy={getSortBy(sort)} sortOrder={getSortOrder(sort)} onSelectSortOption={onSelectSortOption} />
  );
};

export default SortSetter;
