import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { navigate } from '@gatsbyjs/reach-router';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { siteRoot, gettext, orgID } from '../../utils/constants';
import { orgAdminAPI } from '../../utils/org-admin-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Icon from '../../components/icon';
import OrgGroupInfo from '../../models/org-group';
import MainPanelTopbar from './main-panel-topbar';
import ChangeGroupDialog from '../../components/dialog/change-group-dialog';

class Search extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      value: ''
    };
  }

  handleInputChange = (e) => {
    this.setState({
      value: e.target.value
    });
  };

  handleKeyDown = (e) => {
    if (e.key == 'Enter') {
      e.preventDefault();
      this.handleSubmit();
    }
  };

  handleSubmit = () => {
    const value = this.state.value.trim();
    if (!value) {
      return false;
    }
    this.props.submit(value);
  };

  render() {
    return (
      <div className="input-icon">
        <span className="d-flex input-icon-addon">
          <Icon symbol="search" />
        </span>
        <input
          type="text"
          className="form-control search-input h-6 mr-1"
          style={{ width: '15rem' }}
          placeholder={this.props.placeholder}
          value={this.state.value}
          onChange={this.handleInputChange}
          onKeyDown={this.handleKeyDown}
          autoComplete="off"
        />
      </div>
    );
  }
}

Search.propTypes = {
  placeholder: PropTypes.string.isRequired,
  submit: PropTypes.func.isRequired,
};

class OrgGroups extends Component {

  constructor(props) {
    super(props);
    this.state = {
      page: 1,
      pageNext: false,
      orgGroups: [],
      isItemFreezed: false
    };
  }

  componentDidMount() {
    let page = this.state.page;
    this.initData(page);
  }

  initData = (page) => {
    orgAdminAPI.orgAdminListOrgGroups(orgID, page).then(res => {
      let orgGroups = res.data.groups.map(item => {
        return new OrgGroupInfo(item);
      });

      this.setState({
        orgGroups: orgGroups,
        pageNext: res.data.page_next,
        page: res.data.page,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };


  onChangePageNum = (e, num) => {
    e.preventDefault();
    let page = this.state.page;

    if (num == 1) {
      page = page + 1;
    } else {
      page = page - 1;
    }
    this.initData(page);
  };

  onFreezedItem = () => {
    this.setState({ isItemFreezed: true });
  };

  onUnfreezedItem = () => {
    this.setState({ isItemFreezed: false });
  };

  deleteGroupItem = (group) => {
    orgAdminAPI.orgAdminDeleteOrgGroup(orgID, group.id).then(res => {
      this.setState({
        orgGroups: this.state.orgGroups.filter(item => item.id != group.id)
      });
      let msg = gettext('Successfully deleted {name}');
      msg = msg.replace('{name}', group.groupName);
      toaster.success(msg);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  changeGroupItem = (group) => {
    orgAdminAPI.orgAdminGroup2Department(orgID, group.id).then(res => {
      let newGroupList = this.state.orgGroups.map(item => {
        if (item.id == group.id) {
          item = new OrgGroupInfo(res.data);
        }
        return item;
      });
      this.setState({
        orgGroups: newGroupList
      });
      toaster.success(gettext('Successfully change the group'));
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  searchItems = (keyword) => {
    navigate(`${siteRoot}org/groupadmin/search-groups/?query=${encodeURIComponent(keyword)}`);
  };

  getSearch = () => {
    return <Search
      placeholder={gettext('Search groups by name')}
      submit={this.searchItems}
    />;
  };

  render() {
    let groups = this.state.orgGroups;
    return (
      <Fragment>
        <MainPanelTopbar search={this.getSearch()}/>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('All Groups')}</h3>
            </div>
            <div className="cur-view-content">
              <table>
                <thead>
                  <tr>
                    <th width="30%">{gettext('Name')}</th>
                    <th width="35%">{gettext('Creator')}</th>
                    <th width="23%">{gettext('Created At')}</th>
                    <th width="12%"></th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(item => {
                    return (
                      <GroupItem
                        key={item.id}
                        group={item}
                        isItemFreezed={this.state.isItemFreezed}
                        onFreezedItem={this.onFreezedItem}
                        onUnfreezedItem={this.onUnfreezedItem}
                        deleteGroupItem={this.deleteGroupItem}
                        changeGroupItem={this.changeGroupItem}
                      />
                    );
                  })}
                </tbody>
              </table>
              <div className="paginator">
                {this.state.page != 1 && <a href="#" onClick={(e) => this.onChangePageNum(e, -1)}>{gettext('Previous')}</a>}
                {(this.state.page != 1 && this.state.pageNext) && <span> | </span>}
                {this.state.pageNext && <a href="#" onClick={(e) => this.onChangePageNum(e, 1)}>{gettext('Next')}</a>}
              </div>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

const GroupItemPropTypes = {
  group: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  deleteGroupItem: PropTypes.func.isRequired,
  changeGroupItem: PropTypes.func.isRequired,
};

class GroupItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      showMenu: false,
      isItemMenuShow: false,
      isChangeDialogOpen: false,
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        showMenu: true,
        highlight: true,
      });
    }
  };

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        showMenu: false,
        highlight: false
      });
    }
  };

  onDropdownToggleClick = (e) => {
    this.toggleOperationMenu(e);
  };

  toggleOperationMenu = (e) => {
    e.stopPropagation();
    this.setState(
      { isItemMenuShow: !this.state.isItemMenuShow }, () => {
        if (this.state.isItemMenuShow) {
          this.props.onFreezedItem();
        } else {
          this.setState({
            highlight: false,
            showMenu: false,
          });
          this.props.onUnfreezedItem();
        }
      }
    );
  };

  toggleDelete = () => {
    this.props.deleteGroupItem(this.props.group);
  };
  toggleChange = () => {
    this.props.changeGroupItem(this.props.group);
  };

  toggleChangeDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({ isChangeDialogOpen: !this.state.isChangeDialogOpen });
  };

  renderGroupHref = (group) => {
    return siteRoot + 'org/groupadmin/' + group.id + '/';
  };

  renderGroupCreator = (group) => {
    let userInfoHref = siteRoot + 'org/useradmin/info/' + group.creatorEmail + '/';
    if (group.creatorName == 'system admin') {
      return (
        <td> -- </td>
      );
    } else {
      return (
        <td>
          <a href={userInfoHref} className="font-weight-normal">{group.creatorName}</a>
        </td>
      );
    }
  };

  render() {
    let { group } = this.props;
    let isOperationMenuShow = (group.creatorName != 'system admin') && this.state.showMenu;
    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td>
          <a href={this.renderGroupHref(group)} className="font-weight-normal">{group.groupName}</a>
        </td>
        {this.renderGroupCreator(group)}
        <td>{group.ctime}</td>
        <td className="text-center cursor-pointer">
          {isOperationMenuShow &&
            <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
              <DropdownToggle
                tag="span"
                className="op-icon"
                title={gettext('More operations')}
                aria-label={gettext('More operations')}
                data-toggle="dropdown"
                aria-expanded={this.state.isItemMenuShow}
                onClick={this.onDropdownToggleClick}
              >
                <Icon symbol="more-level" />
              </DropdownToggle>
              <DropdownMenu>
                <DropdownItem onClick={this.toggleDelete}>{gettext('Delete')}</DropdownItem>
                <DropdownItem onClick={this.toggleChangeDialog}>{gettext('Change to department')}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          }
          {this.state.isChangeDialogOpen &&
            <ChangeGroupDialog
              groupName={group.groupName}
              changeGroup2Department={this.toggleChange}
              toggleDialog={this.toggleChangeDialog} />
          }
        </td>
      </tr>

    );
  }

}

GroupItem.propTypes = GroupItemPropTypes;

export default OrgGroups;
