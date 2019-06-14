import React from 'react';
import { Editors } from '@seafile/react-data-grid-addons';

const EDITOR_NUMBER = 'number';
const EDITOR_TEXT = 'text';

class EditorFactory {

  createEditor(editorType) {
    switch(editorType) {
      case EDITOR_NUMBER: {
        return <Editors.NumberEditor />;
      }
  
      case EDITOR_TEXT: {
        return '';
      }
  
      default: {
        return '';
      }
    }
  }
}

let editorFactory = new EditorFactory();

export default editorFactory;