import React from 'react';
import PropTypes from 'prop-types';
import LibDetail from './lib-details';
import DirentDetail from './dirent-details';
import GalleryDetail from '../../metadata/components/gallery-details';
import ObjectUtils from '../../metadata/utils/object-utils';
import { METADATA_MODE } from '../dir-view-mode/constants';

const DetailContainer = React.memo(({ repoID, path, dirent, currentRepoInfo, repoTags, fileTags, onClose, onFileTagChanged, mode }) => {

  const renderContent = () => {
    if (mode === METADATA_MODE) {
      const viewID = path.split('/').pop();
      return <GalleryDetail currentRepoInfo={currentRepoInfo} viewID={viewID} onClose={onClose} />;
    }

    if (path === '/' && !dirent) {
      return <LibDetail currentRepoInfo={currentRepoInfo} onClose={onClose} />;
    }

    return (
      <DirentDetail
        repoID={repoID}
        path={path}
        dirent={dirent}
        currentRepoInfo={currentRepoInfo}
        repoTags={repoTags}
        fileTags={fileTags}
        onFileTagChanged={onFileTagChanged}
        onClose={onClose}
      />
    );
  };

  return renderContent();
}, (props, nextProps) => {
  const isChanged =
    props.repoID !== nextProps.repoID ||
    props.path !== nextProps.path ||
    !ObjectUtils.isSameObject(props.dirent, nextProps.dirent) ||
    !ObjectUtils.isSameObject(props.currentRepoInfo, nextProps.currentRepoInfo) ||
    JSON.stringify(props.repoTags || []) !== JSON.stringify(nextProps.repoTags || []) ||
    JSON.stringify(props.fileTags || []) !== JSON.stringify(nextProps.fileTags || []);
  return !isChanged;
});

DetailContainer.propTypes = {
  repoID: PropTypes.string,
  path: PropTypes.string,
  dirent: PropTypes.object,
  currentRepoInfo: PropTypes.object,
  repoTags: PropTypes.array,
  fileTags: PropTypes.array,
  onClose: PropTypes.func,
  onFileTagChanged: PropTypes.func,
  mode: PropTypes.string,
};

export default DetailContainer;
