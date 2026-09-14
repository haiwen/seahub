import React, { useCallback, useMemo, useRef } from 'react';
import { getPreviewContent, LongTextInlineEditor, MarkdownPreview } from '@seafile/seafile-editor';
import PropTypes from 'prop-types';
import { lang } from '@/utils/constants';
import { getCellValueByColumn } from '../../../utils/cell';

const LongText = ({ record, column, onCommit }) => {
  const ref = useRef(null);
  const editorRef = useRef(null);

  const value = useMemo(() => {
    const content = getCellValueByColumn(record, column);
    if (!content) return null;
    const contentType = typeof content;
    if (contentType === 'object') return content;
    if (contentType === 'string') {
      const { previewText, images, links, checklist } = getPreviewContent(content);
      return { text: content, preview: previewText, images: images, links: links, checklist };
    }
    return null;
  }, [record, column]);

  const onEdit = useCallback(() => {
    editorRef.current.openEditor();
  }, []);

  const onSave = useCallback((value) => {
    onCommit(column, value?.text?.trim());
  }, [column, onCommit]);

  if (!column.editable) {
    return (
      <div className="form-control disabled readonly-long-text">
        <MarkdownPreview value={value?.text || ''} isShowOutline={false} />
      </div>
    );
  }

  return (
    <div ref={ref} className="long-text-container">
      <LongTextInlineEditor
        ref={editorRef}
        value={value?.text || ''}
        lang={lang}
        onClick={onEdit}
        onSaveEditorValue={onSave}
      />
    </div>
  );
};

LongText.propTypes = {
  record: PropTypes.object.isRequired,
  column: PropTypes.object.isRequired,
  onCommit: PropTypes.func.isRequired,
};

export default LongText;
