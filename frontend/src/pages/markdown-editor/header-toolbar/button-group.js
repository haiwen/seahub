import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

class ButtonGroup extends React.PureComponent {
  render() {
    return (
      <div className={classnames('btn-group', this.props.className)} role={'group'}>
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
