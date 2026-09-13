import React from 'react';
import { MetadataViewProvider } from '../hooks/metadata-view';
import View from './view';

import './index.css';

const SeafileMetadata = ({ ...params }) => {
  return (
    <MetadataViewProvider { ...params }>
      <View />
    </MetadataViewProvider>
  );
};

export default SeafileMetadata;
