import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';
import OpMenu from '../../../components/dialog/op-menu';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import MainPanelTopbar from '../main-panel-topbar';
import Nav from './nav';

const virusFileItemPropTypes = {
  virusFile: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired
};

class VirusFileItem extends Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      isOpIconShown: false
    };
  }

  handleMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: true,
        highlight: true
      });
    }
  }

  handleMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: false,
        highlight: false
      });
    }
  }

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOpIconShow: false
    });
    this.props.onUnfreezedItem();
  }

  onMenuItemClick = (operation) => {
    this.props.handleFile(this.props.virusFile.virus_id, operation);
  }

  translateOperations = (item) => {
    let translateResult = '';
    switch(item) {
      case 'delete':
        translateResult = gettext('Delete');
        break;
      case 'ignore':
        translateResult = gettext('Ignore');
        break;
      case 'do-not-ignore':
        translateResult = gettext('Don\'t ignore');
        break;
    }
    return translateResult;
  }

  toggleItemSelected = (e) => {
    this.props.toggleItemSelected(this.props.virusFile, e.target.checked);
  }

  render() {
    const virusFile = this.props.virusFile;
    let fileStatus = '',
      fileOpList = [];
    if (virusFile.has_deleted) {
      fileStatus = <span className="text-green">{gettext('Deleted')}</span>;
    } else if (virusFile.has_ignored) {
      fileStatus = <span className="text-orange">{gettext('Ignored')}</span>;
      fileOpList = ['do-not-ignore'];
    } else {
      fileStatus = <span className="text-red">{gettext('Unhandled')}</span>;
      fileOpList = ['delete', 'ignore'];
    }

    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
        <td className="text-center">
          <input type="checkbox" checked={virusFile.isSelected} onChange={this.toggleItemSelected} />
        </td>
        <td>{virusFile.repo_name}</td>
        <td>{virusFile.repo_owner}</td>
        <td>{virusFile.file_path}</td>
        <td>{fileStatus}</td>
        <td>
          {fileOpList.length > 0 && this.state.isOpIconShown &&
            <OpMenu
              operations={fileOpList}
              translateOperations={this.translateOperations}
              onMenuItemClick={this.onMenuItemClick}
              onFreezedItem={this.props.onFreezedItem}
              onUnfreezedItem={this.onUnfreezedItem}
            />
          }
        </td>
      </tr>
    );
  }
}

VirusFileItem.propTypes = virusFileItemPropTypes;


const virusFileListPropTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  virusFiles: PropTypes.array.isRequired
};

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  getPreviousPage = () => {
    this.props.getListByPage(this.props.currentPage - 1);
  }

  getNextPage = () => {
    this.props.getListByPage(this.props.currentPage + 1);
  }

  render() {
    const {
      loading, errorMsg, virusFiles,
      curPerPage, hasNextPage, currentPage,
      isAllItemsSelected
    } = this.props;

    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      return (
        <Fragment>
          <table>
            <thead>
              <tr>
                <th width="3%" className="text-center">
                  <input type="checkbox" checked={isAllItemsSelected} onChange={this.props.toggleAllSelected} />
                </th>
                <th width="24%">{gettext('Library')}</th>
                <th width="25%">{gettext('Owner')}</th>
                <th width="28%">{gettext('Virus File')}</th>
                <th width="15%">{gettext('Status')}</th>
                <th width="5%">{/* Operations */}</th>
              </tr>
            </thead>
            <tbody>
              {virusFiles.map((virusFile, index) => {
                return (
                  <VirusFileItem
                    key={index}
                    virusFile={virusFile}
                    isItemFreezed={this.state.isItemFreezed}
                    onFreezedItem={this.onFreezedItem}
                    onUnfreezedItem={this.onUnfreezedItem}
                    handleFile={this.props.handleFile}
                    toggleItemSelected={this.props.toggleItemSelected}
                  />
                );
              })}
            </tbody>
          </table>
          {virusFiles.length > 0 &&
          <Paginator
            gotoPreviousPage={this.getPreviousPage}
            gotoNextPage={this.getNextPage}
            currentPage={currentPage}
            hasNextPage={hasNextPage}
            curPerPage={curPerPage}
            resetPerPage={this.props.resetPerPage}
          />
          }
        </Fragment>
      );
    }
  }
}

Content.propTypes = virusFileListPropTypes;


class UnhandledVirusFiles extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      virusFiles: [],

      isAllItemsSelected: false,
      selectedItems: [],

      currentPage: 1,
      perPage: 25,
      hasNextPage: false
    };
  }

  componentDidMount() {
    let urlParams = (new URL(window.location)).searchParams;
    const {
      currentPage, perPage
    } = this.state;
    this.setState({
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      this.getListByPage(this.state.currentPage);
    });
  }

  getListByPage = (page) => {
    const { perPage } = this.state;
    const hasHandled = false;
    seafileAPI.listVirusFiles(page, perPage, hasHandled).then((res) => {
      const data = res.data;
      const items = data.virus_file_list.map(item => {
        item.isSelected = false;
        return item;
      });
      this.setState({
        loading: false,
        virusFiles: items,
        hasNextPage: data.has_next_page
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getListByPage(1);
    });
  }

  handleFile = (virusID, op) => {
    let request;
    switch(op) {
      case 'delete':
        request = seafileAPI.deleteVirusFile(virusID);
        break;
      case 'ignore':
        request = seafileAPI.toggleIgnoreVirusFile(virusID, true);
        break;
      case 'do-not-ignore':
        request = seafileAPI.toggleIgnoreVirusFile(virusID, false);
        break;
    }
    request.then((res) => {
      this.setState({
        virusFiles: this.state.virusFiles.map((item) => {
          if (item.virus_id == virusID) {
            if (op == 'delete') {
              item.has_deleted = true;
            } else {
              item = res.data.virus_file;
            }
          }
          return item;
        })
      });
    }).catch((error) => {
      toaster.danger(Utils.getErrorMsg(error));
    });
  }

  toggleAllSelected = () => {
    this.setState((prevState) => ({
      isAllItemsSelected: !prevState.isAllItemsSelected,
      virusFiles: this.state.virusFiles.map((item) => {
        item.isSelected = !prevState.isAllItemsSelected;
        return item;
      })
    }));
  }

  toggleItemSelected = (targetItem, isSelected) => {
    this.setState({
      virusFiles: this.state.virusFiles.map((item) => {
        if (item === targetItem) {
          item.isSelected = isSelected;
        }
        return item;
      })
    }, () => {
      this.setState({
        isAllItemsSelected: !this.state.virusFiles.some(item => !item.isSelected)
      });
    });
  }

  handleSelectedItems = (op) => {
    // op: 'delete-virus', 'ignore-virus'
    const virusIDs = this.state.virusFiles
      .filter(item => {
        if (op == 'delete-virus') {
          return item.isSelected && !item.has_deleted;
        } else {
          return item.isSelected && !item.has_ignored;
        }
      })
      .map(item => item.virus_id);
    seafileAPI.batchProcessVirusFiles(virusIDs, op).then((res) => {
      let fileList = this.state.virusFiles;
      res.data.success.forEach(item => {
        let file = fileList.find(file => file.virus_id == item.virus_id);
        if (op == 'delete-virus') {
          file.has_deleted = true;
        } else {
          file.has_ignored = true;
        }
      });
      this.setState({
        virusFiles: fileList
      });

      res.data.failed.forEach(item => {
        const file = fileList.find(file => file.virus_id == item.virus_id);
        let errMsg = op == 'delete-virus' ?
          gettext('Failed to delete %(virus_file) from library %(library): %(error_msg)') :
          gettext('Failed to ignore %(virus_file) from library %(library): %(error_msg)');
        errMsg = errMsg.replace('%(virus_file)', file.file_path)
          .replace('%(library)', file.repo_name)
          .replace('%(error_msg)', item.error_msg);
        toaster.danger(errMsg);
      });
    }).catch((error) => {
      toaster.danger(Utils.getErrorMsg(error));
    });
  }

  deleteSelectedItems = () => {
    const op = 'delete-virus';
    this.handleSelectedItems(op);
  }

  ignoreSelectedItems = () => {
    const op = 'ignore-virus';
    this.handleSelectedItems(op);
  }

  render() {
    return (
      <Fragment>
        {this.state.virusFiles.some(item => item.isSelected) ? (
          <MainPanelTopbar {...this.props}>
            <Fragment>
              <Button onClick={this.deleteSelectedItems} className="operation-item">{gettext('Delete')}</Button>
              <Button onClick={this.ignoreSelectedItems} className="operation-item">{gettext('Ignore')}</Button>
            </Fragment>
          </MainPanelTopbar>
        ) : <MainPanelTopbar {...this.props} />
        }
        <div className="main-panel-center">
          <div className="cur-view-container">
            <Nav currentItem="unhandled" />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                virusFiles={this.state.virusFiles}
                currentPage={this.state.currentPage}
                hasNextPage={this.state.hasNextPage}
                curPerPage={this.state.perPage}
                resetPerPage={this.resetPerPage}
                getListByPage={this.getListByPage}
                handleFile={this.handleFile}
                isAllItemsSelected={this.state.isAllItemsSelected}
                toggleAllSelected={this.toggleAllSelected}
                toggleItemSelected={this.toggleItemSelected}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default UnhandledVirusFiles;
