import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, ModalHeader, ModalBody, ModalFooter, Input } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

const propTypes = {
  currentTag: PropTypes.object,
  repoID: PropTypes.string.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  onDeleteRepoTag: PropTypes.func.isRequired,
  updateUsedRepoTags: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

class UpdateTagDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      deleteRepoTag: false,
      newName: this.props.currentTag.name,
      newColor: this.props.currentTag.color,
      colorList: ['#FFA8A8', '#FFA94D', '#FFD43B', '#A0EC50', '#A9E34B', '#63E6BE', '#4FD2C9', '#72C3FC', '#91A7FF', '#E599F7', '#B197FC', '#F783AC', '#CED4DA'],
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
      this.props.updateUsedRepoTags();
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
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
    seafileAPI.deleteRepoTag(repoID, tag.id).then((res) => {
      this.props.toggleCancel();
      if (res.data.success === 'true') {
        this.props.onDeleteRepoTag(tag.id);
      }
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    let colorList = this.state.colorList;
    if (colorList.indexOf(this.props.currentTag.color)===-1) {
      colorList.push(this.props.currentTag.color);
    }
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
                  return (
                    <div key={index} className="col-auto" onChange={this.selectNewcolor}>
                      <label className="colorinput">
                        {item===this.props.currentTag.color ?
                          <input name="color" type="radio" value={item} className="colorinput-input" defaultChecked onChange={this.selectNewcolor}></input> :
                          <input name="color" type="radio" value={item} className="colorinput-input" onChange={this.selectNewcolor}></input>}
                        <span className="colorinput-color" style={{backgroundColor:item}}></span>
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
