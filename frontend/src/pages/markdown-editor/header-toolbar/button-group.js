import React from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';

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
