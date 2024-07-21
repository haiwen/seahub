import React from 'react';
import PropTypes from 'prop-types';
import { MetadataProvider, CollaboratorsProvider, RecordDetailsProvider } from './hooks/index';
import { Table } from './components/index';

const SeafileMetadata = ({ ...params }) => {

  return (
    <MetadataProvider { ...params }>
      <CollaboratorsProvider >
        <RecordDetailsProvider>
          <Table />
        </RecordDetailsProvider>
      </CollaboratorsProvider>
    </MetadataProvider>
  );
};

SeafileMetadata.propTypes = {
  collaborators: PropTypes.array,
  collaboratorsCache: PropTypes.object,
  updateCollaboratorsCache: PropTypes.func,
};

export default SeafileMetadata;
