import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { getTagName, getTagColor, getTagFilesCount, getTagId } from '../../../../utils/cell/core';
import { gettext } from '../../../../../utils/constants';
import EditTagDialog from '../../../../components/dialog/edit-tag-dialog';
import DeleteConfirmDialog from '../../../../../metadata/components/dialog/delete-confirm-dialog';
import { useTags } from '../../../../hooks';

import './index.css';

const Tag = ({ tags, tag, context, onChangeDisplayTag }) => {
  const tagId = getTagId(tag);
  const tagName = getTagName(tag);
  const tagColor = getTagColor(tag);
  const fileCount = getTagFilesCount(tag);
  const [isShowEditTagDialog, setShowEditTagDialog] = useState(false);
  const [isShowDeleteDialog, setShowDeleteDialog] = useState(false);

  const { updateTag, deleteTags } = useTags();

  const openEditTagDialog = useCallback(() => {
    setShowEditTagDialog(true);
  }, []);

  const closeEditTagDialog = useCallback(() => {
    setShowEditTagDialog(false);
  }, []);

  const handelEditTag = useCallback((update, callback) => {
    updateTag(tagId, update, callback);
  }, [tagId, updateTag]);

  const openDeleteConfirmDialog = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const closeDeleteConfirmDialog = useCallback(() => {
    setShowDeleteDialog(false);
  }, []);

  const handelDelete = useCallback(() => {
    deleteTags([tagId]);
  }, [tagId, deleteTags]);

  const handleDisplayTag = useCallback((event) => {
    if (event.target.tagName == 'SPAN') {
      onChangeDisplayTag(tagId);
    }
  }, [tagId, onChangeDisplayTag]);

  return (
    <>
      <div className="sf-metadata-tags-table-row">
        <div className="sf-metadata-tags-table-cell sf-metadata-tags-table-cell-tag" onClick={handleDisplayTag}>
          <span className="sf-metadata-tag-color" style={{ backgroundColor: tagColor }}></span>
          <span className="sf-metadata-tag-name">{tagName}</span>
        </div>
        <div className="sf-metadata-tags-table-cell">{fileCount}</div>
        <div className="sf-metadata-tags-table-cell">
          <div className="sf-metadata-tags-table-cell-actions">
            {context.canModifyTag() && (
              <div className="sf-metadata-tags-table-cell-action" title={gettext('Edit')} onClick={openEditTagDialog}>
                <i className="op-icon sf3-font-rename sf3-font"></i>
              </div>
            )}
            {context.checkCanDeleteTag() && (
              <div className="sf-metadata-tags-table-cell-action ml-2" title={gettext('Delete')} onClick={openDeleteConfirmDialog}>
                <i className="op-icon sf3-font-delete1 sf3-font"></i>
              </div>
            )}
          </div>
        </div>
      </div>
      {isShowEditTagDialog && (
        <EditTagDialog tags={tags} title={gettext('Edit tag')} tag={tag} onToggle={closeEditTagDialog} onSubmit={handelEditTag} />
      )}
      {isShowDeleteDialog && (
        <DeleteConfirmDialog title={gettext('Delete tag')} content={tagName} onToggle={closeDeleteConfirmDialog} onSubmit={handelDelete} />
      )}
    </>
  );
};

Tag.propTypes = {
  tags: PropTypes.array,
  tag: PropTypes.object,
  context: PropTypes.object,
  onChangeDisplayTag: PropTypes.func,
};

export default Tag;
