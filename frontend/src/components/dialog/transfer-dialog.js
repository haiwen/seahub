import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter,
  Nav, NavItem, NavLink, TabContent, TabPane, Label } from 'reactstrap';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import makeAnimated from 'react-select/animated';
import { seafileAPI } from '../../utils/seafile-api';
import { systemAdminAPI } from '../../utils/system-admin-api';
import { orgAdminAPI } from '../../utils/org-admin-api';
import { gettext, isPro, orgID } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import UserSelect from '../user-select';
import { SeahubSelect } from '../common/select';
import Switch from '../common/switch';
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
      errorMsg: [],
      transferToUser: true,
      transferToGroup: false,
      reshare: false,
      activeTab: !this.props.isDepAdminTransfer ? TRANS_USER : TRANS_DEPART
    };
    this.userSelect = React.createRef();
  }

  handleSelectChange = (option) => {
    this.setState({ selectedOption: option });
  };

  submit = () => {
    const { activeTab, reshare, selectedOption } = this.state;
    const email = activeTab === TRANS_DEPART ? selectedOption.email : selectedOption[0].email;
    this.props.onTransferRepo(email, reshare);
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
        value: item.name,
        email: item.email,
        label: item.name,
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
    return (
      <Fragment>
        <div className="transfer-dialog-side">
          <Nav pills>
            {!this.props.isDepAdminTransfer &&
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
            }
            {isPro &&
            <NavItem role="tab" aria-selected={activeTab === TRANS_DEPART} aria-controls="transfer-depart-panel">
              <NavLink
                className={activeTab === TRANS_DEPART ? 'active' : ''}
                onClick={this.toggle.bind(this, TRANS_DEPART)}
                tabIndex="0"
                onKeyDown={this.onTabKeyDown}
              >
                {gettext('Transfer to department')}
              </NavLink>
            </NavItem>}
          </Nav>
        </div>
        <div className="transfer-dialog-main">
          <TabContent activeTab={this.state.activeTab}>
            <Fragment>
              <TabPane tabId="transUser" role="tabpanel" id="transfer-user-panel">
                <Label className='transfer-repo-label'>{gettext('Users')}</Label>
                <UserSelect
                  ref={this.userSelect}
                  isMulti={false}
                  placeholder={gettext('Select a user')}
                  onSelectChange={this.handleSelectChange}
                />
                <Switch
                  checked={reshare}
                  disabled={false}
                  size="large"
                  textPosition="right"
                  className='transfer-repo-reshare-switch w-100 mt-3 mb-1'
                  onChange={this.toggleReshareStatus}
                  placeholder={gettext('Keep sharing')}
                />
                <div className='tip'>{gettext('If the library is shared to another user, the sharing will be kept.')}</div>
              </TabPane>
              {isPro && canTransferToDept &&
              <TabPane tabId="transDepart" role="tabpanel" id="transfer-depart-panel">
                <Label className='transfer-repo-label'>{gettext('Departments')}</Label>
                <SeahubSelect
                  isClearable
                  maxMenuHeight={200}
                  hideSelectedOptions={true}
                  components={makeAnimated()}
                  placeholder={gettext('Select a department')}
                  options={this.state.options}
                  onChange={this.handleSelectChange}
                  value={this.state.selectedOption}
                  className="transfer-repo-select-department"
                />
                <Switch
                  checked={reshare}
                  disabled={false}
                  size="large"
                  textPosition="right"
                  className='transfer-repo-reshare-switch w-100 mt-3 mb-1'
                  onChange={this.toggleReshareStatus}
                  placeholder={gettext('Keep sharing')}
                />
                <div className='tip'>{gettext('If the library is shared to another department, the sharing will be kept.')}</div>
              </TabPane>}
            </Fragment>
          </TabContent>
        </div>
      </Fragment>
    );
  };

  render() {
    const { selectedOption } = this.state;
    const { itemName: repoName } = this.props;
    let title = gettext('Transfer Library {library_name}');
    title = title.replace('{library_name}', '<span class="op-target text-truncate mx-1">' + Utils.HTMLescape(repoName) + '</span>');
    let buttonDisabled = false;
    if (selectedOption === null || (Array.isArray(selectedOption) && selectedOption.length === 0)) {
      buttonDisabled = true;
    }
    return (
      <Modal isOpen={true} style={{ maxWidth: '720px' }} toggle={this.props.toggleDialog} className="transfer-dialog">
        <SeahubModalHeader toggle={this.props.toggleDialog}>
          <span dangerouslySetInnerHTML={{ __html: title }} className="d-flex mw-100"></span>
        </SeahubModalHeader>
        <ModalBody className="transfer-dialog-content" role="tablist">
          {this.renderTransContent()}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.submit} disabled={buttonDisabled}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

TransferDialog.propTypes = propTypes;

export default TransferDialog;
