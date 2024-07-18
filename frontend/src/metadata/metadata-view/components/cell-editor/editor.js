import React from 'react';
import PropTypes from 'prop-types';
import { Calendar } from '@seafile/sf-metadata-ui-component';
import { CellType } from '../../_basic';
import FileNameEditor from './file-name-editor';
import TextEditor from './text-editor';

// eslint-disable-next-line react/display-name
const Editor = React.forwardRef((props, ref) => {

  switch (props.column.type) {
    case CellType.FILE_NAME: {
      return (<FileNameEditor ref={ref} {...props} />);
    }
    case CellType.TEXT: {
      return (<TextEditor ref={ref} {...props} />);
    }
    default: {
      return (<Calendar ref={ref} {...props} />);
    }
  }
});

Editor.propTypes = {
  column: PropTypes.object.isRequired,
};

export default Editor;
