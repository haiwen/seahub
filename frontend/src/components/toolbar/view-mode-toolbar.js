import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

const propTypes = {
  currentMode: PropTypes.string.isRequired,
  switchViewMode: PropTypes.func.isRequired,
  isCustomPermission: PropTypes.bool,
};

class ViewModeToolbar extends React.Component {

  static defaultProps = {
    isCustomPermission: false,
  }

  switchViewMode = (e) => {
    e.preventDefault();
    let id = e.target.id;
    if (id === this.props.currentMode) {
      return;
    }
    this.props.switchViewMode(id);
  }

  render() {
    let baseClass = 'btn btn-secondary btn-icon sf-view-mode-btn ';
    return (
      <React.Fragment>
        <div className="view-mode btn-group">
          <button className={`${baseClass} sf2-icon-list-view ${this.props.currentMode === 'list' ? 'current-mode' : ''}`} id='list' title={gettext('List')} aria-label={gettext('List')} onClick={this.switchViewMode}></button>
          <button className={`${baseClass} sf2-icon-grid-view ${this.props.currentMode === 'grid' ? 'current-mode' : ''}`} id='grid' title={gettext('Grid')} aria-label={gettext('Grid')} onClick={this.switchViewMode}></button>
          <button className={`${baseClass} sf2-icon-two-columns ${this.props.currentMode === 'column' ? 'current-mode' : ''}`} id='column' title={gettext('Column')} aria-label={gettext('Column')} onClick={this.switchViewMode}></button>
        </div>
        {!this.props.isCustomPermission && (
          <div className="detail-btn btn-group">
            <button className="btn btn-secondary btn-icon ml-1 fas fa-info" id='detail' title={gettext('Detail')} aria-label={gettext('Detail')} onClick={this.switchViewMode}></button>
          </div>
        )}
      </React.Fragment>
    );
  }
}

ViewModeToolbar.propTypes = propTypes;

export default ViewModeToolbar;
