import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  asyncMoveProgress: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  toggleDialog: PropTypes.func.isRequired,
};

class MoveDirentProgressDialog extends React.Component {

  render() {

    let asyncMoveProgress = this.props.asyncMoveProgress;
    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog}>
        <ModalHeader toggle={this.props.toggleDialog}>{gettext('Move Progress')}</ModalHeader>
        <ModalBody style={{minHeight: '200px'}}>
          <div className="progress">
            <div className="progress-bar bg-success" role="progressbar" style={{width: '100%'}} aria-valuenow={asyncMoveProgress} aria-valuemin="0" aria-valuemax="100"></div>
          </div>
        </ModalBody>
      </Modal>
    );
  }
}

MoveDirentProgressDialog.propTypes = propTypes;

export default MoveDirentProgressDialog;
