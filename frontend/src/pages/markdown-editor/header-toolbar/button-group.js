import React from 'react';
import PropTypes from 'prop-types';

class ButtonGroup extends React.PureComponent {
  render() {
    return (
      <div className={'btn-group ' + this.props.className} role={'group'}>
        {this.props.children}
      </div>
    );
  }
}

ButtonGroup.propTypes = {
  className: PropTypes.string,
  children: PropTypes.any.isRequired,
};

export default ButtonGroup;
