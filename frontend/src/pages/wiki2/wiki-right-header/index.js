import React from 'react';
import PropTypes from 'prop-types';
import PageCover from './page-cover';
import PageTitle from './page-title';

function RightHeader({ isUpdateBySide, currentPageConfig, onUpdatePageConfig }) {

  const props = { isUpdateBySide, currentPageConfig, onUpdatePageConfig };
  return (
    <>
      <PageCover {...props} />
      <PageTitle {...props} />
    </>
  );
}

RightHeader.propTypes = {
  isUpdateBySide: PropTypes.bool,
  currentPageConfig: PropTypes.object,
  onUpdatePageConfig: PropTypes.func,
};

export default RightHeader;
