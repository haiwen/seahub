import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import SelectEditor from './select-editor';

const propTypes = {
  isTextMode: PropTypes.bool.isRequired,
  isEditIconShow: PropTypes.bool.isRequired,
  permissions: PropTypes.array.isRequired,
  currentPermission: PropTypes.string.isRequired,
  onPermissionChanged: PropTypes.func.isRequired
};

class SharePermissionEditor extends React.Component {

  translatePermission = (permission) => {
    return Utils.sharePerms(permission);
  }

  render() {
    return (
      <SelectEditor 
        isTextMode={this.props.isTextMode}
        isEditIconShow={this.props.isEditIconShow}
        options={this.props.permissions}
        currentOption={this.props.currentPermission}
        onOptionChanged={this.props.onPermissionChanged}
        translateOption={this.translatePermission}
      />
    );
  }
}

SharePermissionEditor.propTypes = propTypes;

export default SharePermissionEditor;
