import React from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

import '../../css/repo-tag.css';

const tagNamePropTypes = {
  tag: PropTypes.object.isRequired,
  repoID: PropTypes.string.isRequired
};

class TagName extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      tagName: this.props.tag.name,
      isEditing: false
    };
    this.input = React.createRef();
  }

  toggleMode = () => {
    this.setState({
      isEditing: !this.state.isEditing
    }, () => {
      if (this.state.isEditing) {
        this.input.current.focus();
      }
    });
  }

  updateTagName = (e) => {
    const newName = e.target.value;
    const { repoID, tag } = this.props;
    const { id, color } = tag;
    seafileAPI.updateRepoTag(repoID, id, newName, color).then(() => {
      this.setState({
        tagName: newName
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onInputKeyDown = (e) => {
    if (e.key == 'Enter') {
      this.toggleMode();
      this.updateTagName(e);
    }
  }

  onInputBlur = (e) => {
    this.toggleMode();
    this.updateTagName(e);
  }

  render() {
    const { isEditing, tagName } = this.state;
    return (
      <div className="mx-2 flex-fill d-flex">
        {isEditing ?
          <input
            type="text"
            ref={this.input}
            defaultValue={tagName}
            onBlur={this.onInputBlur}
            onKeyDown={this.onInputKeyDown}
            className="flex-fill form-control-sm form-control"
          /> :
          <span
            onClick={this.toggleMode}
            className="cursor-pointer flex-fill"
          >{tagName}</span>
        }
      </div>
    );
  }
}

TagName.propTypes = tagNamePropTypes;

export default TagName;
