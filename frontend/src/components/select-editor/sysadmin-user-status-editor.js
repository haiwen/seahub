import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import SelectEditor from './select-editor';

const propTypes = {
  isTextMode: PropTypes.bool.isRequired,
  isEditIconShow: PropTypes.bool.isRequired,
  statusOptions: PropTypes.array.isRequired,
  currentStatus: PropTypes.string.isRequired,
  onStatusChanged: PropTypes.func.isRequired
};

class SysAdminUserStatusEditor extends React.Component {

  translateStatus = (status) => {
    switch (status) {
      case 'active':
        return gettext('Active');
      case 'inactive':
        return gettext('Inactive');
    }
  }

  render() {
    return (
      <SelectEditor
        isTextMode={this.props.isTextMode}
        isEditIconShow={this.props.isEditIconShow}
        options={this.props.statusOptions}
        currentOption={this.props.currentStatus}
        onOptionChanged={this.props.onStatusChanged}
        translateOption={this.translateStatus}
      />
    );
  }
}

SysAdminUserStatusEditor.propTypes = propTypes;

export default SysAdminUserStatusEditor;
