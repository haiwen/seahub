import React from 'react';
import PropTypes from 'prop-types';
import { SfCalendar } from '@seafile/sf-metadata-ui-component';
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
    case CellType.DATE: {
      const lang = window.sfMetadataContext.getSetting('lang');
      return (<SfCalendar ref={ref} {...props} lang={lang} />);
    }
    default: {
      return null;
    }
  }
});

Editor.propTypes = {
  column: PropTypes.object.isRequired,
};

export default Editor;
