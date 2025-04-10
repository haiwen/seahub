import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import { getTagColor, getTagId, getTagName } from '../../../tag/utils/cell';
import { PRIVATE_FILE_TYPE } from '../../../constants';
import { EVENT_BUS_TYPE } from '../../../metadata/constants';

import './index.css';

const SearchTags = ({ repoID, data, keyword, onSelectTag }) => {
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
    if (!data || !keyword) return;
    const tags = data?.filter((tag) => getTagName(tag).toLowerCase().includes(keyword.toLowerCase()));
    setDisplayTags(tags);
  }, [data, keyword]);

  if (!data || !keyword || displayTags.length === 0) return null;

  return (
    <div className="search-tags-container">
      <div className="tags-title">{gettext('Tags')}</div>
      <div className="tags-content">
        {displayTags.map((tag) => {
          const tagId = getTagId(tag);
          const tagName = getTagName(tag);
          const tagColor = getTagColor(tag);
          return (
            <div className="tag-item" key={tagId} onClick={(e) => handleClick(e, tagId)}>
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
  data: PropTypes.object.isRequired,
};

export default SearchTags;
