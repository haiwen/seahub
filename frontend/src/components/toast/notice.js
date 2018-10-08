import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  type: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
};

class Notice extends React.Component {
  render() {
    let { type, content } = this.props;
    return (
      <div className="toast-notice">
        <span className={`alert alert-${type}`}>{content}</span>
      </div>
    )
  }
}

Notice.propTypes = propTypes;

export default Notice;
