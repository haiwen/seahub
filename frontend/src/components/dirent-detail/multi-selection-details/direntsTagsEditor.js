import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Popover } from 'reactstrap';
import Editor from '../../../metadata/components/cell-editors/tags-editor';
import DeleteTag from '../../../metadata/components/cell-editors/tags-editor/delete-tags';
import { getRowById } from '../../../components/sf-table/utils/table';
import { gettext } from '../../../utils/constants';
import { KeyCodes } from '../../../constants';
import { getEventClassName } from '../../../utils/dom';
import { PRIVATE_COLUMN_KEY, EVENT_BUS_TYPE } from '../../../metadata/constants';
import { useTags } from '../../../tag/hooks';
import tagsAPI from '../../../tag/api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import { getCellValueByColumn } from '../../../metadata/utils/cell';
import { getTagId, getTagName } from '../../../tag/utils/cell';

const DirentsTagsEditor = ({
  records,
  field,
  onChange,
  repoID,
  modifyLocalFileTags
}) => {
  const ref = useRef(null);
  const [showEditor, setShowEditor] = useState(false);

  const { tagsData, context } = useTags();
  const canEditData = useMemo(() => window.sfMetadataContext && window.sfMetadataContext.canModifyRow() || false, []);

  const commonTags = useMemo(() => {
    if (!records || records.length === 0) return [];

    const allFileTags = records.map(record => {
      const tags = getCellValueByColumn(record, field);
      return Array.isArray(tags) ? tags : [];
    });

    if (allFileTags.length === 0) return [];

    let commonTagsArray = allFileTags[0] || [];

    for (let i = 1; i < allFileTags.length; i++) {
      const currentFileTags = allFileTags[i];
      commonTagsArray = commonTagsArray.filter(tag => {
        const tagId = tag.row_id;
        return currentFileTags.some(fileTag => fileTag.row_id === tagId);
      });
    }

    return commonTagsArray;
  }, [records, field]);

  const commonTagIds = useMemo(() => {
    if (!Array.isArray(commonTags) || commonTags.length === 0) return [];
    return commonTags.filter(item => getRowById(tagsData, item.row_id)).map(item => item.row_id);
  }, [commonTags, tagsData]);

  const onClick = useCallback((event) => {
    if (!event.target) return;
    const className = getEventClassName(event);
    if (className.indexOf('sf-metadata-search-tags') > -1) return;
    const dom = document.querySelector('.sf-metadata-tags-editor');
    if (!dom) return;
    if (dom.contains(event.target)) return;
    if (ref.current && !ref.current.contains(event.target) && showEditor) {
      setShowEditor(false);
    }
  }, [showEditor]);

  const onHotKey = useCallback((event) => {
    if (event.keyCode === KeyCodes.Esc) {
      if (showEditor) {
        setShowEditor(false);
      }
    }
  }, [showEditor]);

  useEffect(() => {
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onHotKey, true);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onHotKey, true);
    };
  }, [onClick, onHotKey]);

  const openEditor = useCallback(() => {
    setShowEditor(true);
  }, []);

  const updateBatchTags = useCallback((newTagIds, oldTagIds = []) => {
    if (!records || records.length === 0) return;

    const newTags = newTagIds.map(id => {
      const tag = getRowById(tagsData, id);
      return {
        display_value: getTagName(tag),
        row_id: getTagId(tag),
      };
    });

    onChange && onChange(PRIVATE_COLUMN_KEY.TAGS, newTags);

    const batchTagUpdates = records.map(record => ({
      record_id: record._id,
      tags: newTagIds
    }));

    tagsAPI.updateFileTags(repoID, batchTagUpdates)
      .then(() => {
        batchTagUpdates.forEach(({ record_id, tags }) => {
          modifyLocalFileTags && modifyLocalFileTags(record_id, tags);

          if (window?.sfMetadataContext?.eventBus) {
            const newValue = tags ? tags.map(id => ({ row_id: id, display_value: id })) : [];
            const update = { [PRIVATE_COLUMN_KEY.TAGS]: newValue };
            window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_RECORD_CHANGED, { recordId: record_id }, update);
          }
        });
      })
      .catch((error) => {
        const errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg);
      });
  }, [records, repoID, tagsData, onChange, modifyLocalFileTags]);

  const onDeleteTag = useCallback((tagId, event) => {
    event && event.stopPropagation();
    event && event.nativeEvent && event.nativeEvent.stopImmediatePropagation();
    const newValue = commonTagIds.slice(0);
    let optionIdx = commonTagIds.indexOf(tagId);
    if (optionIdx > -1) {
      newValue.splice(optionIdx, 1);
    }
    updateBatchTags(newValue, commonTagIds);
    setShowEditor(false);
  }, [commonTagIds, updateBatchTags]);

  const onSelectTag = useCallback((tagId) => {
    const newValue = commonTagIds.slice(0);
    if (!newValue.includes(tagId)) {
      newValue.push(tagId);
    }
    updateBatchTags(newValue, commonTagIds);
  }, [commonTagIds, updateBatchTags]);

  const onDeselectTag = useCallback((tagId) => {
    const newValue = commonTagIds.slice(0);
    let optionIdx = commonTagIds.indexOf(tagId);
    if (optionIdx > -1) {
      newValue.splice(optionIdx, 1);
    }
    updateBatchTags(newValue, commonTagIds);
  }, [commonTagIds, updateBatchTags]);

  const renderEditor = useCallback(() => {
    if (!showEditor) return null;
    const { width, top, bottom } = ref.current.getBoundingClientRect();
    const editorHeight = 400;
    const viewportHeight = window.innerHeight;
    let placement = 'bottom-end';
    if (viewportHeight - bottom < editorHeight && top > editorHeight) {
      placement = 'top-end';
    } else if (viewportHeight - bottom < editorHeight && top < editorHeight) {
      placement = 'left-start';
    }

    return (
      <Popover
        target={ref}
        isOpen={true}
        placement={placement}
        hideArrow={true}
        fade={false}
        className="sf-metadata-property-editor-popover sf-metadata-tags-property-editor-popover"
        boundariesElement="viewport"
      >
        <Editor
          saveImmediately={true}
          value={commonTags}
          column={{ ...field, width: Math.max(width - 2, 400) }}
          onSelect={onSelectTag}
          onDeselect={onDeselectTag}
          canEditData={canEditData}
          canAddTag={context.canAddTag()}
        />
      </Popover>
    );
  }, [showEditor, field, commonTags, context, canEditData, onSelectTag, onDeselectTag]);

  return (
    <div
      className="sf-metadata-property-detail-editor sf-metadata-tags-property-detail-editor"
      placeholder={gettext('Empty')}
      ref={ref}
      onClick={openEditor}
    >
      {commonTagIds.length > 0 && (<DeleteTag value={commonTagIds} tags={tagsData} onDelete={onDeleteTag} />)}
      {renderEditor()}
    </div>
  );
};

DirentsTagsEditor.propTypes = {
  records: PropTypes.array.isRequired,
  field: PropTypes.object.isRequired,
  onBatchMetadataRefresh: PropTypes.func.isRequired,
  repoID: PropTypes.string.isRequired,
  modifyLocalFileTags: PropTypes.func,
};

export default DirentsTagsEditor;
