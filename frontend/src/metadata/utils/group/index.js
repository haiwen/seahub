import { isDateColumn } from '../column';
import {
  CellType, DISPLAY_GROUP_DATE_GRANULARITY, GROUP_DATE_GRANULARITY, SORT_TYPE, SUPPORT_GROUP_COLUMN_TYPES, GROUPBY_DATE_GRANULARITY_LIST,
  GROUP_GEOLOCATION_GRANULARITY, DISPLAY_GROUP_GEOLOCATION_GRANULARITY,
  PRIVATE_COLUMN_KEY,
} from '../../constants';

const GROUPBY_GEOLOCATION_GRANULARITY_LIST = [
  GROUP_GEOLOCATION_GRANULARITY.COUNTRY,
  GROUP_GEOLOCATION_GRANULARITY.PROVINCE,
  GROUP_GEOLOCATION_GRANULARITY.CITY,
  GROUP_GEOLOCATION_GRANULARITY.DISTRICT
];

// const NOT_SUPPORT_GROUPBY_ARRAY_TYPE = [CellType.LONG_TEXT, CellType.IMAGE, CellType.FILE];

export const getDefaultCountType = (column) => {
  if (isDateColumn(column)) {
    return GROUP_DATE_GRANULARITY.MONTH;
  }
  if (column.type === CellType.GEOLOCATION) {
    const { geo_format } = column.data || {};
    if (geo_format === 'country_region') return GROUPBY_GEOLOCATION_GRANULARITY_LIST[0];
    return GROUPBY_GEOLOCATION_GRANULARITY_LIST[1];
  }
  return null;
};

export const getGroupbyColumns = (columns, groupbys = []) => {
  let groupbyColumnKeyMap = {};
  groupbys.forEach(groupby => {
    const { column_key } = groupby;
    if (column_key) {
      groupbyColumnKeyMap[column_key] = true;
    }
  });
  return columns.filter(column => {
    const { key, type } = column;
    if (!SUPPORT_GROUP_COLUMN_TYPES.includes(type)) {
      return false;
    }
    if (groupbyColumnKeyMap[key]) return false; // group by has already exist
    return true;
  });
};

export const getSelectedCountType = (column, countType) => {
  const type = countType || getDefaultCountType(column);
  if (!type) {
    return null;
  }
  if (isDateColumn(column)) {
    return DISPLAY_GROUP_DATE_GRANULARITY[type];
  }
  return null;
};

export const isShowGroupCountType = (column) => {
  if (isDateColumn(column)) return true;
  const data = column.data || {};
  if (column.type === CellType.GEOLOCATION) {
    if (data.geo_format === GROUP_GEOLOCATION_GRANULARITY.PROVINCE || data.geo_format === 'country_region') return false;
    return true;
  }
  return false;
};

export const getGroupbyGranularityByColumn = (column) => {
  let granularityList = [];
  let displayGranularity = {};
  if (isDateColumn(column)) {
    granularityList = GROUPBY_DATE_GRANULARITY_LIST;
    displayGranularity = DISPLAY_GROUP_DATE_GRANULARITY;
  } else if (column.type === CellType.GEOLOCATION) {
    const { geo_format } = column.data || {};
    granularityList = GROUPBY_GEOLOCATION_GRANULARITY_LIST.filter(granularity => {
      const isGranularityProvinceOrCity = granularity === GROUP_GEOLOCATION_GRANULARITY.PROVINCE || granularity === GROUP_GEOLOCATION_GRANULARITY.CITY;
      const isProvinceOrCity = geo_format === 'province_city' && isGranularityProvinceOrCity;
      return geo_format === isProvinceOrCity || granularity !== GROUP_GEOLOCATION_GRANULARITY.COUNTRY;
    });
    displayGranularity = DISPLAY_GROUP_GEOLOCATION_GRANULARITY;
  }
  return { granularityList, displayGranularity };
};

export const generateDefaultGroupby = (columns) => {
  const dateColumn = columns.find(column => column.type === CellType.DATE) || columns.find(column => isDateColumn(column));
  let groupby = { column_key: columns[0].key, sort_type: SORT_TYPE.UP };
  if (dateColumn) {
    groupby.column_key = dateColumn.key;
    groupby.count_type = getDefaultCountType(dateColumn);
  }
  return groupby;
};

export {
  deleteInvalidGroupby,
  isValidGroupby,
  getValidGroupbys,
} from './core';

export {
  groupTableRows,
  getGroupRows,
} from './group-row';
