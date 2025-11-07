import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { getTagColor, getTagName, getTagFilesLinks } from '../../utils/cell';
import { checkTreeNodeHasChildNodes, getTreeNodeId, getTreeNodeKey } from '../../../components/sf-table/utils/tree';
import { getRowById } from '../../../components/sf-table/utils/table';
import { useTags } from '../../hooks';
import { SIDEBAR_INIT_LEFT_INDENT } from '../../constants/sidebar-tree';
import { getAllChildTagsIdsFromNode } from '../../utils/tree';
import { Utils } from '../../../utils/utils';
import Icon from '../../../components/icon';

import './index.css';

const LEFT_INDENT_UNIT = 20;
const NODE_TEXT_LEFT_INDENT_UNIT = 5;

const Tag = ({ node, currentPath, leftIndent, selectedNodeKey, expanded, checkNodeExpanded, toggleExpanded, selectNode }) => {
  const { tagsData } = useTags();
  const [highlight, setHighlight] = useState(false);

  const tagId = useMemo(() => {
    return getTreeNodeId(node);
  }, [node]);

  const tag = useMemo(() => {
    return getRowById(tagsData, tagId);
  }, [tagsData, tagId]);

  const hasChildren = useMemo(() => checkTreeNodeHasChildNodes(node), [node]);
  const nodeKey = useMemo(() => getTreeNodeKey(node), [node]);
  const tagName = useMemo(() => getTagName(tag), [tag]);
  const tagColor = useMemo(() => getTagColor(tag), [tag]);
  const tagCount = useMemo(() => {
    const filesLinks = getTagFilesLinks(tag);
    let allFilesLinks = [...filesLinks];
    const childTagsIds = getAllChildTagsIdsFromNode(node);
    childTagsIds.forEach((childTagId) => {
      const childTag = getRowById(tagsData, childTagId);
      const childFilesLinks = getTagFilesLinks(childTag);
      if (childFilesLinks && childFilesLinks.length > 0) {
        allFilesLinks.push(...childFilesLinks);
      }
    });
    return allFilesLinks.length;
  }, [node, tag, tagsData]);

  const isSelected = useMemo(() => {
    return nodeKey === selectedNodeKey;
  }, [nodeKey, selectedNodeKey]);

  const onMouseEnter = useCallback(() => {
    setHighlight(true);
  }, []);

  const onMouseOver = useCallback(() => {
    setHighlight(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setHighlight(false);
  }, []);

  const onToggleExpanded = useCallback((event) => {
    event.stopPropagation();
    toggleExpanded(nodeKey, expanded);
  }, [nodeKey, expanded, toggleExpanded]);

  const renderChildren = useCallback(() => {
    const { children } = node;
    if (!expanded || !hasChildren || !Array.isArray(children) || children.length === 0) {
      return null;
    }
    return children.map((childNode) => {
      const childNodeKey = getTreeNodeKey(childNode);

      return (
        <Tag
          key={`sidebar-tree-node-${childNodeKey}`}
          node={childNode}
          expanded={checkNodeExpanded(childNodeKey)}
          selectedNodeKey={selectedNodeKey}
          leftIndent={leftIndent + LEFT_INDENT_UNIT}
          currentPath={currentPath}
          checkNodeExpanded={checkNodeExpanded}
          toggleExpanded={toggleExpanded}
          selectNode={selectNode}
        />
      );
    });
  }, [currentPath, node, selectedNodeKey, hasChildren, leftIndent, expanded, checkNodeExpanded, toggleExpanded, selectNode]);

  return (
    <div className="tree-node">
      <div
        className={classnames('tree-node-inner text-nowrap tag-tree-node', { 'tree-node-inner-hover': highlight, 'tree-node-hight-light': isSelected })}
        title={`${tagName} (${tagCount})`}
        aria-label={`${tagName} (${tagCount})`}
        onMouseEnter={onMouseEnter}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
        onClick={() => selectNode(node)}
        tabIndex="0"
        onKeyDown={Utils.onKeyDown}
      >
        <div className="tree-node-text tag-tree-node-text" style={{ paddingLeft: leftIndent + NODE_TEXT_LEFT_INDENT_UNIT }}>
          <div className="tag-tree-node-name">{tagName}</div>
          <div className="tag-tree-node-count">{tagCount}</div>
        </div>
        <div className="left-icon" style={{ left: leftIndent - SIDEBAR_INIT_LEFT_INDENT }}>
          {hasChildren && (
            <span className="folder-toggle-icon" onClick={onToggleExpanded}>
              <Icon symbol="down" className={classnames({ 'rotate-270': !expanded })} />
            </span>
          )}
          <div className="tree-node-icon">
            <div className="tag-tree-node-color" style={{ backgroundColor: tagColor }}></div>
          </div>
        </div>
      </div>
      {hasChildren && renderChildren()}
    </div>
  );
};

Tag.propTypes = {
  tag: PropTypes.object,
  onClick: PropTypes.func,
};

export default Tag;
