import React, { forwardRef, useCallback, useMemo } from 'react';
import EditTagDialog from '../../../../components/dialog/edit-tag-dialog';
import ChildTagsEditor from './child-tags';
import { gettext } from '../../../../../utils/constants';
import { getRecordIdFromRecord } from '../../../../../metadata/utils/cell';
import { useTags } from '../../../../hooks';
import { OPERATION } from '../../../../../components/sf-table/constants/context-menu';
import { PRIVATE_COLUMN_KEY } from '../../../../constants';

const TagNameEditor = forwardRef(({ record, updateTag, onCommitCancel, operation, addTagLinks, deleteTagLinks, column, ...editorProps }, ref) => {
  const { tagsData } = useTags();

  const tags = useMemo(() => {
    return tagsData?.rows || [];
  }, [tagsData]);

  const handelUpdateTag = useCallback((updates, { success_callback, fail_callback } = {}) => {
    const recordId = getRecordIdFromRecord(record);
    updateTag(recordId, updates, { success_callback, fail_callback });
  }, [record, updateTag]);

  if (operation && operation === OPERATION.ADD_CHILD_TAGS) {
    return (
      <ChildTagsEditor {...editorProps} addTagLinks={addTagLinks} deleteTagLinks={deleteTagLinks} column={{ key: PRIVATE_COLUMN_KEY.SUB_LINKS, width: column.width }} />
    );
  }

  return (
    <EditTagDialog {...editorProps} tags={tags} title={gettext('Edit tag')} tag={record} onToggle={onCommitCancel} onSubmit={handelUpdateTag} />
  );
});

export default TagNameEditor;
