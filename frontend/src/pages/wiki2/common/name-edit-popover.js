import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { PopoverBody } from 'reactstrap';
import CustomizePopover from '../../../components/customize-popover';
import { gettext } from '../../../utils/constants';

import '../css/name-edit-popover.css';


class NameEditPopover extends Component {

  constructor(props) {
    super(props);
    this.inputRef = React.createRef();
  }

  componentDidMount() {
    const txtLength = this.props.oldName.length;
    this.inputRef.current.setSelectionRange(0, txtLength);
  }

  onChangeName = (e) => {
    this.props.onChangeName(e.target.value);
  };

  onEnter = (e) => {
    e.preventDefault();
    this.props.toggleEditor();
  };

  handleKeyDown = (e) => {
    if (e.keyCode === 13) {
      e.preventDefault();
      this.props.toggleEditor();
    }
  };

  render() {
    return (
      <CustomizePopover
        placement='bottom-end'
        target={this.props.targetId}
        hidePopover={this.props.toggleEditor}
        hidePopoverWithEsc={this.props.toggleEditor}
        onEnter={this.onEnter}
        popoverClassName="name-edit-popover"
        boundariesElement={document.body}
      >
        <div className="name-edit-popover-header">
          <span className='header-text'>{gettext('Modify name')}</span>
        </div>
        <PopoverBody className="name-edit-content">
          <div className="item-name-editor">
            <input
              type="text"
              className="form-control item-name-editor-input"
              value={this.props.oldName}
              onChange={this.onChangeName}
              autoFocus={true}
              ref={this.inputRef}
              onKeyDown={this.handleKeyDown}
            />
          </div>
        </PopoverBody>
      </CustomizePopover>
    );
  }
}

NameEditPopover.propTypes = {
  oldName: PropTypes.string,
  onChangeName: PropTypes.func,
  toggleEditor: PropTypes.func,
  targetId: PropTypes.string,
};

export default NameEditPopover;
