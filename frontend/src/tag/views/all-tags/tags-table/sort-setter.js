import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { gettext } from '../../../../utils/constants';
import SortMenu from '../../../../components/sort-menu';

const ALL_TAGS_SORT_OPTIONS = 'all_tags_sort_options';
const SortSetter = () => {
  const [option, setOption] = useState({ sortBy: 'name', order: 'asc' });

  const localStorage = window.sfTagsDataContext && window.sfTagsDataContext.localStorage;

  const options = useMemo(() => {
    return [
      { value: 'name-asc', text: gettext('By tag name ascending') },
      { value: 'name-desc', text: gettext('By tag name descending') },
      { value: 'subCount-asc', text: gettext('By child tags count ascending') },
      { value: 'subCount-desc', text: gettext('By child tags count descending') },
      { value: 'fileCount-asc', text: gettext('By file count ascending') },
      { value: 'fileCount-desc', text: gettext('By file count descending') }
    ];
  }, []);

  const onSelectSortOption = useCallback((item) => {
    const [sortBy, order] = item.value.split('-');
    setOption({ sortBy, order });
    localStorage && localStorage.setItem(ALL_TAGS_SORT_OPTIONS, item.value);
  }, [localStorage]);

  useEffect(() => {
    const saved = localStorage && localStorage.getItem(ALL_TAGS_SORT_OPTIONS) || { sortBy: 'name', order: 'asc' };
    setOption(saved);
  }, [localStorage]);

  return (
    <SortMenu sortBy={option.sortBy} sortOrder={option.order} sortOptions={options} onSelectSortOption={onSelectSortOption} />
  );
};

export default SortSetter;
