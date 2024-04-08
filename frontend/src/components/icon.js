import React from 'react';
import PropTypes from 'prop-types';
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
  const { className, symbol } = props;
  const iconClass = `seafile-multicolor-icon seafile-multicolor-icon-${symbol} ${className || ''}`;
  return (
    <svg className={iconClass}>
      <use xlinkHref={`#${symbol}`} />
    </svg>
  );
};

Icon.propTypes = {
  symbol: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default Icon;
