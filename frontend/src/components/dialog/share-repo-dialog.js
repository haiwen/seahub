import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Input, Alert } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Repo from '../../models/repo';

const shareRepoListItemProps = {
  repo: PropTypes.object.isRequired,
  onRepoSelect: PropTypes.func.isRequired,
  onPermissionChange: PropTypes.func.isRequired,
};

class ShareRepoListItem extends React.Component {

  onRepoSelect = (e) => {
    let isChecked = e.target.checked;
    this.props.onRepoSelect(this.props.repo, isChecked);
  }

  onPermissionChange = (e) => {
    let permission = e.target.value;
    let repo = this.props.repo;
    this.props.onPermissionChange(repo, permission);
  }

  render() {
    let repo = this.props.repo;
    let iconUrl = Utils.getLibIconUrl(repo);
    return (
      <tr>
        <td className="text-center"><input type="checkbox" className="vam" name="repo" onChange={this.onRepoSelect} /></td>
        <td className="text-center"><img src={iconUrl} width="24" alt={gettext('icon')} /></td>
        <td className="name">{repo.repo_name}</td>
        <td>{moment(repo.last_modified).fromNow()}</td>
        <td>
          <Input style={{height: '1.5rem', padding: 0}} type="select" name="select" onChange={this.onPermissionChange} value={repo.sharePermission}>
            <option value='rw'>{gettext('Read-Write')}</option>
            <option value='r'>{gettext('Read-Only')}</option>
          </Input>
        </td>
      </tr>
    );
  }
}

ShareRepoListItem.propTypes = shareRepoListItemProps;

const propTypes = {
  onRepoSelectedHandler: PropTypes.func.isRequired,
  onShareRepoDialogClose: PropTypes.func.isRequired,
};

class ShareRepoDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repoList: [],
      currentRepo: null,
      permission: 'rw',
      selectedRepoList: [],
      errMessage: '',
    };
  }

  componentDidMount() {
    seafileAPI.listRepos({type: 'mine'}).then(res => {
      let repoList = res.data.repos.map(item => {
        let repo = new Repo(item);
        repo.sharePermission = 'rw';
        return repo;
      });
      this.setState({repoList: repoList});
    });
  }

  onRepoSelect = (repo, isChecked) => {
    let selectedRepoList = [];
    if (isChecked) {
      this.state.selectedRepoList.push(repo);
      selectedRepoList = this.state.selectedRepoList;
    } else {
      selectedRepoList = this.state.selectedRepoList.filter(item => {
        return item.repo_id !== repo.repo_id;
      });
    }
    this.setState({selectedRepoList: selectedRepoList});
  }

  onPermissionChange = (repo, permission) => {
    let repoList = this.state.repoList.map(item => {
      if (item.repo_id === repo.repo_id) {
        item.sharePermission = permission;
      }
      return item;
    });
    this.setState({repoList: repoList});
  }

  handleSubmit = () => {
    if (this.state.selectedRepoList.length === 0) {
      let errMessage = gettext('Please select a library to share.');
      this.setState({errMessage: errMessage});
      return;
    }

    this.props.onRepoSelectedHandler(this.state.selectedRepoList);
    this.onCloseDialog();
  }

  onCloseDialog = () => {
    this.props.onShareRepoDialogClose();
  }

  render() {
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.toggle}>{gettext('Select libraries to share')}</ModalHeader>
        <ModalBody className="dialog-list-container">
          <table>
            <thead>
              <tr>
                <th width='4%'>{/* select */}</th>
                <th width='6%'>{/* icon */}</th>
                <th width='35%'>{gettext('Name')}</th>
                <th width='25%'>{gettext('Last Update')}</th>
                <th width='30%'>{gettext('Permission')}</th>
              </tr>
            </thead>
            <tbody>
              {this.state.repoList.map((repo, index) => {
                return (
                  <ShareRepoListItem
                    key={index}
                    repo={repo}
                    onRepoSelect={this.onRepoSelect}
                    onPermissionChange={this.onPermissionChange}
                  />
                );
              })}
            </tbody>
          </table>
        </ModalBody>
        {this.state.errMessage && <Alert color="danger" className="mt-2">{this.state.errMessage}</Alert>}
        <ModalFooter>
          <Button color="secondary" onClick={this.onCloseDialog}>{gettext('Close')}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ShareRepoDialog.propTypes = propTypes;

export default ShareRepoDialog;
