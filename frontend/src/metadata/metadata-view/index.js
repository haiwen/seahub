import React from 'react';
import PropTypes from 'prop-types';
import { MetadataProvider } from './hooks';
import { View, DetailEditor, CellFormatter } from './components';
import Context from './context';

const SeafileMetadata = ({ ...params }) => {
  return (
    <MetadataProvider { ...params }>
      <View />
    </MetadataProvider>
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
  DetailEditor,
  CellFormatter,
};
