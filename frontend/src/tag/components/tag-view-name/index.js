import React from 'react';
import PropTypes from 'prop-types';
import { useTags } from '../../hooks';
import { getRowById } from '../../../components/sf-table/utils/table';
import { getTagName } from '../../utils/cell';
import { ALL_TAGS_ID } from '../../constants';
import { gettext } from '../../../utils/constants';
import AllTagsOperationToolbar from './all-tags-operation-toolbar';
import { EVENT_BUS_TYPE } from '../../../metadata/constants';

const TagViewName = ({ id, canSelectAllTags }) => {
  const { tagsData, context } = useTags();

  const selectAllTags = () => {
    window.sfTagsDataContext.eventBus.dispatch(EVENT_BUS_TYPE.RELOAD_DATA);
  };

  if (!id) return null;
  if (id === ALL_TAGS_ID) {
    if (canSelectAllTags) {
      return (
        <span className="path-item" role="button" onClick={selectAllTags}>{gettext('All tags')}</span>
      );
    }

    const canModify = context.canModify();
    const canAddTag = context.canAddTag();
    if (!canModify || !canAddTag) {
      return (
        <span className="path-item path-item-read-only">{gettext('All tags')}</span>
      );
    }
    return (
      <AllTagsOperationToolbar/>
    );
  }
  const tag = getRowById(tagsData, id);
  if (!tag) return null;
  return (
    <span className="path-item path-item-read-only">{getTagName(tag)}</span>
  );
};

TagViewName.propTypes = {
  id: PropTypes.string,
  canSelectAllTags: PropTypes.bool,
};

export default TagViewName;
