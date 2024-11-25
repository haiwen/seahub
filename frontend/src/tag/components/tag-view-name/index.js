import React from 'react';
import PropTypes from 'prop-types';
import { useTags } from '../../hooks';
import { getRowById } from '../../../metadata/utils/table';
import { getTagName } from '../../utils';
import { ALL_TAGS_ID } from '../../constants';
import { gettext } from '../../../utils/constants';
import AllTagsOperationToolbar from './all-tags-operation-toolbar';

const TagViewName = ({ id }) => {
  const { tagsData, context } = useTags();
  if (!id) return null;
  if (id === ALL_TAGS_ID) {
    const canModify = context.canModify();
    if (!canModify) return (<span className="path-item">{gettext('All tags')}</span>);
    const canAddTag = context.canAddTag();
    if (!canAddTag) return (<span className="path-item">{gettext('All tags')}</span>);
    return (<AllTagsOperationToolbar>{gettext('All tags')}</AllTagsOperationToolbar>);
  }
  const tag = getRowById(tagsData, id);
  if (!tag) return null;
  return (<span className="path-item">{getTagName(tag)}</span>);
};

TagViewName.propTypes = {
  id: PropTypes.string,
};

export default TagViewName;
