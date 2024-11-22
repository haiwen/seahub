import React from 'react';
import { TagViewProvider } from '../hooks';
import View from './view';
import TagsManagement from './tags-management';
import { TAG_MANAGEMENT_ID } from '../constants';

const Views = ({ ...params }) => {
  if (params.tagID === TAG_MANAGEMENT_ID) {
    return (<TagsManagement { ...params } />);
  }

  return (
    <TagViewProvider { ...params }>
      <View />
    </TagViewProvider>
  );
};

export default Views;
