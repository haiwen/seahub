import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Loading from '../loading';

import './index.css';

function CenteredLoading(props) {
  return (
    <div className={classnames('sf-centered-loading', props.className)}>
      <Loading />
    </div>
  );
}

CenteredLoading.propTypes = {
  className: PropTypes.string,
};

export default CenteredLoading;
