import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import TermsPreviewWidget from '../terms-preview-widget';
import { gettext } from '../../utils/constants';

const propTypes = {
  title: PropTypes.string,
  content: PropTypes.string,
  onClosePreviewDialog: PropTypes.func.isRequired,
};

class TermsPreviewDialog extends React.Component {

  static defaultProps = {
    title: gettext('Terms'),
  }


  toggle = () => {
    this.props.onClosePreviewDialog();
  }

  render() {
    let { title, content } = this.props;
    return (
      <Modal
        isOpen={true}
        size={'lg'}
        style={{width: 600}}
        wrapClassName={'conditions-perview-wrapper'}
        toggle={this.toggle}
      >
        <ModalHeader toggle={this.toggle}>{title}</ModalHeader>
        <ModalBody>
          <TermsPreviewWidget content={content} />
        </ModalBody>
      </Modal>
    );
  }
}

TermsPreviewDialog.propTypes = propTypes;

export default TermsPreviewDialog;
