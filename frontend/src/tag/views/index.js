import React from 'react';
import CenteredLoading from '../../components/centered-loading';
import { ALL_TAGS_ID } from '../constants';
import { TagViewProvider, useTags } from '../hooks';
import AllTags from './all-tags';
import View from './view';

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
