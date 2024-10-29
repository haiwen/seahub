import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter,
  Nav, NavItem, NavLink, TabContent, TabPane, Label, Input } from 'reactstrap';
import makeAnimated from 'react-select/animated';
import { seafileAPI } from '../../utils/seafile-api';
import { systemAdminAPI } from '../../utils/system-admin-api';
import { gettext, isPro, orgID } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import UserSelect from '../user-select';
import { SeahubSelect } from '../common/select';
import '../../css/transfer-dialog.css';

const propTypes = {
  itemName: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
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
      selectedOption: null,
      errorMsg: [],
      transferToUser: true,
      transferToGroup: false,
      reshare: false,
      activeTab: !this.props.isDepAdminTransfer ? TRANS_USER : TRANS_DEPART
    };
    this.options = [];
  }

  handleSelectChange = (option) => {
    this.setState({ selectedOption: option });
  };

  submit = () => {
    const { activeTab, reshare } = this.state;
    if (activeTab === TRANS_DEPART) {
      let department = this.state.selectedOption;
      this.props.submit(department, reshare);
    } else if (activeTab === TRANS_USER) {
      let selectedOption = this.state.selectedOption;
      if (selectedOption && selectedOption[0]) {
        let user = selectedOption[0];
        this.props.submit(user, reshare);
      }
    }
  };

  componentDidMount() {
    if (this.props.isOrgAdmin) {
      seafileAPI.orgAdminListDepartments(orgID).then((res) => {
        for (let i = 0; i < res.data.length; i++) {
          let obj = {};
          obj.value = res.data[i].name;
          obj.email = res.data[i].email;
          obj.label = res.data[i].name;
          this.options.push(obj);
        }
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
    else if (this.props.isSysAdmin) {
      systemAdminAPI.sysAdminListDepartments().then((res) => {
        for (let i = 0; i < res.data.length; i++) {
          let obj = {};
          obj.value = res.data[i].name;
          obj.email = res.data[i].email;
          obj.label = res.data[i].name;
          this.options.push(obj);
        }
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
    else {
      seafileAPI.listDepartments().then((res) => {
        for (let i = 0; i < res.data.length; i++) {
          let obj = {};
          obj.value = res.data[i].name;
          obj.email = res.data[i].email;
          obj.label = res.data[i].name;
          this.options.push(obj);
        }
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }

  onClick = () => {
    this.setState({
      transferToUser: !this.state.transferToUser,
    });
  };

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
      this.setState({ activeTab: tab });
    }
  };

  onChangeShareStatus = (type) => {
    const { reshare } = this.state;
    return () => {
      this.setState({
        reshare: !reshare
      });
    };

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
                <UserSelect
                  ref="userSelect"
                  isMulti={false}
                  placeholder={gettext('Select a user')}
                  onSelectChange={this.handleSelectChange}
                />
                <Label check className="main-label">
                  <Input type="checkbox" onChange={this.onChangeShareStatus(reshare)} checked={reshare}/>
                  <span>{gettext('retain sharing')}</span>
                </Label>
              </TabPane>
              {isPro && canTransferToDept &&
              <TabPane tabId="transDepart" role="tabpanel" id="transfer-depart-panel">
                <SeahubSelect
                  isClearable
                  maxMenuHeight={200}
                  hideSelectedOptions={true}
                  components={makeAnimated()}
                  placeholder={gettext('Select a department')}
                  options={this.options}
                  onChange={this.handleSelectChange}
                  value={this.state.selectedOption}
                />
                <Label check className="main-label">
                  <Input type="checkbox" onChange={this.onChangeShareStatus(reshare)} checked={reshare}/>
                  <span>{gettext('retain sharing')}</span>
                </Label>
              </TabPane>}
            </Fragment>
          </TabContent>
        </div>
      </Fragment>
    );
  };

  render() {
    const { itemName: repoName } = this.props;
    let title = gettext('Transfer Library {library_name}');
    title = title.replace('{library_name}', '<span class="op-target text-truncate mx-1">' + Utils.HTMLescape(repoName) + '</span>');
    return (
      <Modal isOpen={true} style={{ maxWidth: '720px' }} toggle={this.props.toggleDialog} className="transfer-dialog">
        <ModalHeader toggle={this.props.toggleDialog}>
          <span dangerouslySetInnerHTML={{ __html: title }} className="d-flex mw-100"></span>
        </ModalHeader>
        <ModalBody className="transfer-dialog-content" role="tablist">
          {this.renderTransContent()}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.submit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

TransferDialog.propTypes = propTypes;

export default TransferDialog;
