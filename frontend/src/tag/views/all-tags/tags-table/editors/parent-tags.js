import React, { forwardRef, useCallback, useMemo } from 'react';
// import TagsEditor from '../../../../../components/sf-table/editors/tags-editor';
import { useTags } from '../../../../hooks';
import { getRowById } from '../../../../../components/sf-table/utils/table';
import { getParentLinks } from '../../../../utils/cell';
import TagsEditor from '../../../../../metadata/components/cell-editors/tags-editor';

const ParentTagsEditor = forwardRef(({ editingRowId, column, addTagLinks, deleteTagLinks, ...editorProps }, ref) => {
  const { tagsData, addTag, context } = useTags();
  const canEditData = useMemo(() => window.sfMetadataContext && window.sfMetadataContext.canEditData || false, []);

  const tag = useMemo(() => {
    return getRowById(tagsData, editingRowId);
  }, [tagsData, editingRowId]);

  const parentLinks = useMemo(() => {
    return getParentLinks(tag);
  }, [tag]);

  // const selectTag = useCallback((tagId, recordId) => {
  //   addTagLinks(column.key, recordId, [tagId]);
  // }, [column, addTagLinks]);

  // const deselectTag = useCallback((tagId, recordId) => {
  //   deleteTagLinks(column.key, recordId, [tagId]);
  // }, [column, deleteTagLinks]);

  const updateParentLinks = useCallback((tagId, recordId) => {
    if (parentLinks.includes(tagId)) {
      deleteTagLinks(column.key, recordId, [tagId]);
    } else {
      addTagLinks(column.key, recordId, [tagId]);
    }
  }, [column, parentLinks, addTagLinks, deleteTagLinks]);

  return (
    <div className="sf-metadata-tags-parent-links-editor">
      {/* <TagsEditor
        {...editorProps}
        record={tag}
        column={column}
        value={parentLinks}
        tagsTable={tagsData}
        selectTag={selectTag}
        deselectTag={deselectTag}
      /> */}
      <TagsEditor
        column={{ ...column, width: 400 }}
        record={tag}
        value={parentLinks}
        showTagsAsTree={true}
        onUpdate={updateParentLinks}
        canEditData={canEditData}
        canAddTag={context.canAddTag}
        addNewTag={addTag}
      />
    </div>
  );
});

export default ParentTagsEditor;
