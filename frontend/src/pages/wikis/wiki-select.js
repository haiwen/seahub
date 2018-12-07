import React from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import moment from 'moment';

const propTypes = {
  toggleCancel: PropTypes.func.isRequired,
  addWiki: PropTypes.func.isRequired,
};

class WikiSelect extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repos: [],
      isExist: true,
      name: "",
      repoID: "",
    }
  }

  componentDidMount() {
    seafileAPI.listRepos().then(res => {
      this.setState({
        repos: res.data.repos,
      }); 
    })
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
        <ModalBody>
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
                    <td className="select"><input type="radio" className="vam" name="repo" value={repo.repo_id} onChange={this.onChange.bind(this, repo)} /></td>
                    <td><img src={siteRoot + 'media/img/lib/48/lib.png'} width="24" /></td>
                    <td>{gettext(repo.repo_name)}</td>
                    <td>{moment(repo.last_modified).fromNow()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ModalBody>
        <ModalFooter>
          <Button outline color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button outline color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

WikiSelect.propTypes = propTypes;

export default WikiSelect;
