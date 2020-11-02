import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import moment from 'moment';
import Repo from '../../models/repo';
import { Utils } from '../../utils/utils';

const propTypes = {
  toggleCancel: PropTypes.func.isRequired,
  addWiki: PropTypes.func.isRequired
};

class WikiSelectDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repos: [],
      repoID: '',
    };
  }

  componentDidMount() {
    seafileAPI.listRepos().then(res => {
      let repoList = res.data.repos
        .filter(item => {
          switch (item.type) {
            case 'mine': // my libraries
              return !item.encrypted;
            case 'shared': // libraries shared with me
              // 'is_admin': the library is shared with 'admin' permission
              return !item.encrypted && item.is_admin;
            case 'group':
            default:
              return !item.encrypted && !res.data.repos.some(repo => {
                // just remove the duplicated libraries
                return repo.type != item.type && repo.repo_id == item.repo_id;
              });
          }
        })
        .map(item => {
          let repo = new Repo(item);
          return repo;
        });
      repoList = Utils.sortRepos(repoList, 'name', 'asc');
      this.setState({repos: repoList});
    });
  }

  onChange = (repo) => {
    this.setState({
      repoID: repo.repo_id,
    });
  }

  handleSubmit = () => {
    let { repoID } = this.state;
    this.props.addWiki(repoID);
    this.props.toggleCancel();
  }

  toggle = () => {
    this.props.toggleCancel();
  }

  render() {
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.toggle}>{gettext('Publish a Library')}</ModalHeader>
        <ModalBody className="dialog-list-container">
          <table>
            <thead>
              <tr>
                <th width='6%'>{/* select */}</th>
                <th width='9%'>{/* icon */}</th>
                <th width='55%'>{gettext('Name')}</th>
                <th width='30%'>{gettext('Last Update')}</th>
              </tr>
            </thead>
            <tbody>
              {this.state.repos.map((repo, index) => {
                return (
                  <tr key={index}>
                    <td className="text-center"><input type="radio" className="vam" name="repo" value={repo.repo_id} onChange={this.onChange.bind(this, repo)} /></td>
                    <td className="text-center"><img src={Utils.getLibIconUrl(repo, false)} width="24" title={Utils.getLibIconTitle(repo)} alt={Utils.getLibIconTitle(repo)} /></td>
                    <td>{repo.repo_name}</td>
                    <td>{moment(repo.last_modified).fromNow()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          {this.state.repoID ?
            <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>:
            <Button color="primary" disabled>{gettext('Submit')}</Button>
          }
        </ModalFooter>
      </Modal>
    );
  }
}

WikiSelectDialog.propTypes = propTypes;

export default WikiSelectDialog;
