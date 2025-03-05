import React, { useMemo } from 'react';
import { getTreeNodeByKey, getTreeNodeId } from '../../../../components/sf-table/utils/tree';
import { useTags } from '../../../hooks';
import { getRowById } from '../../../../components/sf-table/utils/table';
import TagNameFormatter from './formatter/tag-name';

const DraggedTagsLayer = ({ draggedNodesKeys }) => {
  const { tagsData } = useTags();

  const keyTreeNodeMap = useMemo(() => {
    return tagsData.key_tree_node_map || [];
  }, [tagsData]);

  return draggedNodesKeys.map((nodeKey) => {
    const node = getTreeNodeByKey(nodeKey, keyTreeNodeMap);
    const tagId = getTreeNodeId(node);
    const tag = getRowById(tagsData, tagId);
    if (!tag) return null;
    return (
      <tr key={`rdg-dragged-record-${nodeKey}`} className="rdg-dragged-record">
        <td className="rdg-dragged-record-cell"><TagNameFormatter record={tag} /></td>
      </tr>
    );
  });
};

export default DraggedTagsLayer;
