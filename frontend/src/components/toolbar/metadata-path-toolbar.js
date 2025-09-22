import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { TAGS_MODE } from '../dir-view-mode/constants';
import { ALL_TAGS_ID } from '../../tag/constants';
import { useMetadata } from '../../metadata/hooks';
import { VIEW_TYPE } from '../../metadata/constants';
import AllTagsToolbar from './all-tags-toolbar';
import TagFilesToolbar from './tag-files-toolbar';
import TableFilesToolbar from './table-files-toolbar';
import GalleryFilesToolbar from './gallery-files-toolbar';
import FaceRecognitionFilesToolbar from './face-recognition-files-toolbar';
import KanbanFilesToolbar from './kanban-files-toolbar';

const MetadataPathToolbar = ({ repoID, repoInfo, mode, path, viewId }) => {
  const { idViewMap } = useMetadata();
  const view = useMemo(() => idViewMap[viewId], [viewId, idViewMap]);
  const type = view?.type;

  if (type === VIEW_TYPE.GALLERY) {
    return (
      <GalleryFilesToolbar />
    );
  }

  if (type === VIEW_TYPE.FACE_RECOGNITION) {
    return <FaceRecognitionFilesToolbar />;
  }

  if (type === VIEW_TYPE.TABLE) {
    return (
      <TableFilesToolbar repoID={repoID} />
    );
  }

  if (type === VIEW_TYPE.KANBAN) {
    return <KanbanFilesToolbar repoID={repoID} />;
  }

  if (mode === TAGS_MODE) {
    const isAllTagsView = path.split('/').pop() === ALL_TAGS_ID;
    if (isAllTagsView) return <AllTagsToolbar />;

    return <TagFilesToolbar currentRepoInfo={repoInfo} />;
  }

};

MetadataPathToolbar.propTypes = {
  repoID: PropTypes.string.isRequired,
  repoInfo: PropTypes.object.isRequired,
  mode: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
};

export default MetadataPathToolbar;
