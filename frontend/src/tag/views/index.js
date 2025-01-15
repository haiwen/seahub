import React from 'react';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import { TagViewProvider, useTags } from '../hooks';
import View from './view';
import AllTags from './all-tags';
import { ALL_TAGS_ID } from '../constants';

const Views = ({ ...params }) => {
  const { isLoading } = useTags();
  if (isLoading) return (<CenteredLoading />);

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
