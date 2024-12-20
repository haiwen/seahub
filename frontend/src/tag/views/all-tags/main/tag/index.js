import React, { useCallback, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { FileTagsFormatter } from '@seafile/sf-metadata-ui-component';
import EditTagDialog from '../../../../components/dialog/edit-tag-dialog';
import DeleteConfirmDialog from '../../../../../metadata/components/dialog/delete-confirm-dialog';
import TagMoreOperation from './tag-more-operation';
import SetLinkedTagsPopover from '../../../../components/popover/set-linked-tags-popover';
import { getTagName, getTagColor, getTagFilesCount, getTagId, getParentLinks, getSubTagsCount, getSubLinks } from '../../../../utils/cell/core';
import { gettext } from '../../../../../utils/constants';
import { useTags } from '../../../../hooks';
import { PRIVATE_COLUMN_KEY } from '../../../../constants';

import './index.css';

const Tag = ({ tags, tag, context, onChangeDisplayTag }) => {
  const { tagsData, updateTag, deleteTags, addTagLinks, deleteTagLinks } = useTags();
  const tagId = getTagId(tag);
  const tagName = getTagName(tag);
  const tagColor = getTagColor(tag);
  const parentLinks = getParentLinks(tag);
  const subLinks = getSubLinks(tag);
  const subTagsCount = getSubTagsCount(tag);
  const fileCount = getTagFilesCount(tag);
  const [isShowEditTagDialog, setShowEditTagDialog] = useState(false);
  const [isShowDeleteDialog, setShowDeleteDialog] = useState(false);
  const [freeze, setFreeze] = useState(false);
  const [editingColumnKey, setEditingColumnKey] = useState(null);

  const operationsPopHandlerRef = useRef(null);

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

  const freezeItem = useCallback(() => {
    setFreeze(true);
  }, []);

  const unfreezeItem = useCallback(() => {
    setFreeze(false);
  }, []);

  const hideSetLinkedTagsPopover = useCallback(() => {
    setEditingColumnKey(null);
  }, []);

  const showParentTagsSetter = useCallback(() => {
    setEditingColumnKey(PRIVATE_COLUMN_KEY.PARENT_LINKS);
  }, []);

  const showSubTagsSetter = useCallback(() => {
    setEditingColumnKey(PRIVATE_COLUMN_KEY.SUB_LINKS);
  }, []);

  const getEditingTagLinks = useCallback(() => {
    return editingColumnKey === PRIVATE_COLUMN_KEY.PARENT_LINKS ? parentLinks : subLinks;
  }, [editingColumnKey, parentLinks, subLinks]);

  const handleAddTagLinks = useCallback((linkedTag) => {
    const { _id: otherTagId } = linkedTag;
    addTagLinks(editingColumnKey, tagId, [otherTagId]);
  }, [editingColumnKey, tagId, addTagLinks]);

  const handleDeleteTagLinks = useCallback((otherTagId) => {
    deleteTagLinks(editingColumnKey, tagId, [otherTagId]);
  }, [editingColumnKey, tagId, deleteTagLinks]);

  return (
    <>
      <div className={classnames('sf-metadata-tags-table-row', { 'freezed': freeze })}>
        <div className="sf-metadata-tags-table-cell sf-metadata-tags-table-cell-tag" onClick={handleDisplayTag}>
          <span className="sf-metadata-tag-color" style={{ backgroundColor: tagColor }}></span>
          <span className="sf-metadata-tag-name" title={tagName}>{tagName}</span>
        </div>
        <div className="sf-metadata-tags-table-cell sf-metadata-tags-table-cell-parent-tags">
          <FileTagsFormatter tagsData={tagsData} value={parentLinks} />
        </div>
        <div className="sf-metadata-tags-table-cell sf-metadata-tags-table-cell-sub-tags-count" title={subTagsCount}>{subTagsCount}</div>
        <div className="sf-metadata-tags-table-cell sf-metadata-tags-table-cell-tag-files-count" title={fileCount}>{fileCount}</div>
        <div className="sf-metadata-tags-table-cell sf-metadata-tags-table-cell-operations-wrapper">
          <div className="sf-metadata-tags-operation-pop-handler" ref={operationsPopHandlerRef}></div>
          <div className="sf-metadata-tags-table-cell-actions">
            {context.canModifyTag() && (
              <>
                <TagMoreOperation
                  freezeItem={freezeItem}
                  unfreezeItem={unfreezeItem}
                  showParentTagsSetter={showParentTagsSetter}
                  showSubTagsSetter={showSubTagsSetter}
                />
                <div className="sf-metadata-tags-table-cell-action mr-2" title={gettext('Edit')} onClick={openEditTagDialog}>
                  <i className="op-icon sf3-font-rename sf3-font"></i>
                </div>
              </>
            )}
            {context.checkCanDeleteTag() && (
              <div className="sf-metadata-tags-table-cell-action" title={gettext('Delete')} onClick={openDeleteConfirmDialog}>
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
      {editingColumnKey && (
        <SetLinkedTagsPopover
          target={operationsPopHandlerRef.current}
          isParentTags={editingColumnKey === PRIVATE_COLUMN_KEY.PARENT_LINKS}
          tagLinks={getEditingTagLinks()}
          allTags={tags}
          hidePopover={hideSetLinkedTagsPopover}
          addTagLinks={handleAddTagLinks}
          deleteTagLinks={handleDeleteTagLinks}
        />
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
