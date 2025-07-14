import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Icon from '../../../../components/icon';

import './index.css';

const RateFormatter = ({ value, data, className, children: emptyFormatter }) => {
  if (!value) return emptyFormatter || null;

  const { max = 5, color = '#eee', type = 'rate' } = data || {};
  const validValue = Math.min(max, value);
  let rateList = [];
  for (let i = 0; i < validValue; i++) {
    rateList.push(
      <div className="sf-metadata-rate-item" style={{ fill: color || '#eee' }} key={i}>
        <Icon symbol={type} />
      </div>
    );
  }

  return (
    <div className={classnames('sf-metadata-ui cell-formatter-container rate-formatter', className)}>
      {rateList}
    </div>
  );
};

RateFormatter.propTypes = {
  value: PropTypes.number,
  data: PropTypes.object,
  className: PropTypes.string,
  children: PropTypes.any,
};

export default RateFormatter;
