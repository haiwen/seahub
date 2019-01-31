import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, ModalHeader, ModalBody, ModalFooter, Input } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';

const propTypes = {
  currentTag: PropTypes.object,
  repoID: PropTypes.string.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

class UpdateTagDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      deleteRepoTag: false,
      newName: this.props.currentTag.name,
      newColor: this.props.currentTag.color,
      colorList: ['blue', 'azure', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'lime', 'green', 'teal', 'cyan', 'gray']
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
    let repoID = this.props.repoID;
    seafileAPI.updateRepoTag(repoID, tag_id, name, color).then(() => {
      this.props.toggleCancel();
    });
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.updateTag();
    }
  }

  deleteTagClick = (item) => {
    this.setState({
      deleteRepoTag: !this.state.deleteRepoTag,
    });
  }

  onDeleteTag = () => {
    let tag = this.props.currentTag;
    let repoID = this.props.repoID;
    seafileAPI.deleteRepoTag(repoID, tag.id).then(() => {
      this.props.toggleCancel();
    });
  }

  render() {
    let colorList = this.state.colorList;
    return (
      <Fragment>
        <ModalHeader toggle={this.props.onClose}>
          <span className="tag-dialog-back fas fa-sm fa-arrow-left" onClick={this.props.toggleCancel} aria-label={gettext('Back')}></span>
          {gettext('Edit Tag')}
        </ModalHeader>
        <ModalBody>
          <div className="tag-edit">
            <div className="form-group">
              <label className="form-label">{gettext('Name')}</label>
              <Input onKeyPress={this.handleKeyPress} innerRef={input => {this.newInput = input;}} value={this.state.newName} onChange={this.inputNewName}/>
            </div>
            <div className="form-group">
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
          <Button color="danger" onClick={this.onDeleteTag}>{gettext('Delete')}</Button>
          <Button color="primary" onClick={this.updateTag}>{gettext('Save')}</Button>
        </ModalFooter>
      </Fragment>
    );
  }
}

UpdateTagDialog.propTypes = propTypes;

export default UpdateTagDialog;
