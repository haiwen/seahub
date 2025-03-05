import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import CheckboxEditor from './checkbox-editor';
import TextEditor from './text-editor';
import NumberEditor from './number-editor';
import SingleSelectEditor from './single-select-editor';
import MultipleSelectEditor from './multiple-select-editor';
import CollaboratorEditor from './collaborator-editor';
import DetailDateEditor from './date-editor';
import LongTextEditor from './long-text-editor';
import RateEditor from './rate-editor';
import TagsEditor from './tags-editor';
import { lang } from '../../../utils/constants';
import { CellType } from '../../constants';

import './index.css';

const DetailEditor = ({ field, onChange: onChangeAPI, ...props }) => {
  const onChange = useCallback((newValue) => {
    onChangeAPI(field.key, newValue);
  }, [field, onChangeAPI]);

  switch (field.type) {
    case CellType.CHECKBOX: {
      return (<CheckboxEditor { ...props } field={field} onChange={onChange} />);
    }
    case CellType.TEXT: {
      return (<TextEditor { ...props } field={field} onChange={onChange} />);
    }
    case CellType.NUMBER: {
      return (<NumberEditor { ...props } field={field} onChange={onChange} />);
    }
    case CellType.DATE: {
      return (<DetailDateEditor { ...props } field={field} onChange={onChange} lang={lang} />);
    }
    case CellType.SINGLE_SELECT: {
      return (<SingleSelectEditor { ...props } field={field} onChange={onChange} />);
    }
    case CellType.MULTIPLE_SELECT: {
      return (<MultipleSelectEditor { ...props } field={field} onChange={onChange} />);
    }
    case CellType.COLLABORATOR: {
      return (<CollaboratorEditor { ...props } field={field} onChange={onChange} />);
    }
    case CellType.LONG_TEXT: {
      return (<LongTextEditor { ...props } field={field} onChange={onChange} />);
    }
    case CellType.RATE: {
      return (<RateEditor { ...props } field={field} onChange={onChange} />);
    }
    case CellType.TAGS: {
      return (<TagsEditor { ...props } field={field} />);
    }
    default: {
      return null;
    }
  }
};

DetailEditor.propTypes = {
  field: PropTypes.object.isRequired,
};

export default DetailEditor;
