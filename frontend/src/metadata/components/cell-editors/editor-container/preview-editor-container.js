import React from 'react';
import Editor from '../editor';

const PreviewEditorContainer = (props) => {
  return (<Editor { ...props } mode={props.openEditorMode} />);
};

export default PreviewEditorContainer;
