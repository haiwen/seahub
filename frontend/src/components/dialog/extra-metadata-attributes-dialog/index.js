import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import isHotkey from 'is-hotkey';
import { zIndexes, DIALOG_MAX_HEIGHT } from '../../../constants';
import { gettext } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import { getValidColumns } from '../../../utils/extra-attributes';
import Column from './column';
import Loading from '../../loading';
import toaster from '../../toast';
import metadataAPI from '../../../metadata/api';

import './index.css';


class ExtraMetadataAttributesDialog extends Component {

  constructor(props) {
    super(props);
    const { direntDetail, direntType } = props;
    this.state = {
      animationEnd: false,
      isLoading: true,
      update: {},
      row: {},
      columns: [],
      errorMsg: '',
    };
    if (direntType === 'dir') {
      this.isEmptyFile = false;
    } else {
      const direntDetailId = direntDetail?.id || '';
      this.isEmptyFile = direntDetailId === '0'.repeat(direntDetailId.length);
    }
    this.isExist = false;
    this.modalRef = React.createRef();
  }

  componentDidMount() {
    this.startAnimation(this.getData);
    window.addEventListener('keydown', this.onHotKey);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onHotKey);
  }

  startAnimation = (callback) => {
    if (this.state.animationEnd === true) {
      callback && callback();
    }

    // use setTimeout to make sure real dom rendered
    setTimeout(() => {
      let dom = this.modalRef.current.firstChild;
      const { width, maxWidth, marginLeft, height } = this.getDialogStyle();
      dom.style.width = `${width}px`;
      dom.style.maxWidth = `${maxWidth}px`;
      dom.style.marginLeft = `${marginLeft}px`;
      dom.style.height = `${height}px`;
      dom.style.marginRight = 'unset';
      dom.style.marginTop = '28px';

      // after animation, change style and run callback
      setTimeout(() => {
        this.setState({ animationEnd: true }, () => {
          dom.style.transition = 'none';
          callback && callback();
        });
      }, 280);
    }, 1);
  };

  getData = () => {
    const { repoID, filePath, direntType } = this.props;

    let dirName = Utils.getDirName(filePath);
    let fileName = Utils.getFileName(filePath);
    let parentDir = direntType === 'file' ?  dirName : dirName.slice(0, dirName.length - fileName.length - 1);

    if (!parentDir.startsWith('/')) {
      parentDir = '/' + parentDir;
    }

    metadataAPI.getMetadataRecordInfo(repoID, parentDir, fileName).then(res => {
      const { row, metadata, editable_columns } = res.data;
      this.isExist = Boolean(row._id);
      this.setState({ row: row, columns: getValidColumns(metadata, editable_columns, this.isEmptyFile), isLoading: false, errorMsg: '' });
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      this.setState({ isLoading: false, errorMsg });
    });
  };

  updateData = (update, column) => {
    const newRow = { ...this.state.row, ...update };
    this.setState({ row: newRow }, () => {
      const { repoID, filePath } = this.props;

      let newValue = update[column.key];
      let recordID = this.state.row._id;
      if (this.isExist) {
        metadataAPI.updateMetadataRecord(repoID, recordID, column.name, newValue).then(res => {
          this.setState({ update: {}, row: res.data.row });
        }).catch(error => {
          const errorMsg = Utils.getErrorMsg(error);
          toaster.danger(gettext(errorMsg));
        });
      } else {
        // this.createData(data);
      }
    });
  };

  onHotKey = (event) => {
    if (isHotkey('esc', event)) {
      this.onToggle();
      return;
    }
  };

  onToggle = () => {
    this.props.onToggle();
  };

  getDialogStyle = () => {
    const width = 800;
    return {
      width,
      maxWidth: width,
      marginLeft: (window.innerWidth - width) / 2,
      height: DIALOG_MAX_HEIGHT,
    };
  };

  getInitStyle = () => {
    const transition = 'all .3s';
    const defaultMargin = 80; // sequence cell width
    const defaultHeight = 100;
    const marginTop = '30%';
    const width = window.innerWidth;
    return {
      width: `${width - defaultMargin}px`,
      maxWidth: `${width - defaultMargin}px`,
      marginLeft: `${defaultMargin}px`,
      height: `${defaultHeight}px`,
      marginRight: `${defaultMargin}px`,
      marginTop,
      transition,
    };
  };

  renderColumns = () => {
    const { isLoading, errorMsg, columns, row, update } = this.state;
    if (isLoading) {
      return (
        <div className="w-100 h-100 d-flex align-items-center justify-content-center">
          <Loading />
        </div>
      );
    }

    if (errorMsg) {
      return (
        <div className="w-100 h-100 d-flex align-items-center justify-content-center error-message">
          {gettext(errorMsg)}
        </div>
      );
    }

    const newRow = { ...row, ...update };

    return (
      <>
        {columns.map(column => {
          return (
            <Column
              key={column.key}
              column={column}
              row={newRow}
              columns={columns}
              onCommit={this.updateData}
            />
          );
        })}
      </>
    );

  };

  renderContent = () => {
    if (!this.state.animationEnd) return null;

    return (
      <>
        <ModalHeader toggle={this.onToggle}>{gettext('Edit extra properties')}</ModalHeader>
        <ModalBody>
          {this.renderColumns()}
        </ModalBody>
      </>
    );
  };

  render() {
    const { animationEnd } = this.state;

    return (
      <Modal
        isOpen={true}
        className="extra-attributes-dialog"
        style={animationEnd ? this.getDialogStyle() : this.getInitStyle()}
        zIndex={zIndexes.EXTRA_ATTRIBUTES_DIALOG_MODAL}
        contentClassName="extra-attributes-content-container"
        modalClassName="extra-attributes-modal"
        wrapClassName="extra-attributes"
        fade={false}
        innerRef={this.modalRef}
        toggle={this.onToggle}
      >
        {this.renderContent()}
      </Modal>
    );
  }
}

ExtraMetadataAttributesDialog.propTypes = {
  repoID: PropTypes.string,
  filePath: PropTypes.string,
  direntType: PropTypes.string,
  direntDetail: PropTypes.object,
  onToggle: PropTypes.func,
};

export default ExtraMetadataAttributesDialog;
