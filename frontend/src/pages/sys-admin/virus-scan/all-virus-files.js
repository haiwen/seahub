import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
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
      curPerPage, hasNextPage, currentPage
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
                <th width="27%">{gettext('Library')}</th>
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


class AllVirusFiles extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      virusFiles: [],
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
    seafileAPI.listVirusFiles(page, perPage).then((res) => {
      const data = res.data;
      this.setState({
        loading: false,
        virusFiles: data.virus_file_list,
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

  render() {
    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center">
          <div className="cur-view-container">
            <Nav currentItem="all" />
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
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default AllVirusFiles;
