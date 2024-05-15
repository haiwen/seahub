import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { PopoverBody } from 'reactstrap';
import SeahubPopover from '../../../../components/common/seahub-popover';
import { gettext } from '../../../../utils/constants';

import '../../css/view-edit-popover.css';


class ViewEditPopover extends Component {

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

  renderViewName = () => {
    const { viewName } = this.props;
    return (
      <div className="view-name-editor">
        <input
          type="text"
          className="form-control view-name-editor-input"
          value={viewName}
          onChange={this.onChangeName}
          autoFocus={true}
          ref={this.viewInputRef}
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
      >
        <div className="view-edit-popover-header">
          <span className='header-text'>{gettext('Modify Name')}</span>
        </div>
        <PopoverBody className="view-edit-content">
          {this.renderViewName()}
        </PopoverBody>
      </SeahubPopover>
    );
  }
}

ViewEditPopover.propTypes = {
  viewName: PropTypes.string,
  onChangeName: PropTypes.func,
  toggleViewEditor: PropTypes.func,
  viewEditorId: PropTypes.string,
};

export default ViewEditPopover;
