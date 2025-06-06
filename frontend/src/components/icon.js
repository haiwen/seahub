import PropTypes from 'prop-types';
import classnames from 'classnames';
import '../css/icon.css';

const iconModules = require.context('../assets/icons', false, /\.svg$/);
const icons = {};

iconModules.keys().forEach(key => {
  const iconName = key.replace(/\.\/(.*)\.svg$/, '$1').toLowerCase();
  icons[iconName] = iconModules(key).default;
});

const Icon = (props) => {
  const { className, symbol, style } = props;
  const iconClass = classnames('seafile-multicolor-icon', className, `seafile-multicolor-icon-${symbol}`);
  const IconComponent = icons[symbol];
  if (!IconComponent) {
    return null;
  }
  return <IconComponent className={iconClass} style={style} aria-hidden="true" />;
};

Icon.propTypes = {
  symbol: PropTypes.string.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default Icon;
