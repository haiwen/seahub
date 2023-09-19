import React from 'react';
import PropTypes from 'prop-types';
import { Popover, PopoverBody } from 'reactstrap';
import { TAG_COLORS } from '../../constants';

import '../../css/repo-tag.css';

export default class VirtualTagColor extends React.Component {

  static propTypes = {
    updateVirtualTag: PropTypes.func.isRequired,
    tag: PropTypes.object.isRequired,
    repoID: PropTypes.string.isRequired
  };

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
    this.props.updateVirtualTag(this.props.tag, { color: newColor });
    this.setState({
      tagColor: newColor,
      isPopoverOpen: !this.state.isPopoverOpen,
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
