import React, { Component, Fragment } from 'react';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { Button, Form, FormGroup, Input, Col } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, orgID, siteRoot } from '../../utils/constants';
import toaster from '../../components/toast';
import OrgGroupInfo from '../../models/org-group';

class GroupItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      showMenu: false,
      isItemMenuShow: false
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        showMenu: true,
        highlight: true,
      });
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        showMenu: false,
        highlight: false
      });
    }
  }

  onDropdownToggleClick = (e) => {
    e.preventDefault();
    this.toggleOperationMenu(e);
  }

  toggleOperationMenu = (e) => {
    e.stopPropagation();
    this.setState(
      {isItemMenuShow: !this.state.isItemMenuShow }, () => {
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
  }

  toggleDelete = () => {
    this.props.deleteGroupItem(this.props.group);
  }

  renderGroupHref = (group) => {
    let groupInfoHref;
    if (group.creatorName == 'system admin') {
      groupInfoHref = siteRoot + 'org/departmentadmin/groups/' + group.id + '/';
    } else {
      groupInfoHref = siteRoot + 'org/groupadmin/' + group.id + '/';
    }

    return groupInfoHref;
  }

  renderGroupCreator = (group) => {
    let userInfoHref = siteRoot + 'org/useradmin/info/' + group.creatorEmail + '/';
    if (group.creatorName == 'system admin') {
      return (
        <td> -- </td>
      );
    } else {
      return(
        <td>
          <a href={userInfoHref} className="font-weight-normal">{group.creatorName}</a>
        </td>
      );
    }
  }

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
                tag="a"
                className="attr-action-icon fas fa-ellipsis-v"
                title={gettext('More Operations')}
                data-toggle="dropdown"
                aria-expanded={this.state.isItemMenuShow}
                onClick={this.onDropdownToggleClick}
              />
              <DropdownMenu>
                <DropdownItem onClick={this.toggleDelete}>{gettext('Delete')}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          }
        </td>
      </tr>
    );
  }
}


class OrgGroupsSearchGroupsResult extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  render() {
    let { orgGroups } = this.props;
    return (
      <div className="cur-view-content">
        <table>
          <thead>
            <tr>
              <th width="30%">{gettext('Name')}</th>
              <th width="35%">{gettext('Creator')}</th>
              <th width="23%">{gettext('Created At')}</th>
              <th width="12%" className="text-center">{gettext('Operations')}</th>
            </tr>
          </thead>
          <tbody>
            {orgGroups.map(item => {
              return (
                <GroupItem
                  key={item.id}
                  group={item}
                  isItemFreezed={this.state.isItemFreezed}
                  onFreezedItem={this.onFreezedItem}
                  onUnfreezedItem={this.onUnfreezedItem}
                  deleteGroupItem={this.props.toggleDelete}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

class OrgGroupsSearchGroups extends Component {

  constructor(props) {
    super(props);
    this.state = {
      query: '',
      orgGroups: [],
      isSubmitBtnActive: false,
      loading: true,
      errorMsg: '',
    };
  }

  componentDidMount () {
    let params = (new URL(document.location)).searchParams;
    this.setState({
      query: params.get('query') || '',
    }, () => {this.getItems();});
  }

  getItems = () => {
    seafileAPI.orgAdminSearchGroup(orgID, this.state.query.trim()).then(res => {
      let groupList = res.data.group_list.map(item => {
        return new OrgGroupInfo(item);
      });
      this.setState({
        orgGroups: groupList,
        loading: false,
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  deleteGroupItem = (group) => {
    seafileAPI.orgAdminDeleteOrgGroup(orgID, group.id).then(res => {
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
  }

  handleInputChange = (e) => {
    this.setState({
      query: e.target.value
    }, this.checkSubmitBtnActive);
  }

  checkSubmitBtnActive = () => {
    const { query } = this.state;
    this.setState({
      isSubmitBtnActive: query.trim()
    });
  }

  render() {
    const { query, isSubmitBtnActive } = this.state;

    return (
      <Fragment>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Groups')}</h3>
            </div>
            <div className="cur-view-content">
              <div className="mt-4 mb-6">
                <h4 className="border-bottom font-weight-normal mb-2 pb-1">{gettext('Search Groups')}</h4>
                <Form>
                  <FormGroup row>
                    <Col sm={5}>
                      <Input type="text" name="query" value={query} placeholder={gettext('Search groups')} onChange={this.handleInputChange} />
                    </Col>
                  </FormGroup>
                  <FormGroup row>
                    <Col sm={{size: 5}}>
                      <button className="btn btn-outline-primary" disabled={!isSubmitBtnActive} onClick={this.getItems}>{gettext('Submit')}</button>
                    </Col>
                  </FormGroup>
                </Form>
              </div>
              <div className="mt-4 mb-6">
                <h4 className="border-bottom font-weight-normal mb-2 pb-1">{gettext('Result')}</h4>
                <OrgGroupsSearchGroupsResult
                  toggleDelete={this.deleteGroupItem}
                  orgGroups={this.state.orgGroups}
                />
              </div>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default OrgGroupsSearchGroups;
