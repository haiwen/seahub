import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext, orgID } from '../../utils/constants';
import { orgAdminAPI } from '../../utils/org-admin-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';

const propTypes = {
  groupName: PropTypes.string,
  groupID: PropTypes.number.isRequired,
  toggle: PropTypes.func.isRequired,
  onDeleteDepartment: PropTypes.func.isRequired
};

class DeleteDepartDialog extends React.Component {

  constructor(props) {
    super(props);
  }

  deleteDepart = () => {
    const { groupID } = this.props;
    this.props.toggle();
    orgAdminAPI.orgAdminDeleteDepartGroup(orgID, groupID).then((res) => {
      this.props.onDeleteDepartment(groupID);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    let subtitle = gettext('Are you sure you want to delete {placeholder} ?');
    subtitle = subtitle.replace('{placeholder}', '<span class="op-target">' + Utils.HTMLescape(this.props.groupName) + '</span>');
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}>{gettext('Delete Department')}</ModalHeader>
        <ModalBody>
          <p dangerouslySetInnerHTML={{ __html: subtitle }}></p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.deleteDepart}>{gettext('Delete')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

DeleteDepartDialog.propTypes = propTypes;

export default DeleteDepartDialog;
