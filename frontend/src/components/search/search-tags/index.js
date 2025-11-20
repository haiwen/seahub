import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import { getTagColor, getTagId, getTagName } from '../../../tag/utils/cell';
import { PRIVATE_FILE_TYPE } from '../../../constants';
import { EVENT_BUS_TYPE } from '../../common/event-bus-type';
import { Utils } from '../../../utils/utils';

import './index.css';

const SearchTags = ({ repoID, tagsData, keyword, onSelectTag }) => {
  const [displayTags, setDisplayTags] = useState([]);

  const handleClick = useCallback((e, tagId) => {
    e.preventDefault();
    e.stopPropagation();

    const node = {
      children: [],
      path: '/' + PRIVATE_FILE_TYPE.TAGS_PROPERTIES + '/' + tagId,
      isExpanded: false,
      isLoaded: true,
      isPreload: true,
      object: {
        file_tags: [],
        id: tagId,
        type: PRIVATE_FILE_TYPE.TAGS_PROPERTIES,
        isDir: () => false,
      },
      parentNode: {},
      key: repoID,
      tag_id: tagId,
    };
    onSelectTag(node);
    window.sfTagsDataContext?.eventBus?.dispatch(EVENT_BUS_TYPE.UPDATE_SELECTED_TAG, tagId);
  }, [repoID, onSelectTag]);

  useEffect(() => {
    if (!tagsData || tagsData.length === 0 || !keyword) return;
    const tags = tagsData?.filter((tag) => getTagName(tag).toLowerCase().includes(keyword.toLowerCase()));
    setDisplayTags(tags);
  }, [tagsData, keyword]);

  if (!tagsData || tagsData.length === 0 || !keyword || displayTags.length === 0) return null;

  return (
    <div className="search-tags-container">
      <div className="tags-title">{gettext('Tags')}</div>
      <div className="tags-content">
        {displayTags.map((tag) => {
          const tagId = getTagId(tag);
          const tagName = getTagName(tag);
          const tagColor = getTagColor(tag);
          return (
            <div
              className="tag-item"
              key={tagId}
              onClick={(e) => handleClick(e, tagId)}
              tabIndex={0}
              role="button"
              aria-label={gettext('Edit tag')}
              onKeyDown={Utils.onKeyDown}
            >
              <div className="tag-color" style={{ backgroundColor: tagColor }} />
              <div className="tag-name">{tagName}</div>
            </div>
          );
        })}
      </div>
      <div className="search-tags-divider" />
    </div>
  );
};

SearchTags.propTypes = {
  tagsData: PropTypes.array.isRequired,
};

export default SearchTags;
