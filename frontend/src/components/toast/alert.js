import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  intent: PropTypes.string.isRequired,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  onRemove: PropTypes.func.isRequired,
  children: PropTypes.string,
  isRemovable: PropTypes.bool,
};

class Alert extends React.PureComponent {

  getIconClass(intent) {
    switch (intent) {
      case 'success':
        return 'fa fa-check-circle';
      case 'warning':
        return 'fa fa-exclamation-triangle';
      case 'none':
        return 'fa fa-exclamation-circle';
      case 'danger':
        return 'fa fa-exclamation-circle';
      default:
        return 'fa fa-check-circle';
    }
  }

  render() {
    const { intent, title, children, isRemovable, onRemove } = this.props;
    const iconClass = this.getIconClass(intent);
    return (
      <div className={`seahub-toast-alert-container ${intent || 'success'}`}>
        <div className="toast-alert-icon">
          <i className={iconClass} />
        </div>
        <div className="toast-text-container">
          <p className="toast-text-title">{title}</p>
          {children ? <p className="toast-text-child">{children}</p> : null}
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
