import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../icon';

const propTypes = {
  intent: PropTypes.string.isRequired,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  onRemove: PropTypes.func.isRequired,
  children: PropTypes.string,
  isRemovable: PropTypes.bool,
};

class Alert extends React.PureComponent {

  getIconSymbol(intent) {
    switch (intent) {
      case 'success':
        return 'check-circle';
      case 'warning':
        return 'exclamation-triangle';
      case 'none':
        return 'exclamation-circle';
      case 'danger':
        return 'exclamation-circle';
      case 'notify-in-progress':
        return null; // special case for loading
      default:
        return 'check-circle';
    }
  }

  render() {
    const { intent, title, children, isRemovable, onRemove } = this.props;
    const iconSymbol = this.getIconSymbol(intent);
    const isLoading = intent === 'notify-in-progress';

    return (
      <div className={`seahub-toast-alert-container ${intent || 'success'}`}>
        <div className="toast-alert-icon d-flex align-items-center justify-content-center">
          {isLoading ? <i className="loading-icon" /> : <Icon symbol={iconSymbol} />}
        </div>
        <div className="toast-text-container">
          <p className="toast-text-title">{title}</p>
          {children && <p className="toast-text-child">{children}</p>}
        </div>
        {isRemovable && (
          <div onClick={onRemove} className="toast-close">
            <span>&times;</span>
          </div>
        )}
      </div>
    );
  }
}

Alert.propTypes = propTypes;

export default Alert;
