import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Input } from 'reactstrap';
import { gettext, repoID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import DeleteTagDialog from '../dialog/delete-tag-dialog';

const propTypes = {
  currentTag: PropTypes.object,
  toggleCancel: PropTypes.func.isRequired,
};

class UpdateTagDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      deleteRepoTag: false,
      newName: this.props.currentTag.name,
      newColor: this.props.currentTag.color,
      colorList: ['lime', 'teal', 'azure', 'green', 'blue', 'purple', 'pink', 'indigo'],
    };
    this.newInput = React.createRef();
  }

  componentDidMount() {
    this.newInput.focus();
    this.newInput.setSelectionRange(0, -1);
  }

  inputNewName = (e) => {
    this.setState({
      newName: e.target.value,
    });
  }

  selectNewcolor = (e) => {
    this.setState({
      newColor: e.target.value,
    });
  }

  updateTag = () => {  
    let tag_id = this.props.currentTag.id;
    let name = this.state.newName;
    let color = this.state.newColor;
    seafileAPI.updateRepoTag(repoID, tag_id, name, color).then(() => {
      this.props.toggleCancel();
    });
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.updateTag();
    } 
  }

  toggle = () => {
    this.props.toggleCancel();
  }

  deleteTagClick = (item) => {
    this.setState({
      deleteRepoTag: !this.state.deleteRepoTag,
    });
  }

  onRepoTagDeleted = () => {
    this.onDeleteCancel();
    this.props.toggleCancel();
  }

  onDeleteCancel = () => {
    this.setState({
      deleteRepoTag: !this.state.deleteRepoTag,
    });
  }

  render() {
    let colorList = this.state.colorList;
    let tag = this.props.currentTag;
    return (
      <Fragment>
        <Modal isOpen={true} toggle={this.toggle}>
          <ModalHeader toggle={this.toggle}>{gettext('Edit Tag')}</ModalHeader>
          <ModalBody>
            <div className="tag-edit">
              <p>{gettext('Name:')}</p>
              <Input onKeyPress={this.handleKeyPress} innerRef={input => {this.newInput = input;}} placeholder="newName" value={this.state.newName} onChange={this.inputNewName}/>
              <div className="form-group color-chooser">
                <label className="form-label">{gettext('Select a color')}</label>
                <div className="row gutters-xs">
                  {colorList.map((item, index)=>{
                    var className = 'colorinput-color bg-' + item;
                    return (
                      <div key={index} className="col-auto" onChange={this.selectNewcolor}>
                        <label className="colorinput">
                          {item===this.props.currentTag.color ? 
                            <input name="color" type="radio" value={item} className="colorinput-input" defaultChecked onChange={this.selectNewcolor}></input> :
                            <input name="color" type="radio" value={item} className="colorinput-input" onChange={this.selectNewcolor}></input>}
                          <span className={className}></span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={this.updateTag}>{gettext('Edit')}</Button>
            <Button color="danger" onClick={this.deleteTagClick.bind(this, tag)}>{gettext('Delete')}</Button>
          </ModalFooter>
        </Modal>
        {this.state.deleteRepoTag &&
          <DeleteTagDialog
            currentTag={this.props.currentTag}
            onRepoTagDeleted={this.onRepoTagDeleted}
            toggleCancel={this.onDeleteCancel}
          />
        }
      </Fragment>
    );
  }
}

UpdateTagDialog.propTypes = propTypes;

export default UpdateTagDialog;
