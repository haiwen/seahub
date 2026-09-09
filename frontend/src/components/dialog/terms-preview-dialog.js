import React from 'react';
import { Modal, ModalBody } from 'reactstrap';
import PropTypes from 'prop-types';
import SeahubModalHeader from '@/components/seahub-modal-header';
import { gettext } from '../../utils/constants';
import TermsPreviewWidget from '../terms-preview-widget';

const propTypes = {
  title: PropTypes.string,
  content: PropTypes.string,
  onClosePreviewDialog: PropTypes.func.isRequired,
};

class TermsPreviewDialog extends React.Component {

  toggle = () => {
    this.props.onClosePreviewDialog();
  };

  render() {
    let { title = gettext('Terms'), content } = this.props;
    return (
      <Modal
        isOpen={true}
        size={'lg'}
        style={{ width: 600 }}
        wrapClassName={'conditions-perview-wrapper'}
        toggle={this.toggle}
      >
        <SeahubModalHeader toggle={this.toggle}>{title}</SeahubModalHeader>
        <ModalBody>
          <TermsPreviewWidget content={content} />
        </ModalBody>
      </Modal>
    );
  }
}

TermsPreviewDialog.propTypes = propTypes;

export default TermsPreviewDialog;
