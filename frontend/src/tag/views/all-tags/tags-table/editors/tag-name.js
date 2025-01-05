import React, { forwardRef, useCallback, useMemo } from 'react';
import EditTagDialog from '../../../../components/dialog/edit-tag-dialog';
import { gettext } from '../../../../../utils/constants';
import { getRecordIdFromRecord } from '../../../../../metadata/utils/cell';
import { useTags } from '../../../../hooks';

const TagNameEditor = forwardRef(({ record, updateTag, onCommitCancel, ...editorProps }, ref) => {
  const { tagsData } = useTags();

  const tags = useMemo(() => {
    return tagsData?.rows || [];
  }, [tagsData]);

  const handelUpdateTag = useCallback((updates, { success_callback, fail_callback } = {}) => {
    const recordId = getRecordIdFromRecord(record);
    updateTag(recordId, updates, { success_callback, fail_callback });
  }, [record, updateTag]);

  return (
    <EditTagDialog {...editorProps} tags={tags} title={gettext('Edit tag')} tag={record} onToggle={onCommitCancel} onSubmit={handelUpdateTag} />
  );
});

export default TagNameEditor;
