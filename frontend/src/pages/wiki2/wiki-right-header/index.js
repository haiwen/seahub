import React from 'react';
import PropTypes from 'prop-types';
import PageCover from './page-cover';
import PageTitle from './page-title';

function RightHeader({ currentPageConfig, onUpdatePage }) {

  const props = { currentPageConfig, onUpdatePage };
  return (
    <>
      <PageCover {...props} />
      <PageTitle {...props} />
    </>
  );
}

RightHeader.propTypes = {
  currentPageConfig: PropTypes.object,
  onUpdatePage: PropTypes.func,
};

export default RightHeader;
