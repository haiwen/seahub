import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import '../css/icon.css';

const importAll = (requireContext) => {
  requireContext.keys().forEach(requireContext);
};
try {
  importAll(require.context('../assets/icons', true, /\.svg$/));
} catch (error) {
  // eslint-disable-next-line no-console
  console.log(error);
}

const Icon = (props) => {
  const { className, symbol, style } = props;
  const iconClass = classnames('seafile-multicolor-icon', className, `seafile-multicolor-icon-${symbol}`);
  return (
    <svg className={iconClass} style={style}>
      <use xlinkHref={`#${symbol}`} />
    </svg>
  );
};

Icon.propTypes = {
  symbol: PropTypes.string.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default Icon;
