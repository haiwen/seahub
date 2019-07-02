import React, {Component} from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
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
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} className={this.state.active ? 'tr-highlight' : ''}>
        <td><img src={siteRoot + 'media/img/data-base.svg'} alt="" width="24"/></td>
        <td><a href={tableHref} target="_blank">{table.name}</a></td>
        <td>{table.from_user_name}</td>
        <td>{moment(table.updated_at).fromNow()}</td>
        <td>
          <i
            className="action-icon sf2-icon-x3"
            title={gettext('Leave Share')}
            style={!this.state.active ? {opacity: 0} : {}}
            onClick={this.onLeaveShareTableSubmit}>
          </i>
        </td>
      </tr>
    );
  }
}

ShareTableItem.propTypes = shareTableItemPropTypes;

export default ShareTableItem;
