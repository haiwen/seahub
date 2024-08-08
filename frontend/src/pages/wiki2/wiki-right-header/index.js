import React from 'react';
import PropTypes from 'prop-types';
import PageCover from './page-cover';
import PageTitle from './page-title';

function RightHeader({ isUpdateBySide, currentPageConfig, onUpdatePage }) {

  const props = { isUpdateBySide, currentPageConfig, onUpdatePage };
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
  onUpdatePage: PropTypes.func,
};

export default RightHeader;
