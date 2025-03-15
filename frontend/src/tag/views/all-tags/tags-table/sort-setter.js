import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { gettext } from '../../../../utils/constants';
import SortMenu from '../../../../components/sort-menu';
import { EVENT_BUS_TYPE } from '../../../../metadata/constants';
import { ALL_TAGS_SORT_KEY, ALL_TAGS_SORT_OPTIONS, TAGS_DEFAULT_SORT } from '../../../constants/sort';

const SortSetter = () => {
  const [option, setOption] = useState(TAGS_DEFAULT_SORT);

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
    setOption(newSort);
    localStorage && localStorage.setItem(ALL_TAGS_SORT_OPTIONS, JSON.stringify(newSort));
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_TAGS_SORT, newSort);
  }, [eventBus, localStorage]);

  useEffect(() => {
    const saved = localStorage?.getItem(ALL_TAGS_SORT_OPTIONS);
    if (saved) {
      setOption(JSON.parse(saved));
    }
  }, [localStorage]);

  return (
    <SortMenu sortBy={option.sortBy} sortOrder={option.order} sortOptions={options} onSelectSortOption={onSelectSortOption} />
  );
};

export default SortSetter;
