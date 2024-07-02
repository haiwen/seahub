import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { PopoverBody } from 'reactstrap';
import SeahubPopover from '../../../../components/common/seahub-popover';
import { gettext } from '../../../../utils/constants';

import '../../css/page-edit-popover.css';


class PageEditPopover extends Component {

  constructor(props) {
    super(props);
    this.viewInputRef = React.createRef();
  }

  componentDidMount() {
    const txtLength = this.props.viewName.length;
    this.viewInputRef.current.setSelectionRange(0, txtLength);
  }

  onChangeName = (e) => {
    let name = e.target.value;
    this.props.onChangeName(name);
  };

  onEnter = (e) => {
    e.preventDefault();
    this.props.toggleViewEditor();
  };

  handleKeyDown = (e) => {
    if (e.keyCode === 13) {
      e.preventDefault();
      this.props.toggleViewEditor();
    }
  };

  renderViewName = () => {
    const { viewName } = this.props;
    return (
      <div className="page-name-editor">
        <input
          type="text"
          className="form-control page-name-editor-input"
          value={viewName}
          onChange={this.onChangeName}
          autoFocus={true}
          ref={this.viewInputRef}
          onKeyDown={this.handleKeyDown}
        />
      </div>
    );
  };

  render() {
    return (
      <SeahubPopover
        placement='bottom-end'
        target={this.props.viewEditorId}
        hideSeahubPopover={this.props.toggleViewEditor}
        hideSeahubPopoverWithEsc={this.props.toggleViewEditor}
        onEnter={this.onEnter}
        hideArrow={true}
        popoverClassName="view-edit-popover"
        boundariesElement={document.body}
      >
        <div className="page-edit-popover-header">
          <span className='header-text'>{gettext('Modify Name')}</span>
        </div>
        <PopoverBody className="page-edit-content">
          {this.renderViewName()}
        </PopoverBody>
      </SeahubPopover>
    );
  }
}

PageEditPopover.propTypes = {
  viewName: PropTypes.string,
  onChangeName: PropTypes.func,
  toggleViewEditor: PropTypes.func,
  viewEditorId: PropTypes.string,
};

export default PageEditPopover;
