import React, { useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTags } from '../hooks';
import Tag from './tag';
import { getTagId, getTagName } from '../utils';
import { PRIVATE_FILE_TYPE } from '../../constants';
import { gettext, mediaUrl } from '../../utils/constants';
import { getRowById } from '../../metadata/utils/table';
import AllTags from './all-tags';
import { PRIVATE_COLUMN_KEY, ALL_TAGS_ID } from '../constants';

const updateFavicon = () => {
  const favicon = document.getElementById('favicon');
  if (favicon) {
    favicon.href = `${mediaUrl}favicons/favicon.png`;
  }
};

const TagsTreeView = ({ userPerm, currentPath }) => {
  const originalTitle = useRef('');

  const { tagsData, selectTag } = useTags();

  const tags = useMemo(() => {
    if (!tagsData) return [];
    return tagsData.rows;
  }, [tagsData]);

  const canUpdate = useMemo(() => {
    if (userPerm !== 'rw' && userPerm !== 'admin') return false;
    return true;
  }, [userPerm]);

  useEffect(() => {
    originalTitle.current = document.title;
  }, []);

  useEffect(() => {
    const { origin, pathname, search } = window.location;
    const urlParams = new URLSearchParams(search);
    const tagId = urlParams.get('tag');
    if (tagId) {
      if (tagId === ALL_TAGS_ID) {
        if (!canUpdate) return;
        selectTag({ [PRIVATE_COLUMN_KEY.ID]: ALL_TAGS_ID });
        return;
      }

      const lastOpenedTag = getRowById(tagsData, tagId);
      if (lastOpenedTag) {
        selectTag(lastOpenedTag);
        const lastOpenedTagName = getTagName(lastOpenedTag);
        document.title = `${lastOpenedTagName} - Seafile`;
        updateFavicon();
        return;
      }
      const url = `${origin}${pathname}`;
      window.history.pushState({ url: url, path: '' }, '', url);
    }
    updateFavicon();
    document.title = originalTitle.current;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentPath.includes('/' + PRIVATE_FILE_TYPE.TAGS_PROPERTIES + '/')) return;
    const currentTagId = currentPath.split('/').pop();
    if (currentTagId === ALL_TAGS_ID) {
      if (!canUpdate) return;
      document.title = `${gettext('All tags')} - Seafile`;
      return;
    }
    const currentTag = getRowById(tagsData, currentTagId);
    if (currentTag) {
      const tagName = getTagName(currentTag);
      document.title = `${tagName} - Seafile`;
      updateFavicon('default');
      return;
    }
    document.title = originalTitle;
    updateFavicon('default');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, tagsData]);

  return (
    <div className="tree-view tree metadata-tree-view">
      <div className="tree-node">
        <div className="children">
          {tags.slice(0, 20).map(tag => {
            const id = getTagId(tag);
            const tagPath = '/' + PRIVATE_FILE_TYPE.TAGS_PROPERTIES + '/' + id;
            const isSelected = currentPath === tagPath;
            return (
              <Tag
                key={id}
                tag={tag}
                isSelected={isSelected}
                onClick={(tag) => selectTag(tag, isSelected)}
              />
            );
          })}
          <AllTags currentPath={currentPath} />
        </div>
      </div>
    </div>
  );

};

TagsTreeView.propTypes = {
  userPerm: PropTypes.string,
  currentPath: PropTypes.string,
};

export default TagsTreeView;
