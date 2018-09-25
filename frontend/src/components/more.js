import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  clickToShowMore: PropTypes.func.isRequired
};

class More extends React.Component {

  render() {
    return (
      <li className="list-show-more" onClick={this.props.clickToShowMore}>
        <span className="more-message">show more</span>
        <i className="more-icon fas fa-chevron-down"></i>
      </li>
    )
  }
}

More.propTypes = propTypes;

export default More;
