import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext, orgID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';

const propTypes = {
  groupName: PropTypes.string,
  toggle: PropTypes.func.isRequired,
  onDepartChanged: PropTypes.func.isRequired
};

class DeleteDepartDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      errMessage: null
    };
  }

  deleteDepart = () => {
    seafileAPI.orgAdminDeleteDepartGroup(orgID, this.props.groupID).then((res) => {
      if (res.data.success) {
        this.props.onDepartChanged();
        this.props.toggle();
      }
    }).catch(err => {
      this.setState({ errMessage: 'There are sub-departments in this department.' });
    });
  }

  render() {
    let subtitle = gettext('Are you sure you want to delete {placeholder} ?');
    subtitle = subtitle.replace('{placeholder}', '<span class="op-target">' + Utils.HTMLescape(this.props.groupName) + '</span>');
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}>{gettext('Delete Department')}</ModalHeader>
        <ModalBody>
          <div dangerouslySetInnerHTML={{__html: subtitle}}></div>
          { this.state.errMessage && <p className="error">{this.state.errMessage}</p> }
        </ModalBody>
        <ModalFooter>
          {!this.state.errMessage && <Button color="primary" onClick={this.deleteDepart}>{gettext('Delete')}</Button>}
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

DeleteDepartDialog.propTypes = propTypes;

export default DeleteDepartDialog;
