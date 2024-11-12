import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTags } from '../hooks';
import Tag from './tag';
import { getTagId, getTagName } from '../utils';
import { PRIVATE_FILE_TYPE } from '../../constants';
import { mediaUrl } from '../../utils/constants';
import { getRowById } from '../../metadata/utils/table';
import TagsManagement from './tags-management';
import { PRIVATE_COLUMN_KEY, TAG_MANAGEMENT_ID } from '../constants';

const updateFavicon = () => {
  const favicon = document.getElementById('favicon');
  if (favicon) {
    favicon.href = `${mediaUrl}favicons/favicon.png`;
  }
};

const TagsTreeView = ({ userPerm, currentPath }) => {
  const originalTitle = useRef('');

  const { tagsData, selectTag, deleteTags, duplicateTag, updateTag } = useTags();

  const tags = useMemo(() => {
    if (!tagsData) return [];
    return tagsData.rows;
  }, [tagsData]);

  const canUpdate = useMemo(() => {
    if (userPerm !== 'rw' && userPerm !== 'admin') return false;
    return true;
  }, [userPerm]);

  const deleteTag = useCallback((tagId, isSelected) => {
    if (isSelected) {
      const currentTagIndex = tagsData.row_ids.indexOf(tagId);
      const lastTagId = tagsData.row_ids[currentTagIndex - 1];
      const lastTag = getRowById(tagsData, lastTagId);
      selectTag(lastTag);
    }
    deleteTags([tagId]);
  }, [tagsData, deleteTags, selectTag]);

  useEffect(() => {
    originalTitle.current = document.title;
  }, []);

  useEffect(() => {
    const { origin, pathname, search } = window.location;
    const urlParams = new URLSearchParams(search);
    const tagId = urlParams.get('tag');
    if (tagId) {
      if (tagId === TAG_MANAGEMENT_ID) {
        if (!canUpdate) return;
        selectTag({ [PRIVATE_COLUMN_KEY.ID]: TAG_MANAGEMENT_ID });
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

  return (
    <div className="tree-view tree metadata-tree-view">
      <div className="tree-node">
        <div className="children">
          {tags.map(tag => {
            const id = getTagId(tag);
            const tagPath = '/' + PRIVATE_FILE_TYPE.TAGS_PROPERTIES + '/' + id;
            const isSelected = currentPath === tagPath;
            return (
              <Tag
                key={id}
                tag={tag}
                tags={tags}
                userPerm={userPerm}
                isSelected={isSelected}
                onClick={(tag) => selectTag(tag, isSelected)}
                onDelete={() => deleteTag(id, isSelected)}
                onCopy={() => duplicateTag(id)}
                onUpdateTag={updateTag}
              />
            );
          })}
          {canUpdate && (<TagsManagement currentPath={currentPath} />)}
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
