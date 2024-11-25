import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { mediaUrl } from '../../utils/constants';
import { isWorkWeixin } from './weixin-utils';
import '../../css/wechat-dialog.css';

const propTypes = {
  toggleWechatDialog: PropTypes.func.isRequired
};

class WechatDialog extends React.PureComponent {

  toggle = () => {
    this.props.toggleWechatDialog();
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle} zIndex='1060'>
        <ModalHeader toggle={this.toggle}>
          加入咨询群
        </ModalHeader>
        <ModalBody>
          <div className="wechat-dialog-body">
            <img src={`${mediaUrl}img/wechat-QR-code.png`} width="150" alt="" />
            <div className="wechat-dialog-message">
              <p>扫描二维码</p>
              <p>{`加入 Seafile ${isWorkWeixin(window.navigator.userAgent.toLowerCase()) ? '企业' : ''}微信咨询群`}</p>
            </div>
          </div>
        </ModalBody>
      </Modal>
    );
  }
}

WechatDialog.propTypes = propTypes;

export default WechatDialog;
