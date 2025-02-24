import React from 'react';
import CenteredLoading from '../../components/centered-loading';
import View from './view';
import AllTags from './all-tags';
import { TagViewProvider, useTags } from '../hooks';
import { ALL_TAGS_ID } from '../constants';

const Views = ({ ...params }) => {
  const { isLoading, displayNodeKey } = useTags();
  if (isLoading) return (<CenteredLoading />);

  if (params.tagID === ALL_TAGS_ID) {
    return (<AllTags { ...params } />);
  }

  return (
    <TagViewProvider { ...params } nodeKey={displayNodeKey}>
      <View />
    </TagViewProvider>
  );
};

export default Views;
