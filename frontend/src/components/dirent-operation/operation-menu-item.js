import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

const propTypes = {
  item: PropTypes.string.isRequired,
  onItemClick: PropTypes.func.isRequired,
};

class OperationMenuItem extends React.Component {

  onClick = (e) => {
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
              <span className="user-select-none" title={operationName} aria-label={operationName}>{operationName}</span>
            </li> :
            <li className="dropdown-item menu-inner-divider"></li>
        }
      </Fragment>
    );
  }
}

OperationMenuItem.propTypes = propTypes;

export default OperationMenuItem;
