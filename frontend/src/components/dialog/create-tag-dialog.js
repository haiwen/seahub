import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, ModalHeader, ModalBody, ModalFooter, Input } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  onRepoTagCreated: PropTypes.func,
  toggleCancel: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

class CreateTagDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tagName: '',
      tagColor: '',
      newTag: {},
      errorMsg: '',
      colorList: ['#FBD44A', '#EAA775', '#F4667C', '#DC82D2', '#9860E5', '#9F8CF1', '#59CB74', '#ADDF84', '#89D2EA', '#4ECCCB', '#46A1FD', '#C2C2C2'],
    };
  }

  inputNewName = (e) => {
    this.setState({
      tagName: e.target.value,
    });
    if (this.state.errorMsg) {
      this.setState({errorMsg: ''});
    }
  }

  selectTagcolor = (e) => {
    this.setState({
      tagColor: e.target.value,
    });
  }

  createTag = () => {
    let name = this.state.tagName;
    let color = this.state.tagColor;
    let repoID = this.props.repoID;
    seafileAPI.createRepoTag(repoID, name, color).then((res) => {
      let repoTagID = res.data.repo_tag.repo_tag_id;
      if (this.props.onRepoTagCreated) this.props.onRepoTagCreated(repoTagID);
      this.props.toggleCancel();
    }).catch((error) => {
      let errMessage;
      if (error.response.status === 500) {
        errMessage = gettext('Internal Server Error');
      } else if (error.response.status === 400) {
        errMessage = gettext('Tag "{name}" already exists.');
        errMessage = errMessage.replace('{name}', Utils.HTMLescape(name));
      }
      this.setState({errorMsg: errMessage});
    });
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.createTag();
    }
  }

  componentDidMount() {
    this.setState({
      tagColor: this.state.colorList[0]
    });
  }

  render() {
    let colorList = this.state.colorList;
    let canSave = this.state.tagName.trim() ? true : false;
    return (
      <Fragment>
        <ModalHeader toggle={this.props.onClose}>
          <span className="tag-dialog-back fas fa-sm fa-arrow-left" onClick={this.props.toggleCancel} aria-label={gettext('Back')}></span>
          {gettext('New Tag')}
        </ModalHeader>
        <ModalBody>
          <div role="form" className="tag-create">
            <div className="form-group">
              <label className="form-label">{gettext('Name')}</label>
              <Input onKeyPress={this.handleKeyPress} autoFocus={true} value={this.state.tagName} onChange={this.inputNewName}/>
              <div className="mt-2"><span className="error">{this.state.errorMsg}</span></div>
            </div>
            <div className="form-group">
              <label className="form-label">{gettext('Select a color')}</label>
              <div className="d-flex justify-content-between">
                {colorList.map((item, index)=>{
                  return (
                    <div key={index} className="tag-color-option" onChange={this.selectTagcolor}>
                      <label className="colorinput">
                        {index===0 ?
                          <input name="color" type="radio" value={item} className="colorinput-input" defaultChecked onClick={this.selectTagcolor}></input> :
                          <input name="color" type="radio" value={item} className="colorinput-input" onClick={this.selectTagcolor}></input>}
                        <span className="colorinput-color rounded-circle d-flex align-items-center justify-content-center" style={{backgroundColor:item}}>
                          <i className="fas fa-check color-selected"></i>
                        </span>
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
          <Button color="secondary" onClick={this.props.toggleCancel}>{gettext('Cancel')}</Button>
          {canSave ?
            <Button color="primary" onClick={this.createTag}>{gettext('Save')}</Button> :
            <Button color="primary" disabled>{gettext('Save')}</Button>
          }
        </ModalFooter>
      </Fragment>
    );
  }
}

CreateTagDialog.propTypes = propTypes;

export default CreateTagDialog;
