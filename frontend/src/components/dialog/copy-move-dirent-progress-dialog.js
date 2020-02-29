import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  type: PropTypes.oneOf(['move', 'copy']).isRequired,
  asyncOperationProgress: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  toggleDialog: PropTypes.func.isRequired,
};

class CopyMoveDirentProgressDialog extends React.Component {

  render() {

    let { type , asyncOperationProgress } = this.props;
    let title = type === 'move' ? gettext('Move Progress') : gettext('Copy Progress');

    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog}>
        <ModalHeader toggle={this.props.toggleDialog}>{title}</ModalHeader>
        <ModalBody style={{minHeight: '80px'}}>
          <div className="progress" style={{width: '40px'}}>
            <div 
              className="progress-bar" 
              role="progressbar" 
              style={{width: asyncOperationProgress + '%'}} 
              aria-valuenow={asyncOperationProgress} 
              aria-valuemin="0" 
              aria-valuemax="100"
            >
              {asyncOperationProgress}
            </div>
          </div>
        </ModalBody>
      </Modal>
    );
  }
}

CopyMoveDirentProgressDialog.propTypes = propTypes;

export default CopyMoveDirentProgressDialog;
