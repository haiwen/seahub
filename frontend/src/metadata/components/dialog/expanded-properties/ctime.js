import React from 'react';
import { getCellValueByColumn } from '../../../utils/cell';
import dayjs from 'dayjs';

const CTime = ({ record, column }) => {
  const value = getCellValueByColumn(record, column);
  const formatedValue = value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '';
  return (
    <div className="form-control disabled" style={{ width: 320 }} title={formatedValue}>
      {formatedValue}
    </div>
  );
};

export default CTime;
