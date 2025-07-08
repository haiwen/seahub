import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Utils, validateName } from '../../utils/utils';
import { Button, Modal, Input, ModalBody, ModalFooter, Alert } from 'reactstrap';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  dirent: PropTypes.object,
  onRename: PropTypes.func.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  checkDuplicatedName: PropTypes.func.isRequired,
};

class Rename extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      newName: '',
      errMessage: '',
      isSubmitBtnActive: false,
    };
    this.newInput = React.createRef();
  }

  UNSAFE_componentWillMount() {
    this.setState({ newName: this.props.dirent.name });
  }

  componentDidMount() {
    const { dirent } = this.props;
    this.changeState(dirent);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.changeState(nextProps.dirent);
  }

  handleChange = (e) => {
    if (!e.target.value.trim()) {
      this.setState({ isSubmitBtnActive: false });
    } else {
      this.setState({ isSubmitBtnActive: true });
    }

    this.setState({ newName: e.target.value });
  };

  handleSubmit = () => {
    let newName = this.state.newName.trim();
    let { isValid, errMessage } = validateName(newName);
    if (!isValid) {
      this.setState({ errMessage });
      return;
    }
    let isDuplicated = this.props.checkDuplicatedName(newName);
    if (isDuplicated) {
      let errMessage = gettext('The name "{name}" is already taken. Please choose a different name.');
      errMessage = errMessage.replace('{name}', Utils.HTMLescape(newName));
      this.setState({ errMessage });
      return;
    }
    this.props.onRename(newName);
    this.toggle();
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.handleSubmit();
    }
  };

  toggle = () => {
    this.props.toggleCancel();
  };

  changeState = (dirent) => {
    let name = dirent.name;
    this.setState({ newName: name });
  };

  onAfterModelOpened = () => {
    if (!this.newInput.current) return;
    const { dirent } = this.props;
    let type = dirent.type;
    this.newInput.current.focus();
    if (type === 'file') {
      var endIndex = dirent.name.lastIndexOf('.');
      this.newInput.current.setSelectionRange(0, endIndex, 'forward');
    } else {
      this.newInput.current.setSelectionRange(0, -1);
    }
  };

  render() {
    let type = this.props.dirent.type;
    return (
      <Modal isOpen={true} toggle={this.toggle} onOpened={this.onAfterModelOpened}>
        <SeahubModalHeader toggle={this.toggle}>{type === 'file' ? gettext('Rename File') : gettext('Rename Folder') }</SeahubModalHeader>
        <ModalBody>
          <p>{type === 'file' ? gettext('New file name') : gettext('New folder name')}</p>
          <Input
            onKeyDown={this.handleKeyDown}
            innerRef={this.newInput}
            placeholder="newName"
            value={this.state.newName}
            onChange={this.handleChange}
            name={type === 'file' ? 'new-file-name' : 'new-folder-name'}
          />
          {this.state.errMessage && <Alert color="danger" className="mt-2">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

Rename.propTypes = propTypes;

export default Rename;
