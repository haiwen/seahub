import React, { useEffect, useRef, useState } from 'react';

import './index.css';

const Tooltip = ({ data, position: initPosition }) => {
  const [position, setPosition] = useState(initPosition);

  const ref = useRef(null);

  useEffect(() => {
    const { height, width } = ref.current.getBoundingClientRect();
    const { left, top } = initPosition || {};
    let position = { ...initPosition };
    if (top + height > window.innerHeight - 10) {
      position.top = 'unset';
      position.bottom = 10;
    }
    if (left + width > window.innerWidth - 10) {
      position.left = 'unset';
      position.right = 10;
    }
    setPosition(position);
  }, [initPosition]);

  const { title, records } = data;

  return (
    <div
      className="sf-chart-tooltip"
      ref={ref}
      style={position}
    >
      <div className="sf-chart-tooltip-title">{title}</div>
      {records.map(record => {
        return (
          <div className="sf-chart-tooltip-item" key={record.color}>
            <div className="sf-chart-tooltip-item-marker" style={{ backgroundColor: record.color }}></div>
            <div className="sf-chart-tooltip-item-name">{record.name}</div>
            <div className="sf-chart-tooltip-item-value">{record.value}</div>
          </div>
        );
      })}
    </div>
  );
};

export default Tooltip;
