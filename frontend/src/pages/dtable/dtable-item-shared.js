import React from 'react';
import PropTypes from 'prop-types';

const gettext = window.gettext;
const { siteRoot } = window.app.config;

const propTypes = {
  table: PropTypes.object.isRequired,
  leaveShareTable: PropTypes.func.isRequired,
};

class DtableItemShared extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      active: false,
    };
  }

  
  onMouseEnter = () => {
    this.setState({active: true});
  };
  
  onMouseLeave = () => {
    this.setState({active: false});
  };
  
  onLeaveShareTableSubmit = () => {
    let table = this.props.table;
    this.props.leaveShareTable(table);
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

DtableItemShared.propTypes = propTypes;

export default DtableItemShared;
