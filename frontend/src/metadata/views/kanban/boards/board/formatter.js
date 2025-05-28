import React from 'react';
import PropTypes from 'prop-types';
import CellFormatter from '../../../../components/cell-formatter';
import { CellType } from '../../../../constants';
import { Utils } from '../../../../../utils/utils';

const SPECIAL_FILE_ICON = [
  'excel.png',
  'md.png',
  'ppt.png',
  'sdoc_notification.ico',
  'sdoc.png',
  'txt.png',
  'word.png',
];

const Formatter = ({ value, column, record, tagsData, ...params }) => {
  let className = '';

  if (column.type === CellType.FILE_NAME && value) {
    const icon = Utils.getFileIconName(value);
    if (SPECIAL_FILE_ICON.includes(icon)) {
      className = 'sf-metadata-special-file-name-formatter';
    }
  }

  return (<CellFormatter { ...params } readonly={true} className={className} value={value} field={column} record={record} tagsData={tagsData} />);
};

Formatter.propTypes = {
  value: PropTypes.any,
  column: PropTypes.object,
  record: PropTypes.object,
};

export default Formatter;
