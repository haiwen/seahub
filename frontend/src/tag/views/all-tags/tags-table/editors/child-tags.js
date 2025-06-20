import React, { forwardRef, useCallback, useMemo } from 'react';
import TagsEditor from '../../../../../metadata/components/cell-editors/tags-editor';
import { useTags } from '../../../../hooks';
import { getRowById } from '../../../../../components/sf-table/utils/table';
import { getChildLinks } from '../../../../utils/cell';
import { getRecordIdFromRecord } from '../../../../../metadata/utils/cell';

const ChildTagsEditor = forwardRef(({ editingRowId, column, addTagLinks, deleteTagLinks, ...editorProps }, ref) => {
  const { tagsData, context } = useTags();

  const tag = useMemo(() => {
    return getRowById(tagsData, editingRowId);
  }, [tagsData, editingRowId]);

  const childTags = useMemo(() => {
    return getChildLinks(tag);
  }, [tag]);

  const selectTag = useCallback((tagId) => {
    const recordId = getRecordIdFromRecord(tag);
    addTagLinks(column.key, recordId, [tagId]);
  }, [tag, column, addTagLinks]);

  const deselectTag = useCallback((tagId) => {
    const recordId = getRecordIdFromRecord(tag);
    deleteTagLinks(column.key, recordId, [tagId]);
  }, [tag, column, deleteTagLinks]);

  return (
    <div className="sf-metadata-tags-child-links-editor">
      <TagsEditor
        column={{ ...column, width: 400 }}
        value={childTags}
        onSelect={selectTag}
        onDeselect={deselectTag}
        canEditData={context.canModify()}
        canAddTag={context.canAddTag()}
      />
    </div>
  );
});

export default ChildTagsEditor;
