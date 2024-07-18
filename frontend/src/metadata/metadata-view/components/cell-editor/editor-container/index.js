import React from 'react';
import PropTypes from 'prop-types';
import NormalEditorContainer from './normal';
import PopupEditorContainer from './popup';
import { CellType } from '../../../_basic';
import Editor from '../editor';

const POPUP_EDITOR_COLUMN_TYPES = [
  CellType.DATE,
  CellType.COLLABORATOR,
  CellType.SINGLE_SELECT,
  CellType.LONG_TEXT,
];

const PREVIEW_EDITOR_COLUMN_TYPES = [
  CellType.FILE_NAME,
];

const EditorContainer = (props) => {
  const { column } = props;
  if (!column) return null;
  if (POPUP_EDITOR_COLUMN_TYPES.includes(column.type)) {
    return (<PopupEditorContainer { ...props } />);
  }

  if (PREVIEW_EDITOR_COLUMN_TYPES.includes(column.type)) {
    return (<Editor { ...props } />);
  }
  return (<NormalEditorContainer { ...props } />);
};


EditorContainer.propTypes = {
  column: PropTypes.object,
};

export default EditorContainer;
