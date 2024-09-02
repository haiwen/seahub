import React, { forwardRef, useMemo, useState, useImperativeHandle, useCallback } from 'react';
import PropTypes from 'prop-types';
import { CellType } from '../../../../_basic';
import DateData from './date-data';
import RateData from './rate-data';

import './index.css';

// eslint-disable-next-line react/display-name
const Data = forwardRef(({ column }, ref) => {
  const type = useMemo(() => column.type, [column]);
  const [value, setValue] = useState({});
  const [popoverShow, setPopoverShow] = useState(false);
  // const [error, setError] = useState('');

  useImperativeHandle(ref, () => ({
    getValue: () => value,
    setValue: (value) => setValue(value),
    getIsPopoverShow: () => popoverShow,
    // setError: (error) => setError(error),
  }), [popoverShow, value]);

  const onChange = useCallback((value) => {
    setValue(value);
  }, []);

  if (type === CellType.DATE) {
    return (<DateData value={value} onChange={onChange} />);
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
