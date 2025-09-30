import React from 'react';
import PropTypes from 'prop-types';
import { useMetadata } from '../hooks';

const MetadataViewName = ({ id }) => {
  const { idViewMap } = useMetadata();
  const view = idViewMap[id];
  if (!view) return null;
  return (<>{view.name}</>);
};

MetadataViewName.propTypes = {
  id: PropTypes.string.isRequired,
};

export default MetadataViewName;
