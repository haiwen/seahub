import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { getGeolocationDisplayString } from '../../utils/cell/column/geolocation';

const GeolocationFormatter = ({ isBaiduMap, format, value, children: emptyFormatter, className, hyphen = ' ', record }) => {
  const displayValue = useMemo(() => {
    if (typeof value !== 'object') return null;
    const translatedLocation = record._location_translated;
    if (translatedLocation && translatedLocation.address) {
      return translatedLocation.address;
    }
    return getGeolocationDisplayString(value, { geo_format: format }, { isBaiduMap, hyphen });
  }, [value, format, isBaiduMap, hyphen, record]);

  if (!displayValue) return emptyFormatter || null;
  return (
    <div className={classnames('sf-metadata-ui cell-formatter-container geolocation-formatter', className)}>
      {displayValue}
    </div>
  );
};

GeolocationFormatter.propTypes = {
  isBaiduMap: PropTypes.bool,
  format: PropTypes.string,
  value: PropTypes.object,
  children: PropTypes.any,
  className: PropTypes.string,
  hyphen: PropTypes.string,
};

export default GeolocationFormatter;
