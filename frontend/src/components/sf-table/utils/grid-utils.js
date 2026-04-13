import dayjs from 'dayjs';
import { TRANSFER_TYPES } from '../constants/transfer-types';
import { getColumnByIndex, getColumnOriginName } from './column';
import { REG_STRING_NUMBER_PARTS, REG_NUMBER_DIGIT } from '../constants/reg';
import { RATE_MAX_NUMBER } from '../constants/column';
import { getCellValueByColumn } from './cell';
import { CellType } from '../../../metadata/constants';
import { NOT_SUPPORT_DRAG_COPY_COLUMN_TYPES } from '../../../metadata/constants/view/table';
import { getGroupRecordByIndex } from '../shared/group-metrics';
import { checkIsDir } from '../../../metadata/utils/row/core';

const NORMAL_RULE = ({ value }) => {
  return value;
};

class GridUtils {

  constructor(renderRecordsIds, { recordGetterById, recordGetterByIndex, updateFileTags }) {
    this.renderRecordsIds = renderRecordsIds;
    this.api = {
      recordGetterById,
      recordGetterByIndex,
      updateFileTags,
    };
  }

  getCopiedContent({ type, copied, isGroupView, columns }) {
    // copy from internal grid
    if (type === TRANSFER_TYPES.METADATA_FRAGMENT) {
      const { selectedRecordIds, copiedRange } = copied;

      // copy from selected rows
      if (Array.isArray(selectedRecordIds) && selectedRecordIds.length > 0) {
        return {
          copiedRecords: selectedRecordIds.map(recordId => this.api.recordGetterById(recordId)),
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
        copiedRecords.push(this.api.recordGetterByIndex({ isGroupView, groupRecordIndex: currentGroupIndex, recordIndex: i }));
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

  // Sequence detection algorithms for drag-fill

  getDateStringValue(date) {
    let dateObject = dayjs(date);
    return dateObject.isValid() ? dateObject.valueOf() : 0;
  }

  _getYearTolerance(dateList) {
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

  _getMonthTolerance(dateList) {
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

  _getDayTolerance(dateList) {
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

  _getLeastSquares(numberList) {
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

  _isArithmeticSequence(numberList) {
    let number0 = numberList[0];
    let tolerance = numberList[1] - number0;
    let func = (v, n) => {
      return v === n * (tolerance) + number0;
    };
    return numberList.every(func);
  }

  _getTextItemStructureInfo(textItem) {
    let validTextItem = textItem || '';
    let lastNumberPosition = -1;
    let lastNumber = validTextItem;
    let valueList = validTextItem.match(REG_STRING_NUMBER_PARTS) || [];
    for (let i = valueList.length - 1; i > -1; i--) {
      let valueItem = valueList[i];
      if (REG_NUMBER_DIGIT.test(valueItem)) {
        lastNumberPosition = i;
        lastNumber = valueItem;
        break;
      }
    }
    if (lastNumberPosition !== -1) {
      valueList[lastNumberPosition] = '-|*|-sf-metadata-|*|-';
    }

    return { lastNumberPosition, lastNumber, structure: valueList.join('') };
  }

  _getTextFillNumberRule(valueList, lastNumber, lastNumberPosition, fillFunc) {
    let isStartWith0 = lastNumber.startsWith('0');
    return ({ n }) => {
      let fillValue = fillFunc ? fillFunc({ lastNumber, n }) : '';
      if (isStartWith0 && fillValue.length < lastNumber.length) {
        fillValue = '0'.repeat(lastNumber.length - fillValue.length) + fillValue;
      }
      valueList[lastNumberPosition] = fillValue;
      return valueList.join('');
    };
  }

  _getTextRule(textList) {
    let isAllNotIncludeNumber = textList.every(item => !REG_NUMBER_DIGIT.test(item || ''));
    if (isAllNotIncludeNumber) {
      return NORMAL_RULE;
    }
    if (textList.length === 1) {
      let valueList = textList[0].match(REG_STRING_NUMBER_PARTS);
      let { lastNumberPosition, lastNumber } = this._getTextItemStructureInfo(textList[0]);
      return this._getTextFillNumberRule(valueList, lastNumber, lastNumberPosition, ({ lastNumber, n }) => {
        let lastNumberValue = parseInt(lastNumber, 10);
        return (lastNumberValue + n) + '';
      });
    }
    // isStructureConsistent: the last number part is not equal, other is equal
    let structureList = textList.map((text) => this._getTextItemStructureInfo(text));
    let firstStructure = structureList[0];
    let isStructureConsistent = structureList.every(structure => structure['lastNumberPosition'] === firstStructure['lastNumberPosition'] && structure['structure'] === firstStructure['structure']);
    if (isStructureConsistent) {
      let numberList = structureList.map(structure => parseInt(structure.lastNumber, 10));
      if (this._isArithmeticSequence(numberList)) {
        let valueList = textList[0].match(REG_STRING_NUMBER_PARTS);
        let secondStructure = structureList[1];
        let secondStructureLastNumberValue = parseInt(secondStructure['lastNumber'], 10);
        return this._getTextFillNumberRule(valueList, firstStructure['lastNumber'], firstStructure['lastNumberPosition'], ({ lastNumber, n }) => {
          let lastNumberValue = parseInt(lastNumber, 10);
          return (n * (secondStructureLastNumberValue - lastNumberValue) + lastNumberValue) + '';
        });
      }
      return NORMAL_RULE;
    }
    return ({ value, n }) => {
      if (REG_NUMBER_DIGIT.test(value || '')) {
        let valueList = value.match(REG_STRING_NUMBER_PARTS);
        let { lastNumberPosition, lastNumber } = this._getTextItemStructureInfo(value);
        let isStartWith0 = lastNumber.startsWith('0');
        let lastNumberValue = parseInt(lastNumber, 10);
        let fillValue = (lastNumberValue + Math.floor(n / textList.length)) + '';
        if (isStartWith0 && fillValue.length < lastNumber.length) {
          fillValue = '0'.repeat(lastNumber.length - fillValue.length) + fillValue;
        }
        valueList[lastNumberPosition] = fillValue;
        return valueList.join('');
      }
      return value;
    };
  }

  _getRatingLeastSquares(numberList, data) {
    const { rate_max_number = RATE_MAX_NUMBER[4].name } = data || {};
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
      const value = Number(parseFloat(y).toFixed(0));
      if (value > rate_max_number) return rate_max_number;
      if (value < 0) return 0;
      return value;
    };
  }

  // Build drag range rules based on column type
  getDraggedRangeRules(draggedRangeMatrix, columns, startColumnIdx) {
    let draggedRangeRuleMatrix = {};
    draggedRangeMatrix.forEach((valueList, i) => {
      let column = columns[i + startColumnIdx];
      if (!column) return; // Skip if column is undefined
      let { type, data, key } = column;
      let ruleMatrixItem = NORMAL_RULE;
      // For TAGS and other special column types, always set specific rules
      // For other types, only set rules when there's sequence to detect (valueList.length > 1)
      if (valueList.length > 1 || type === CellType.TAGS) {
        switch (type) {
          case CellType.DATE: {
            let format = data && data.format && data.format.indexOf('HH:mm') > -1 ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD';
            let value0 = valueList[0];
            let yearTolerance = this._getYearTolerance(valueList);
            if (yearTolerance) {
              ruleMatrixItem = ({ n }) => {
                return dayjs(value0).add(n * yearTolerance, 'years').format(format);
              };
              break;
            }
            let monthTolerance = this._getMonthTolerance(valueList);
            if (monthTolerance) {
              ruleMatrixItem = ({ n }) => {
                return dayjs(value0).add(n * monthTolerance, 'months').format(format);
              };
              break;
            }
            let dayTolerance = this._getDayTolerance(valueList);
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
            ruleMatrixItem = this._getLeastSquares(valueList);
            break;
          }
          case CellType.TEXT: {
            ruleMatrixItem = this._getTextRule(valueList);
            break;
          }
          case CellType.RATE: {
            ruleMatrixItem = this._getRatingLeastSquares(valueList, data);
            break;
          }
          case CellType.TAGS: {
            // For TAGS column type, return the tag row_ids for drag-fill
            // valueList is draggedRangeMatrix[i] which contains source cell values
            // For a single cell selection, valueList = [[tagObj]], so valueList[0][0] = tagObj
            // For multiple cells, valueList[j][0] = tagObj for each column j
            const tagSourceData = valueList[0]; // This is the source cell value (tagObj array)
            ruleMatrixItem = ({ value, n }) => {
              // Use source data from valueList instead of current cell value
              const sourceValue = tagSourceData;
              if (!sourceValue) return [];
              if (!Array.isArray(sourceValue) || sourceValue.length === 0) return [];
              // Return the same tag row_ids for each fill (copy mode)
              return sourceValue.map(item => item.row_id);
            };
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

  // Build matrix of cell values from dragged range
  getDraggedRangeMatrix(columns, draggedRange, rows, groupMetrics, idRowMap) {
    let draggedRangeMatrix = [];
    const { topLeft, bottomRight } = draggedRange;
    const { idx: startColumnIdx, rowIdx: startRowIdx, groupRecordIndex: startGroupRecordIndex } = topLeft;
    const { idx: endColumnIdx, rowIdx: endRowIdx } = bottomRight;
    for (let i = startColumnIdx; i <= endColumnIdx; i++) {
      let currentGroupRecordIndex = startGroupRecordIndex;
      draggedRangeMatrix[i - startColumnIdx] = [];
      const column = columns[i];
      for (let j = startRowIdx; j <= endRowIdx; j++) {
        let selectedRecord;
        if (currentGroupRecordIndex) {
          const groupRecord = getGroupRecordByIndex(currentGroupRecordIndex, groupMetrics);
          selectedRecord = idRowMap[groupRecord?.rowId];
        } else {
          selectedRecord = rows[j];
        }
        draggedRangeMatrix[i - startColumnIdx][j - startRowIdx] = getCellValueByColumn(selectedRecord, column);
        currentGroupRecordIndex++;
      }
    }
    return draggedRangeMatrix;
  }

  // Get records to be updated during drag-fill operation
  getUpdateDraggedRecords(draggedRange, shownColumns, rows, idRowMap, groupMetrics) {
    let rowIds = [];
    let updatedOriginalRows = {};
    let oldOriginalRows = {};
    const updatedRows = {};
    const oldRows = {};
    const { overRecordIdx, topLeft, bottomRight } = draggedRange;
    const { idx: startColumnIdx } = topLeft;
    const { idx: endColumnIdx, rowIdx: endRecordIdx, groupRecordIndex } = bottomRight;
    const { canModifyRow, canModifyColumn } = window.sfMetadataContext || {};

    const draggedRangeMatrix = this.getDraggedRangeMatrix(shownColumns, draggedRange, rows, groupMetrics, idRowMap);
    const rules = this.getDraggedRangeRules(draggedRangeMatrix, shownColumns, startColumnIdx);

    const selectedRowLength = draggedRangeMatrix[0] ? draggedRangeMatrix[0].length : 0;
    let fillingIndex = selectedRowLength;

    // if group view then use index of groupRows which is different from the normal rows
    // Only set currentGroupRowIndex when groupRecordIndex is explicitly set (not null/undefined)
    let currentGroupRowIndex = groupRecordIndex != null ? groupRecordIndex + 1 : null;
    const isGroupViewMode = groupRecordIndex != null;

    for (let i = endRecordIdx + 1; i <= overRecordIdx; i++) {
      let dragRow;
      // find the row that need to be updated (it's dragged)
      if (isGroupViewMode && currentGroupRowIndex != null) {
        const groupRow = getGroupRecordByIndex(currentGroupRowIndex, groupMetrics);
        dragRow = idRowMap[groupRow?.rowId];
      } else {
        dragRow = rows[i];
      }
      if (!dragRow) {
        if (isGroupViewMode) currentGroupRowIndex++;
        continue;
      }
      const { _id: dragRowId } = dragRow;
      fillingIndex++;
      if (canModifyRow && !canModifyRow(dragRow)) {
        if (isGroupViewMode) currentGroupRowIndex++;
        continue;
      }
      rowIds.push(dragRowId);
      oldRows[dragRowId] = dragRow;
      oldOriginalRows[dragRowId] = { ...dragRow };

      for (let j = startColumnIdx; j <= endColumnIdx; j++) {
        let column = shownColumns[j];
        let { key: cellKey, type } = column;
        const columnName = getColumnOriginName(column);

        // Skip TAGS and LONG_TEXT for folder records (folders don't support these)
        const isFolder = checkIsDir(dragRow);
        if (isFolder && (type === CellType.TAGS || type === CellType.LONG_TEXT)) {
          continue;
        }
        if (canModifyColumn && !canModifyColumn(column)) {
          continue;
        }
        if (NOT_SUPPORT_DRAG_COPY_COLUMN_TYPES && NOT_SUPPORT_DRAG_COPY_COLUMN_TYPES.includes(type)) {
          continue;
        }

        let rule = rules[cellKey];
        // Get source value from draggedRangeMatrix instead of target row
        const sourceValue = draggedRangeMatrix[j - startColumnIdx]?.[fillingIndex - selectedRowLength - 1] || draggedRangeMatrix[j - startColumnIdx]?.[0];
        let oldCellValue = getCellValueByColumn(dragRow, column);
        let fillValue = rule ? rule({ value: sourceValue, n: fillingIndex }) : sourceValue;

        // Skip empty values for non-tags columns (empty drag-fill is meaningless)
        if (type === CellType.TAGS) {
          // Call updateFileTags directly with correct format: { record_id, tags, old_tags }
          // fillValue is already an array of tag row_ids from the TAGS rule
          if (fillValue && Array.isArray(fillValue) && fillValue.length > 0) {
            const oldTags = Array.isArray(oldCellValue) ? oldCellValue.map(item => item.row_id || item) : [];
            if (this.api.updateFileTags) {
              this.api.updateFileTags([{ record_id: dragRowId, tags: fillValue, old_tags: oldTags }]);
            }
          }
        } else {
          // Skip if fillValue is empty/undefined/null and equals old value
          if (fillValue !== undefined && fillValue !== null && fillValue !== '') {
            updatedRows[dragRowId] = updatedRows[dragRowId] || {};
            updatedRows[dragRowId][columnName] = fillValue;
          }
        }
      }
      if (isGroupViewMode) currentGroupRowIndex++;
    }

    Object.keys(updatedRows).forEach(rowId => {
      updatedOriginalRows[rowId] = { ...rows.find(r => r._id === rowId), ...updatedRows[rowId] };
    });

    return {
      recordIds: rowIds,
      idRecordUpdates: updatedRows,
      idOriginalRecordUpdates: updatedOriginalRows,
      idOldRecordData: oldRows,
      idOriginalOldRecordData: oldOriginalRows,
    };
  }
}

export default GridUtils;
