import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {gettext, siteRoot} from '../../utils/constants';

import '../../css/dtable-page.css';

const shareTableItemPropTypes = {
  table: PropTypes.object.isRequired,
  leaveShareTable: PropTypes.func.isRequired,
};

class ShareTableItem extends Component {

  constructor(props) {
    super(props);
    this.state = {
      active: false,
    };
  }

  onLeaveShareTableSubmit = () => {
    let table = this.props.table;
    this.props.leaveShareTable(table);
  };

  onMouseEnter = () => {
    this.setState({
      active: true
    });
  };

  onMouseLeave = () => {
    this.setState({
      active: false
    });
  };

  render() {
    let table = this.props.table;
    let tableHref = siteRoot + 'workspace/' + table.workspace_id + '/dtable/' + table.name + '/';

    return (

      <div onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} className={ `table-item ${this.state.active ? 'tr-highlight' : ''}`}>
        <div className="table-icon"><span className="sf3-font sf3-font-table"></span></div>
        <div className="table-name">
          <a href={tableHref} target="_blank">{table.name}</a>
        </div>
        <div className="table-dropdown-menu">
          <i
            className="action-icon sf2-icon-x3"
            title={gettext('Leave Share')}
            style={!this.state.active ? {opacity: 0} : {}}
            onClick={this.onLeaveShareTableSubmit}>
          </i>
        </div>
      </div>
    );
  }
}

ShareTableItem.propTypes = shareTableItemPropTypes;

export default ShareTableItem;