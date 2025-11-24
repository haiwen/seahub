import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter,
  Nav, NavItem, NavLink, TabContent, TabPane, Label } from 'reactstrap';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import { seafileAPI } from '../../utils/seafile-api';
import { systemAdminAPI } from '../../utils/system-admin-api';
import { orgAdminAPI } from '../../utils/org-admin-api';
import { gettext, isPro, orgID, LARGE_DIALOG_STYLE } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import UserSelect from '../user-select';
import Switch from '../switch';
import CustomizeSelect from '../customize-select';

import '../../css/transfer-dialog.css';

const propTypes = {
  itemName: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired,
  onTransferRepo: PropTypes.func.isRequired,
  canTransferToDept: PropTypes.bool,
  isOrgAdmin: PropTypes.bool,
  isSysAdmin: PropTypes.bool,
  isDepAdminTransfer: PropTypes.bool,
};

const TRANS_USER = 'transUser';
const TRANS_DEPART = 'transDepart';

class TransferDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      options: [],
      selectedOption: null,
      selectedUsers: [],
      errorMsg: [],
      transferToUser: true,
      transferToGroup: false,
      reshare: false,
      activeTab: TRANS_USER
    };
  }

  handleSelectDepartment = (value) => {
    if (this.state.selectedOption && this.state.selectedOption.value === value) {
      this.setState({ selectedOption: null });
    } else {
      const option = this.state.options.find(item => item.value === value);
      this.setState({ selectedOption: option });
    }
  };

  deleteSelectedDepartment = (e) => {
    e.stopPropagation();
    e.preventDefault();
    this.setState({ selectedOption: null });
  };

  onUsersChange = (selectedUsers) => {
    this.setState({ selectedUsers });
  };

  submit = () => {
    const { activeTab, reshare, selectedOption, selectedUsers } = this.state;
    const email = activeTab === TRANS_DEPART ? selectedOption.value : selectedUsers[0].email;
    this.props.onTransferRepo(email, reshare);
    this.props.toggleDialog();
  };

  componentDidMount() {
    if (isPro) {
      if (this.props.isOrgAdmin) {
        orgAdminAPI.orgAdminListDepartments(orgID).then((res) => {
          this.updateOptions(res);
        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      }
      else if (this.props.isSysAdmin) {
        systemAdminAPI.sysAdminListDepartments().then((res) => {
          this.updateOptions(res);
        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      }
      else {
        seafileAPI.listDepartments().then((res) => {
          this.updateOptions(res);
        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      }
    }
  }

  updateOptions = (departmentsRes) => {
    const options = departmentsRes.data.map(item => {
      let option = {
        value: item.email,
        label: item.name,
        name: item.name,
      };
      return option;
    });
    this.setState({ options });
  };

  onClick = () => {
    this.setState({
      transferToUser: !this.state.transferToUser,
    });
  };

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
      this.setState({
        activeTab: tab,
        reshare: false,
        selectedOption: null,
        selectedUsers: [],
      });
    }
  };

  toggleReshareStatus = () => {
    this.setState({
      reshare: !this.state.reshare
    });
  };

  renderTransContent = () => {
    let activeTab = this.state.activeTab;
    let reshare = this.state.reshare;
    let canTransferToDept = true;
    if (this.props.canTransferToDept != undefined) {
      canTransferToDept = this.props.canTransferToDept;
    }

    const { selectedOption } = this.state;
    let buttonDisabled = false;
    if (activeTab === TRANS_DEPART) {
      if (selectedOption === null || (Array.isArray(selectedOption) && selectedOption.length === 0)) {
        buttonDisabled = true;
      }
    } else {
      if (this.state.selectedUsers.length === 0) {
        buttonDisabled = true;
      }
    }
    return (
      <Fragment>
        <div className="transfer-dialog-side">
          <Nav pills>
            <NavItem role="tab" aria-selected={activeTab === TRANS_USER} aria-controls="transfer-user-panel">
              <NavLink
                className={activeTab === TRANS_USER ? 'active' : ''}
                onClick={(this.toggle.bind(this, TRANS_USER))}
                tabIndex="0"
                onKeyDown={this.onTabKeyDown}
              >
                {gettext('Transfer to user')}
              </NavLink>
            </NavItem>
            {isPro && canTransferToDept &&
            <NavItem role="tab" aria-selected={activeTab === TRANS_DEPART} aria-controls="transfer-depart-panel">
              <NavLink
                className={activeTab === TRANS_DEPART ? 'active' : ''}
                onClick={this.toggle.bind(this, TRANS_DEPART)}
                tabIndex="0"
                onKeyDown={this.onTabKeyDown}
              >
                {gettext('Transfer to department')}
              </NavLink>
            </NavItem>
            }
          </Nav>
        </div>
        <div className="transfer-dialog-main">
          <TabContent activeTab={this.state.activeTab}>
            <>
              <TabPane tabId="transUser" role="tabpanel" id="transfer-user-panel">
                <Label className='transfer-repo-label'>{gettext('Users')}</Label>
                <UserSelect
                  isMulti={false}
                  placeholder={gettext('Select a user')}
                  onSelectChange={this.onUsersChange}
                  selectedUsers={this.state.selectedUsers}
                />
                <Switch
                  checked={reshare}
                  disabled={false}
                  size="large"
                  textPosition="right"
                  className='transfer-repo-reshare-switch w-100 mt-6 mb-1'
                  onChange={this.toggleReshareStatus}
                  placeholder={gettext('Keep sharing')}
                />
                <div className='tip'>{gettext('If the library is shared to another user, the sharing will be kept.')}</div>
              </TabPane>
              {isPro && canTransferToDept &&
                <TabPane tabId="transDepart" role="tabpanel" id="transfer-depart-panel">
                  <Label className='transfer-repo-label'>{gettext('Departments')}</Label>
                  <CustomizeSelect
                    readOnly={false}
                    value={this.state.selectedOption}
                    options={this.state.options}
                    onSelectOption={this.handleSelectDepartment}
                    searchable={true}
                    supportMultipleSelect={false}
                    placeholder={gettext('Select a department')}
                    searchPlaceholder={gettext('Search department')}
                    enableDeleteSelected={true}
                    deleteSelected={this.deleteSelectedDepartment}
                  />
                  <Switch
                    checked={reshare}
                    disabled={false}
                    size="large"
                    textPosition="right"
                    className='transfer-repo-reshare-switch w-100 mt-6 mb-1'
                    onChange={this.toggleReshareStatus}
                    placeholder={gettext('Keep sharing')}
                  />
                  <div className='tip'>{gettext('If the library is shared to another department, the sharing will be kept.')}</div>
                </TabPane>
              }
            </>
          </TabContent>
          <ModalFooter>
            <Button color="secondary" onClick={this.props.toggleDialog}>{gettext('Cancel')}</Button>
            <Button color="primary" onClick={this.submit} disabled={buttonDisabled}>{gettext('Submit')}</Button>
          </ModalFooter>
        </div>
      </Fragment>
    );
  };

  render() {
    let { itemName } = this.props;
    let title = gettext('Transfer Library {library_name}');
    title = title.replace('{library_name}', '<span class="op-target text-truncate mx-1">' + Utils.HTMLescape(itemName) + '</span>');
    return (
      <Modal isOpen={true} style={LARGE_DIALOG_STYLE} toggle={this.props.toggleDialog} className="transfer-dialog">
        <SeahubModalHeader toggle={this.props.toggleDialog}>
          <span dangerouslySetInnerHTML={{ __html: title }} className="d-flex mw-100"></span>
        </SeahubModalHeader>
        <ModalBody className="transfer-dialog-content" role="tablist">
          {this.renderTransContent()}
        </ModalBody>
      </Modal>
    );
  }
}

TransferDialog.propTypes = propTypes;

export default TransferDialog;
