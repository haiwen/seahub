import React from 'react';
import PropTypes from 'prop-types';
import { useMetadata } from './hooks';

const MetadataViewId2Name = ({ id }) => {
  const { viewsMap } = useMetadata();
  if (!id) return null;
  const view = viewsMap[id];
  if (!view) return null;
  return (<>{view.name}</>);
};

MetadataViewId2Name.propTypes = {
  id: PropTypes.string,
};

export default MetadataViewId2Name;
