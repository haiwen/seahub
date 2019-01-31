import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, ModalHeader, ModalBody, ModalFooter, Input } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';

const propTypes = {
  repoID: PropTypes.string.isRequired,
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
      colorList: ['blue', 'azure', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'lime', 'green', 'teal', 'cyan', 'gray']
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
    let repoID = this.props.repoID;
    seafileAPI.createRepoTag(repoID, name, color).then(() =>{
      this.props.toggleCancel();
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
    this.newInput.focus();
    this.newInput.setSelectionRange(0, 0);
  }

  render() {
    let colorList = this.state.colorList;
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
              <Input onKeyPress={this.handleKeyPress} innerRef={input => {this.newInput = input;}} value={this.state.tagName} onChange={this.inputNewName}/>
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
          <Button color="secondary" onClick={this.props.toggleCancel}>{gettext('Cancel')}</Button>
        </ModalFooter>
      </Fragment>
    );
  }
}

CreateTagDialog.propTypes = propTypes;

export default CreateTagDialog;
