import React from 'react';
import PropTypes from 'prop-types';
import { useMetadata } from '../hooks';

const MetadataViewName = ({ id }) => {
  const { viewsMap } = useMetadata();
  if (!id) return null;
  const view = viewsMap[id];
  if (!view) return null;
  return (<>{view.name}</>);
};

MetadataViewName.propTypes = {
  id: PropTypes.string,
};

export default MetadataViewName;
