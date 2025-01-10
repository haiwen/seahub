import React from 'react';
import PropTypes from 'prop-types';
import { GALLERY_DATE_MODE } from '../../constants';
import { gettext } from '../../../utils/constants';
import RadioGroup from '../radio-group';

const DATE_MODES = [
  { value: GALLERY_DATE_MODE.YEAR, label: gettext('Year') },
  { value: GALLERY_DATE_MODE.MONTH, label: gettext('Month') },
  { value: GALLERY_DATE_MODE.DAY, label: gettext('Day') },
  { value: GALLERY_DATE_MODE.ALL, label: gettext('All') },
];

const GalleryGroupBySetter = ({ mode, onGroupByChange }) => {
  return (<RadioGroup value={mode} options={DATE_MODES} onChange={onGroupByChange} />);
};

GalleryGroupBySetter.propTypes = {
  mode: PropTypes.string,
  onGroupByChange: PropTypes.func,
};

export default GalleryGroupBySetter;
