import React from 'react';
import PropTypes from 'prop-types';
import CustomPermissionItem from './custom-permission-item';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';

const propTypes = {
  permissions: PropTypes.array.isRequired,
  onAddCustomPermission: PropTypes.func.isRequired,
  onEditCustomPermission: PropTypes.func.isRequired,
  onDeleteCustomPermission: PropTypes.func.isRequired,
};

class ListCustomPermissions extends React.Component {

  render() {
    const { permissions } = this.props;
    const isDesktop = Utils.isDesktop();
    const columnWidths = isDesktop ? ['22%', '56%', '22%'] : ['36%', '44%', '20%'];

    const thead = (
      <thead>
        <tr>
          <th width={columnWidths[0]}>{gettext('Permission name')}</th>
          <th width={columnWidths[1]}>{gettext('Description')}</th>
          <th width={columnWidths[2]}></th>
        </tr>
      </thead>
    );

    return (
      <div className="custom-permission">
        <div className="permission-header">
          <div className="title">{gettext('Permission')}</div>
          <div className="operation">
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={this.props.onAddCustomPermission}>{gettext('Add permission')}</button>
          </div>
        </div>
        <div className="permission-main mt-4">
          <table className="permissions-list-header">
            {thead}
          </table>
          <div className="permissions-list-body table-thead-hidden">
            <table>
              {thead}
              <tbody>
                {permissions.map((permission, index) => {
                  return (
                    <CustomPermissionItem
                      key={index}
                      index={index}
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
