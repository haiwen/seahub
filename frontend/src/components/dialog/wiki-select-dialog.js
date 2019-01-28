import React from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import moment from 'moment';
import Repo from '../../models/repo';
import { Utils } from '../../utils/utils';

const propTypes = {
  toggleCancel: PropTypes.func.isRequired,
  addWiki: PropTypes.func.isRequired,
};

class WikiSelectDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repos: [],
      isExist: true,
      name: '',
      repoID: '',
    };
  }

  componentDidMount() {
    seafileAPI.listRepos().then(res => {
      let repoList = res.data.repos.map(item => {
        let repo = new Repo(item);
        return repo;
      });
      repoList = Utils.sortRepos(repoList, 'name', 'asc');
      this.setState({repos: repoList}); 
    });
  }

  onChange = (repo) => {
    this.setState({
      name: repo.repo_name,
      repoID: repo.repo_id,
    });
  }

  handleSubmit = () => {
    let { isExist, name, repoID } = this.state;
    this.props.addWiki(isExist, name, repoID);
    this.props.toggleCancel();
  }

  toggle = () => {
    this.props.toggleCancel();
  }

  render() {
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.toggle}>{gettext('Choose a library as Wiki')}</ModalHeader>
        <ModalBody className="dialog-list-container">
          <table>
            <thead>
              <tr>
                <th width='12%'>{/* select */}</th>
                <th width='13%'>{/* icon */}</th>
                <th width='50%'>{gettext('Name')}</th>
                <th width='25%'>{gettext('Last Update')}</th>
              </tr>
            </thead>
            <tbody>
              {this.state.repos.map((repo, index) => {
                return (
                  <tr key={index}>
                    <td className="text-center"><input type="radio" className="vam" name="repo" value={repo.repo_id} onChange={this.onChange.bind(this, repo)} /></td>
                    <td className="text-center"><img src={siteRoot + 'media/img/lib/48/lib.png'} width="24" alt={gettext('icon')} /></td>
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
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

WikiSelectDialog.propTypes = propTypes;

export default WikiSelectDialog;
