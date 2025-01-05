import { cloneElement, forwardRef, isValidElement } from 'react';

const Editor = forwardRef(({ column, editorProps }, ref) => {

  if (!isValidElement(column.editor)) {
    return null;
  }
  return cloneElement(column.editor, { ...editorProps, ref });
});

export default Editor;
