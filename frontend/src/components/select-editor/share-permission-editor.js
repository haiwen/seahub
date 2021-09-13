import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import SelectEditor from './select-editor';
import { seafileAPI } from '../../utils/seafile-api';
import CustomPermission from '../../models/custom-permission';
import toaster from '../toast';
import { isPro } from '../../utils/constants';

const propTypes = {
  repoID: PropTypes.string,
  isTextMode: PropTypes.bool.isRequired,
  isEditIconShow: PropTypes.bool.isRequired,
  permissions: PropTypes.array.isRequired,
  currentPermission: PropTypes.string.isRequired,
  onPermissionChanged: PropTypes.func.isRequired,
  enableAddCustomPermission: PropTypes.bool,
  onAddCustomPermissionToggle: PropTypes.func,
};

class SharePermissionEditor extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      customPermissions: []
    };

    this.customPermissions = null;
    const { repoID } = this.props;
    this.CACHE_KEY = repoID ? `custom_permissions_${repoID}` : '';
  }

  componentDidMount() {
    if (this.props.repoID && isPro) {
      this.listCustomPermissions();
    } else {
      this.setState({
        isLoading: false,
        customPermissions: [],
      });
    }
  }

  componentWillUnmount() {
    isPro && localStorage.removeItem(this.CACHE_KEY);
  }

  listCustomPermissions = () => {
    const { repoID } = this.props;
    const cacheData = localStorage.getItem(this.CACHE_KEY);
    if (cacheData) {
      const { permission_list: permissions } = JSON.parse(cacheData);
      const customPermissions = permissions.map(item => new CustomPermission(item));
      this.setState({
        isLoading: false,
        customPermissions: customPermissions
      });
      return;
    }

    seafileAPI.listCustomPermissions(repoID).then(res => {
      const { permission_list: permissions } = res.data;
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(res.data));
      const customPermissions = permissions.map(item => new CustomPermission(item));
      this.setState({
        isLoading: false,
        customPermissions: customPermissions
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      this.setState({isLoading: false});
    });
  }

  translatePermission = (permission) => {
    let value = Utils.sharePerms(permission);
    if (!value) {
      const { customPermissions } = this.state;
      const item = customPermissions.find(item => item.id + '' === permission);
      value = item && item.name;
    }
    return value;
  }
  
  translateExplanation = (explanation) => {
    let value = Utils.sharePermsExplanation(explanation);
    if (!value) {
      const { customPermissions } = this.state;
      const item = customPermissions.find(item => item.id + '' === explanation);
      value = item && item.description;
    }
    return value;
  }

  getPermissions = () => {
    const { permissions } = this.props;
    let newPermissions = permissions.slice();
    const { customPermissions } = this.state;
    if (!this.customPermissions) {
      if (customPermissions.length > 0) {
        customPermissions.forEach(item => {
          newPermissions.push(item.id + '');
        });
      }
      this.customPermissions = newPermissions;
    }
    return this.customPermissions;
  }

  render() {

    const { isLoading } = this.state;
    if (isLoading) {
      return null;
    }

    return (
      <SelectEditor
        isTextMode={this.props.isTextMode}
        isEditIconShow={this.props.isEditIconShow}
        options={this.getPermissions()}
        currentOption={this.props.currentPermission}
        onOptionChanged={this.props.onPermissionChanged}
        translateOption={this.translatePermission}
        translateExplanation={this.translateExplanation}
        enableAddCustomPermission={this.props.enableAddCustomPermission}
        onAddCustomPermissionToggle={this.props.onAddCustomPermissionToggle}
      />
    );
  }
}

SharePermissionEditor.propTypes = propTypes;

export default SharePermissionEditor;
