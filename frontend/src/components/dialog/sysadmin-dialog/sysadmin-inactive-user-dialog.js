import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';

const propTypes = {
  nickname: PropTypes.object.isRequired,
  toggle: PropTypes.func.isRequired,
  confirmInactive: PropTypes.func.isRequired,
};

class InactiveUserDialog extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    let tipMessage = gettext('Are you sure you want to inactive {placeholder} ?');
    tipMessage = tipMessage.replace('{placeholder}', '<span class="op-target">' + Utils.HTMLescape(this.props.nickname) + '</span>');
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}>{gettext('Inactive User')}</ModalHeader>
        <ModalBody>
          <div dangerouslySetInnerHTML={{__html: tipMessage}}></div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.props.confirmInactive}>{gettext('Inactive')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

InactiveUserDialog.propTypes = propTypes;

export default InactiveUserDialog;
