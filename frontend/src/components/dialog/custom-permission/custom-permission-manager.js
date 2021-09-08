import React from 'react';
import PropTypes from 'prop-types';
import ListCustomPermission from './list-custom-permissions';
import AddCustomPermission from './add-custom-permission';
import EditCustomPermission from './edit-custom-permission';
import Loading from '../../loading';
import { seafileAPI } from '../../../utils/seafile-api';
import toaster from '../../toast';
import { Utils } from '../../../utils/utils';
import CustomPermission from '../../../models/custom-permission';

const propTypes = {
  repoID: PropTypes.string.isRequired
};

const MANAGER_STATE = {
  LIST: 'list',
  ADD: 'add',
  EDIT: 'edit',
};

class CustomPermissionManager extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      currentMode: MANAGER_STATE.LIST,
      isLoading: true,
      permissions: [],
      currentPermission: null,
    };
  }

  componentDidMount() {
    this.listCustomPermissions();
  }

  listCustomPermissions = () => {
    const { repoID } = this.props;
    seafileAPI.listCustomPermissions(repoID).then(res => {
      const permissions = res.data.permission_list.map(item => new CustomPermission(item));
      this.setState({
        isLoading: false,
        permissions: permissions
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      this.setState({isLoading: false});
    });
  }

  addCustomPermission = (permission_name, permission_desc, permission) => {
    const { repoID } = this.props;
    seafileAPI.createCustomPermission(repoID, permission_name, permission_desc, permission).then(res => {
      const { permissions } = this.state;
      const customPermission = new CustomPermission(res.data.permission);
      permissions.unshift(customPermission)
      this.setState({
        permissions,
        currentMode: MANAGER_STATE.LIST
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  editCustomPermission = (newPermission) => {
    const { repoID } = this.props;
    seafileAPI.updateCustomPermission(repoID, newPermission).then(res => {
      const customPermission = new CustomPermission(res.data.permission);
      const { permissions } = this.state;
      const newPermissions = permissions.map(item => {
        if (item.id === customPermission.id) {
          return customPermission;
        }
        return item;
      });
      this.setState({
        permissions: newPermissions,
        currentMode: MANAGER_STATE.LIST
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteCustomPermission = (permission) => {
    const { repoID } = this.props;
    const { id: permissionID } = permission;
    seafileAPI.deleteCustomPermission(repoID, permissionID).then(res => {
      const { permissions } = this.state;
      const newPermissions = permissions.filter(permission => permission.id !== permissionID);
      this.setState({permissions: newPermissions});
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onChangeMode = () => {
    this.setState({currentMode: MANAGER_STATE.LIST});
  }

  onAddCustomPermission = () => {
    this.setState({currentMode: MANAGER_STATE.ADD});
  }

  onEditCustomPermission = (permission) => {
    this.setState({
      currentMode: MANAGER_STATE.EDIT,
      currentPermission: permission
    });
  }

  onDeleteCustomPermission = (permission) => {
    this.deleteCustomPermission(permission);
  }

  render() {

    if (this.state.isLoading) {
      return <Loading />
    }
    
    const { currentMode, permissions, currentPermission } = this.state;
    return (
      <div className="custom-permission-manager">
        {currentMode === MANAGER_STATE.LIST && (
          <ListCustomPermission 
            permissions={permissions}
            onAddCustomPermission={this.onAddCustomPermission}
            onEditCustomPermission={this.onEditCustomPermission}
            onDeleteCustomPermission={this.onDeleteCustomPermission}
          />
        )}
        {currentMode === MANAGER_STATE.ADD && (
          <AddCustomPermission 
            onChangeMode={this.onChangeMode}
            addCustomPermission={this.addCustomPermission}
          />
        )}
        {currentMode === MANAGER_STATE.EDIT && (
          <EditCustomPermission
            permission={currentPermission}
            onChangeMode={this.onChangeMode} 
            editCustomPermission={this.editCustomPermission}
          />
        )}
      </div>
    );
  }
}

CustomPermissionManager.propTypes = propTypes;

export default CustomPermissionManager;
