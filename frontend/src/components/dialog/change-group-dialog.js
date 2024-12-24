import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalFooter, ModalBody } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  groupName: PropTypes.string.isRequired,
  changeGroup2Department: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class ChangeGroupDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null
    };
  }

  submit = () => {
    this.props.changeGroup2Department();
    this.props.toggleDialog();
  };

  render() {
    const groupName = '<span class="op-target">' + Utils.HTMLescape(this.props.groupName) + '</span>';
    const msg = gettext('Are you sure to change group {placeholder} to department ?').replace('{placeholder}', groupName);
    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog}>
        <SeahubModalHeader toggle={this.props.toggleDialog}>
          {gettext('Change group to department')}
        </SeahubModalHeader>
        <ModalBody>
          <p dangerouslySetInnerHTML={{ __html: msg }}></p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.submit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ChangeGroupDialog.propTypes = propTypes;

export default ChangeGroupDialog;
