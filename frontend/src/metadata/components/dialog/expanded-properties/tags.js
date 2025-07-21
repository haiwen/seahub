import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { getCellValueByColumn, getRecordIdFromRecord } from '../../../utils/cell';
import { getRowById } from '../../../../components/sf-table/utils/table';
import { useTags } from '../../../../tag/hooks';
import TagsEditor from '../../cell-editors/tags-editor';
import { useMetadataView } from '../../../hooks/metadata-view';
import FileTagsFormatter from '../../cell-formatter/file-tags';
import ClickOutside from '../../../../components/click-outside';

const Tags = ({ record, column, containerRef }) => {
  const [isEditorShown, setIsEditorShown] = useState(false);
  const [editorPosition, setEditorPosition] = useState({ top: 0, left: 0 });

  const ref = useRef(null);
  const editorRef = useRef(null);

  const { tagsData } = useTags();
  const { updateFileTags } = useMetadataView();

  const value = useMemo(() => getCellValueByColumn(record, column), [record, column]);
  const tagIds = useMemo(() => {
    if (!Array.isArray(value) || value.length === 0) return [];
    return value.filter(item => getRowById(tagsData, item.row_id)).map(item => item.row_id);
  }, [value, tagsData]);

  const onEdit = () => {
    setIsEditorShown(true);
  };

  const onSelect = (tagId) => {
    const recordId = getRecordIdFromRecord(record);
    const newValue = [...tagIds, tagId];
    updateFileTags([{ record_id: recordId, tags: newValue, old_tags: Array.isArray(tagIds) ? tagIds : [] }]);
  };

  const onDeselect = (tagId) => {
    const recordId = getRecordIdFromRecord(record);
    const newValue = tagIds.filter(id => id !== tagId);
    updateFileTags([{ record_id: recordId, tags: newValue, old_tags: Array.isArray(tagIds) ? tagIds : [] }]);
  };

  useEffect(() => {
    if (isEditorShown) {
      const space = ref.current.getBoundingClientRect().top - containerRef.current.getBoundingClientRect().top - 57;
      if (space < 400) {
        setEditorPosition({ top: 0, bottom: 'auto' });
      } else {
        setEditorPosition({ top: 'auto', bottom: '40px' });
      }
    }
  }, [isEditorShown, containerRef]);

  return (
    <ClickOutside onClickOutside={() => setIsEditorShown(false)}>
      <div ref={ref} className="form-control position-relative select-option-container" onClick={onEdit}>
        <FileTagsFormatter tagsData={tagsData} value={value} showName={true} />
        <i className="sf3-font sf3-font-down dropdown-indicator" aria-hidden="true"></i>
        {isEditorShown && (
          <TagsEditor ref={editorRef} value={value} column={{ ...column, width: 400 }} customStyle={editorPosition} onSelect={onSelect} onDeselect={onDeselect} />
        )}
      </div>
    </ClickOutside>
  );
};

Tags.propTypes = {
  record: PropTypes.object.isRequired,
  column: PropTypes.object.isRequired,
  containerRef: PropTypes.object.isRequired,
};

export default Tags;
