import dayjs from 'dayjs';
import {
  CellType,
  NOT_SUPPORT_EDIT_COLUMN_TYPE_MAP,
} from '../_basic';
import { getColumnByIndex } from './column-utils';
import { NOT_SUPPORT_DRAG_COPY_COLUMN_TYPES, TRANSFER_TYPES } from '../constants';
import { getGroupRecordByIndex } from './group-metrics';

const NORMAL_RULE = ({ value }) => {
  return value;
};

const isCopyPaste = true;

class GridUtils {

  constructor(metadata, api) {
    this.metadata = metadata;
    this.api = api;
  }

  getCopiedContent({ type, copied, isGroupView }) {
    // copy from internal grid
    if (type === TRANSFER_TYPES.DTABLE_FRAGMENT) {
      const { shownColumns: columns } = this.tablePage.state;
      const { selectedRecordIds, copiedRange } = copied;

      // copy from selected rows
      if (Array.isArray(selectedRecordIds) && selectedRecordIds.length > 0) {
        return {
          copiedRecords: selectedRecordIds.map(recordId => this.tablePage.recordGetterById(recordId)),
          copiedColumns: [...columns],
        };
      }

      // copy from selected range
      let copiedRecords = [];
      let copiedColumns = [];
      const { topLeft, bottomRight } = copiedRange;
      const { rowIdx: minRecordIndex, idx: minColumnIndex, groupRecordIndex: minGroupRecordIndex } = topLeft;
      const { rowIdx: maxRecordIndex, idx: maxColumnIndex } = bottomRight;
      let currentGroupIndex = minGroupRecordIndex;
      for (let i = minRecordIndex; i <= maxRecordIndex; i++) {
        copiedRecords.push(this.tablePage.recordGetterByIndex({ isGroupView, groupRecordIndex: currentGroupIndex, recordIndex: i }));
        if (isGroupView) {
          currentGroupIndex++;
        }
      }
      for (let i = minColumnIndex; i <= maxColumnIndex; i++) {
        copiedColumns.push(getColumnByIndex(i, columns));
      }
      return { copiedRecords, copiedColumns };
    }

    // copy from other external apps as default
    const { copiedRecords, copiedColumns } = copied;
    return { copiedRecords, copiedColumns };
  }

  async paste({ copied, multiplePaste, pasteRange, isGroupView }) {
    const { row_ids: renderRecordIds, columns } = this.metadata;
    const { topLeft, bottomRight = {} } = pasteRange;
    const { rowIdx: startRecordIndex, idx: startColumnIndex, groupRecordIndex } = topLeft;
    const { rowIdx: endRecordIndex, idx: endColumnIndex } = bottomRight;
    const { copiedRecords, copiedColumns } = copied;
    const copiedRecordsLen = copiedRecords.length;
    const copiedColumnsLen = copiedColumns.length;
    const pasteRecordsLen = multiplePaste ? endRecordIndex - startRecordIndex + 1 : copiedRecordsLen;
    const pasteColumnsLen = multiplePaste ? endColumnIndex - startColumnIndex + 1 : copiedColumnsLen;
    const renderRecordsCount = renderRecordIds.length;

    // need expand records
    const startExpandRecordIndex = renderRecordsCount - startRecordIndex;
    if ((copiedRecordsLen > startExpandRecordIndex)) return;

    let updateRecordIds = [];
    let idRecordUpdates = {};
    let idOriginalRecordUpdates = {};
    let idOldRecordData = {};
    let idOriginalOldRecordData = {};
    let currentGroupRecordIndex = groupRecordIndex;
    for (let i = 0; i < pasteRecordsLen; i++) {
      const pasteRecord = this.tablePage.recordGetterByIndex({ isGroupView, groupRecordIndex: currentGroupRecordIndex, recordIndex: startRecordIndex + i });
      if (isGroupView) {
        currentGroupRecordIndex++;
      }
      if (!pasteRecord) {
        continue;
      }
      const updateRecordId = pasteRecord._id;
      const copiedRecordIndex = i % copiedRecordsLen;
      const copiedRecord = copiedRecords[copiedRecordIndex];
      let originalUpdate = {};
      let originalOldRecordData = {};
      for (let j = 0; j < pasteColumnsLen; j++) {
        const pasteColumn = getColumnByIndex(j + startColumnIndex, columns);
        if (!pasteColumn || NOT_SUPPORT_EDIT_COLUMN_TYPE_MAP[pasteColumn.type]) {
          continue;
        }
        const copiedColumnIndex = j % copiedColumnsLen;
        const copiedColumn = getColumnByIndex(copiedColumnIndex, copiedColumns);
        const { key: pasteColumnKey } = pasteColumn;
        const { key: copiedColumnKey } = copiedColumn;
        const pasteCellValue = Object.prototype.hasOwnProperty.call(pasteRecord, pasteColumnKey) ? pasteRecord[pasteColumnKey] : null;
        const copiedCellValue = Object.prototype.hasOwnProperty.call(copiedRecord, copiedColumnKey) ? copiedRecord[copiedColumnKey] : null;
        const update = this.convertCellValue(copiedCellValue, pasteCellValue, pasteColumn, copiedColumn);
        if (update === pasteCellValue) {
          continue;
        }
        originalUpdate[pasteColumnKey] = update;
        originalOldRecordData[pasteColumnKey] = pasteCellValue;
      }

      if (Object.keys(originalUpdate).length > 0) {
        updateRecordIds.push(updateRecordId);
        const update = originalUpdate;
        const oldRecordData = originalOldRecordData;
        idRecordUpdates[updateRecordId] = update;
        idOriginalRecordUpdates[updateRecordId] = originalUpdate;
        idOldRecordData[updateRecordId] = oldRecordData;
        idOriginalOldRecordData[updateRecordId] = originalOldRecordData;
      }
    }

    if (updateRecordIds.length === 0) return;
    this.modifyRecords(updateRecordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData, isCopyPaste);
  }

  getLinkedRowsIdsByNameColumn(linkedTableRows, linkColumnKey, cellValue, linkItem) {
    if (!Array.isArray(linkedTableRows) || linkedTableRows.length === 0) {
      return [];
    }
    const cellValueStr = String(cellValue);

    // 1、If all string match the corresponding row, return this row
    const linkedRow = linkedTableRows.find(row => row['0000']?.trim() === cellValueStr.trim()) || null;
    if (linkedRow) {
      linkItem[linkColumnKey] = [{ display_value: cellValueStr, row_id: linkedRow._id }];
      return [linkedRow._id];
    }

    // 2、If the string contains a comma, split into multiple substrings to match the corresponding rows
    let linkedRowsIds = [];
    if (cellValueStr.includes(',') || cellValueStr.includes('，')) {
      const copiedNames = cellValueStr.split(/[,，]/).map(item => item.trim()).filter((value, index, self) => self.indexOf(value) === index);
      if (!Array.isArray(copiedNames) || copiedNames.length === 0) {
        return [];
      }
      linkItem[linkColumnKey] = [];
      copiedNames.forEach((copiedName) => {
        const linkedRow = linkedTableRows.find(row => row['0000']?.trim() === copiedName) || null;
        if (linkedRow) {
          linkItem[linkColumnKey].push({ display_value: copiedName, row_id: linkedRow._id });
          linkedRowsIds.push(linkedRow._id);
        }
      });
    }
    return linkedRowsIds;
  }

  getUpdateDraggedRecords(draggedRange, shownColumns, rows, idRowMap, groupMetrics) {
    let rowIds = [];
    let updatedOriginalRows = {};
    let oldOriginalRows = {};
    const updatedRows = {};
    const oldRows = {};
    const { overRecordIdx, topLeft, bottomRight } = draggedRange;
    let { idx: startColumnIdx } = topLeft;
    let { idx: endColumnIdx, rowIdx: endRecordIdx, groupRecordIndex } = bottomRight;

    let draggedRangeMatrix = this.getdraggedRangeMatrix(shownColumns, draggedRange, rows, groupMetrics, idRowMap);

    let rules = this.getDraggedRangeRules(draggedRangeMatrix, shownColumns, startColumnIdx);

    const selectedRowLength = draggedRangeMatrix[0].length;
    let fillingIndex = draggedRangeMatrix[0].length;

    // if group view then use index of gropRows which is different from the normal rows(they represent DOMs)
    let currentGroupRowIndex = groupRecordIndex + 1;
    for (let i = endRecordIdx + 1; i <= overRecordIdx; i++) {
      let dragRow;
      // find the row that need to be updated (it's draged)
      if (currentGroupRowIndex) {
        const groupRow = getGroupRecordByIndex(currentGroupRowIndex, groupMetrics);
        dragRow = idRowMap[groupRow.rowId];
      } else {
        dragRow = rows[i];
      }
      let { _id: dragRowId, _locked } = dragRow;
      fillingIndex++;
      if (_locked) continue;
      rowIds.push(dragRowId);

      let idx = (i - endRecordIdx - 1) % selectedRowLength;

      for (let j = startColumnIdx; j <= endColumnIdx; j++) {
        let column = shownColumns[j];
        let { key: cellKey, type, editable } = column;
        if (editable && !NOT_SUPPORT_EDIT_COLUMN_TYPE_MAP[type] && !NOT_SUPPORT_DRAG_COPY_COLUMN_TYPES.includes(type)) {
          let value = draggedRangeMatrix[j - startColumnIdx][idx];
          let rule = rules[cellKey];
          let fillingValue = rule({ n: fillingIndex - 1, value });
          updatedOriginalRows[dragRowId] = Object.assign({}, updatedOriginalRows[dragRowId], { [cellKey]: fillingValue });
          oldOriginalRows[dragRowId] = Object.assign({}, oldOriginalRows[dragRowId], { [cellKey]: dragRow[cellKey] });
          // update: {[name]: value}
          // originalUpdate: {[key]: id}
          const update = updatedOriginalRows[dragRowId];
          const oldUpdate = oldOriginalRows[dragRowId];

          updatedRows[dragRowId] = Object.assign({}, updatedRows[dragRowId], update);
          oldRows[dragRowId] = Object.assign({}, oldRows[dragRowId], oldUpdate);
        }
      }
      currentGroupRowIndex++;
    }

    return { recordIds: rowIds, idOriginalRecordUpdates: updatedOriginalRows, idRecordUpdates: updatedRows, idOriginalOldRecordData: oldOriginalRows, idOldRecordData: oldRows };
  }

  getdraggedRangeMatrix(columns, draggedRange, rows, groupMetrics, idRowMap) {
    let draggedRangeMatrix = [];
    let { topLeft, bottomRight } = draggedRange;
    let { idx: startColumnIdx, rowIdx: startRowIdx, groupRecordIndex } = topLeft;
    let { idx: endColumnIdx, rowIdx: endRowIdx } = bottomRight;
    for (let i = startColumnIdx; i <= endColumnIdx; i++) {
      let currentGroupRecordIndex = groupRecordIndex;
      draggedRangeMatrix[i - startColumnIdx] = [];
      let column = columns[i];
      let { key } = column;
      for (let j = startRowIdx; j <= endRowIdx; j++) {
        let selectedRecord;
        if (currentGroupRecordIndex) {
          const groupRecord = getGroupRecordByIndex(currentGroupRecordIndex, groupMetrics);
          selectedRecord = idRowMap[groupRecord.rowId];
        } else {
          selectedRecord = rows[j];
        }
        draggedRangeMatrix[i - startColumnIdx][j - startRowIdx] = selectedRecord[key];
        currentGroupRecordIndex++;
      }
    }
    return draggedRangeMatrix;
  }

  getDraggedRangeRules(draggedRangeMatrix, columns, startColumnIdx) {
    let draggedRangeRuleMatrix = {};
    draggedRangeMatrix.forEach((valueList, i) => {
      let column = columns[i + startColumnIdx];
      let { type, data, key } = column;
      let ruleMatrixItem = NORMAL_RULE;
      if (valueList.length > 1) {
        switch (type) {
          case CellType.DATE: {
            let format = data && data.format && data.format.indexOf('HH:mm') > -1 ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD';
            let value0 = valueList[0];
            let yearTolerance = this.getYearTolerance(valueList);
            if (yearTolerance) {
              ruleMatrixItem = ({ n }) => {
                return dayjs(value0).add(n * yearTolerance, 'years').format(format);
              };
              break;
            }
            let monthTolerance = this.getMonthTolerance(valueList);
            if (monthTolerance) {
              ruleMatrixItem = ({ n }) => {
                return dayjs(value0).add(n * monthTolerance, 'months').format(format);
              };
              break;
            }
            let dayTolerance = this.getDayTolerance(valueList);
            if (dayTolerance) {
              ruleMatrixItem = ({ n }) => {
                let time = n * dayTolerance + this.getDateStringValue(value0);
                return dayjs(time).format(format);
              };
              break;
            }
            break;
          }
          case CellType.NUMBER: {
            ruleMatrixItem = this.getLeastSquares(valueList);
            break;
          }
          case CellType.TEXT: {
            ruleMatrixItem = this._getTextRule(valueList);
            break;
          }
          case CellType.RATE: {
            ruleMatrixItem = this.getRatingLeastSquares(valueList, data);
            break;
          }
          default: {
            ruleMatrixItem = NORMAL_RULE;
            break;
          }
        }
      }
      draggedRangeRuleMatrix[key] = ruleMatrixItem;
    });
    return draggedRangeRuleMatrix;
  }

  getDateStringValue(date) {
    let dateObject = dayjs(date);
    return dateObject.isValid() ? dateObject.valueOf() : 0;
  }

  getYearTolerance(dateList) {
    let date0 = dayjs(dateList[0]);
    let date1 = dayjs(dateList[1]);
    if (!date0.isValid() || !date1.isValid()) {
      return 0;
    }
    if (date0.month() !== date1.month() || date0.date() !== date1.date()
      || date0.hour() !== date1.hour() || date0.minute() !== date1.minute()) {
      return 0;
    }
    let date0Year = date0.year();
    let tolerance = date1.year() - date0Year;
    let isYearArithmeticSequence = dateList.every((date, n) => {
      let dateObject = dayjs(date);
      if (!dateObject.isValid()) {
        return false;
      }
      return dateObject.year() === n * tolerance + date0Year;
    });
    return isYearArithmeticSequence ? tolerance : 0;
  }

  getMonthTolerance(dateList) {
    let date0 = dayjs(dateList[0]);
    let date1 = dayjs(dateList[1]);
    if (!date0.isValid() || !date1.isValid()) {
      return 0;
    }
    if (date0.date() !== date1.date() || date0.hour() !== date1.hour() || date0.minute() !== date1.minute()) {
      return 0;
    }
    let tolerance = (date1.month() - date0.month()) + (date1.year() - date0.year()) * 12;
    let isMonthArithmeticSequence = dateList.every((date, i) => {
      let month = i * tolerance;
      let dateObject = dayjs(date);
      if (!dateObject.isValid()) {
        return false;
      }
      return dateObject.isSame(dayjs(dateList[0]).add(month, 'month'), 'minute');
    });
    return isMonthArithmeticSequence ? tolerance : 0;
  }

  getDayTolerance(dateList) {
    let date0 = this.getDateStringValue(dateList[0]);
    let tolerance = this.getDateStringValue(dateList[1]) - date0;
    let isDayArithmeticSequence = dateList.every((date, i) => {
      if (!dayjs(date).isValid()) {
        return false;
      }
      return this.getDateStringValue(date) === i * tolerance + date0;
    });
    return isDayArithmeticSequence ? tolerance : 0;
  }

  getLeastSquares(numberList) {
    let slope;
    let intercept;
    let xAverage;
    let yAverage;
    let xSum = 0;
    let ySum = 0;
    let xSquareSum = 0;
    let xySum = 0;
    let validCellsLen = 0;
    let emptyCellPositions = [];
    numberList.forEach((v, i) => {
      if (v !== undefined && v !== null && v !== '') {
        validCellsLen++;
        xSum += i;
        ySum += v;
        xySum += (v * i);
        xSquareSum += Math.pow(i, 2);
      } else {
        emptyCellPositions.push(i);
      }
    });
    if (validCellsLen < 2) {
      return NORMAL_RULE;
    }
    xAverage = xSum / validCellsLen;
    yAverage = ySum / validCellsLen;
    slope = (xySum - validCellsLen * xAverage * yAverage) / (xSquareSum - validCellsLen * Math.pow(xAverage, 2));
    intercept = yAverage - slope * xAverage;
    return ({ n }) => {
      if (emptyCellPositions.length && emptyCellPositions.includes(n % numberList.length)) {
        return '';
      }
      let y = n * slope + intercept;
      return Number(parseFloat(y).toFixed(8));
    };
  }

}

export default GridUtils;
