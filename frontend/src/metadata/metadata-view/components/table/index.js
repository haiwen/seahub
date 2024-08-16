import React from 'react';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import { useMetadata } from '../../hooks';
import Container from './container';

import './index.css';

const Table = () => {
  const { isLoading } = useMetadata();

  if (isLoading) return (<CenteredLoading />);

  return (<Container />);
};

export default Table;
