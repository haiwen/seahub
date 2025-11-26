import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter, Input, Label } from 'reactstrap';
import SeahubModalHeader from '../common/seahub-modal-header';
import { gettext, isPro } from '../../utils/constants';
import wikiAPI from '../../utils/wiki-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import { SeahubSelect } from '../common/select';

const propTypes = {
  toggleCancel: PropTypes.func.isRequired,
  addWiki: PropTypes.func.isRequired,
  currentDeptID: PropTypes.string,
};

class AddWikiDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      name: '',
      isSubmitBtnActive: false,
      selectedOption: null,
      options: [],
    };
  }

  componentDidMount() {
    if (!isPro) return;
    wikiAPI.listWikiDepartments().then(res => {
      const departments = res.data.sort((a, b) => {
        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
      });
      let options = [];
      for (let i = 0 ; i < departments.length; i++) {
        let obj = {};
        obj.value = departments[i].name;
        obj.id = departments[i].id;
        obj.email = departments[i].email;
        obj.label = departments[i].name;
        options.push(obj);
      }
      const myWikiOption = {
        id: '',
        value: 'My wiki',
        email: '',
        label: gettext('My Wikis'),
      };
      options.unshift(myWikiOption);
      this.setState({ options });
      if (this.props.currentDeptID) {
        const selectedOption = options.find(op => op.id == this.props.currentDeptID);
        this.setState({ selectedOption });
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  inputNewName = (e) => {
    this.setState({
      name: e.target.value,
    });
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
    }
  };

  handleSubmit = () => {
    const wikiName = this.state.name.trim();
    const departmentID = this.state.selectedOption ? this.state.selectedOption.id : null;
    if (!wikiName) return;
    this.props.addWiki(wikiName, departmentID);
    this.props.toggleCancel();
  };

  toggle = () => {
    this.props.toggleCancel();
  };

  handleSelectChange = (option) => {
    this.setState({ selectedOption: option });
  };

  render() {
    return (
      <Modal isOpen={true} autoFocus={false} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{gettext('Add Wiki')}</SeahubModalHeader>
        <ModalBody>
          <Label>{gettext('Name')}</Label>
          <Input
            onKeyDown={this.handleKeyDown}
            autoFocus={true}
            value={this.state.name}
            onChange={this.inputNewName}
            name="wiki-name"
          />
          {isPro &&
            <>
              <Label className='mt-4'>{gettext('Wiki owner')} ({gettext('Optional')})</Label>
              <SeahubSelect
                onChange={this.handleSelectChange}
                options={this.state.options}
                hideSelectedOptions={true}
                placeholder={gettext('Select a department')}
                maxMenuHeight={200}
                value={this.state.selectedOption}
                noOptionsMessage={() => {return gettext('No options available');}}
              />
            </>
          }
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!this.state.name.trim()}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddWikiDialog.propTypes = propTypes;

export default AddWikiDialog;
