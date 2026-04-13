const RowUtils = {

  get: function (row, property) {
    if (typeof row.get === 'function') {
      return row.get(property);
    }

    return row[property];
  },

  isRowSelected(keys, indexes, isSelectedKey, recordData, rowIdx) {
    if (indexes && Object.prototype.toString.call(indexes) === '[object Array]') {
      return indexes.indexOf(rowIdx) > -1;
    } else if (keys && keys.rowKey && keys.values && Object.prototype.toString.call(keys.values) === '[object Array]') {
      return keys.values.indexOf(recordData[keys.rowKey]) > -1;
    } else if (isSelectedKey && recordData && typeof isSelectedKey === 'string') {
      return recordData[isSelectedKey];
    }
    return false;
  },

  getRecordById(recordId, value) {
    return recordId && value.id_row_map[recordId];
  }

};

export default RowUtils;
