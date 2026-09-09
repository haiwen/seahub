import React from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';
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
