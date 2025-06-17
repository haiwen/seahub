import SortSetter from './sort-setter';
import ViewModeSetter from './view-mode-setter';

const TagFilesViewToolbar = () => {
  return (
    <>
      <ViewModeSetter />
      <SortSetter />
    </>
  );
};

export default TagFilesViewToolbar;
