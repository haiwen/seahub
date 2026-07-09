import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { gettext } from '../../../utils/constants';
import OpIcon from '../../op-icon';

const propTypes = {
  index: PropTypes.number.isRequired,
  permission: PropTypes.object.isRequired,
  onEditCustomPermission: PropTypes.func.isRequired,
  onDeleteCustomPermission: PropTypes.func.isRequired,
};

class CustomPermissionItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlighted: false,
      isShowOperations: false
    };
  }

  onMouseEnter = () => {
    this.setState({
      isHighlighted: true,
      isShowOperations: true
    });
  };

  onMouseOver = () => {
    this.setState({
      isHighlighted: true,
      isShowOperations: true
    });
  };

  onMouseLeave = () => {
    this.setState({
      isHighlighted: false,
      isShowOperations: false
    });
  };

  onEditCustomPermission = () => {
    const { permission } = this.props;
    this.props.onEditCustomPermission(permission);
  };

  onDeleteCustomPermission = () => {
    const { permission } = this.props;
    this.props.onDeleteCustomPermission(permission);
  };

  render() {
    const { isHighlighted, isShowOperations } = this.state;
    const { index, permission } = this.props;
    const { name, description } = permission;
    return (
      <tr
        className={classnames({
          'tr-highlight': isHighlighted
        })}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onMouseOver={this.onMouseOver}
        tabIndex="0"
        onFocus={this.onMouseEnter}
      >
        <td className="text-truncate" title={name}>{name}</td>
        <td className="text-truncate">{description}</td>
        <td>
          {isShowOperations && (
            <Fragment>
              <OpIcon
                id={`edit-icon-${index}`}
                symbol="rename"
                className="op-icon"
                tooltip={gettext('Edit')}
                op={this.onEditCustomPermission}
              />
              <OpIcon
                id={`delete-icon-${index}`}
                symbol="delete1"
                className="op-icon"
                tooltip={gettext('Delete')}
                op={this.onDeleteCustomPermission}
              />
            </Fragment>
          )}
        </td>
      </tr>
    );
  }
}

CustomPermissionItem.propTypes = propTypes;

export default CustomPermissionItem;
