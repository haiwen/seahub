import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext } from '../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

import '../../css/connect-network-library-dialog.css';

const propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  onConnectBaiduNetdisk: PropTypes.func.isRequired,
};

class ConnectNetworkLibraryDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: false,
    };
  }

  onConnectBaiduNetdisk = () => {
    this.setState({ isLoading: true });
    this.props.onConnectBaiduNetdisk();
  };

  render() {
    const { isOpen, toggle } = this.props;
    const { isLoading } = this.state;

    return (
      <Modal isOpen={isOpen} toggle={toggle} className="connect-network-library-dialog">
        <SeahubModalHeader toggle={toggle}>连接网络库</SeahubModalHeader>
        <ModalBody>
          <div className="network-library-list">
            <div className="network-library-item" onClick={this.onConnectBaiduNetdisk}>
              <div className="network-library-icon">
                <img src="/media/img/baidu-netdisk-icon.svg" alt="百度网盘" />
              </div>
              <div className="network-library-name">百度网盘</div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggle}>取消</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ConnectNetworkLibraryDialog.propTypes = propTypes;

export default ConnectNetworkLibraryDialog;
