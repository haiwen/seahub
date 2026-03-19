import React, { useMemo } from 'react';
import { getCellValueByColumn } from '@/components/sf-table/utils/cell';
import CTimeFormatter from '@/metadata/components/cell-formatter/ctime';
import Empty from '@/metadata/components/formatter/empty';
import { PRIVATE_COLUMN_KEY } from '@/metadata/constants';

const CTimeFormatterWrapper = ({ value, record, column, className, ...otherProps }) => {
  const validValue = useMemo(() => {
    let tmp = value || getCellValueByColumn(record, column);
    if (!tmp && column.key === PRIVATE_COLUMN_KEY.FILE_MTIME) {
      tmp = record._mtime;
    }
    return tmp;
  }, [value, record, column]);

  return (
    <CTimeFormatter value={validValue} className={className} {...otherProps}>
      <Empty fieldType={column.type} placeholder='' />
    </CTimeFormatter>
  );
};

export default CTimeFormatterWrapper;
