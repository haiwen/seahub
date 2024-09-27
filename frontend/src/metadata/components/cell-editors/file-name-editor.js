import React, { useImperativeHandle, useRef } from 'react';
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

  const getFileName = () => {
    const { key } = column;
    return record[key];
  };

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
    if (fileType === 'image') {
      return (
        <ImagePreviewer {...props} closeImagePopup={props.onCommitCancel} />
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
