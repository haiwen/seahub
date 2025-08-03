import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormGroup, Label, Input, Alert } from 'reactstrap';
import { gettext } from '../../utils/constants';

class BaiduAuthCodeDialog extends Component {
  constructor(props) {
    super(props);
    this.state = {
      authCode: '',
      isLoading: false,
      errorMsg: ''
    };
  }

  handleInputChange = (e) => {
    this.setState({ authCode: e.target.value, errorMsg: '' });
  };

  handleSubmit = (e) => {
    e.preventDefault();
    const { authCode } = this.state;
    
    if (!authCode.trim()) {
      this.setState({ errorMsg: '请输入授权码' });
      return;
    }

    this.setState({ isLoading: true, errorMsg: '' });
    this.props.onSubmit(authCode.trim());
  };

  componentDidUpdate(prevProps) {
    if (prevProps.isLoading && !this.props.isLoading) {
      this.setState({ isLoading: false });
    }
    if (prevProps.errorMsg !== this.props.errorMsg) {
      this.setState({ errorMsg: this.props.errorMsg });
    }
  }

  render() {
    const { isOpen, toggle } = this.props;
    const { authCode, isLoading, errorMsg } = this.state;

    return (
      <Modal isOpen={isOpen} toggle={toggle} size="md">
        <ModalHeader toggle={toggle}>
          百度网盘授权
        </ModalHeader>
        <ModalBody>
          <div className="mb-3">
            <p>请按以下步骤完成授权：</p>
            <ol>
              <li>点击下方"打开授权页面"按钮</li>
              <li>在新页面中登录您的百度账号并授权</li>
              <li>授权成功后，页面会显示授权码</li>
              <li>复制授权码并粘贴到下方输入框中</li>
              <li>点击"完成授权"按钮</li>
            </ol>
          </div>
          
          <div className="mb-3">
            <Button 
              color="primary" 
              onClick={this.props.onOpenAuthUrl}
              disabled={isLoading}
            >
              打开授权页面
            </Button>
          </div>

          {errorMsg && (
            <Alert color="danger" className="mb-3">
              {errorMsg}
            </Alert>
          )}

          <Form onSubmit={this.handleSubmit}>
            <FormGroup>
              <Label for="authCode">授权码</Label>
              <Input
                type="text"
                id="authCode"
                value={authCode}
                onChange={this.handleInputChange}
                placeholder="请输入从授权页面获取的授权码"
                disabled={isLoading}
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggle} disabled={isLoading}>
            取消
          </Button>
          <Button 
            color="primary" 
            onClick={this.handleSubmit}
            disabled={isLoading || !authCode.trim()}
          >
            {isLoading ? '处理中...' : '完成授权'}
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}

BaiduAuthCodeDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onOpenAuthUrl: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  errorMsg: PropTypes.string
};

BaiduAuthCodeDialog.defaultProps = {
  isLoading: false,
  errorMsg: ''
};

export default BaiduAuthCodeDialog; 

