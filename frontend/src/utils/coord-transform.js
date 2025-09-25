import { MAP_TYPE } from '../constants';

/* eslint-disable no-loss-of-precision */
const x_PI = Math.PI * 3000.0 / 180.0;
const PI = Math.PI;
const a = 6378245.0;
const ee = 0.00669342162296594323;

/**
 * Determine whether it is in China. If not, no offset will be made.
 * @param lng
 * @param lat
 * @returns {boolean}
 */
export const out_of_china = (lng, lat) => {
  const _lat = +lat;
  const _lng = +lng;

  // latitude 3.86~53.55, longitude 73.66~135.05
  return !(_lng > 73.66 && _lng < 135.05 && _lat > 3.86 && _lat < 53.55);
};

export const transformLat = (lng, lat) => {
  const _lat = +lat;
  const _lng = +lng;
  let ret = -100.0 + 2.0 * _lng + 3.0 * _lat + 0.2 * _lat * _lat + 0.1 * _lng * _lat + 0.2 * Math.sqrt(Math.abs(_lng));
  ret += (20.0 * Math.sin(6.0 * _lng * PI) + 20.0 * Math.sin(2.0 * _lng * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(_lat * PI) + 40.0 * Math.sin(_lat / 3.0 * PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(_lat / 12.0 * PI) + 320 * Math.sin(_lat * PI / 30.0)) * 2.0 / 3.0;
  return ret;
};

export const transformLng = (lng, lat) => {
  const _lat = +lat;
  const _lng = +lng;
  let ret = 300.0 + _lng + 2.0 * _lat + 0.1 * _lng * _lng + 0.1 * _lng * _lat + 0.1 * Math.sqrt(Math.abs(_lng));
  ret += (20.0 * Math.sin(6.0 * _lng * PI) + 20.0 * Math.sin(2.0 * _lng * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(_lng * PI) + 40.0 * Math.sin(_lng / 3.0 * PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(_lng / 12.0 * PI) + 300.0 * Math.sin(_lng / 30.0 * PI)) * 2.0 / 3.0;
  return ret;
};

/**
 * Baidu coordinate system(BD-09) to Mars coordinate system(GCJ-02)
 * Baidu to Google
 * @param bd_lng
 * @param bd_lat
 * @returns {*[]}
 */
export const bd09_to_gcj02 = (bd_lng, bd_lat) => {
  const lng = +bd_lng;
  const lat = +bd_lat;
  const x = lng - 0.0065;
  const y = lat - 0.006;
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_PI);
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_PI);
  const g_lng = z * Math.cos(theta);
  const g_lat = z * Math.sin(theta);
  return { lng: g_lng, lat: g_lat };
};

/**
 * Mars coordinate system(GCJ-02) to Baidu coordinate system(BD-09)
 * Google to Baidu
 * @param lng
 * @param lat
 * @returns {*[]}
 */
export const gcj02_to_bd09 = (lng, lat) => {
  const _lat = +lat;
  const _lng = +lng;
  const digits = 6;
  const z = Math.sqrt(_lng * _lng + _lat * _lat) + 0.00002 * Math.sin(_lat * x_PI);
  const theta = Math.atan2(_lat, _lng) + 0.000003 * Math.cos(_lng * x_PI);
  const bd_lng = z * Math.cos(theta) + 0.0065;
  const bd_lat = z * Math.sin(theta) + 0.006;
  return { lng: Number(bd_lng.toFixed(digits)), lat: Number(bd_lat.toFixed(digits)) };
};

/**
 * WGS-84 to GCJ-02
 * @param lng
 * @param lat
 * @returns {*[]}
 */
export const wgs84_to_gcj02 = (lng, lat) => {
  const _lat = +lat;
  const _lng = +lng;
  const digits = 6;
  if (out_of_china(_lng, _lat)) return { lng: _lng, lat: _lat };
  let dLat = transformLat(_lng - 105.0, _lat - 35.0);
  let dLng = transformLng(_lng - 105.0, _lat - 35.0);
  const radLat = lat / 180.0 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI);
  dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI);
  return { lat: Number((_lat + dLat).toFixed(digits)), lng: Number((_lng + dLng).toFixed(digits)) };
};

/**
 * GCJ-02 to WGS-84
 * @param lng
 * @param lat
 * @returns {*[]}
 */
export const gcj02_to_wgs84 = (lng, lat) => {
  const _lat = +lat;
  const _lng = +lng;
  const digits = 6;
  if (out_of_china(_lng, _lat)) return { lng: _lng, lat: _lat };
  let dLat = transformLat(_lng - 105.0, _lat - 35.0);
  let dLng = transformLng(_lng - 105.0, _lat - 35.0);
  const radLat = _lat / 180.0 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI);
  dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI);
  return { lat: Number((_lat - dLat).toFixed(digits)), lng: Number((_lng - dLng).toFixed(digits)) };
};

// Converts WGS84 coordinates to the map's native coordinate system
export const convertToMapCoords = (type, position) => {
  if (type === MAP_TYPE.B_MAP) {
    const gcjPos = wgs84_to_gcj02(position.lng, position.lat);
    const bdPos = gcj02_to_bd09(gcjPos.lng, gcjPos.lat);
    return bdPos;
  }
  return position;
};

// Converts coordinates from the map's native system to WGS84
export const convertToWGS84 = (type, position) => {
  if (type === MAP_TYPE.B_MAP) {
    const gcjPos = bd09_to_gcj02(position.lng, position.lat);
    const wgsPos = gcj02_to_wgs84(gcjPos.lng, gcjPos.lat);
    return wgsPos;
  }
  return position;
};
