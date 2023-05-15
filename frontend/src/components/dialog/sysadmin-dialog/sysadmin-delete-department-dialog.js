import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';

const propTypes = {
  group: PropTypes.object.isRequired,
  toggle: PropTypes.func.isRequired,
  onDeleteDepartment: PropTypes.func.isRequired
};

class DeleteDepartmentDialog extends React.Component {

  constructor(props) {
    super(props);
  }

  deleteDepart = () => {
    this.props.toggle();
    const { group } = this.props;
    seafileAPI.sysAdminDeleteDepartment(group.id).then((res) => {
      this.props.onDeleteDepartment(group.id);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    const { group } = this.props;

    let tipMessage = gettext('Are you sure you want to delete {placeholder} ?');
    tipMessage = tipMessage.replace('{placeholder}', '<span class="op-target">' + Utils.HTMLescape(group.name) + '</span>');
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}>{gettext('Delete Department')}</ModalHeader>
        <ModalBody>
          <p dangerouslySetInnerHTML={{__html: tipMessage}}></p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.deleteDepart}>{gettext('Delete')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

DeleteDepartmentDialog.propTypes = propTypes;

export default DeleteDepartmentDialog;
