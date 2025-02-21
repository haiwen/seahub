import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import AllTags from './all-tags';
import Tag from './tag';
import { useTags } from '../hooks';
import { PRIVATE_FILE_TYPE } from '../../constants';
import { PRIVATE_COLUMN_KEY, ALL_TAGS_ID } from '../constants';
import { checkTreeNodeHasChildNodes, getTreeChildNodes, getTreeNodeDepth, getTreeNodeId, getTreeNodeKey } from '../../components/sf-table/utils/tree';
import { getRowById } from '../../metadata/utils/table';
import { SIDEBAR_INIT_LEFT_INDENT } from '../constants/sidebar-tree';

import './index.css';

const LOCAL_KEY_TREE_NODE_EXPANDED = 'sidebar_key_tree_node_expanded_map';

const TagsTreeView = ({ currentPath }) => {
  const { tagsData, selectTag } = useTags();
  const [currSelectedNodeKey, setCurrSelectedNodeKey] = useState('');
  const [keyTreeNodeExpandedMap, setKeyTreeNodeExpandedMap] = useState({});

  const recordsTree = useMemo(() => {
    return (tagsData && tagsData.rows_tree) || [];
  }, [tagsData]);

  const buildTree = useCallback((roots, tree) => {
    roots.forEach((node) => {
      const childNodes = checkTreeNodeHasChildNodes(node) ? getTreeChildNodes(node, tree) : [];
      if (childNodes.length > 0) {
        node.children = childNodes;
        buildTree(node.children, tree);
      }
    });
  }, []);

  const visibleRoots = useMemo(() => {
    let roots = recordsTree.filter((node) => getTreeNodeDepth(node) === 0);
    roots = roots.slice(0, 20);
    buildTree(roots, recordsTree);
    return roots;
  }, [recordsTree, buildTree]);

  const getKeyTreeNodeExpandedMap = useCallback(() => {
    if (!window.sfTagsDataContext || !window.sfTagsDataContext.localStorage) return {};
    const strKeyTreeNodeExpandedMap = window.sfTagsDataContext.localStorage.getItem(LOCAL_KEY_TREE_NODE_EXPANDED);
    if (strKeyTreeNodeExpandedMap) {
      try {
        return JSON.parse(strKeyTreeNodeExpandedMap);
      } catch {
        return {};
      }
    }
    return {};
  }, []);

  const storeKeyTreeNodeExpandedMap = useCallback((keyTreeNodeExpandedMap) => {
    window.sfTagsDataContext.localStorage.setItem(LOCAL_KEY_TREE_NODE_EXPANDED, JSON.stringify(keyTreeNodeExpandedMap));
  }, []);

  const checkNodeExpanded = useCallback((nodeKey) => {
    return !!keyTreeNodeExpandedMap[nodeKey];
  }, [keyTreeNodeExpandedMap]);

  const toggleExpanded = useCallback((nodeKey, expanded) => {
    let updatedKeyTreeNodeExpandedMap = { ...keyTreeNodeExpandedMap };
    if (expanded) {
      delete updatedKeyTreeNodeExpandedMap[nodeKey];
    } else {
      updatedKeyTreeNodeExpandedMap[nodeKey] = true;
    }
    storeKeyTreeNodeExpandedMap(updatedKeyTreeNodeExpandedMap);
    setKeyTreeNodeExpandedMap(updatedKeyTreeNodeExpandedMap);
  }, [keyTreeNodeExpandedMap, storeKeyTreeNodeExpandedMap]);

  const selectNode = useCallback((node) => {
    const tagId = getTreeNodeId(node);
    const tag = getRowById(tagsData, tagId);
    const nodeKey = getTreeNodeKey(node);
    selectTag(tag, nodeKey);
    setCurrSelectedNodeKey(nodeKey);
  }, [tagsData, selectTag]);

  const selectAllTags = useCallback((isSelected) => {
    selectTag({ [PRIVATE_COLUMN_KEY.ID]: ALL_TAGS_ID }, isSelected);
    setCurrSelectedNodeKey('');
  }, [selectTag]);

  useEffect(() => {
    if (!currSelectedNodeKey) {
      const selectedNode = recordsTree.find((node) => {
        const nodePath = '/' + PRIVATE_FILE_TYPE.TAGS_PROPERTIES + '/' + getTreeNodeId(node);
        return nodePath === currentPath;
      });
      const nextSelectedNodeKey = getTreeNodeKey(selectedNode);
      setCurrSelectedNodeKey(nextSelectedNodeKey);
    }
    if (!currentPath.includes(PRIVATE_FILE_TYPE.TAGS_PROPERTIES)) {
      setCurrSelectedNodeKey('');
    }
  }, [currentPath, currSelectedNodeKey, recordsTree]);

  useEffect(() => {
    setKeyTreeNodeExpandedMap(getKeyTreeNodeExpandedMap());
  }, [getKeyTreeNodeExpandedMap]);

  return (
    <div className="tree-view tree metadata-tree-view metadata-tree-view-tag">
      <div className="tree-node">
        <div className="children">
          {visibleRoots.map((node) => {
            const nodeKey = getTreeNodeKey(node);
            return (
              <Tag
                key={`sidebar-tree-node-${nodeKey}`}
                node={node}
                expanded={checkNodeExpanded(nodeKey)}
                currentPath={currentPath}
                leftIndent={SIDEBAR_INIT_LEFT_INDENT}
                selectedNodeKey={currSelectedNodeKey}
                checkNodeExpanded={checkNodeExpanded}
                toggleExpanded={toggleExpanded}
                selectNode={selectNode}
              />
            );
          })}
          <AllTags currentPath={currentPath} selectAllTags={selectAllTags} />
        </div>
      </div>
    </div>
  );
};

TagsTreeView.propTypes = {
  currentPath: PropTypes.string,
};

export default TagsTreeView;
