import { getColumnByKey } from '../../../utils/column';
import { GROUP_HEADER_HEIGHT, GROUP_ROW_TYPE, GROUP_VIEW_OFFSET, INSERT_ROW_HEIGHT } from '../../../constants';

export const createGroupMetrics = (groups, groupbys, pathFoldedGroupMap, columns, rowHeight, includeInsertRow) => {
  let groupbyColumnsMap = {};
  groupbys.forEach(groupby => {
    const columnKey = groupby.column_key;
    const column = getColumnByKey(columns, columnKey);
    groupbyColumnsMap[columnKey] = column;
  });
  const maxLevel = groupbys.length;
  const groupRows = getGroupsRows(
    groups, groupbyColumnsMap, pathFoldedGroupMap, includeInsertRow, rowHeight, maxLevel,
    { parentGroupPath: [], currentLevel: maxLevel, isParentGroupVisible: true }
  );
  const { computedGroupRows, groupRowsHeight, idGroupRowMap } = setupGroupsRows(groupRows, maxLevel);
  return {
    groupRows: computedGroupRows,
    idGroupRowMap,
    groupRowsHeight,
    maxLevel,
  };
};

export const getGroupsRows = (
  groups, groupbyColumnsMap, pathFoldedGroupMap, includeInsertRow, rowHeight, maxLevel, {
    parentGroupPath, parentGroupKey, currentLevel, isParentGroupVisible,
  }
) => {
  let groupRows = [];
  groups.forEach((group, groupIndex) => {
    let groupPath = [];
    if (parentGroupPath.length > 0) {
      groupPath.push(...parentGroupPath);
    }
    groupPath.push(groupIndex);
    const { cell_value, subgroups, row_ids, column_key, summaries, original_cell_value } = group;
    const groupPathString = groupPath.join('-');
    const isExpanded = isExpandedGroup(groupPathString, pathFoldedGroupMap);
    const left = (maxLevel - currentLevel + 1) * GROUP_VIEW_OFFSET;
    const groupKey = `${parentGroupKey ? parentGroupKey : column_key}_${cell_value}`;
    let groupContainer = {
      type: GROUP_ROW_TYPE.GROUP_CONTAINER,
      level: currentLevel,
      left,
      key: groupKey,
      cell_value,
      column_key,
      isExpanded,
      summaries,
      groupPath,
      groupPathString,
      column: groupbyColumnsMap[column_key],
      visible: isParentGroupVisible,
      original_cell_value
    };
    if (Array.isArray(subgroups) && subgroups.length > 0) {
      const flattenSubgroups = getGroupsRows(
        subgroups, groupbyColumnsMap, pathFoldedGroupMap, includeInsertRow, rowHeight, maxLevel,
        { parentGroupPath: groupPath, parentGroupKey: groupKey, currentLevel: currentLevel - 1, isParentGroupVisible: isParentGroupVisible && isExpanded }
      );
      let groupCount = 0;
      let subgroupsHeight = 0;
      let first_row_id;
      flattenSubgroups.forEach((subgroupContainer) => {
        if (subgroupContainer.type === GROUP_ROW_TYPE.GROUP_CONTAINER && subgroupContainer.level + 1 === currentLevel) {
          groupCount += subgroupContainer.count || 0;
          subgroupsHeight += (subgroupContainer.height || 0) + GROUP_VIEW_OFFSET;
          if (!first_row_id) {
            first_row_id = subgroupContainer.first_row_id;
          }
        }
      });
      groupContainer.first_row_id = first_row_id;
      groupContainer.count = groupCount;
      groupContainer.height = (isExpanded ? subgroupsHeight : 0) + GROUP_HEADER_HEIGHT;
      groupRows.push(groupContainer);
      groupRows.push(...flattenSubgroups);
    } else if (Array.isArray(row_ids) && row_ids.length > 0) {
      const rowsLength = row_ids.length;
      const lastRowIndex = rowsLength - 1;
      const isRowVisible = isParentGroupVisible && isExpanded;
      const isBtnInsertRowVisible = isRowVisible && includeInsertRow;
      const rowsHeight = isRowVisible ? rowsLength * rowHeight + 1 : 0;
      const btnInsertRowHeight = isBtnInsertRowVisible ? INSERT_ROW_HEIGHT : 0;
      let rows = row_ids.map((rowId, index) => {
        return {
          type: GROUP_ROW_TYPE.ROW,
          key: `row-${rowId}`,
          rowIdx: index,
          isLastRow: index === lastRowIndex,
          visible: isRowVisible,
          height: index === lastRowIndex ? rowHeight + 1 : rowHeight,
          level: currentLevel,
          rowsLength,
          left,
          rowId,
          groupPath,
          groupPathString,
        };
      });
      groupContainer.first_row_id = rows[0].rowId;
      groupContainer.count = rowsLength;
      groupContainer.height = rowsHeight + btnInsertRowHeight + GROUP_HEADER_HEIGHT;
      groupRows.push(groupContainer);
      groupRows.push(...rows);
    }
  });
  return groupRows;
};

export const setupGroupsRows = (groupRows, maxLevel) => {
  let groupRowsHeight = GROUP_VIEW_OFFSET;
  let top = GROUP_VIEW_OFFSET;
  let idGroupRowMap = {};
  let pervVisibleGroupLevel;
  const computedGroupRows = groupRows.map((flattenGroup, index) => {
    const { type, level, height, visible } = flattenGroup;
    let newGroupRow = {
      ...flattenGroup,
      top,
      groupRecordIndex: index,
    };
    if (type === GROUP_ROW_TYPE.GROUP_CONTAINER) {
      if (visible) {
        if (level === maxLevel) {
          groupRowsHeight += height + GROUP_VIEW_OFFSET;
        }
        top += GROUP_HEADER_HEIGHT;
        pervVisibleGroupLevel = level;
      }
    } else if (type === GROUP_ROW_TYPE.ROW) {
      const { rowId } = flattenGroup;
      idGroupRowMap[rowId] = newGroupRow;
      if (visible) {
        top += height;
      }
    } else if (type === GROUP_ROW_TYPE.BTN_INSERT_ROW) {
      if (visible) {
        top += height;
      }
    }
    const nextFlattenGroup = groupRows[index + 1];
    if (nextFlattenGroup && nextFlattenGroup.visible && nextFlattenGroup.type === GROUP_ROW_TYPE.GROUP_CONTAINER) {
      const { groupPath: nextGroupPath, level: nextGroupLevel } = nextFlattenGroup;
      if (nextGroupPath[nextGroupPath.length - 1] > 0) {
        top += GROUP_VIEW_OFFSET;
      }
      if (nextGroupLevel > pervVisibleGroupLevel) {
        top += (nextGroupLevel - pervVisibleGroupLevel) * GROUP_VIEW_OFFSET;
      }
    }
    return newGroupRow;
  });
  return { computedGroupRows, groupRowsHeight, idGroupRowMap };
};

export const isExpandedGroup = (groupPathString, pathFoldedGroupMap) => {
  return !pathFoldedGroupMap || !pathFoldedGroupMap[groupPathString];
};

export const isNestedGroupRow = (currentGroupRow, targetGroupRow) => {
  const { groupPath: currentGroupPath, groupPathString: currentGroupPathString, level: currentGroupLevel, type: currentGroupRowType } = currentGroupRow;
  const { groupPath: targetGroupPath, groupPathString: targetGroupPathString, level: targetGroupLevel } = targetGroupRow;
  return (currentGroupPathString === targetGroupPathString && currentGroupRowType !== GROUP_ROW_TYPE.GROUP_CONTAINER) ||
    (currentGroupLevel < targetGroupLevel && currentGroupPath[0] === targetGroupPath[0]);
};

export const getGroupRecordByIndex = (index, groupMetrics) => {
  const groupRows = groupMetrics.groupRows || [];
  return groupRows[index] || {};
};
