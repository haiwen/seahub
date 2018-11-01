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
    let operation = this.props.item;
    let operationMessage = gettext(operation);
    return (
      <Fragment>
        {
          operation !== 'Divider' ?
            <li className="dropdown-item operation-menu-item" data-type={operation} onClick={this.onClick}>
              <span className="user-select-none" data-type={operation} title={operationMessage} aria-label={operationMessage}>{operationMessage}</span>
            </li> :
            <li className="dropdown-divider"></li>
        }
      </Fragment>
    );
  }
}

DirentMenuItem.propTypes = propTypes;

export default DirentMenuItem;
