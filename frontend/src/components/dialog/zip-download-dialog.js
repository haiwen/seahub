import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { gettext, fileServerRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import Loading from '../loading';

const propTypes = {
  token: PropTypes.string,
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string,
  target: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.array
  ]),
  toggleDialog: PropTypes.func.isRequired
};

let interval;

class ZipDownloadDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errorMsg: '',
      zipProgress: null
    };
  }

  componentDidMount() {
    const { token, path, repoID, target } = this.props;
    let getZipTask;
    if (token) {
      getZipTask = target.length ?
        seafileAPI.getShareLinkDirentsZipTask(token, path, target) :
        seafileAPI.getShareLinkZipTask(token, path);
    } else {
      getZipTask = seafileAPI.zipDownload(repoID, path, target);
    }
    getZipTask.then((res) => {
      const zipToken = res.data['zip_token'];
      this.setState({
        isLoading: false,
        errorMsg: '',
        zipToken: zipToken
      });
      this.queryZipProgress();
      interval = setInterval(this.queryZipProgress, 1000);
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      this.setState({
        isLoading: false,
        errorMsg: errorMsg
      });
    });
  }

  queryZipProgress = () => {
    const zipToken = this.state.zipToken;
    seafileAPI.queryZipProgress(zipToken).then((res) => {
      const data = res.data;
      if (data.failed == 1) {
        clearInterval(interval);
        this.setState({
          isLoading: false,
          errorMsg: data.failed_reason
        });
      } else {
        this.setState({
          zipProgress: data.total == 0 ? '100%' : (data.zipped/data.total*100).toFixed(2) + '%'
        });
        if (data['total'] == data['zipped']) {
          clearInterval(interval);
          this.props.toggleDialog();
          location.href = `${fileServerRoot}zip/${zipToken}`;
        }
      }
    }).catch((error) => {
      clearInterval(interval);
      let errorMsg = Utils.getErrorMsg(error);
      this.setState({
        isLoading: false,
        errorMsg: errorMsg
      });
    });
  }

  cancelZipTask = () => {
    const zipToken = this.state.zipToken;
    seafileAPI.cancelZipTask(zipToken).then((res) => {
    // do nothing
    }).catch((error) => {
    // do nothing
    });
  }

  toggleDialog = () => {
    const zipProgress = this.state.zipProgress;
    if (zipProgress && zipProgress != '100%') {
      clearInterval(interval);
      this.cancelZipTask();
    }
    this.props.toggleDialog();
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggleDialog}>
        <ModalHeader toggle={this.toggleDialog}>{gettext('Download')}</ModalHeader>
        <ModalBody>
          <Content data={this.state} />
        </ModalBody>
      </Modal>
    );
  }
}

class Content extends React.Component {

  render() {
    const {isLoading, errorMsg, zipProgress} = this.props.data;

    if (isLoading) {
      return <Loading />;
    }

    if (errorMsg) {
      return <p className="error mt-4 text-center">{errorMsg}</p>;
    }

    return <p className="mt-4 text-center">{`${gettext('Packaging...')} ${zipProgress}`}</p>;
  }
}

ZipDownloadDialog.propTypes = propTypes;

export default ZipDownloadDialog;
