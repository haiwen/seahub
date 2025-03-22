import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { getTagColor, getTagId, getTagName } from '../../../../../tag/utils/cell';
import { NODE_CONTENT_LEFT_INDENT, NODE_ICON_LEFT_INDENT } from '../../../../../components/sf-table/constants/tree';
import Icon from '../../../../../components/icon';

import './index.css';

const TagItem = ({
  node,
  tag,
  isSelected,
  highlight,
  onSelect,
  onMouseEnter,
  onMouseLeave,
  depth = 0,
  hasChildren = false,
  isFolded = false,
  onToggleExpand
}) => {
  const tagId = getTagId(tag);
  const tagName = getTagName(tag);
  const tagColor = getTagColor(tag);
  const paddingLeft = node ? NODE_CONTENT_LEFT_INDENT + NODE_ICON_LEFT_INDENT * depth : 8;

  return (
    <div className="sf-metadata-tags-editor-tag-item">
      <div
        className={classNames('sf-metadata-tags-editor-tag-container', {
          'sf-metadata-tags-editor-tag-container-highlight': highlight,
        })}
        style={{ paddingLeft }}
        onMouseDown={!node ? () => onSelect(tagId) : () => {}}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {hasChildren && (
          <span
            className="sf-metadata-tags-editor-tree-expand-icon"
            style={{ left: depth * NODE_ICON_LEFT_INDENT }}
            onClick={onToggleExpand}
          >
            <i className={classNames('sf3-font sf3-font-down', { 'rotate-270': isFolded })}></i>
          </span>
        )}
        <div className="sf-metadata-tag-color-and-name" onClick={node ? () => onSelect(tagId) : () => {}}>
          <div className="sf-metadata-tag-color" style={{ backgroundColor: tagColor }} />
          <div className="sf-metadata-tag-name">{tagName}</div>
        </div>
        <div className="sf-metadata-tags-editor-tag-check-icon">
          {isSelected && <Icon className="sf-metadata-icon" symbol="check-mark" />}
        </div>
      </div>
    </div>
  );
};

TagItem.propTypes = {
  node: PropTypes.object,
  tag: PropTypes.object,
  isSelected: PropTypes.bool,
  highlight: PropTypes.bool,
  onSelect: PropTypes.func,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
  depth: PropTypes.number,
  hasChildren: PropTypes.bool,
  isFolded: PropTypes.bool,
  onToggleExpand: PropTypes.func,
};

export default TagItem;
