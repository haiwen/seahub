import SortSetter from './sort-setter';
import TagFilesViewMode from './view-mode';

const TagFilesViewToolbar = () => {
  return (
    <>
      <TagFilesViewMode />
      <SortSetter />
    </>
  );
};

export default TagFilesViewToolbar;
