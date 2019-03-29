import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext, orgID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';

class DeleteRepoDialog extends React.Component {

  constructor(props) {
    super(props);
  }

  deleteRepo = () => {
    seafileAPI.orgAdminDeleteDepartGroupRepo(orgID, this.props.groupID, this.props.repo.repo_id).then((res) => {
      if (res.data.success) {
        this.props.onRepoChanged();
        this.props.toggle();
      }
    });
  }

  render() {
    let subtitle = gettext('Are you sure you want to delete {placeholder} ?');
    subtitle = subtitle.replace('{placeholder}', '<span class="op-target">' + Utils.HTMLescape(this.props.repo.name) + '</span>');
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}>{gettext('Delete Library')}</ModalHeader>
        <ModalBody>
          <div dangerouslySetInnerHTML={{__html: subtitle}}></div>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.deleteRepo}>{gettext('Yes')}</Button>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('No')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

const propTypes = {
  repo: PropTypes.object.isRequired,
  toggle: PropTypes.func.isRequired,
  onRepoChanged: PropTypes.func.isRequired
};

DeleteRepoDialog.propTypes = propTypes;

export default DeleteRepoDialog;
