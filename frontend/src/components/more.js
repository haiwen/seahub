import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';

const propTypes = {
  onShowMore: PropTypes.func.isRequired
};

class More extends React.Component {

  render() {
    return (
      <li className="list-show-more" onClick={this.props.onShowMore}>
        <span className="more-message">{gettext('show more')}</span>
      </li>
    );
  }
}

More.propTypes = propTypes;

export default More;
