import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Link } from '@reach/router';
import { Utils } from '../../../utils/utils.js';
import { siteRoot, gettext } from '../../../utils/constants';
import OpMenu from '../../../components/dialog/op-menu';
import RenameDepartmentDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-rename-department-dialog';

const GroupItemPropTypes = {
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  group: PropTypes.object.isRequired,
  onDepartmentNameChanged: PropTypes.func.isRequired,
  showSetGroupQuotaDialog: PropTypes.func.isRequired,
  showDeleteDepartDialog: PropTypes.func.isRequired,
};

class GroupItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false,
      highlight: false,
      isRenameDialogOpen: false
    };
  }

  handleMouseOver = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: true,
        highlight: true
      });
    }
  }

  handleMouseOut = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: false,
        highlight: false
      });
    }
  }

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOpIconShow: false
    });
    this.props.onUnfreezedItem();
  }

  translateOperations = (item) => {
    let translateResult = '';
    switch(item) {
      case 'Rename':
        translateResult = gettext('Rename');
        break;
      case 'Delete':
        translateResult = gettext('Delete');
        break;
      default:
        break;
    }

    return translateResult;
  }

  onMenuItemClick = (operation) => {
    const { group } = this.props;
    switch(operation) {
      case 'Rename':
        this.toggleRenameDialog();
        break;
      case 'Delete':
        this.props.showDeleteDepartDialog(group);
        break;
      default:
        break;
    }
  }

  toggleRenameDialog = () => {
    this.setState({
      isRenameDialogOpen: !this.state.isRenameDialogOpen
    });
  }

  render() {
    const { group } = this.props;
    const { highlight, isOpIconShown, isRenameDialogOpen } = this.state;
    const newHref = siteRoot+ 'sys/departments/' + group.id + '/';
    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
          <td><Link to={newHref}>{group.name}</Link></td>
          <td>{moment(group.created_at).fromNow()}</td>
          {group.org_id === -1 ?
            <td onClick={this.props.showSetGroupQuotaDialog.bind(this, group.id)}>
              {Utils.bytesToSize(group.quota)}{' '}
              <span title="Edit Quota" className={`fa fa-pencil-alt attr-action-icon ${highlight ? '' : 'vh'}`}></span>
            </td>
            :
            <td>{Utils.bytesToSize(group.quota)}</td>
          }
          {group.org_id === -1 ?
            <td>
              {isOpIconShown &&
              <OpMenu
                operations={['Rename', 'Delete']}
                translateOperations={this.translateOperations}
                onMenuItemClick={this.onMenuItemClick}
                onFreezedItem={this.props.onFreezedItem}
                onUnfreezedItem={this.onUnfreezedItem}
              />
              }
            </td>
            :
            <td></td>
          }
        </tr>
        {isRenameDialogOpen && (
          <RenameDepartmentDialog
            groupID={group.id}
            name={group.name}
            toggle={this.toggleRenameDialog}
            onDepartmentNameChanged={this.props.onDepartmentNameChanged}
          />
        )}
      </Fragment>
    );
  }
}

GroupItem.propTypes = GroupItemPropTypes;

export default GroupItem;
