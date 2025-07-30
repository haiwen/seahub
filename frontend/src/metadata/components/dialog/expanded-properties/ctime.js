import React from 'react';
import PropTypes from 'prop-types';
import { getCellValueByColumn } from '../../../utils/cell';
import dayjs from 'dayjs';

const CTime = ({ record, column }) => {
  const value = getCellValueByColumn(record, column);
  const formatedValue = value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '';
  return (
    <div className="form-control disabled shrink" title={formatedValue}>
      {formatedValue}
    </div>
  );
};

CTime.propTypes = {
  record: PropTypes.object.isRequired,
  column: PropTypes.object.isRequired,
};

export default CTime;
