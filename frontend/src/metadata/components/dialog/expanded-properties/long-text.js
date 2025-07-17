import React, { useCallback, useMemo, useRef } from 'react';
import { getPreviewContent, LongTextInlineEditor } from '@seafile/seafile-editor';
import { getCellValueByColumn } from '../../../utils/cell';
import { lang } from '../../../../utils/constants';

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

export default LongText;
