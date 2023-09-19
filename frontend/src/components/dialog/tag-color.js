import React from 'react';
import PropTypes from 'prop-types';
import { Popover, PopoverBody } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { TAG_COLORS } from '../../constants';
import toaster from '../toast';

import '../../css/repo-tag.css';

const tagColorPropTypes = {
  tag: PropTypes.object.isRequired,
  repoID: PropTypes.string.isRequired
};

class TagColor extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      tagColor: this.props.tag.color,
      isPopoverOpen: false
    };
  }

  togglePopover = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen
    });
  };

  selectTagColor = (e) => {
    const newColor = e.target.value;
    const { repoID, tag } = this.props;
    const { id, name } = tag;
    seafileAPI.updateRepoTag(repoID, id, name, newColor).then(() => {
      this.setState({
        tagColor: newColor,
        isPopoverOpen: !this.state.isPopoverOpen
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { isPopoverOpen, tagColor } = this.state;
    const { tag } = this.props;
    const { id, color } = tag;

    let colorList = [...TAG_COLORS];
    // for color from previous color options
    if (colorList.indexOf(color) == -1) {
      colorList.unshift(color);
    }

    return (
      <div>
        <span
          id={`tag-${id}-color`}
          className="tag-color cursor-pointer rounded-circle d-flex align-items-center justify-content-center"
          style={{backgroundColor: tagColor}}
          onClick={this.togglePopover}
        >
          <i className="fas fa-caret-down text-white"></i>
        </span>
        <Popover
          target={`tag-${id}-color`}
          isOpen={isPopoverOpen}
          placement="bottom"
          toggle={this.togglePopover}
          className="tag-color-popover mw-100"
        >
          <PopoverBody className="p-2">
            <div className="d-flex justify-content-between">
              {colorList.map((item, index)=>{
                return (
                  <div key={index} className="tag-color-option mx-1">
                    <label className="colorinput">
                      <input name="color" type="radio" value={item} className="colorinput-input" defaultChecked={item == tagColor} onClick={this.selectTagColor} />
                      <span className="colorinput-color rounded-circle d-flex align-items-center justify-content-center" style={{backgroundColor: item}}>
                        <i className="fas fa-check color-selected"></i>
                      </span>
                    </label>
                  </div>
                );
              })
              }
            </div>
          </PopoverBody>
        </Popover>
      </div>
    );
  }
}

TagColor.propTypes = tagColorPropTypes;

export default TagColor;
