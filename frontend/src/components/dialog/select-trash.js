import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import CreatableSelect from 'react-select/creatable';
import { gettext } from '../../utils/constants';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  trashType: PropTypes.number.isRequired,
  refreshTrash: PropTypes.func.isRequired,
  refreshTrash2: PropTypes.func.isRequired,
  changeTrash: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class SelectTrash extends React.Component {
  constructor(props) {
    super(props);
    this.options = [
      {label: gettext('New'), value: 0},
      {label: gettext('Old'), value: 1}
    ];
    this.state = {
      inputValue: this.options[this.props.trashType],
      submitBtnDisabled: false
    };
  }

  handleInputChange = (value) => {
    this.setState({
      inputValue: value
    });
  };

  formSubmit = ()=>{
    const inputValue = this.state.inputValue;
    if (inputValue.value === 1){
      this.OldTrash();
    }
    if (inputValue.value === 0){
      this.NewTrash();
    }
    this.props.changeTrash(this.state.inputValue.value);
  };

  OldTrash = ()=>{
    this.props.refreshTrash();
    this.props.toggleDialog();
  };
  NewTrash = () => {
    this.props.refreshTrash2();
    this.props.toggleDialog();
  };

  render() {
    return (
      <Modal isOpen={true} centered={true} toggle={this.props.toggleDialog}>
        <ModalHeader toggle={this.props.toggleDialog}>{gettext('Old Trash')}</ModalHeader>
        <ModalBody>
          <React.Fragment>
            <p>{gettext('Select Trash')}</p>
            <CreatableSelect
              defaultValue={this.options[this.props.trashType]}
              options={this.options}
              autoFocus={false}
              onChange={this.handleInputChange}
              placeholder=''
            />
          </React.Fragment>
        </ModalBody>
        <ModalFooter>
          <button className="btn btn-primary"
            onClick={this.formSubmit}>{gettext('Submit')}</button>
        </ModalFooter>
      </Modal>
    );
  }
}

SelectTrash.propTypes = propTypes;

export default SelectTrash;
