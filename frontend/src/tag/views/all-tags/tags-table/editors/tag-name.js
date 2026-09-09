import React, { forwardRef, useCallback, useMemo } from 'react';
import { OPERATION } from '../../../../../components/sf-table/constants/operation';
import { getRecordIdFromRecord } from '../../../../../metadata/utils/cell';
import { gettext } from '../../../../../utils/constants';
import EditTagDialog from '../../../../components/dialog/edit-tag-dialog';
import { PRIVATE_COLUMN_KEY } from '../../../../constants';
import { useTags } from '../../../../hooks';
import ChildTagsEditor from './child-tags';

const TagNameEditor = forwardRef(({ record, updateTag, onCommitCancel, operation, addTagLinks, deleteTagLinks, column, ...editorProps }, ref) => {
  const { tagsData } = useTags();

  const tags = useMemo(() => {
    return tagsData?.rows || [];
  }, [tagsData]);

  const handleUpdateTag = useCallback((updates, { success_callback, fail_callback } = {}) => {
    const recordId = getRecordIdFromRecord(record);
    updateTag(recordId, updates, { success_callback, fail_callback });
  }, [record, updateTag]);

  if (operation && operation === OPERATION.ADD_CHILD_TAGS) {
    return (
      <ChildTagsEditor
        {...editorProps}
        addTagLinks={addTagLinks}
        deleteTagLinks={deleteTagLinks}
        column={{ key: PRIVATE_COLUMN_KEY.SUB_LINKS, width: column.width }}
      />
    );
  }

  return (
    <EditTagDialog {...editorProps} tags={tags} title={gettext('Edit tag')} tag={record} onToggle={onCommitCancel} onSubmit={handleUpdateTag} />
  );
});

export default TagNameEditor;
