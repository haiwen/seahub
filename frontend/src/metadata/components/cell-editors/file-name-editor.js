import React, { useImperativeHandle, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../../utils/utils';
import { EDITOR_TYPE } from '../../constants';
import ImagePreviewer from '../cell-formatter/image-previewer';
import TextEditor from './text-editor';
import { checkIsDir } from '../../utils/row';

const FileNameEditor = React.forwardRef((props, ref) => {
  const { column, record, mode } = props;

  const textEditorRef = useRef(null);
  useImperativeHandle(ref, () => {
    return textEditorRef.current;
  });

  const getFileName = useCallback(() => {
    const { key } = column;
    return record[key];
  }, [column, record]);

  useEffect(() => {
    if (mode === EDITOR_TYPE.PREVIEWER) {
      return;
    }
    const fileName = getFileName();
    const endIndex = fileName.lastIndexOf('.');
    textEditorRef.current.input.setSelectionRange(0, endIndex, 'forward');
  }, [mode, getFileName]);

  const getFileType = () => {
    if (checkIsDir(record)) {
      return 'folder';
    }
    const fileName = getFileName();
    if (!fileName) return '';
    const index = fileName.lastIndexOf('.');
    if (index === -1) return '';
    const suffix = fileName.slice(index).toLowerCase();
    if (suffix.indexOf(' ') > -1) return '';
    if (Utils.imageCheck(fileName)) return 'image';
    if (Utils.isMarkdownFile(fileName)) return 'markdown';
    if (Utils.isSdocFile(fileName)) return 'sdoc';
    return '';
  };

  if (mode === EDITOR_TYPE.PREVIEWER) {
    const fileType = getFileType();
    const repoID = window.sfMetadataContext && window.sfMetadataContext.getSetting('repoID') || props.repoID;
    const repoInfo = window.sfMetadataContext && window.sfMetadataContext.getSetting('repoInfo') || props.repoInfo;
    const canDelete = window.sfMetadataContext && window.sfMetadataContext.checkCanDeleteRow() || props.permission === 'rw';

    if (fileType === 'image') {
      return (
        <ImagePreviewer {...props} repoID={repoID} repoInfo={repoInfo} closeImagePopup={props.onCommitCancel} canDelete={canDelete} />
      );
    }

    return null;
  }

  return (<TextEditor ref={textEditorRef} { ...props } readOnly={false} />);
});

FileNameEditor.propTypes = {
  table: PropTypes.object,
  column: PropTypes.object,
  record: PropTypes.object,
  mode: PropTypes.string,
  onCommitCancel: PropTypes.func,
};

export default FileNameEditor;
