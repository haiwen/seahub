import React, { forwardRef, useCallback, useMemo } from 'react';
import TagsEditor from '../../../../../components/sf-table/editors/tags-editor';
import { useTags } from '../../../../hooks';

const ParentTagsEditor = forwardRef(({ record, column, addTagLinks, deleteTagLinks, ...editorProps }, ref) => {
  const { tagsData } = useTags();

  const parentLinks = useMemo(() => {
    return record[column.key] || [];
  }, [record, column]);

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
        record={record}
        column={column}
        value={parentLinks}
        tagsTable={tagsData}
        selectTag={selectTag}
        deselectTag={deselectTag}
      />
    </div>
  );
});

export default ParentTagsEditor;
