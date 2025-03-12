import React from 'react';
import PropTypes from 'prop-types';
import { TAGS_MODE } from '../dir-view-mode/constants';
import { ALL_TAGS_ID } from '../../tag/constants';
import AllTagsToolbar from './all-tags-toolbar';
import TagFilesToolbar from './tag-files-toolbar';
import TableFilesToolbar from './table-files-toolbar';

const MetadataPathToolbar = ({ repoID, repoInfo, mode, path }) => {
  if (mode === TAGS_MODE) {
    const isAllTagsView = path.split('/').pop() === ALL_TAGS_ID;
    if (isAllTagsView) return <AllTagsToolbar />;

    return <TagFilesToolbar currentRepoInfo={repoInfo} />;
  }
  return (
    <TableFilesToolbar repoID={repoID} />
  );
};

MetadataPathToolbar.propTypes = {
  repoID: PropTypes.string.isRequired,
  repoInfo: PropTypes.object.isRequired,
  mode: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
};

export default MetadataPathToolbar;
