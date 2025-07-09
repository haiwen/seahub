import React, { Component } from 'react';
import EmptyTip from '../../components/empty-tip';
import SingleDropdownToolbar from '../../components/toolbar/single-dropdown-toolbar';
import ConnectNetworkLibraryDialog from '../../components/dialog/connect-network-library-dialog';
import ModalPortal from '../../components/modal-portal';
import { gettext } from '../../utils/constants';

class NetworkLibraries extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            errorMsg: '',
            items: [],
            isConnectDialogOpen: false
        };
    }

      componentDidMount() {
    // 这里可以添加加载网络库的逻辑
    this.setState({
      loading: false,
      items: []
    });
  }

  onConnectNetworkLibrary = () => {
    this.setState({ isConnectDialogOpen: true });
  };

  toggleConnectDialog = () => {
    this.setState({ isConnectDialogOpen: !this.state.isConnectDialogOpen });
  };

  onConnectBaiduNetdisk = () => {
    // 这里是您要实现的百度网盘连接接口
    console.log('连接百度网盘');
    // 关闭对话框
    this.setState({ isConnectDialogOpen: false });
    // TODO: 在这里添加您的百度网盘连接逻辑
  };

    render() {
        const { loading, errorMsg, items, isConnectDialogOpen } = this.state;

        if (loading) {
            return (
                <div className="main-panel-center">
                    <div className="cur-view-container">
                        <div className="loading-tip text-center">
                            <i className="sf2-icon-loading"></i>
                        </div>
                    </div>
                </div>
            );
        }

        if (errorMsg) {
            return (
                <div className="main-panel-center">
                    <div className="cur-view-container">
                        <div className="error-msg text-center">
                            {errorMsg}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="main-panel-center">
                <div className="cur-view-container">
                    <div className="cur-view-path">
                        <h3 className="sf-heading m-0 d-flex align-items-center">
                            我的网络库
                            <SingleDropdownToolbar
                                withPlusIcon={true}
                                opList={[
                                    { 'text': '连接网络库', 'onClick': this.onConnectNetworkLibrary }
                                ]}
                            />
                        </h3>
                    </div>
                    <div className="cur-view-content">
                        <EmptyTip
                            title="没有网络库"
                            text="尚未连接任何网络库。网络库可以通过网络连接访问。你可以通过单击上方的加号按钮选择'连接网络库'来添加网络库。"
                        />
                    </div>
                    {isConnectDialogOpen && (
                        <ModalPortal>
                            <ConnectNetworkLibraryDialog
                                isOpen={isConnectDialogOpen}
                                toggle={this.toggleConnectDialog}
                                onConnectBaiduNetdisk={this.onConnectBaiduNetdisk}
                            />
                        </ModalPortal>
                    )}
                </div>
            </div>
        );
    }
}

export default NetworkLibraries;

