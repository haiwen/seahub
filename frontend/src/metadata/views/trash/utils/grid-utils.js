import dayjs from 'dayjs';
import { getCellValueByColumn, getFileNameFromRecord, getRecordIdFromRecord, isCellValueChanged } from '../../../utils/cell';
import { getColumnByIndex, getColumnOriginName } from '../../../utils/column';
import { CellType, NOT_SUPPORT_DRAG_COPY_COLUMN_TYPES, PRIVATE_COLUMN_KEY, TRANSFER_TYPES,
  REG_NUMBER_DIGIT, REG_STRING_NUMBER_PARTS, RATE_MAX_NUMBER, PASTE_SOURCE,
} from '../../../constants';
import { getGroupRecordByIndex } from './group-metrics';
import { convertCellValue } from './convert-utils';
import { Utils } from '../../../../utils/utils';

const NORMAL_RULE = ({ value }) => {
  return value;
};

const isCopyPaste = true;

class GridUtils {

  constructor(metadata, api) {
    this.metadata = metadata;
    this.api = api;
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

  clearCutData(cutPosition, cutData, isGroupView) {
    let { rowIdx: startRecordIndex, groupRecordIndex } = cutPosition;
    const { copiedColumns, copiedRecords } = cutData;
    let updateRecordIds = [];
    let idRecordUpdates = {};
    let idOldRecordData = {};
    let updateTags = [];

    copiedRecords.forEach((record, index) => {
      const cutRowIdx = startRecordIndex + index;
      const cutRecord = this.api.recordGetterByIndex({ isGroupView, groupRecordIndex: groupRecordIndex, recordIndex: cutRowIdx });
      groupRecordIndex++;
      const cutRecordId = getRecordIdFromRecord(cutRecord);
      const canModify = window.sfMetadataContext.canModifyRow(cutRecord);
      if (canModify) {
        updateRecordIds.push(cutRecordId);
        copiedColumns.forEach((copiedColumn, index) => {
          if (copiedColumn.editable) {
            const cellValue = getCellValueByColumn(cutRecord, copiedColumn);
            const copiedColumnName = getColumnOriginName(copiedColumn);
            if (copiedColumn.type === CellType.TAGS) {
              const oldValue = Array.isArray(cellValue) ? cellValue : [];
              if (oldValue.length > 0) {
                updateTags.push({
                  record_id: cutRecordId,
                  tags: [],
                  old_tags: oldValue.map(i => i.row_id)
                });
              }
            } else {
              idRecordUpdates[cutRecordId] = Object.assign({}, idRecordUpdates[cutRecordId], { [copiedColumnName]: null });
              idOldRecordData[cutRecordId] = Object.assign({}, idOldRecordData[cutRecordId], { [copiedColumnName]: cellValue });
            }
          }
        });
      }
    });

    if (Object.keys(idRecordUpdates).length > 0) {
      this.api.modifyRecords(updateRecordIds, idRecordUpdates, idRecordUpdates, idOldRecordData, idOldRecordData, true);
    }

    if (updateTags.length > 0) {
      this.api.updateFileTags(updateTags);
    }
  }

  async paste({ type, copied, multiplePaste, pasteRange, isGroupView, columns, viewId, pasteSource, cutPosition }) {
    const { row_ids: renderRecordIds } = this.metadata;
    const { topLeft, bottomRight = {} } = pasteRange;
    const { rowIdx: startRecordIndex, idx: startColumnIndex, groupRecordIndex } = topLeft;
    const { rowIdx: endRecordIndex, idx: endColumnIndex } = bottomRight;
    const { copiedRecords, copiedColumns } = copied;
    const copiedRecordsLen = copiedRecords.length;
    const copiedColumnsLen = copiedColumns.length;
    const pasteRecordsLen = multiplePaste ? endRecordIndex - startRecordIndex + 1 : copiedRecordsLen;
    const pasteColumnsLen = multiplePaste ? endColumnIndex - startColumnIndex + 1 : copiedColumnsLen;
    const renderRecordsCount = renderRecordIds.length;

    const isFromCut = pasteSource === PASTE_SOURCE.CUT && type === TRANSFER_TYPES.METADATA_FRAGMENT;
    if (isFromCut) {
      const { search } = window.location;
      const urlParams = new URLSearchParams(search);
      const currentViewId = urlParams.has('view') && urlParams.get('view');
      if (currentViewId === viewId) {
        this.clearCutData(cutPosition, copied, isGroupView);
      }
    }

    // need expand records
    const startExpandRecordIndex = renderRecordsCount - startRecordIndex;

    if ((copiedRecordsLen > startExpandRecordIndex)) return;

    let updateTags = [];
    let updateRecordIds = [];
    let idRecordUpdates = {};
    let idOriginalRecordUpdates = {};
    let idOldRecordData = {};
    let idOriginalOldRecordData = {};
    let currentGroupRecordIndex = groupRecordIndex;

    for (let i = 0; i < pasteRecordsLen; i++) {
      const pasteRecord = this.api.recordGetterByIndex({ isGroupView, groupRecordIndex: currentGroupRecordIndex, recordIndex: startRecordIndex + i });
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
      let originalKeyUpdate = {};
      let originalOldRecordData = {};
      let originalKeyOldRecordData = {};
      const { canModifyRow, canModifyColumn } = window.sfMetadataContext;
      const filename = getFileNameFromRecord(pasteRecord);

      for (let j = 0; j < pasteColumnsLen; j++) {
        const pasteColumn = getColumnByIndex(j + startColumnIndex, columns);
        if (!pasteColumn || !(canModifyRow(pasteRecord) && canModifyColumn(pasteColumn))) {
          continue;
        }
        if (pasteColumn.key === PRIVATE_COLUMN_KEY.CAPTURE_TIME && !(Utils.imageCheck(filename) || Utils.videoCheck(filename))) {
          continue;
        }
        const copiedColumnIndex = j % copiedColumnsLen;
        const copiedColumn = getColumnByIndex(copiedColumnIndex, copiedColumns);
        const pasteColumnName = getColumnOriginName(pasteColumn);
        const copiedColumnName = getColumnOriginName(copiedColumn);
        const pasteCellValue = Object.prototype.hasOwnProperty.call(pasteRecord, pasteColumnName) ? getCellValueByColumn(pasteRecord, pasteColumn) : null;
        const copiedCellValue = Object.prototype.hasOwnProperty.call(copiedRecord, copiedColumnName) ? getCellValueByColumn(copiedRecord, copiedColumn) : null;
        const update = convertCellValue(copiedCellValue, pasteCellValue, pasteColumn, copiedColumn, this.api);
        if (!isCellValueChanged(pasteCellValue, update, pasteColumn.type)) continue;
        if (pasteColumn.type === CellType.TAGS) {
          updateTags.push({
            record_id: updateRecordId,
            tags: Array.isArray(update) ? update.map(i => i.row_id) : [],
            old_tags: Array.isArray(pasteCellValue) ? pasteCellValue.map(i => i.row_id) : []
          });
          continue;
        }
        originalUpdate[pasteColumnName] = update;
        originalKeyUpdate[pasteColumn.key] = update;
        originalOldRecordData[pasteColumnName] = pasteCellValue;
        originalKeyOldRecordData[pasteColumn.key] = pasteCellValue;
      }

      if (Object.keys(originalUpdate).length > 0) {
        updateRecordIds.push(updateRecordId);
        idRecordUpdates[updateRecordId] = originalUpdate;
        idOriginalRecordUpdates[updateRecordId] = originalKeyUpdate;
        idOldRecordData[updateRecordId] = originalOldRecordData;
        idOriginalOldRecordData[updateRecordId] = originalKeyOldRecordData;
      }
    }

    if (updateTags.length > 0) {
      this.api.updateFileTags(updateTags);
    }

    if (updateRecordIds.length === 0) return;
    this.api.modifyRecords(updateRecordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData, isCopyPaste);
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
    let tagsUpdate = [];
    let rowIds = [];
    let updatedOriginalRows = {};
    let oldOriginalRows = {};
    const updatedRows = {};
    const oldRows = {};
    const { overRecordIdx, topLeft, bottomRight } = draggedRange;
    const { idx: startColumnIdx } = topLeft;
    const { idx: endColumnIdx, rowIdx: endRecordIdx, groupRecordIndex } = bottomRight;
    const { canModifyRow, canModifyColumn } = window.sfMetadataContext;

    const draggedRangeMatrix = this.getDraggedRangeMatrix(shownColumns, draggedRange, rows, groupMetrics, idRowMap);
    const rules = this.getDraggedRangeRules(draggedRangeMatrix, shownColumns, startColumnIdx);

    const selectedRowLength = draggedRangeMatrix[0].length;
    let fillingIndex = draggedRangeMatrix[0].length;

    // if group view then use index of groupRows which is different from the normal rows(they represent DOMs)
    let currentGroupRowIndex = groupRecordIndex + 1;
    for (let i = endRecordIdx + 1; i <= overRecordIdx; i++) {
      let dragRow;
      // find the row that need to be updated (it's dragged)
      if (currentGroupRowIndex) {
        const groupRow = getGroupRecordByIndex(currentGroupRowIndex, groupMetrics);
        dragRow = idRowMap[groupRow.rowId];
      } else {
        dragRow = rows[i];
      }
      const { _id: dragRowId } = dragRow;
      fillingIndex++;
      if (!canModifyRow(dragRow)) continue;
      rowIds.push(dragRowId);

      const idx = (i - endRecordIdx - 1) % selectedRowLength;
      for (let j = startColumnIdx; j <= endColumnIdx; j++) {
        let column = shownColumns[j];
        let { key: cellKey, type } = column;
        const columnName = getColumnOriginName(column);
        if (canModifyColumn(column) && !NOT_SUPPORT_DRAG_COPY_COLUMN_TYPES.includes(type)) {
          const value = draggedRangeMatrix[j - startColumnIdx][idx];
          const rule = rules[cellKey];
          const fillingValue = rule({ n: fillingIndex - 1, value });
          const oldValue = dragRow[columnName];
          if (isCellValueChanged(fillingValue, oldValue, type)) {
            if (type === CellType.TAGS) {
              tagsUpdate.push({
                record_id: dragRowId,
                tags: fillingValue.map(value => value.row_id) || [],
                old_tags: Array.isArray(oldValue) ? oldValue.map(i => i.row_id) : [],
              });
            } else {
              updatedOriginalRows[dragRowId] = Object.assign({}, updatedOriginalRows[dragRowId], { [columnName]: fillingValue });
              oldOriginalRows[dragRowId] = Object.assign({}, oldOriginalRows[dragRowId], { [columnName]: oldValue });
              const update = updatedOriginalRows[dragRowId];
              const oldUpdate = oldOriginalRows[dragRowId];

              updatedRows[dragRowId] = Object.assign({}, updatedRows[dragRowId], update);
              oldRows[dragRowId] = Object.assign({}, oldRows[dragRowId], oldUpdate);
            }
          }
        }
      }
      currentGroupRowIndex++;
    }

    if (tagsUpdate.length > 0) {
      this.api.updateFileTags(tagsUpdate);
    }

    return {
      recordIds: rowIds,
      idOriginalRecordUpdates: updatedOriginalRows,
      idRecordUpdates: updatedRows,
      idOriginalOldRecordData: oldOriginalRows,
      idOldRecordData: oldRows
    };
  }

  getDraggedRangeMatrix(columns, draggedRange, rows, groupMetrics, idRowMap) {
    let draggedRangeMatrix = [];
    const { topLeft, bottomRight } = draggedRange;
    const { idx: startColumnIdx, rowIdx: startRowIdx, groupRecordIndex } = topLeft;
    const { idx: endColumnIdx, rowIdx: endRowIdx } = bottomRight;
    for (let i = startColumnIdx; i <= endColumnIdx; i++) {
      let currentGroupRecordIndex = groupRecordIndex;
      draggedRangeMatrix[i - startColumnIdx] = [];
      const column = columns[i];
      for (let j = startRowIdx; j <= endRowIdx; j++) {
        let selectedRecord;
        if (currentGroupRecordIndex) {
          const groupRecord = getGroupRecordByIndex(currentGroupRecordIndex, groupMetrics);
          selectedRecord = idRowMap[groupRecord.rowId];
        } else {
          selectedRecord = rows[j];
        }
        draggedRangeMatrix[i - startColumnIdx][j - startRowIdx] = getCellValueByColumn(selectedRecord, column);
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
            ruleMatrixItem = ({ value }) => {
              if (!value) return [];
              if (!Array.isArray(value) || value.length === 0) return [];
              return value.map(item => item.row_id);
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

}

export default GridUtils;
