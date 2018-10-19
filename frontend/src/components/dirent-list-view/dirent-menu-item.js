import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

const propTypes = {
  item: PropTypes.string.isRequired,
  onItemClick: PropTypes.func.isRequired,
};

class DirentMenuItem extends React.Component {

  onClick = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    let operation = e.target.dataset.type;
    this.props.onItemClick(operation);
  }

  render() {
    let operationName = gettext(this.props.item);
    return (
      <Fragment>
        {
          operationName !== 'Divider' ?
            <li className="dropdown-item operation-menu-item" data-type={operationName} onClick={this.onClick}>
              <span className="user-select-none" data-type={operationName} title={operationName} aria-label={operationName}>{operationName}</span>
            </li> :
            <li className="dropdown-divider"></li>
        }
      </Fragment>
    );
  }
}

DirentMenuItem.propTypes = propTypes;

export default DirentMenuItem;
