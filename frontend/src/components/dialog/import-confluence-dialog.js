import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { gettext } from '../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import Loading from '../loading';

import '../../css/seahub-io-dialog.css';

const propTypes = {
  toggleDialog: PropTypes.func.isRequired,
};

class ImportConfluenceDialog extends React.Component {
  constructor(props) {
    super(props);
  }

  toggle = () => {
    this.props.toggleDialog();
  };


  render() {
    return (
      <Modal className='seahub-io-dialog' isOpen={true} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{gettext('Import Confluence')}</SeahubModalHeader>
        <ModalBody>
          <>
            <Loading/>
            <div className="seahub-io-dialog-parsing-text">{gettext('Importing Confluence...')}</div>
          </>
        </ModalBody>
      </Modal>
    );
  }
}

ImportConfluenceDialog.propTypes = propTypes;

export default ImportConfluenceDialog;
