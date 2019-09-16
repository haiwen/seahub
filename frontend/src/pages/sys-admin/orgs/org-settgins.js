import React, { Component, Fragment } from 'react';
import { Button, Input, Col } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import PropTypes from 'prop-types';
import OrgNav from './org-nav';
import MainPanelTopbar from '../main-panel-topbar';

const propTypes = {
  orgName: PropTypes.string.isRequired,
  updateOrgName: PropTypes.func.isRequired
};

class OrgSettings extends Component {

  constructor(props) {
    super(props);
    this.state = {
      orgName: this.props.orgName
    };
  }

  changeContent = (e) => {
    this.setState({ orgName: e.target.value });
  }

  submit = () => {
    let { orgName } = this.state;
    if(orgName.length > 0) {
      this.props.updateOrgName(orgName);
    }
  }

  render() {
    let { orgName } = this.state;

    return (
      <Fragment>
        <MainPanelTopbar />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <OrgNav currentItem="settings" orgID={this.props.orgID} />
            <div className="cur-view-content">
              <h3 className="mt-3">{gettext('Rename Organization')}</h3>
              <p>{gettext('New Name')}</p>
              <Col xs="4">
                <Input type={'text'} onChange={this.changeContent} value={orgName}/>
                <Button className="mt-2" color="primary" onClick={this.submit}>{gettext('Submit')}</Button>
              </Col>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

OrgSettings.propTypes = propTypes;

export default OrgSettings;
