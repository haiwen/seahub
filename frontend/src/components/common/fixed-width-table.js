import React, { useState, useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';

const FixedWidthTable = ({ className, headers, theadOptions = {}, children }) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const fixedWidth = useMemo(() => headers.reduce((pre, cur) => cur.isFixed ? cur.width + pre : pre, 0), [headers]);

  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const handleResize = () => {
      if (!container) return;
      setContainerWidth(container.offsetWidth);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    container && resizeObserver.observe(container);

    return () => {
      container && resizeObserver.unobserve(container);
    };
  }, []);

  return (
    <table ref={containerRef} className={className}>
      <thead { ...theadOptions }>
        <tr>
          {headers.map((header, index) => {
            const { width, isFixed, className } = header;
            return (
              <th
                key={index}
                style={{ width: isFixed ? width : (containerWidth - fixedWidth) * width }}
                className={className}
              >
                {header.children}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {children}
      </tbody>
    </table>
  );
};

FixedWidthTable.propTypes = {
  className: PropTypes.string,
  headers: PropTypes.array,
  theadOptions: PropTypes.object,
  children: PropTypes.oneOfType([PropTypes.string, PropTypes.node, PropTypes.number]),
};

export default FixedWidthTable;
