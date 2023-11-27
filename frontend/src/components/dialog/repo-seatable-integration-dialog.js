import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap';
import SeatableAccountSettingList from '../seatable-integration-account-setting-widgets/seatable-account-setting-list.js';
import AddSeatableAccountSetting from '../../components/seatable-integration-account-setting-widgets/add-seatable-account-setting.js';
import toaster from '../toast';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { gettext, internalFilePath, dirPath } from '../../utils/constants';

import '../../css/repo-seatable-integration-dialog.css';

const propTypes = {
  repo: PropTypes.object.isRequired,
  onSeaTableIntegrationToggle: PropTypes.func.isRequired,
};

const STATUS = {
  SEATABLE_ACCOUNT_MANAGE: 'seatable_account_manage',
  ADD_SETABLE_ACCOUNT: 'add_seatable_account',
  UPDATE_SEATABLE_ACCOUNT: 'update_seatable_account'
};

class RepoSeaTableIntegrationDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'Seatable',
      seatableSettings: [],
      baseApiToken: '',
      isPasswordVisible: false,
      isShowDialog: false,
      currentDtableInfo: {},
      status: STATUS.SEATABLE_ACCOUNT_MANAGE,
    };
    this.repo = this.props.repo;
  }

  componentDidMount() {
    this.getSeatableSettings();
  }

  getSeatableSettings = async (status) => {
    seafileAPI.req.defaults.headers.Authorization = null;
    const [downloadLinkRes] = await seafileAPI.getFileDownloadLink(this.repo.repo_id, internalFilePath).then(res => [res, null]).catch((err) => [null, err]);
    if (downloadLinkRes && downloadLinkRes.data) {
      const fileInfoRes = await seafileAPI.getFileContent(downloadLinkRes.data);
      if (fileInfoRes?.data && fileInfoRes.data) {
        this.setState({
          seatableSettings: fileInfoRes.data
        });
        status && this.setState({ status });
      }
    }
  };

  changeTab = (tab) => {
    if (this.state.activeTab !== tab) {
      this.setState({activeTab: tab});
    }
  };

  changeStatus = (status) => {
    this.setState({status});
  };

  getFile = (detail, fileList) => {
    const { base_name, seatable_url, seatable_api_token } = detail;
    let content = [{
      'base_name': base_name,
      'seatable_server_url': seatable_url,
      'base_api_token': seatable_api_token
    }];

    if (fileList && fileList.length !== 0) {
      const index = fileList?.findIndex((item) => item.base_api_token === seatable_api_token);
      if (index !== -1) {
        fileList[index] = content[0];
      } else {
        fileList.push(content[0]);
      }
      content = fileList;
    }

    const fileName = internalFilePath.split('/')[2];
    const fileContent = JSON.stringify(content);
    const newFile = new File([fileContent], fileName);
    return newFile;
  };

  editSeatableSettingAccount = (baseApiToken) => {
    const { seatableSettings } = this.state;
    this.setState({
      status: STATUS.UPDATE_SEATABLE_ACCOUNT,
      currentDtableInfo: seatableSettings.find((item) => item.base_api_token === baseApiToken)
    });
  };

  deleteStableAccountSetting = async (setting, status) => {
    const { base_api_token } = setting;
    seafileAPI.req.defaults.headers.Authorization = null;
    const [downloadLinkRes] = await seafileAPI.getFileDownloadLink(this.repo.repo_id, internalFilePath).then(res => [res, null]).catch((err) => [null, err]);
    if (downloadLinkRes && downloadLinkRes.data) {
      const fileInfoRes = await seafileAPI.getFileContent(downloadLinkRes.data);
      if (fileInfoRes?.data) {
        const fileList = fileInfoRes.data;
        const index = fileList?.findIndex((item) => item.base_api_token === base_api_token);
        if (index !== -1) {
          fileList.splice(index, 1);
          const fileContent = JSON.stringify(fileList);
          const fileName = internalFilePath.split('/')[2];
          const newFile = new File([fileContent], fileName);
          const updateLink = await seafileAPI.getUpdateLink(this.repo.repo_id, internalFilePath.slice(0, 10));
          await seafileAPI.updateFile(updateLink.data, internalFilePath, fileName, newFile).catch(err => {toaster.danger(gettext(err.message));});
          this.getSeatableSettings(status);
        }
      }
    }
  };

  onSubmit = async (detail, status) => {
    seafileAPI.req.defaults.headers.Authorization = null;
    const [downloadLinkRes, err] = await seafileAPI.getFileDownloadLink(this.repo.repo_id, internalFilePath).then(res => [res, null]).catch((err) => [null, err]);
    // Contains configuration files
    if (downloadLinkRes && downloadLinkRes.data) {
      const fileInfoRes = await seafileAPI.getFileContent(downloadLinkRes.data);
      if (fileInfoRes?.data) {
        const newFile = this.getFile(detail, fileInfoRes.data);
        const updateLink = await seafileAPI.getUpdateLink(this.repo.repo_id, internalFilePath.slice(0, 10));
        const fileName = internalFilePath.split('/')[2];
        await seafileAPI.updateFile(updateLink.data, internalFilePath, fileName, newFile).catch(err => {toaster.danger(gettext(err.message));});
        this.getSeatableSettings(status);
      }
    }
    // No configuration file
    if (err) {
      const uploadLink = await seafileAPI.getFileServerUploadLink(this.repo.repo_id, dirPath);
      const newFile = this.getFile(detail);
      const formData = new FormData();
      formData.append('file', newFile);
      formData.append('relative_path', internalFilePath.split('/')[1]);
      formData.append('parent_dir', dirPath);
      await seafileAPI.uploadImage(uploadLink.data + '?ret-json=1', formData).catch(err => {toaster.danger(gettext(err.message));});
      this.getSeatableSettings(status);
    }
  };

  render() {
    const { activeTab, seatableSettings, status, currentDtableInfo } = this.state;
    const { onSeaTableIntegrationToggle } = this.props;
    let repo = this.repo;
    const itemName = '<span class="op-target">' + Utils.HTMLescape(repo.repo_name) + '</span>';
    const title = gettext('{placeholder} SeaTable integration').replace('{placeholder}', itemName);

    return (
      <Modal
        isOpen={true}
        toggle={onSeaTableIntegrationToggle}
        className="account-dialog"
      >
        <ModalHeader toggle={onSeaTableIntegrationToggle}>
          <p dangerouslySetInnerHTML={{__html: title}} className="m-0"></p>
        </ModalHeader>
        <ModalBody className="account-dialog-content">
          <Fragment>
            <div className="account-dialog-side">
              <Nav pills vertical className="w-100">
                <NavItem>
                  <NavLink className={activeTab === 'Seatable' ? 'active' : ''} onClick={this.changeTab.bind(this, 'Seatable')}>
                    {'SeaTable'}
                  </NavLink>
                </NavItem>
              </Nav>
            </div>
            <div className="account-dialog-main">
              <TabContent activeTab={activeTab}>
                <TabPane tabId="Seatable">
                  <div className="h-100">
                    {status === STATUS.SEATABLE_ACCOUNT_MANAGE &&
                    <SeatableAccountSettingList
                      seatableSettings={seatableSettings}
                      changeStatus={() => this.changeStatus(STATUS.ADD_SETABLE_ACCOUNT)}
                      editSeatableSettingAccount={this.editSeatableSettingAccount}
                      deleteStableAccountSetting={this.deleteStableAccountSetting}
                    />
                    }
                    {status === STATUS.ADD_SETABLE_ACCOUNT &&
                    <AddSeatableAccountSetting
                      changeStatus={() => this.changeStatus(STATUS.SEATABLE_ACCOUNT_MANAGE)}
                      onSubmit={this.onSubmit}
                    />
                    }
                    {status === STATUS.UPDATE_SEATABLE_ACCOUNT &&
                    <AddSeatableAccountSetting
                      currentDtableInfo={currentDtableInfo}
                      changeStatus={() => this.changeStatus(STATUS.SEATABLE_ACCOUNT_MANAGE)}
                      onSubmit={this.onSubmit}
                    />
                    }
                  </div>
                </TabPane>
              </TabContent>
            </div>
          </Fragment>
        </ModalBody>
      </Modal>
    );
  }
}

RepoSeaTableIntegrationDialog.propTypes = propTypes;

export default RepoSeaTableIntegrationDialog;
