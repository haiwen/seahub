import { useCallback } from 'react';
import SortMenu from '../../components/sort-menu';
import ViewModes from '../../components/view-modes';
import { useTags } from '../hooks';
import { getSortBy, getSortOrder } from '../utils/sort';

const ViewModeSetter = () => {
  const { tagFilesViewMode, switchTagFilesViewMode } = useTags();

  return (
    <ViewModes
      currentViewMode={tagFilesViewMode}
      switchViewMode={switchTagFilesViewMode}
    />
  );
};

const SortSetter = () => {
  const { tagFilesSort, modifyTagFilesSort } = useTags();

  const onSelectSortOption = useCallback((item) => {
    const [sortBy, order] = item.value.split('-');
    const newSort = { sort_by: sortBy, order };
    modifyTagFilesSort(newSort);
  }, [modifyTagFilesSort]);

  return (
    <SortMenu
      className="ml-2"
      sortBy={getSortBy(tagFilesSort)}
      sortOrder={getSortOrder(tagFilesSort)}
      onSelectSortOption={onSelectSortOption}
    />
  );
};

const TagFilesViewToolbar = () => {
  return (
    <>
      <ViewModeSetter />
      <SortSetter />
    </>
  );
};

export default TagFilesViewToolbar;
