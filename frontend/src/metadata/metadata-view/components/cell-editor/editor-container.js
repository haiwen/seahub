import React from 'react';
import PropTypes from 'prop-types';
import Editor from './editor';

const EditorContainer = (props) => {
  if (!props.column) return null;
  return (<Editor { ...props } />);
};


EditorContainer.propTypes = {
  table: PropTypes.object,
  columns: PropTypes.array,
  isGroupView: PropTypes.bool,
  scrollTop: PropTypes.number,
  scrollLeft: PropTypes.number,
  firstEditorKeyDown: PropTypes.object,
  openEditorMode: PropTypes.string,
  portalTarget: PropTypes.any,
  editorPosition: PropTypes.object,
  record: PropTypes.object,
  column: PropTypes.object,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  left: PropTypes.number.isRequired,
  top: PropTypes.number.isRequired,
  onCommit: PropTypes.func,
  onCommitCancel: PropTypes.func,
};

export default EditorContainer;
