import React from 'react';
import Editor from './editor';

const PreviewEditorContainer = (props) => {
  return (
    <Editor column={props.column} editorProps={props} mode={props.openEditorMode} />
  );
};

export default PreviewEditorContainer;
