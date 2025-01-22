import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, Input, ModalBody, ModalFooter, Form, FormGroup, Label, Alert } from 'reactstrap';
import { gettext } from '../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  wikiPageName: PropTypes.string,
  onAddPage: PropTypes.func,
  handleClose: PropTypes.func,
};

class AddWikiPageDialog extends React.Component {
  constructor(props) {
    super(props);
    const { wikiPageName = '' } = props;
    this.state = {
      wikiPageName,
      errMessage: '',
      isSubmitBtnActive: !!wikiPageName.length,
    };
    this.inputRef = React.createRef();
  }

  handleChange = (e) => {
    const isSubmitBtnActive = !!e.target.value.trim();
    const wikiPageName = e.target.value;
    this.setState({ isSubmitBtnActive, wikiPageName });
  };

  handleSubmit = () => {
    if (!this.state.isSubmitBtnActive) return;
    // first param set false to prevent redirect to new page
    this.props.onAddPage(false, this.state.wikiPageName);
    this.props.handleClose();
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.handleSubmit();
    }
  };

  onDialogLoad = () => {
    const input = this.inputRef.current;
    if (!input) return;

    input.focus();
    const focusPosition = this.props.wikiPageName.length;
    input.setSelectionRange(focusPosition, focusPosition);
  };

  render() {
    const { handleClose } = this.props;
    return (
      <Modal isOpen={true} toggle={handleClose} onOpened={this.onDialogLoad}>
        <SeahubModalHeader toggle={handleClose}>{gettext('New page')}</SeahubModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="pageName">{gettext('Name')}</Label>
              <Input
                id="pageName"
                name="wiki-page-name"
                onKeyDown={this.handleKeyDown}
                innerRef={this.inputRef}
                value={this.state.wikiPageName}
                onChange={this.handleChange}
              />
            </FormGroup>
          </Form>
          {this.state.errMessage && <Alert color="danger" className="mt-2">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={handleClose}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddWikiPageDialog.propTypes = propTypes;

export default AddWikiPageDialog;
