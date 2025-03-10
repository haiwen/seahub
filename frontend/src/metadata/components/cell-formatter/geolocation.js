import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { getGeolocationDisplayString } from '../../utils/cell/column/geolocation';
import { getImageLocationFromRecord, getTranslateLocationFromRecord } from '../../utils/cell';
import { GEOLOCATION_FORMAT } from '../../constants';

const GeolocationFormatter = ({ isBaiduMap, format, value, children: emptyFormatter, className, hyphen = ' ', record }) => {
  const displayValue = useMemo(() => {
    let location = value;
    if (!value) {
      const translatedLocation = getTranslateLocationFromRecord(record);
      const longitude = getImageLocationFromRecord(record);
      location = { ...longitude, ...translatedLocation };
    }
    const geo_format = location && location.address && GEOLOCATION_FORMAT.MAP_SELECTION || format;
    return getGeolocationDisplayString(location, { geo_format }, { isBaiduMap, hyphen });
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
