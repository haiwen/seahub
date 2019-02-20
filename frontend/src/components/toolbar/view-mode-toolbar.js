import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

const propTypes = {
  currentMode: PropTypes.string.isRequired,
  switchViewMode: PropTypes.func.isRequired,
};

class ViewModeToolbar extends React.Component {

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
      <div className="view-mode btn-group">
        <button className={`${baseClass} sf2-icon-list-view ${this.props.currentMode === 'list' ? 'current-mode' : ''}`} id='list' title={gettext('List')} onClick={this.switchViewMode}></button>
        {/* <button className={`${baseClass} sf2-icon-grid-view ${this.props.currentMode === 'grid' ? 'current-mode' : ''}`} id='grid' title={gettext('Grid')} onClick={this.switchViewMode}></button> */}
        <button className={`${baseClass} sf2-icon-two-columns ${this.props.currentMode === 'column' ? 'current-mode' : ''}`} id='column' title={gettext('Column')} onClick={this.switchViewMode}></button>
      </div>
    );
  }
}

ViewModeToolbar.propTypes = propTypes;

export default ViewModeToolbar;
