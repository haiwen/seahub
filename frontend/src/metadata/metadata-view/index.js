import React from 'react';
import PropTypes from 'prop-types';
import View from './view';
import { MetadataViewProvider } from '../hooks/metadata-view';
import Context from '../context';

const SeafileMetadata = ({ ...params }) => {
  return (
    <MetadataViewProvider { ...params }>
      <View />
    </MetadataViewProvider>
  );
};

SeafileMetadata.propTypes = {
  collaborators: PropTypes.array,
  collaboratorsCache: PropTypes.object,
  updateCollaboratorsCache: PropTypes.func,
};

export default SeafileMetadata;
export {
  Context,
};
