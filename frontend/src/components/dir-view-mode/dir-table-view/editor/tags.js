import { forwardRef, useCallback } from 'react';
import TagsEditor from '@/metadata/components/cell-editors/tags-editor';
import { getRecordIdFromRecord } from '@/metadata/utils/cell';
import tagsAPI from '@/tag/api';
import { checkIsDir } from '@/metadata/utils/row';

const TagsEditorWrapper = forwardRef((props, ref) => {
  const { repoID, value, record, column } = props;
  const handleSelect = useCallback((tagId) => {
    const currentValue = Array.isArray(value) && value.length > 0 ? value.map(item => item.row_id) : [];
    const newValue = [...currentValue, tagId];
    const recordID = getRecordIdFromRecord(record);
    tagsAPI.updateFileTags(repoID, [{ record_id: recordID, tags: newValue }]);
  }, [value, record, repoID]);

  const handleDeselect = useCallback((tagId) => {
    const currentValue = Array.isArray(value) && value.length > 0 ? value.map(item => item.row_id) : [];
    const newValue = currentValue.filter(existingId => existingId !== tagId);
    const recordID = getRecordIdFromRecord(record);
    tagsAPI.updateFileTags(repoID, [{ record_id: recordID, tags: newValue }]);
  }, [value, record, repoID]);

  if (checkIsDir(record)) return null;

  return (
    <TagsEditor
      ref={ref}
      column={{ ...column, width: 400 }}
      record={record}
      value={value}
      canAddTag={true}
      onSelect={handleSelect}
      onDeselect={handleDeselect}
    />
  );
});

export default TagsEditorWrapper;
