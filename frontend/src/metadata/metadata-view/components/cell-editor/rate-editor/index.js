import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import RateItem from './rate-item';

import './index.css';

const RateEditor = ({ isCellSelected, field, value: oldValue, onChange }) => {
  const [value, setValue] = useState(oldValue || 0);
  const [enterIndex, setEnterIndex] = useState(-1);

  const onMouseEnterRateItem = useCallback((index) => {
    setEnterIndex(index);
  }, []);

  const onMouseLeaveRateItem = useCallback(() => {
    setEnterIndex(-1);
  }, []);

  const onChangeValue = useCallback((index) => {
    const newValue = value === index ? 0 : index;
    setValue(newValue);
    onChange({ [field.key]: newValue });
  }, [value, field, onChange]);

  const renderRate = useCallback(() => {
    const { max = 5 } = field.data || {};
    let rateList = [];
    if (value || isCellSelected) {
      for (let i = 0; i < max; i++) {
        const rateItem = (
          <RateItem
            key={i}
            index={i + 1}
            enterIndex={enterIndex}
            value={value}
            field={field}
            isShowRateItem={isCellSelected}
            onMouseEnter={onMouseEnterRateItem}
            onMouseLeave={onMouseLeaveRateItem}
            onChange={onChangeValue}
          />
        );
        rateList.push(rateItem);
      }
    }
    return rateList;
  }, [field, value, isCellSelected, enterIndex, onChangeValue, onMouseEnterRateItem, onMouseLeaveRateItem]);

  return (
    <div className="sf-metadata-rate-editor d-flex">
      {renderRate()}
    </div>
  );
};

RateEditor.propTypes = {
  isCellSelected: PropTypes.bool,
  field: PropTypes.object,
  value: PropTypes.number,
  onChange: PropTypes.func,
};

export default RateEditor;
