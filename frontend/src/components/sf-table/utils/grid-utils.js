import TRANSFER_TYPES from '../constants/transfer-types';
import { getColumnByIndex } from './column';


class GridUtils {

  constructor(renderRecordsIds, { recordGetterById, recordGetterByIndex }) {
    this.renderRecordsIds = renderRecordsIds;
    this.api = {
      recordGetterById,
      recordGetterByIndex,
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
}

export default GridUtils;
