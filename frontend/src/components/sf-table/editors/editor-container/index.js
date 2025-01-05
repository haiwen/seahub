import React, { isValidElement } from 'react';
import PropTypes from 'prop-types';
import NormalEditorContainer from './normal-editor-container';
import PopupEditorContainer from './popup-editor-container';
import PreviewEditorContainer from './preview-editor-container';
import { checkIsColumnSupportPreview, checkIsPopupColumnEditor } from '../../utils/column';
import { EDITOR_TYPE } from '../../constants/grid';

const EditorContainer = (props) => {
  const { column, openEditorMode } = props;
  if (!column || !isValidElement(column.editor)) return null;

  if (checkIsPopupColumnEditor(column)) {
    return <PopupEditorContainer { ...props } />;
  }
  if (checkIsColumnSupportPreview(column) && openEditorMode === EDITOR_TYPE.PREVIEWER) {
    return <PreviewEditorContainer { ...props } />;
  }
  return <NormalEditorContainer { ...props } />;
};

EditorContainer.propTypes = {
  column: PropTypes.object,
  openEditorMode: PropTypes.string,
};

export default EditorContainer;
