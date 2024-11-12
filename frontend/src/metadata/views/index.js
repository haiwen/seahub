import React from 'react';
import View from './view';
import { MetadataViewProvider } from '../hooks/metadata-view';

import './index.css';

const SeafileMetadata = ({ ...params }) => {
  return (
    <MetadataViewProvider { ...params }>
      <View />
    </MetadataViewProvider>
  );
};

export default SeafileMetadata;
