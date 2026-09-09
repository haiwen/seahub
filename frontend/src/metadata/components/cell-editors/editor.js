import React from 'react';
import { lang } from '../../../utils/constants';
import { CellType } from '../../constants';
import { checkIsDir } from '../../utils/row';
import CollaboratorEditor from './collaborator-editor';
import DateEditor from './date-editor';
import FileNameEditor from './file-name-editor';
import TableGeolocationEditor from './geolocation-editor/table-geolocation-editor';
import LongTextEditor from './long-text-editor';
import MultipleSelectEditor from './multiple-select-editor';
import NumberEditor from './number-editor';
import SingleSelectEditor from './single-select-editor';
import TagsEditor from './tags-editor';
import TextEditor from './text-editor';

const Editor = React.forwardRef((props, ref) => {

  switch (props.column.type) {
    case CellType.FILE_NAME: {
      return (<FileNameEditor ref={ref} {...props} />);
    }
    case CellType.TEXT: {
      return (<TextEditor ref={ref} {...props} />);
    }
    case CellType.DATE: {
      return (<DateEditor ref={ref} {...props} lang={lang} />);
    }
    case CellType.NUMBER: {
      return (<NumberEditor ref={ref} {...props} />);
    }
    case CellType.SINGLE_SELECT: {
      return (<SingleSelectEditor ref={ref} {...props} />);
    }
    case CellType.MULTIPLE_SELECT: {
      return (<MultipleSelectEditor ref={ref} {...props} />);
    }
    case CellType.COLLABORATOR: {
      return (<CollaboratorEditor ref={ref} {...props} />);
    }
    case CellType.LONG_TEXT: {
      return (<LongTextEditor ref={ref} {...props} lang={lang} />);
    }
    case CellType.TAGS: {
      if (checkIsDir(props.record)) return null;
      return (<TagsEditor ref={ref} {...props} />);
    }
    case CellType.GEOLOCATION: {
      return (<TableGeolocationEditor ref={ref} {...props} />);
    }
    case CellType.LINK: {
      return null;
    }
    default: {
      return null;
    }
  }
});

Editor.displayName = 'CellEditor';

export default Editor;
