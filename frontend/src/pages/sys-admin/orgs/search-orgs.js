import React, { Component, Fragment } from 'react';
import { Form, FormGroup, Input, Label, Col } from 'reactstrap';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import MainPanelTopbar from '../main-panel-topbar';
import Content from './orgs-content';


class SearchOrgs extends Component {

  constructor(props) {
    super(props);
    this.state = {
      query: '',
      isSubmitBtnActive: false,
      loading: true,
      errorMsg: '',
      orgList: []
    };
  }

  componentDidMount () {
    let params = (new URL(document.location)).searchParams;
    this.setState({
      query: params.get('query') || ''
    }, this.getItems);
  }

  getItems = () => {
    seafileAPI.sysAdminSearchOrgs(this.state.query.trim()).then(res => {
      this.setState({
        loading: false,
        orgList: res.data.organization_list
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  updateRole = (orgID, role) => {
    let orgInfo = {};
    orgInfo.role = role;
    seafileAPI.sysAdminUpdateOrg(orgID, orgInfo).then(res => {
      let newOrgList = this.state.orgList.map(org => {
        if (org.org_id == orgID) {
          org.role = role;
        }
        return org;
      });
      this.setState({orgList: newOrgList});
      toaster.success(gettext('Edit succeeded'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteOrg = (orgID) => {
    seafileAPI.sysAdminDeleteOrg(orgID).then(res => {
      let orgList = this.state.orgList.filter(org => {
        return org.org_id != orgID;
      });
      this.setState({orgList: orgList});
      toaster.success(gettext('Successfully deleted 1 item.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  handleInputChange = (e) => {
    this.setState({
      query: e.target.value
    }, this.checkSubmitBtnActive);
  }

  checkSubmitBtnActive = () => {
    const { query } = this.state;
    this.setState({
      isSubmitBtnActive: query.trim()
    });
  }

  render() {
    const { query, isSubmitBtnActive } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Organizations')}</h3>
            </div>
            <div className="cur-view-content">
              <div className="mt-4 mb-6">
                <h4 className="border-bottom font-weight-normal mb-2 pb-1">{gettext('Search Organizations')}</h4>
                <p className="text-secondary small">{gettext('Tip: you can search by keyword in name.')}</p>
                <Form>
                  <FormGroup row>
                    <Label for="name" sm={1}>{gettext('Name')}</Label>
                    <Col sm={5}>
                      <Input type="text" name="query" id="name" value={query} onChange={this.handleInputChange} />
                    </Col>
                  </FormGroup>
                  <FormGroup row>
                    <Col sm={{size: 5, offset: 1}}>
                      <button className="btn btn-outline-primary" disabled={!isSubmitBtnActive} onClick={this.getItems}>{gettext('Submit')}</button>
                    </Col>
                  </FormGroup>
                </Form>
              </div>
              <div className="mt-4 mb-6">
                <h4 className="border-bottom font-weight-normal mb-2 pb-1">{gettext('Result')}</h4>
                <Content
                  loading={this.state.loading}
                  errorMsg={this.state.errorMsg}
                  items={this.state.orgList}
                  updateRole={this.updateRole}
                  deleteOrg={this.deleteOrg}
                />
              </div>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default SearchOrgs;
