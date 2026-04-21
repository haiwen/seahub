import { cloneElement, forwardRef, isValidElement } from 'react';

const Editor = forwardRef((props, ref) => {

  if (!isValidElement(props.column.editor)) {
    return null;
  }
  return cloneElement(props.column.editor, { ...props, ref });
});

Editor.displayName = 'EditorClone';

export default Editor;
