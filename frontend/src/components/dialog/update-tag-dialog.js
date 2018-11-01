import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Input } from 'reactstrap';
import { gettext, repoID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import RepoTag from '../../models/repo-tag';
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
      newName: '',
      newColor: '',
      newTag: {},
      colorList: ['lime', 'teal', 'azure', 'green', 'blue', 'purple', 'pink', 'indigo'],
    };
    this.newInput = React.createRef();
  }

  inputNewname = (e) => {
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
    seafileAPI.updateRepotag(repoID, tag_id, name, color).then(res => {
      let newTag = new RepoTag(res.data.repo_tag);
      this.setState({
        newTag: newTag,
      });
    });
    this.props.toggleCancel();
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.updateTag();
    } 
  }

  toggle = () => {
    this.props.toggleCancel();
  }

  componentWillMount() {
    this.setState({
      newName: this.props.currentTag.name,
      newColor: this.props.currentTag.color,
    });
  }

  componentDidMount() {
    this.changeState();
    this.newInput.focus();
    this.newInput.setSelectionRange(0, -1);
  }

  componentWillReceiveProps(nextProps) {
    this.changeState(nextProps.currentTag);
  }

  changeState() {
    this.setState({
      newName: this.state.newName,
      newColor: this.state.newColor,
    });
  }

  deleteTagClick = (item) => {
    this.setState({
      deleteRepoTag: !this.state.deleteRepoTag,
      currentTag: item,
    });
  }

  deleteTagCancel = () => {
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
        <ModalHeader toggle={this.toggle}>{gettext('Edit tag:')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Enter the new name:')}</p>
          <Input onKeyPress={this.handleKeyPress} innerRef={input => {this.newInput = input;}} placeholder="newName" value={this.state.newName} onChange={this.inputNewname}/>
          <div className="form-group">
            <label className="form-label">{gettext('Select a color:')}</label>
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
                  </div>)
              })}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.updateTag}>{gettext('Save')}</Button>
          <Button color="danger" onClick={this.deleteTagClick.bind(this, tag)}>{gettext('Delete')}</Button>
        </ModalFooter>
      </Modal>
      {this.state.deleteRepoTag &&
        <DeleteTagDialog
          currentTag={this.state.currentTag}
          toggleCancel={this.deleteTagCancel}
        />
      }
      </Fragment>
    );
  }
}

UpdateTagDialog.propTypes = propTypes;

export default UpdateTagDialog;
