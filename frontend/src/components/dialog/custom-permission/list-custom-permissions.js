import React from 'react';
import PropTypes from 'prop-types';
import CustomPermissionItem from './custom-permission-item';
import { gettext } from '../../../utils/constants';

const propTypes = {
  permissions: PropTypes.array.isRequired,
  onAddCustomPermission: PropTypes.func.isRequired,
  onEditCustomPermission: PropTypes.func.isRequired,
  onDeleteCustomPermission: PropTypes.func.isRequired,
};

class ListCustomPermissions extends React.Component {

  render() {
    const { permissions } = this.props;

    return (
      <div className="custom-permission">
        <div className="permission-header">
          <div className="title">{gettext('Permission')}</div>
          <div className="operation">
            <button type="button" className="btn btn-outline-primary" onClick={this.props.onAddCustomPermission}>{gettext('Add permission')}</button>
          </div>
        </div>
        <div className="permission-main mt-4">
          <table className="permissions-list-header">
            <thead>
              <tr>
                <th width='22%'>{gettext('Permission name')}</th>
                <th width='56%'>{gettext('Description')}</th>
                <th width='22%'></th>
              </tr>
            </thead>
          </table>
          <div className="permissions-list-body">
            <table>
              <tbody>
                {permissions.map(permission => {
                  return (
                    <CustomPermissionItem
                      key={permission.id} 
                      permission={permission}
                      onEditCustomPermission={this.props.onEditCustomPermission}
                      onDeleteCustomPermission={this.props.onDeleteCustomPermission}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
}

ListCustomPermissions.propTypes = propTypes;

export default ListCustomPermissions;
