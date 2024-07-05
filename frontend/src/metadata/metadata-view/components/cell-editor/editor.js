import React from 'react';
import PropTypes from 'prop-types';
import { CellType } from '../../_basic';
import FileNameEditor from './file-name-editor';

const Editor = (props) => {

  switch (props.column.type) {
    case CellType.FILE_NAME: {
      return (<FileNameEditor {...props} />);
    }
    default: {
      return null;
    }
  }
};

Editor.propTypes = {
  column: PropTypes.object.isRequired,
};

export default Editor;
