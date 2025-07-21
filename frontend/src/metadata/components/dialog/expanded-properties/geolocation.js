import React, { useMemo } from 'react';
import { getCellValueByColumn } from '../../../utils/cell';
import GeolocationFormatter from '../../cell-formatter/geolocation';

const Geolocation = ({ record, column }) => {
  const value = useMemo(() => getCellValueByColumn(record, column), [record, column]);
  return (
    <div className="form-control disabled">
      <GeolocationFormatter format={column.data?.geo_format} value={value} record={record} />
    </div>
  );
};

export default Geolocation;
