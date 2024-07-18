import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Link } from '@gatsbyjs/reach-router';
import { Utils } from '../../../utils/utils';
import ModalPortal from '../../../components/modal-portal';
import DeleteDepartDialog from '../../../components/dialog/org-delete-department-dialog';
import SetGroupQuotaDialog from '../../../components/dialog/org-set-group-quota-dialog';
import RenameDepartmentDialog from '../../../components/dialog/org-rename-department-dialog';
import OpMenu from '../../../components/dialog/op-menu';
import { siteRoot, gettext, orgID, lang } from '../../../utils/constants';
import '../../../css/org-department-item.css';

moment.locale(lang);

class GroupItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      isOpIconShown: false,
      isRenameDialogOpen: false,
      isSetGroupQuotaDialogOpen: false
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: true,
        highlight: true
      });
    }
  };

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: false,
        highlight: false
      });
    }
  };

  translateOperations = (item) => {
    let translateResult = '';
    switch (item) {
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
  };

  onMenuItemClick = (operation) => {
    switch (operation) {
      case 'Rename':
        this.toggleRenameDialog();
        break;
      case 'Delete':
        this.toggleDeleteDialog();
        break;
      default:
        break;
    }
  };

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOpIconShow: false
    });
    this.props.onUnfreezedItem();
  };

  toggleRenameDialog = () => {
    this.setState({
      isRenameDialogOpen: !this.state.isRenameDialogOpen
    });
  };

  toggleSetQuotaDialog = () => {
    this.setState({
      isSetGroupQuotaDialogOpen: !this.state.isSetGroupQuotaDialogOpen
    });
  };

  toggleDeleteDialog = () => {
    this.setState({
      isDeleteDialogOpen: !this.state.isDeleteDialogOpen
    });
  };


  render() {
    const group = this.props.group;
    const { highlight, isOpIconShown, isRenameDialogOpen, isSetGroupQuotaDialogOpen, isDeleteDialogOpen } = this.state;
    const newHref = siteRoot + 'org/departmentadmin/groups/' + group.id + '/';
    return (
      <Fragment>
        <tr className={highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <td><Link to={newHref}>{group.name}</Link></td>
          <td>{moment(group.created_at).fromNow()}</td>
          <td>
            {Utils.bytesToSize(group.quota)}{' '}
            <span onClick={this.toggleSetQuotaDialog} title={gettext('Edit Quota')} className={`sf3-font sf3-font-rename attr-action-icon ${highlight ? '' : 'vh'}`}></span>
          </td>
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
        </tr>
        {isSetGroupQuotaDialogOpen && (
          <ModalPortal>
            <SetGroupQuotaDialog
              toggle={this.toggleSetQuotaDialog}
              groupID={group.id}
              onSetQuota={this.props.onSetDepartmentQuota}
            />
          </ModalPortal>
        )}
        {isRenameDialogOpen && (
          <RenameDepartmentDialog
            orgID={orgID}
            groupID={group.id}
            name={group.name}
            toggle={this.toggleRenameDialog}
            onDepartmentNameChanged={this.props.onDepartmentNameChanged}
          />
        )}
        {isDeleteDialogOpen && (
          <ModalPortal>
            <DeleteDepartDialog
              toggle={this.toggleDeleteDialog}
              groupID={group.id}
              groupName={group.name}
              onDeleteDepartment={this.props.onDeleteDepartment}
            />
          </ModalPortal>
        )}

      </Fragment>
    );
  }
}

const GroupItemPropTypes = {
  group: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onDepartmentNameChanged: PropTypes.func.isRequired,
  onSetDepartmentQuota: PropTypes.func.isRequired,
  onDeleteDepartment: PropTypes.func.isRequired,
};

GroupItem.propTypes = GroupItemPropTypes;

export default GroupItem;
