import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
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
    const { isHighlighted } = this.state;
    const { permission } = this.props;
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
        <td width='22%' className="text-truncate" title={name}>{name}</td>
        <td width='56%' className="text-truncate">{description}</td>
        <td width='22%'>
          {this.state.isShowOperations && (
            <Fragment>
              <OpIcon
                symbol="rename"
                className="op-icon"
                title={gettext('Edit')}
                op={this.onEditCustomPermission}
              />
              <OpIcon
                symbol="delete1"
                className="op-icon"
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
