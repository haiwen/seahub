import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Icon } from '@seafile/sf-metadata-ui-component';
import { getTagColor, getTagId, getTagName } from '../../../utils';
import { debounce } from '../../../../metadata/utils/common';

const Tags = ({ tags, deletable, selectable, idTagSelectedMap, selectTag, deleteTag }) => {

  const clickTag = debounce((tag) => {
    if (!selectable) return;
    selectTag && selectTag(tag);
  }, 200);

  const remove = useCallback((tagId) => {
    if (!deletable) return;
    deleteTag && deleteTag(tagId);
  }, [deletable, deleteTag]);

  return (
    <div className={classnames('sf-metadata-editing-tags-list', { 'selectable': selectable })}>
      {tags.map((tag) => {
        const tagId = getTagId(tag);
        const tagName = getTagName(tag);
        const tagColor = getTagColor(tag);
        return (
          <div className="sf-metadata-editing-tag" key={`sf-metadata-editing-tag-${tagId}`} onClick={() => clickTag(tag)}>
            <div className="sf-metadata-editing-tag-container pl-2">
              <div className="sf-metadata-editing-tag-color-name">
                <div className="sf-metadata-tag-color" style={{ backgroundColor: tagColor }}></div>
                <div className="sf-metadata-tag-name">{tagName}</div>
              </div>
              <div className="sf-metadata-editing-tag-operations">
                {deletable && <div className="sf-metadata-editing-tag-operation sf-metadata-editing-tag-delete" onClick={() => remove(tagId)}><Icon iconName="close" className="sf-metadata-editing-tag-delete-icon" /></div>}
                {(selectable && idTagSelectedMap && idTagSelectedMap[tagId]) && <div className="sf-metadata-editing-tag-operation sf-metadata-editing-tag-selected"><Icon iconName="check-mark" className="sf-metadata-editing-tag-selected-icon" /></div>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

Tags.propTypes = {
  tags: PropTypes.array,
  deletable: PropTypes.bool,
  selectable: PropTypes.bool,
  selectTag: PropTypes.func,
  deleteTag: PropTypes.func,
};

export default Tags;
