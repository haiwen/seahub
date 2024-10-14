import React from 'react';
import PropTypes from 'prop-types';
import CellFormatter from '../../../../../../components/cell-formatter';
import CheckboxEditor from '../../../../../../components/cell-editors/checkbox-editor';
import RateEditor from '../../../../../../components/cell-editors/rate-editor';
import { canEditCell } from '../../../../../../utils/column';
import { CellType } from '../../../../../../constants';

const Formatter = ({ isCellSelected, isDir, field, value, onChange, record }) => {
  const { type } = field;
  const cellEditAble = canEditCell(field, record, true);
  if (type === CellType.CHECKBOX && cellEditAble) {
    return (<CheckboxEditor isCellSelected={isCellSelected} value={value} field={field} onChange={onChange} />);
  }
  if (type === CellType.RATE && cellEditAble) {
    return (<RateEditor isCellSelected={isCellSelected} value={value} field={field} onChange={onChange} />);
  }
  return (<CellFormatter readonly={true} value={value} field={field} isDir={isDir} record={record} />);
};

Formatter.propTypes = {
  isCellSelected: PropTypes.bool,
  isDir: PropTypes.bool,
  field: PropTypes.object,
  value: PropTypes.any,
  record: PropTypes.object,
  onChange: PropTypes.func,
};

export default Formatter;
