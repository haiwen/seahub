import React, { Component, Fragment } from 'react';
import { Form, FormGroup, Input, Label, Col } from 'reactstrap';
import { seafileAPI } from '../../../utils/seafile-api';
import { loginUrl, gettext } from '../../../utils/constants';
import MainPanelTopbar from '../main-panel-topbar';
import Content from './repos';


class SearchRepos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      name: '',
      isSubmitBtnActive: false, 
      loading: true,
      errorMsg: '',
      repos: []
    };
  }

  componentDidMount() {
    let params = (new URL(document.location)).searchParams;
    this.setState({
      name: params.get('name') || ''
    }, this.getRepos);
  }

  getRepos = () => {
    const { name } = this.state;
    seafileAPI.sysAdminSearchRepos(name).then((res) => {
      this.setState({
        loading: false,
        repos: res.data.repo_list
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          }); 
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext('Error')
          }); 
        }   
      } else {
        this.setState({
          loading: false,
          errorMsg: gettext('Please check the network.')
        }); 
      }   
    });
  }

  searchRepos = () => {
    this.getRepos();
  }

  onDeleteRepo = (targetRepo) => {
    let repos = this.state.repos.filter(repo => {
      return repo.id != targetRepo.id;
    }); 
    this.setState({
      repos: repos
    }); 
  }

  onTransferRepo = (targetRepo) => {
    let repos = this.state.repos.map((item) => {
      return item.id == targetRepo.id ? targetRepo : item;
    });
    this.setState({
      repos: repos
    });
  }

  handleNameInputChange = (e) => {
    this.setState({
      name: e.target.value
    }, this.checkSubmitBtnActive);
  }

  checkSubmitBtnActive = () => {
    const { name } = this.state;
    this.setState({
      isSubmitBtnActive: name.trim()
    });
  }

  render() {
    const { name, isSubmitBtnActive } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Libraries')}</h3>
            </div>
            <div className="cur-view-content">
              <div className="mt-4 mb-6">
                <h4 className="border-bottom font-weight-normal mb-2 pb-1">{gettext('Search Libraries')}</h4>
                <p className="text-secondary small">{gettext('Tip: you can search by keyword in name.')}</p>
                <Form>
                  <FormGroup row>
                    <Label for="name" sm={1}>{gettext('Name')}</Label>
                    <Col sm={5}>
                      <Input type="text" name="name" id="name" value={name} onChange={this.handleNameInputChange} />
                    </Col>
                  </FormGroup>
                  <FormGroup row>
                    <Col sm={{size: 5, offset: 1}}>
                      <button className="btn btn-outline-primary" disabled={!isSubmitBtnActive} onClick={this.searchRepos}>{gettext('Submit')}</button>
                    </Col>
                  </FormGroup>
                </Form>
              </div>
              <div className="mt-4 mb-6">
                <h4 className="border-bottom font-weight-normal mb-2 pb-1">{gettext('Result')}</h4>
                <Content
                  loading={this.state.loading}
                  errorMsg={this.state.errorMsg}
                  items={this.state.repos}
                  onDeleteRepo={this.onDeleteRepo}
                  onTransferRepo={this.onTransferRepo}
                />
              </div>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default SearchRepos;
