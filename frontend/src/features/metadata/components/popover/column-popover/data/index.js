import React, { forwardRef, useMemo, useState, useImperativeHandle, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { CellType } from '../../../../constants';
import DateData from './date-data';
import RateData from './rate-data';

import './index.css';

// eslint-disable-next-line react/display-name
const Data = forwardRef(({ column }, ref) => {
  const type = useMemo(() => column.type, [column]);
  const [value, setValue] = useState(column.data || {});
  const [popoverShow, setPopoverShow] = useState(false);
  const columnKey = useRef(null);

  useImperativeHandle(ref, () => ({
    getValue: () => value,
    setValue: (value) => setValue(value),
    getIsPopoverShow: () => popoverShow,
  }), [popoverShow, value]);

  const onChange = useCallback((value) => {
    setValue(value);
  }, []);

  useEffect(() => {
    if (columnKey.current === column.key) return;
    columnKey.current = column.key;
    setValue(column.data || {});
  }, [column]);

  if (type === CellType.DATE) {
    return (<DateData value={value} column={column} onChange={onChange} />);
  }

  if (type === CellType.RATE) {
    return (<RateData value={value} onChange={onChange} updatePopoverState={setPopoverShow} />);
  }

  return null;
});

Data.propTypes = {
  column: PropTypes.object,
};

export default Data;
