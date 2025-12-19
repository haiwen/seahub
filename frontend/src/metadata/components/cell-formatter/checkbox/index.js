import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Icon from '../../../../components/icon';

import './index.css';

const CheckboxFormatter = ({ value, className, children: emptyFormatter }) => {
  if (!value) return emptyFormatter;
  return (
    <div className={classnames('sf-metadata-ui cell-formatter-container checkbox-formatter', className)}>
      <Icon symbol="check"/>
    </div>
  );
};

CheckboxFormatter.propTypes = {
  value: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.any,
};

export default CheckboxFormatter;
