import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { gettext } from '../../../../utils/constants';
import SortMenu from '../../../../components/sort-menu';
import { EVENT_BUS_TYPE } from '../../../../metadata/constants';
import { ALL_TAGS_SORT, ALL_TAGS_SORT_KEY, TAGS_DEFAULT_SORT } from '../../../constants/sort';

const SortSetter = () => {
  const [sort, setSort] = useState(TAGS_DEFAULT_SORT);

  const eventBus = useMemo(() => window.sfTagsDataContext?.eventBus, []);
  const localStorage = useMemo(() => window.sfTagsDataContext?.localStorage, []);

  const options = useMemo(() => {
    return [
      { value: `${ALL_TAGS_SORT_KEY.NAME}-asc`, text: gettext('By tag name ascending') },
      { value: `${ALL_TAGS_SORT_KEY.NAME}-desc`, text: gettext('By tag name descending') },
      { value: `${ALL_TAGS_SORT_KEY.CHILD_TAGS_COUNT}-asc`, text: gettext('By child tags count ascending') },
      { value: `${ALL_TAGS_SORT_KEY.CHILD_TAGS_COUNT}-desc`, text: gettext('By child tags count descending') },
      { value: `${ALL_TAGS_SORT_KEY.TAG_FILE_COUNT}-asc`, text: gettext('By file count ascending') },
      { value: `${ALL_TAGS_SORT_KEY.TAG_FILE_COUNT}-desc`, text: gettext('By file count descending') }
    ];
  }, []);

  const onSelectSortOption = useCallback((item) => {
    const [sortBy, order] = item.value.split('-');
    const newSort = { sortBy, order };
    setSort(newSort);
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_TAGS_SORT, newSort);
  }, [eventBus]);

  useEffect(() => {
    const storedSort = localStorage && localStorage.getItem(ALL_TAGS_SORT);
    const sort = storedSort ? JSON.parse(storedSort) : TAGS_DEFAULT_SORT;
    setSort(sort);
  }, [localStorage]);

  return (
    <SortMenu sortBy={sort.sortBy} sortOrder={sort.order} sortOptions={options} onSelectSortOption={onSelectSortOption} />
  );
};

export default SortSetter;
