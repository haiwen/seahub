import React from 'react';
import PageCover from './page-cover';
import PageTitle from './page-title';

export default function RightHeader({ currentPageConfig, onUpdatePage }) {

  const props = { currentPageConfig, onUpdatePage };
  return (
    <div className='wiki-page-header-wrapper'>
      <PageCover {...props} />
      <PageTitle {...props} />
    </div>
  );
}
