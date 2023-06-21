import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import isHotkey from 'is-hotkey';
import { zIndexes, DIALOG_MAX_HEIGHT, EXTRA_ATTRIBUTES_COLUMN_TYPE } from '../../../constants';
import { gettext } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import { getSelectColumnOptions, getValidColumns } from '../../../utils/extra-attributes';
import Column from './column';
import Loading from '../../loading';
import toaster from '../../toast';

import './index.css';

class ExtraAttributesDialog extends Component {

  constructor(props) {
    super(props);
    const { direntDetail } = props;
    this.state = {
      animationEnd: false,
      isLoading: true,
      update: {},
      row: {},
      columns: [],
      errorMsg: '',
    };
    const direntDetailId = direntDetail.id;
    this.isEmptyFile = direntDetailId === '0'.repeat(direntDetailId.length);
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
  }

  getFormatUpdateData = (update = {}) => {
    const { columns } = this.state;
    const updateData = {};
    for (let key in update) {
      const column = columns.find(column => column.key === key);
      if (column && column.editable) {
        const { type, name } = column;
        const value = update[key];
        if (type === EXTRA_ATTRIBUTES_COLUMN_TYPE.SINGLE_SELECT) {
          const options = getSelectColumnOptions(column);
          const option = options.find(item => item.id === value);
          updateData[name] = option ? option.name : '';
        } else {
          updateData[column.name] = update[key];
        }
      }
    }
    return updateData;
  }

  getData = () => {
    const { repoID, filePath } = this.props;
    seafileAPI.getFileExtendedProperties(repoID, filePath).then(res => {
      const { row, metadata, editable_columns } = res.data;
      this.isExist = Boolean(row._id);
      this.setState({ row: row, columns: getValidColumns(metadata, editable_columns, this.isEmptyFile), isLoading: false, errorMsg: '' });
    }).catch(error => {
      const errorMsg =Utils.getErrorMsg(error);
      this.setState({ isLoading: false, errorMsg });
    });
  }

  createData = (data) => {
    const { repoID, filePath } = this.props;
    seafileAPI.newFileExtendedProperties(repoID, filePath, data).then(res => {
      this.isExist = true;
      this.getData();
    }).catch(error => {
      const errorMsg =Utils.getErrorMsg(error);
      toaster.danger(gettext(errorMsg));
    });
  };

  updateData = (update, column) => {
    const newRow = { ...this.state.row, ...update };
    this.setState({ row: newRow }, () => {
      const data = this.getFormatUpdateData(update);
      const { repoID, filePath } = this.props;
      if (this.isExist) {
        seafileAPI.updateFileExtendedProperties(repoID, filePath, data).then(res => {
          this.setState({ update: {} });
        }).catch(error => {
          const errorMsg =Utils.getErrorMsg(error);
          toaster.danger(gettext(errorMsg));
        });
      } else {
        this.createData(data);
      }
    });
  }

  onHotKey = (event) => {
    if (isHotkey('esc', event)) {
      this.onToggle();
      return;
    }
  }

  onToggle = () => {
    this.props.onToggle();
  }

  getDialogStyle = () => {
    const width = 800;
    return {
      width,
      maxWidth: width,
      marginLeft: (window.innerWidth - width) / 2,
      height: DIALOG_MAX_HEIGHT,
    };
  }

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
  }

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

  }

  renderContent = () => {
    if (!this.state.animationEnd) return null;

    return (
      <>
        <ModalHeader toggle={this.onToggle}>{gettext('Edit extra attributes')}</ModalHeader>
        <ModalBody>
          {this.renderColumns()}
        </ModalBody>
      </>
    );
  }

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

ExtraAttributesDialog.propTypes = {
  repoID: PropTypes.string,
  filePath: PropTypes.string,
  direntDetail: PropTypes.object,
  onToggle: PropTypes.func,
};

export default ExtraAttributesDialog;
