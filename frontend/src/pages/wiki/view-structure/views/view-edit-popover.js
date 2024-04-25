import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { PopoverBody } from 'reactstrap';
import SeahubPopover from '../../../../components/common/seahub-popover';
import { gettext } from '../../../../utils/constants';

import '../../css/view-edit-popover.css';

const PAGE_ICON_LIST = [
  'app-table',
  'app-form',
  'app-gallery',
  'app-map',
  'app-information',
  'app-inquire',
  'app-label',
  'app-matter',
  'app-design',
  'app-statistics',
  'app-link',
  'app-external-links',
  'app-page',
  'app-home',
  'app-personnel',
  'app-star-mark',
  'app-history',
  'app-edit',
  'app-folder',
  'app-calendar',
  'app-invoice',
  'app-contract',
  'app-email',
  'app-logistics',
  'app-product-library',
  'app-purchase',
  'app-distribution',
  'app-achievement-distribution',
  'app-address-book',
  'app-individual-bill',
  'app-post-sale',
  'app-rules-and-regulations'
];


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

  removeViewIcon = () => {
    const { viewIcon, onChangeIcon } = this.props;
    if (viewIcon) {
      onChangeIcon(null);
    }
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

  renderIconSettings = () => {
    const { viewIcon } = this.props;
    return (
      <div className="row view-icon-editor">
        {PAGE_ICON_LIST.map((icon) => {
          // Compatible with page icons that have already been set in older versions
          let currentViewIcon = (viewIcon && viewIcon.includes('dtable-icon')) ? viewIcon.replace('dtable-icon-', '') : viewIcon;
          let isActive = icon === currentViewIcon;
          return (
            <div key={icon}
              className="view-icon-item-editor"
              onClick={() => this.props.onChangeIcon(isActive ? '' : icon)}
              style={{ background: isActive ? '#ff8000' : '' }}
            >
              <label className="view-icon-item-container">
                <svg className={classnames('svg-item', { 'view-icon-color-white': isActive })}><use xlinkHref={`#${icon}`}/></svg>
              </label>
            </div>
          );
        })
        }
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
          <span className='header-text'>{gettext('Name and icon')}</span>
          <span className='remove-icon-button' onClick={this.removeViewIcon}>{gettext('Remove icon')}</span>
        </div>
        <PopoverBody className="view-edit-content">
          {this.renderViewName()}
          {this.renderIconSettings()}
        </PopoverBody>
      </SeahubPopover>
    );
  }
}

ViewEditPopover.propTypes = {
  viewName: PropTypes.string,
  viewIcon: PropTypes.string,
  onChangeName: PropTypes.func,
  onChangeIcon: PropTypes.func,
  toggleViewEditor: PropTypes.func,
  viewEditorId: PropTypes.string,
};

export default ViewEditPopover;
