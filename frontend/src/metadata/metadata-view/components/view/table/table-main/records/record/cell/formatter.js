import React from 'react';
import PropTypes from 'prop-types';
import CellFormatter from '../../../../../../cell-formatter';
import { CellType } from '../../../../../../../_basic';
import CheckboxEditor from '../../../../../../cell-editor/checkbox-editor';

const Formatter = ({ isCellSelected, isDir, field, value, onChange }) => {
  const { type } = field;
  if (type === CellType.CHECKBOX && window.sfMetadataContext.canModifyColumn(field)) {
    return (<CheckboxEditor isCellSelected={isCellSelected} value={value} field={field} onChange={onChange} />);
  }
  return (<CellFormatter readonly={true} value={value} field={field} isDir={isDir} />);
};

Formatter.propTypes = {
  isCellSelected: PropTypes.bool,
  isDir: PropTypes.bool,
  field: PropTypes.object,
  value: PropTypes.any,
  onChange: PropTypes.func,
};

export default Formatter;
