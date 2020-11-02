import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import SelectEditor from './select-editor';

const propTypes = {
  isTextMode: PropTypes.bool.isRequired,
  isEditIconShow: PropTypes.bool.isRequired,
  statusArray: PropTypes.array.isRequired,
  currentStatus: PropTypes.string.isRequired,
  onStatusChanged: PropTypes.func.isRequired
};

class UserStatusEditor extends React.Component {

  translateStatus = (userStatus) => {
    if (userStatus === 'active') {
      return gettext('Active');
    }

    if (userStatus === 'inactive') {
      return gettext('Inactive');
    }
  }

  render() {
    return (
      <SelectEditor
        isTextMode={this.props.isTextMode}
        isEditIconShow={this.props.isEditIconShow}
        options={this.props.statusArray}
        currentOption={this.props.currentStatus}
        onOptionChanged={this.props.onStatusChanged}
        translateOption={this.translateStatus}
      />
    );
  }

}

UserStatusEditor.propTypes = propTypes;

export default UserStatusEditor;
