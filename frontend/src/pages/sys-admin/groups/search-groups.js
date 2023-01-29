import React, { Component, Fragment } from 'react';
import { Form, FormGroup, Input, Label, Col } from 'reactstrap';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import MainPanelTopbar from '../main-panel-topbar';
import Content from './groups-content';

class SearchGroups extends Component {

  constructor(props) {
    super(props);
    this.state = {
      name: '',
      isSubmitBtnActive: false,
      loading: true,
      errorMsg: '',
      groupList: [],
      pageInfo: null
    };
  }

  componentDidMount () {
    let params = (new URL(document.location)).searchParams;
    this.setState({
      name: params.get('name') || ''
    }, this.getGroups);
  }

  getGroups = () => {
    const { name } = this.state;
    seafileAPI.sysAdminSearchGroups(name).then((res) => {
      this.setState({
        loading: false,
        groupList: res.data.group_list
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  deleteGroup = (groupID) => {
    seafileAPI.sysAdminDismissGroupByID(groupID).then(res => {
      let newGroupList = this.state.groupList.filter(item => {
        return item.id != groupID;
      });
      this.setState({
        groupList: newGroupList
      });
      toaster.success(gettext('Successfully deleted 1 item.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  transferGroup = (groupID, receiverEmail) => {
    seafileAPI.sysAdminTransferGroup(receiverEmail, groupID).then(res => {
      let newGroupList = this.state.groupList.map(item => {
        if (item.id == groupID) {
          item = res.data;
        }
        return item;
      });
      this.setState({
        groupList: newGroupList
      });
      toaster.success(gettext('Successfully transferred the group.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
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
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Groups')}</h3>
            </div>
            <div className="cur-view-content">
              <div className="mt-4 mb-6">
                <h4 className="border-bottom font-weight-normal mb-2 pb-1">{gettext('Search Groups')}</h4>
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
                      <button className="btn btn-outline-primary" disabled={!isSubmitBtnActive} onClick={this.getGroups}>{gettext('Submit')}</button>
                    </Col>
                  </FormGroup>
                </Form>
              </div>
              <div className="mt-4 mb-6">
                <h4 className="border-bottom font-weight-normal mb-2 pb-1">{gettext('Result')}</h4>
                <Content
                  loading={this.state.loading}
                  errorMsg={this.state.errorMsg}
                  items={this.state.groupList}
                  deleteGroup={this.deleteGroup}
                  transferGroup={this.transferGroup}
                />
              </div>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default SearchGroups;
