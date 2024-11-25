import React from 'react';
import { TagViewProvider } from '../hooks';
import View from './view';
import AllTags from './all-tags';
import { ALL_TAGS_ID } from '../constants';

const Views = ({ ...params }) => {
  if (params.tagID === ALL_TAGS_ID) {
    return (<AllTags { ...params } />);
  }

  return (
    <TagViewProvider { ...params }>
      <View />
    </TagViewProvider>
  );
};

export default Views;
