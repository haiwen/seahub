import React, { forwardRef, useCallback, useMemo } from 'react';
import TagsEditor from '../../../../../components/sf-table/editors/tags-editor';
import { useTags } from '../../../../hooks';
import { getRowById } from '../../../../../components/sf-table/utils/table';
import { getSubLinks } from '../../../../utils/cell';

const SubTagsEditor = forwardRef(({ editingRowId, column, addTagLinks, deleteTagLinks, ...editorProps }, ref) => {
  const { tagsData } = useTags();

  const tag = useMemo(() => {
    return getRowById(tagsData, editingRowId);
  }, [tagsData, editingRowId]);

  const subTags = useMemo(() => {
    return getSubLinks(tag);
  }, [tag]);

  const selectTag = useCallback((tagId, recordId) => {
    addTagLinks(column.key, recordId, [tagId]);
  }, [column, addTagLinks]);

  const deselectTag = useCallback((tagId, recordId) => {
    deleteTagLinks(column.key, recordId, [tagId]);
  }, [column, deleteTagLinks]);

  return (
    <div className="sf-metadata-tags-parent-links-editor">
      <TagsEditor
        {...editorProps}
        record={tag}
        column={column}
        value={subTags}
        tagsTable={tagsData}
        selectTag={selectTag}
        deselectTag={deselectTag}
      />
    </div>
  );
});

export default SubTagsEditor;
