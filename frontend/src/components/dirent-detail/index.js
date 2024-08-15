import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import LibDetail from './lib-details';
import DirentDetail from './dirent-details';
import ObjectUtils from '../../metadata/metadata-view/utils/object-utils';
import { MetadataContext } from '../../metadata';
import { mediaUrl } from '../../utils/constants';

const Index = React.memo(({ repoID, path, dirent, currentRepoInfo, repoTags, fileTags, onClose, onFileTagChanged }) => {

  useEffect(() => {
    // init context
    const context = new MetadataContext();
    window.sfMetadataContext = context;
    window.sfMetadataContext.init({ repoID, mediaUrl, repoInfo: currentRepoInfo });
    return () => {
      window.sfMetadataContext.destroy();
      delete window['sfMetadataContext'];
    };
  }, [repoID, currentRepoInfo]);

  if (path === '/' && !dirent) {
    return (
      <LibDetail currentRepoInfo={currentRepoInfo} onClose={onClose} />
    );
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
}, (props, nextProps) => {
  const isChanged = props.repoID !== nextProps.repoID ||
    props.path !== nextProps.path ||
    !ObjectUtils.isSameObject(props.dirent, nextProps.dirent) ||
    !ObjectUtils.isSameObject(props.currentRepoInfo, nextProps.currentRepoInfo) ||
    JSON.stringify(props.repoTags || []) !== JSON.stringify(nextProps.repoTags || []) ||
    JSON.stringify(props.fileTags || []) !== JSON.stringify(nextProps.fileTags || []);
  return !isChanged;
});

Index.propTypes = {
  repoID: PropTypes.string,
  path: PropTypes.string,
  dirent: PropTypes.object,
  currentRepoInfo: PropTypes.object,
  repoTags: PropTypes.array,
  fileTags: PropTypes.array,
  onClose: PropTypes.func,
  onFileTagChanged: PropTypes.func,
};

export default Index;
