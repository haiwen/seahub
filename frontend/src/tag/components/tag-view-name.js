import React from 'react';
import PropTypes from 'prop-types';
import { useTags } from '../hooks';
import { getRowById } from '../../metadata/utils/table';
import { getTagName } from '../utils';
import { TAG_MANAGEMENT_ID } from '../constants';
import { gettext } from '../../utils/constants';

const TagViewName = ({ id }) => {
  const { tagsData } = useTags();
  if (!id) return null;
  if (id === TAG_MANAGEMENT_ID) return gettext('Tags management');
  const tag = getRowById(tagsData, id);
  if (!tag) return null;
  return (<>{getTagName(tag)}</>);
};

TagViewName.propTypes = {
  id: PropTypes.string,
};

export default TagViewName;
