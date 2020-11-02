import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import SelectEditor from './select-editor';

const propTypes = {
  isTextMode: PropTypes.bool.isRequired,
  isEditIconShow: PropTypes.bool.isRequired,
  permissionOptions: PropTypes.array.isRequired,
  currentPermission: PropTypes.string.isRequired,
  onPermissionChanged: PropTypes.func.isRequired
};

class ShareLinkPermissionEditor extends React.Component {

  translatePermission = (permission) => {
    return Utils.getShareLinkPermissionObject(permission).text;
  }

  render() {
    return (
      <SelectEditor
        isTextMode={this.props.isTextMode}
        isEditIconShow={this.props.isEditIconShow}
        options={this.props.permissionOptions}
        currentOption={this.props.currentPermission}
        onOptionChanged={this.props.onPermissionChanged}
        translateOption={this.translatePermission}
      />
    );
  }
}

ShareLinkPermissionEditor.propTypes = propTypes;

export default ShareLinkPermissionEditor;
