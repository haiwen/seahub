import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import TreeSection from '../../tree-section';
import { useMetadataStatus } from '../../../hooks';
import { TagsTreeView } from '../../../tag';
import { useTags } from '../../../tag/hooks';
import EditTagDialog from '../../../tag/components/dialog/edit-tag-dialog';

const DirTags = ({ userPerm, repoID, currentPath, currentRepoInfo }) => {
  const [isShowEditTagDialog, setIsShowEditTagDialog] = useState(false);

  const { enableMetadata, enableTags } = useMetadataStatus();
  const { isLoading, tagsData, addTag } = useTags();

  const enableMetadataManagement = useMemo(() => {
    if (currentRepoInfo.encrypted) return false;
    return window.app.pageOptions.enableMetadataManagement;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.app.pageOptions.enableMetadataManagement, currentRepoInfo]);

  const tags = useMemo(() => {
    if (!tagsData) return [];
    return tagsData.rows;
  }, [tagsData]);

  const createTag = useCallback((tag, callback) => {
    addTag(tag, callback);
  }, [addTag]);

  const openAddTag = useCallback(() => {
    setIsShowEditTagDialog(true);
  }, []);

  const closeAddTag = useCallback(() => {
    setIsShowEditTagDialog(false);
  }, []);

  const renderTreeSectionHeaderOperations = (menuProps) => {
    const canAdd = userPerm === 'rw' || userPerm === 'admin';

    let operations = [];
    if (enableTags && canAdd) {
      operations.push(
        <span key="tree-section-create-operation" role="button" className="tree-section-header-operation tree-section-create-operation" onClick={openAddTag}>
          <i className="sf3-font sf3-font-new"></i>
        </span>
      );
    }
    return operations;
  };

  if (!enableMetadataManagement) return null;
  if (!enableMetadata || !enableTags) return null;

  return (
    <TreeSection
      repoID={repoID}
      title={gettext('Tags')}
      stateStorageKey="tags"
      renderHeaderOperations={renderTreeSectionHeaderOperations}
    >
      {!isLoading && (<TagsTreeView userPerm={userPerm} repoID={repoID} currentPath={currentPath} />)}
      {isShowEditTagDialog && (
        <EditTagDialog tags={tags} title={gettext('New tag')} onToggle={closeAddTag} onSubmit={createTag} />
      )}
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
