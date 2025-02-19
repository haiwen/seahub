import React, { useCallback, useEffect, useRef } from 'react';
import { TreeMetrics } from '../../utils/tree-metrics';
import { RecordMetrics } from '../../utils/record-metrics';

const RecordDragLayer = ({ showRecordAsTree, draggingRecordSource, recordMetrics, treeMetrics, renderCustomDraggedRows }) => {
  const layerRef = useRef(null);

  useEffect(() => {
    if (layerRef.current && draggingRecordSource.event) {
      draggingRecordSource.event.dataTransfer.setDragImage(layerRef.current, 15, 15);
    }
  }, [draggingRecordSource]);

  const getDraggedRowsIds = useCallback(() => {
    const { draggingRecordId, draggingTreeNodeKey } = draggingRecordSource;
    return showRecordAsTree ? TreeMetrics.getDraggedTreeNodesKeys(draggingTreeNodeKey, treeMetrics) : RecordMetrics.getDraggedRecordsIds(draggingRecordId, recordMetrics);
  }, [showRecordAsTree, draggingRecordSource, treeMetrics, recordMetrics]);

  const renderDraggedRows = useCallback(() => {
    const draggedRowsIds = getDraggedRowsIds();
    if (renderCustomDraggedRows) {
      return renderCustomDraggedRows(draggedRowsIds);
    }
    return null;
  }, [getDraggedRowsIds, renderCustomDraggedRows]);

  return (
    <div className="sf-table-record-drag-layer" ref={layerRef}>
      <table className='record-drag-layer-table'>
        <tbody>{renderDraggedRows()}</tbody>
      </table>
    </div>
  );
};

export default RecordDragLayer;
