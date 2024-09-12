import React from 'react';
import PropTypes from 'prop-types';
import NormalEditorContainer from './normal-editor-container';
import PopupEditorContainer from './popup-editor-container';
import PreviewEditorContainer from './preview-editor-container';
import { CellType } from '../../../constants';

const POPUP_EDITOR_COLUMN_TYPES = [
  CellType.DATE,
  CellType.COLLABORATOR,
  CellType.SINGLE_SELECT,
  CellType.MULTIPLE_SELECT,
  CellType.LONG_TEXT,
];

const PREVIEW_EDITOR_COLUMN_TYPES = [
  CellType.FILE_NAME,
];

const EditorContainer = (props) => {
  const { column } = props;
  if (!column) return null;
  const { type } = column;
  if (POPUP_EDITOR_COLUMN_TYPES.includes(type)) {
    return <PopupEditorContainer { ...props } />;
  } else if (PREVIEW_EDITOR_COLUMN_TYPES.includes(type)) {
    return <PreviewEditorContainer { ...props } />;
  } else {
    return <NormalEditorContainer { ...props } />;
  }
};

EditorContainer.propTypes = {
  column: PropTypes.object,
};

export default EditorContainer;
