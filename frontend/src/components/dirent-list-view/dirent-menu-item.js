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

  translateOperation = (operation) => {
    let translateOperation = '';
    switch(operation) {
      case 'Rename':
        translateOperation = gettext('Rename');
        break;
      case 'Move':
        translateOperation = gettext('Move');
        break;
      case 'Copy':
        translateOperation = gettext('Copy');
        break;
      case 'Permission':
        translateOperation = gettext('Permission');
        break;
      case 'Details':
        translateOperation = gettext('Details');
        break;
      case 'Unlock':
        translateOperation = gettext('Unlock');
        break;
      case 'Lock':
        translateOperation = gettext('Lock');
        break;
      case 'New Draft':
        translateOperation = gettext('New Draft');
        break;
      case 'Comment':
        translateOperation = gettext('Comment');
        break;
      case 'History':
        translateOperation = gettext('History');
        break;
      case 'Access Log':
        translateOperation = gettext('Access Log');
        break;
      case 'Open via Client':
        translateOperation = gettext('Open via Client');
        break;
      default:
        break;
    }
    return translateOperation;
  }

  render() {
    let operation = this.props.item;
    let operationMessage = this.translateOperation(operation);
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
