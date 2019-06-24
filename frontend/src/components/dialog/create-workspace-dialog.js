import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import makeAnimated from 'react-select/lib/animated';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api.js';


const propTypes = {
  createWorkspace: PropTypes.func.isRequired,
  onAddWorkspace: PropTypes.func.isRequired,
};

const NoOptionsMessage = (props) => {
  return (
    <div {...props.innerProps} style={{margin: '6px 10px', textAlign: 'center', color: 'hsl(0,0%,50%)'}}>{gettext('Group not found')}</div>
  );
};

class CreateWorkspaceDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
      options:[],
    };
  }

  componentDidMount() {
    seafileAPI.listGroups().then((res) => {
      let options = [];
      for (let i = 0 ; i < res.data.length; i++) {
        let obj = {};
        obj.value = res.data[i].name;
        obj.email = res.data[i].id + '@seafile_group';
        obj.label = res.data[i].name;
        options.push(obj);
      }
      this.setState({options: options});
    });
  }

  handleSelectChange = (option) => {
    this.setState({selectedOption: option});
  }

  submit = () => {
    let owner = this.state.selectedOption;
    this.props.createWorkspace(owner.email);
  } 

  toggle = () => {
    this.props.onAddWorkspace();
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('New DTable')}</ModalHeader>
        <ModalBody>
          <Select
            isClearable
            isMulti={false}
            maxMenuHeight={200}
            hideSelectedOptions={true}
            components={makeAnimated()}
            placeholder={gettext('Select a owner')}
            options={this.state.options}
            onChange={this.handleSelectChange}
            components={{ NoOptionsMessage }}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.submit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

CreateWorkspaceDialog.propTypes = propTypes;

export default CreateWorkspaceDialog;
