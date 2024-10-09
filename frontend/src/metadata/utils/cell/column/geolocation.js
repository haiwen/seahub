import { GROUP_GEOLOCATION_GRANULARITY, GEOLOCATION_FORMAT } from '../../../constants';
import { isValidPosition } from '../../validate';

const _convertLatitudeDecimalToDMS = (latitudeDecimal) => {
  if (!latitudeDecimal && latitudeDecimal !== 0) return '';
  if (latitudeDecimal < -90 || latitudeDecimal > 90) {
    return '';
  }
  const degrees = Math.floor(Math.abs(latitudeDecimal));
  const minutesDecimal = (Math.abs(latitudeDecimal) - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = Math.round((minutesDecimal - minutes) * 60);
  const latitudeNS = latitudeDecimal >= 0 ? 'N' : 'S';
  return `${latitudeNS}${degrees}°${minutes}'${seconds}"`;
};

const _convertLongitudeDecimalToDMS = (longitudeDecimal) => {
  if (!longitudeDecimal && longitudeDecimal !== 0) return '';
  if (longitudeDecimal < -180 || longitudeDecimal > 180) {
    return '';
  }
  const degrees = Math.floor(Math.abs(longitudeDecimal));
  const minutesDecimal = (Math.abs(longitudeDecimal) - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = Math.round((minutesDecimal - minutes) * 60);
  const longitudeNS = longitudeDecimal >= 0 ? 'E' : 'W';
  return `${longitudeNS}${degrees}°${minutes}'${seconds}"`;
};

/**
 * Get formatted geolocation
 * @param {object} loc
 * @param {object} formats , e.g. { geo_format, ... }
 * @param {bool} isBaiduMap Determine the way to connect latitude and longitude. Default as true
 * @param {string} hyphen Used as a connector between province, city, district and detail. Default as empty string
 * @returns formatted geolocation, string
 */
const getGeolocationDisplayString = (loc, formats, { isBaiduMap = true, hyphen = '' } = {}) => {
  if (!loc) return '';
  const { geo_format } = formats || {};
  switch (geo_format) {
    case GEOLOCATION_FORMAT.LNG_LAT: {
      const { lng, lat } = loc;
      if (!isValidPosition(lng, lat)) return '';
      const lngDMS = _convertLongitudeDecimalToDMS(lng);
      const latDMS = _convertLatitudeDecimalToDMS(lat);
      return `${latDMS}, ${lngDMS}`;
    }
    case GEOLOCATION_FORMAT.COUNTRY_REGION: {
      const { country_region } = loc;
      return country_region || '';
    }
    case GEOLOCATION_FORMAT.PROVINCE: {
      const { province } = loc;
      return province || '';
    }
    case GEOLOCATION_FORMAT.PROVINCE_CITY: {
      const { province, city } = loc;
      return (`${province || ''}${hyphen}${city || ''}`).trim();
    }
    case GEOLOCATION_FORMAT.PROVINCE_CITY_DISTRICT: {
      const { province, city, district } = loc;
      return (`${province || ''}${hyphen}${city || ''}${hyphen}${district || ''}`).trim();
    }
    case GEOLOCATION_FORMAT.MAP_SELECTION: {
      const { address, title } = loc;
      return (`${address || ''}${hyphen}${title || ''}`).trim();
    }
    default: {
      // default as 'geolocation'
      const {
        province, city, district, detail,
      } = loc;
      if (!province && !city && !district && !detail) return '';
      return (`${province || ''}${hyphen}${city || ''}${hyphen}${district || ''}${hyphen}${detail || ''}`).trim();
    }
  }
};

/**
 * Get geolocation by granularity
 * @param {object} geolocation e.g. { province, ... }
 * @param {string} granularity
 * @returns geolocation string
 */
const getGeolocationByGranularity = (geolocation, granularity) => {
  if (!geolocation) return '';
  const {
    province, city, district, country_region,
  } = geolocation;
  switch (granularity) {
    case GROUP_GEOLOCATION_GRANULARITY.CITY: {
      return city || '';
    }
    case GROUP_GEOLOCATION_GRANULARITY.DISTRICT: {
      return district || '';
    }
    case GROUP_GEOLOCATION_GRANULARITY.COUNTRY: {
      return country_region || '';
    }
    default: {
      return province || '';
    }
  }
};

export {
  getGeolocationDisplayString,
  getGeolocationByGranularity,
};
