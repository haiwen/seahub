import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import TreeSection from '../../tree-section';
import { useMetadataStatus } from '../../../hooks';
import { TagsTreeView } from '../../../tag';

const DirTags = ({ userPerm, repoID, currentPath, currentRepoInfo }) => {

  const enableMetadataManagement = useMemo(() => {
    if (currentRepoInfo.encrypted) return false;
    return window.app.pageOptions.enableMetadataManagement;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.app.pageOptions.enableMetadataManagement, currentRepoInfo]);

  const { enableMetadata, enableTags } = useMetadataStatus();

  if (!enableMetadataManagement) return null;
  if (!enableMetadata || !enableTags) return null;

  return (
    <TreeSection title={gettext('Tags')}>
      <TagsTreeView userPerm={userPerm} repoID={repoID} currentPath={currentPath} />
    </TreeSection>
  );
};

DirTags.propTypes = {
  userPerm: PropTypes.string,
  repoID: PropTypes.string,
  currentPath: PropTypes.string,
  currentRepoInfo: PropTypes.object,
};

export default DirTags;
