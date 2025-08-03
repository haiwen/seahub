import React, { Component } from 'react';
import EmptyTip from '../../components/empty-tip';
import SingleDropdownToolbar from '../../components/toolbar/single-dropdown-toolbar';
import ConnectNetworkLibraryDialog from '../../components/dialog/connect-network-library-dialog';
import BaiduAuthCodeDialog from '../../components/dialog/baidu-auth-code-dialog';
import ModalPortal from '../../components/modal-portal';
import Loading from '../../components/loading';
import NetworkLibItem from './network-lib-item';
import BaiduNetdiskBrowser from './baidu-netdisk-browser';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import toaster from '../../components/toast';


class NetworkLibraries extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            errorMsg: '',
            items: [],
            isConnectDialogOpen: false,
            isBaiduAuthDialogOpen: false,
            baiduAuthUrl: '',
            authLoading: false,
            authErrorMsg: '',
            // 百度网盘浏览状态
            showBaiduBrowser: false,
            currentBaiduPath: '/'
        };
    }

    componentDidMount() {
        this.loadNetworkLibraries();
    }

    onConnectNetworkLibrary = () => {
        this.setState({ isConnectDialogOpen: true });
    };

    toggleConnectDialog = () => {
        this.setState({ isConnectDialogOpen: !this.state.isConnectDialogOpen });
    };

    toggleBaiduAuthDialog = () => {
        this.setState({ 
            isBaiduAuthDialogOpen: !this.state.isBaiduAuthDialogOpen,
            authErrorMsg: ''
        });
    };

    onConnectBaiduNetdisk = () => {
        console.log('连接百度网盘');
        // 关闭连接对话框，打开授权对话框
        this.setState({ 
            isConnectDialogOpen: false,
            isBaiduAuthDialogOpen: true,
            authErrorMsg: ''
        });
        
        // 获取授权URL
        seafileAPI.getBaiduNetdiskAuthUrl().then((response) => {
            const { auth_url } = response.data;
            console.log('授权URL:', auth_url);
            this.setState({ baiduAuthUrl: auth_url });
        }).catch((error) => {
            console.error('获取授权URL失败:', error);
            this.setState({ 
                authErrorMsg: '获取授权URL失败，请重试',
                isBaiduAuthDialogOpen: false
            });
        });
    };

    onOpenAuthUrl = () => {
        if (this.state.baiduAuthUrl) {
            window.open(this.state.baiduAuthUrl, '_blank');
        }
    };

    onSubmitAuthCode = (authCode) => {
        this.setState({ authLoading: true, authErrorMsg: '' });
        
        // 发送授权码到后端进行token交换
        seafileAPI.processBaiduNetdiskAuthCode(authCode, null).then((response) => {
            console.log('连接成功:', response.data);
            this.setState({ 
                authLoading: false,
                isBaiduAuthDialogOpen: false,
                authErrorMsg: ''
            });
            // 刷新网络库列表或显示成功消息
            this.loadNetworkLibraries();
            // 可以在这里显示成功提示
            alert('百度网盘连接成功！');
        }).catch((error) => {
            console.error('连接失败:', error);
            let errorMsg = '连接失败，请重试';
            if (error.response && error.response.data && error.response.data.error_msg) {
                errorMsg = error.response.data.error_msg;
            }
            this.setState({ 
                authLoading: false,
                authErrorMsg: errorMsg
            });
        });
    };

    // 加载网络库列表
    loadNetworkLibraries = () => {
        this.setState({ loading: true, errorMsg: '' });
        
        seafileAPI.getNetworkLibraries().then((response) => {
            const { network_libs } = response.data;
            this.setState({
                loading: false,
                items: network_libs || []
            });
        }).catch((error) => {
            console.error('获取网络库列表失败:', error);
            this.setState({
                loading: false,
                errorMsg: '获取网络库列表失败',
                items: []
            });
        });
    };

    // 处理网络库项点击
    onNetworkLibClick = (networkLib) => {
        console.log('点击网络库:', networkLib);
        if (networkLib.type === 'baidu_netdisk') {
            // 显示百度网盘文件浏览界面
            this.setState({ 
                showBaiduBrowser: true,
                currentBaiduPath: '/'
            });
        }
    };

    // 返回网络库列表
    onBackToNetworkLibs = () => {
        this.setState({ 
            showBaiduBrowser: false,
            currentBaiduPath: '/'
        });
    };

    render() {
        const { 
            loading, 
            errorMsg, 
            items, 
            isConnectDialogOpen, 
            isBaiduAuthDialogOpen,
            authLoading,
            authErrorMsg,
            showBaiduBrowser,
            currentBaiduPath
        } = this.state;

        // 如果正在显示百度网盘浏览器，渲染百度网盘界面
        if (showBaiduBrowser) {
            return (
                <BaiduNetdiskBrowser
                    initialPath={currentBaiduPath}
                    onBack={this.onBackToNetworkLibs}
                />
            );
        }

        if (loading) {
            return (
                <div className="main-panel-center">
                    <div className="cur-view-container">
                        <Loading />
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
                        {items.length === 0 ? (
                            <EmptyTip
                                title="没有网络库"
                                text="尚未连接任何网络库。网络库可以通过网络连接访问。你可以通过单击上方的加号按钮选择'连接网络库'来添加网络库。"
                            />
                        ) : (
                            <table className="table table-hover table-vcenter">
                                <thead>
                                    <tr>
                                        <th width="5%"></th>
                                        <th width="5%"></th>
                                        <th width="35%">名称</th>
                                        <th width="15%">状态</th>
                                        <th width="15%">大小</th>
                                        <th width="25%">最后修改时间</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <NetworkLibItem
                                            key={item.id || index}
                                            networkLib={item}
                                            onItemClick={this.onNetworkLibClick}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        )}
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
                    {isBaiduAuthDialogOpen && (
                        <ModalPortal>
                            <BaiduAuthCodeDialog
                                isOpen={isBaiduAuthDialogOpen}
                                toggle={this.toggleBaiduAuthDialog}
                                onSubmit={this.onSubmitAuthCode}
                                onOpenAuthUrl={this.onOpenAuthUrl}
                                isLoading={authLoading}
                                errorMsg={authErrorMsg}
                            />
                        </ModalPortal>
                    )}
                </div>
            </div>
        );
    }
}

export default NetworkLibraries;

