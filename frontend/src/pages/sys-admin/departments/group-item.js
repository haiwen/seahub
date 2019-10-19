import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Link } from '@reach/router';
import { Utils } from '../../../utils/utils.js';
import { siteRoot } from '../../../utils/constants';

const GroupItemPropTypes = {
  group: PropTypes.object.isRequired,
  showSetGroupQuotaDialog: PropTypes.func.isRequired,
  showDeleteDepartDialog: PropTypes.func.isRequired,
};

class GroupItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
    };
  }

  onMouseEnter = () => {
    this.setState({ highlight: true });
  }

  onMouseLeave = () => {
    this.setState({ highlight: false });
  }

  render() {
    const group = this.props.group;
    const highlight = this.state.highlight;
    const newHref = siteRoot+ 'sys/departments/' + group.id + '/';
    return (
      <tr className={highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td><Link to={newHref}>{group.name}</Link></td>
        <td>{moment(group.created_at).fromNow()}</td>
        <td onClick={this.props.showSetGroupQuotaDialog.bind(this, group.id)}>
          {Utils.bytesToSize(group.quota)}{' '}
          <span title="Edit Quota" className={`fa fa-pencil-alt attr-action-icon ${highlight ? '' : 'vh'}`}></span>
        </td>
        <td className="cursor-pointer text-center" onClick={this.props.showDeleteDepartDialog.bind(this, group)}>
          <span className={`sf2-icon-delete action-icon  ${highlight ? '' : 'vh'}`} title="Delete"></span>
        </td>
      </tr>
    );
  }
}

GroupItem.propTypes = GroupItemPropTypes;

export default GroupItem;