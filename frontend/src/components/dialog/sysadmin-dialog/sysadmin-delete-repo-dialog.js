import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';

class DeleteRepoDialog extends React.Component {

  constructor(props) {
    super(props);
  }

  deleteRepo = () => {
    seafileAPI.sysAdminDeleteRepoInDepartment(this.props.groupID, this.props.repo.repo_id).then((res) => {
      if (res.data.success) {
        this.props.onRepoChanged();
        this.props.toggle();
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    const { repo } = this.props;
    let tipMessage = gettext('Are you sure you want to delete {placeholder} ?');
    tipMessage = tipMessage.replace('{placeholder}', '<span class="op-target">' + Utils.HTMLescape(repo.name || repo.repo_name) + '</span>');
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}>{gettext('Delete Library')}</ModalHeader>
        <ModalBody>
          <div dangerouslySetInnerHTML={{__html: tipMessage}}></div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.deleteRepo}>{gettext('Delete')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

const propTypes = {
  repo: PropTypes.object.isRequired,
  toggle: PropTypes.func.isRequired,
  groupID: PropTypes.string.isRequired,
  onRepoChanged: PropTypes.func.isRequired
};

DeleteRepoDialog.propTypes = propTypes;

export default DeleteRepoDialog;
