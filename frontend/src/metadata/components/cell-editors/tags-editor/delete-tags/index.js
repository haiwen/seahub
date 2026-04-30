import React from './index';
import PropTypes from 'prop-types';
import OpIcon from '@/components/op-icon';
import { getRowById } from '../../../../../components/sf-table/utils/table';
import { getTagColor, getTagName } from '../../../../../tag/utils/cell';
import { Utils } from '../../../../../utils/utils';
import { gettext } from '../../../../../utils/constants';

import './index.css';

const DeleteTag = ({ value, tags, onDelete }) => {
  return (
    <div className="sf-metadata-delete-select-tags">
      {Array.isArray(value) && value.map((tagId, idx) => {
        const tag = getRowById(tags, tagId);
        if (!tag) return null;
        const tagName = getTagName(tag);
        const tagColor = getTagColor(tag);
        return (
          <div className="sf-metadata-delete-select-tag" key={tagId}>
            <div className="sf-metadata-delete-select-tag-color" style={{ backgroundColor: tagColor }}></div>
            <div className="sf-metadata-delete-select-tag-name">{tagName}</div>
            <OpIcon
              id={`remove-tag-icon-${idx}`}
              symbol="close"
              className="sf-metadata-delete-select-remove"
              tooltip={gettext('Remove')}
              aria-label={gettext('Delete')}
              op={(event) => onDelete(tagId, event)}
              onKeyDown={Utils.onKeyDown}
            />
          </div>
        );
      })}
    </div>
  );
};

DeleteTag.propTypes = {
  value: PropTypes.array,
  tags: PropTypes.object,
  onDelete: PropTypes.func,
};

export default DeleteTag;
