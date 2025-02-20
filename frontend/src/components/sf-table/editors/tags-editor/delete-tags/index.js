import React from './index';
import PropTypes from 'prop-types';
import IconBtn from '../../../../icon-btn';
import { getTagColor, getTagName } from '../../../../../tag/utils/cell';
import { getRowById } from '../../../utils/table';

import './index.css';

const DeleteTag = ({ value, tagsTable, onDelete }) => {
  return (
    <div className="sf-metadata-delete-select-tags">
      {Array.isArray(value) && value.map(tagId => {
        const tag = getRowById(tagsTable, tagId);
        if (!tag) return null;
        const tagName = getTagName(tag);
        const tagColor = getTagColor(tag);
        return (
          <div className="sf-metadata-delete-select-tag" key={tagId}>
            <div className="sf-metadata-delete-select-tag-color" style={{ backgroundColor: tagColor }}></div>
            <div className="sf-metadata-delete-select-tag-name">{tagName}</div>
            <IconBtn className="sf-metadata-delete-select-remove" onClick={(event) => onDelete(tagId, event)} symbol="x-01" />
          </div>
        );
      })}
    </div>
  );
};

DeleteTag.propTypes = {
  value: PropTypes.array,
  tagsTable: PropTypes.object,
  onDelete: PropTypes.func,
};

export default DeleteTag;
