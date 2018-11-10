import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Input } from 'reactstrap';
import { gettext, repoID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';

const propTypes = {
  toggleCancel: PropTypes.func.isRequired,
};

class CreateTagDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tagName: '',
      tagColor: '',
      newTag: {},
      colorList: ['lime', 'teal', 'azure', 'green', 'blue', 'purple', 'pink', 'indigo'],
    };
    this.newInput = React.createRef();
  }

  inputNewName = (e) => {
    this.setState({
      tagName: e.target.value,
    }); 
  }

  selectTagcolor = (e) => {
    this.setState({
      tagColor: e.target.value,
    });
  }

  createTag = () => {  
    let name = this.state.tagName;
    let color = this.state.tagColor;
    seafileAPI.createRepoTag(repoID, name, color).then(() =>{
      this.props.toggleCancel();
    });
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.createTag();
    } 
  }

  toggle = () => {
    this.props.toggleCancel();
  }

  componentDidMount() {
    this.setState({
      tagColor: this.state.colorList[0]
    });
    this.newInput.focus();
    this.newInput.setSelectionRange(0, 0);
  }

  render() {
    let colorList = this.state.colorList;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('New Tag')}</ModalHeader>
        <ModalBody>
          <div role="form" className="tag-create">
            <div className="form-group">
              <label className="form-label">{gettext('Name')}</label>
              <Input onKeyPress={this.handleKeyPress} innerRef={input => {this.newInput = input;}} placeholder={gettext('name')} value={this.state.tagName} onChange={this.inputNewName}/>
            </div>
            <div className="form-group">
              <label className="form-label">{gettext('Select a color')}</label>
              <div className="row gutters-xs">
                {colorList.map((item, index)=>{
                  var className = 'colorinput-color bg-' + item;
                  return (
                    <div key={index} className="col-auto" onChange={this.selectTagcolor}>
                      <label className="colorinput">
                        {index===0 ? 
                          <input name="color" type="radio" value={item} className="colorinput-input" defaultChecked onClick={this.selectTagcolor}></input> :
                          <input name="color" type="radio" value={item} className="colorinput-input" onClick={this.selectTagcolor}></input>}
                        <span className={className}></span>
                      </label>
                    </div>
                  );
                })
                }
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.createTag}>{gettext('Save')}</Button>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

CreateTagDialog.propTypes = propTypes;

export default CreateTagDialog;
