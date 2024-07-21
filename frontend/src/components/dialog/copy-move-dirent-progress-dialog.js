import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { gettext } from '../../utils/constants';
import '../../css/copy-move-dirent-progress-dialog.css';

const propTypes = {
  type: PropTypes.oneOf(['move', 'copy']).isRequired,
  asyncOperatedFilesLength: PropTypes.number.isRequired,
  asyncOperationProgress: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  toggleDialog: PropTypes.func.isRequired,
};

class CopyMoveDirentProgressDialog extends React.Component {

  render() {
    let { type, asyncOperationProgress, asyncOperatedFilesLength } = this.props;
    let title = type === 'move' ? gettext('Move {num} items') : gettext('Copy {num} items');
    title = title.replace('{num}', asyncOperatedFilesLength);
    let progressStyle = {
      width: asyncOperationProgress + '%',
      lineHeight: '40px',
      textAlign: 'left',
    };
    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog} className="copy-move-dirent-progress-dialog">
        <ModalHeader toggle={this.props.toggleDialog}>{title}</ModalHeader>
        <ModalBody>
          <div className="progress">
            <div
              className="progress-bar pl-2"
              role="progressbar"
              style={progressStyle}
              aria-valuenow={asyncOperationProgress}
              aria-valuemin="0"
              aria-valuemax="100"
            >
              {asyncOperationProgress + '%'}
            </div>
          </div>
        </ModalBody>
      </Modal>
    );
  }
}

CopyMoveDirentProgressDialog.propTypes = propTypes;

export default CopyMoveDirentProgressDialog;
