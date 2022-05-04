import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import OpIcon from '../../op-icon';

const propTypes = {
  permission: PropTypes.object.isRequired,
  onEditCustomPermission: PropTypes.func.isRequired,
  onDeleteCustomPermission: PropTypes.func.isRequired,
};

class CustomPermissionItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowOperations: false
    };
  }

  onMouseEnter = () => {
    this.setState({isShowOperations: true});
  }

  onMouseOver = () => {
    this.setState({isShowOperations: true});
  }

  onMouseLeave = () => {
    this.setState({isShowOperations: false});
  }

  onEditCustomPermission = () => {
    const { permission } = this.props;
    this.props.onEditCustomPermission(permission);
  }

  onDeleteCustomPermission = () => {
    const { permission } = this.props;
    this.props.onDeleteCustomPermission(permission);
  }

  render() {
    const { permission } = this.props;
    const { id, name, description } = permission;
    return (
      <tr key={id} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onMouseOver={this.onMouseOver} tabIndex="0" onFocus={this.onMouseEnter}>
        <td width='22%' className="text-truncate" title={name}>{name}</td>
        <td width='56%' className="text-truncate">{description}</td>
        <td width='22%'>
          {this.state.isShowOperations && (
            <Fragment>
              <OpIcon
                className="fa fa-pencil-alt attr-action-icon"
                title={gettext('Edit')}
                op={this.onEditCustomPermission}
              />
              <OpIcon
                className="fa fa-trash attr-action-icon"
                title={gettext('Delete')}
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
