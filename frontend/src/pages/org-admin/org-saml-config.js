import React, { Fragment, Component } from 'react';
import { Row, Col, Label, Button, Input, InputGroup } from 'reactstrap';
import copy from 'copy-to-clipboard';
import MainPanelTopbar from './main-panel-topbar';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import { gettext, orgID, serviceURL } from '../../utils/constants';
import { orgAdminAPI } from '../../utils/org-admin-api';
import { Utils } from '../../utils/utils';
import Section from './section';
import OrgSamlConfigInput from './input-item';

class OrgSAMLConfig extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      samlConfigID: '',
      metadataUrl: '',
      domain: '',
      dnsTxt: '',
      domainVerified: false,
      idpCertificate: '',
    };
  }

  componentDidMount() {
    orgAdminAPI.orgAdminGetSamlConfig(orgID).then((res) => {
      this.setState({
        loading: false,
        samlConfigID: res.data.saml_config.id,
        metadataUrl: res.data.saml_config.metadata_url || '',
        domain: res.data.saml_config.domain || '',
        dnsTxt: res.data.saml_config.dns_txt || '',
        domainVerified: res.data.saml_config.domain_verified || false,
        idpCertificate: res.data.saml_config.idp_certificate || '',
      });
    }).catch(error => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true),
      });
    });
  }

  updateSamlConfig = (changeType, value) => {
    let metadataUrl = null;
    let domain = null;
    let idpCertificate = null;
    if (changeType === 'metadataUrl') metadataUrl = value;
    if (changeType === 'domain') domain = value;
    if (changeType === 'idpCertificate') idpCertificate = value;

    orgAdminAPI.orgAdminUpdateSamlConfig(orgID, metadataUrl, domain, idpCertificate).then((res) => {
      this.setState({
        samlConfigID: res.data.saml_config.id,
        metadataUrl: res.data.saml_config.metadata_url,
        domain: res.data.saml_config.domain || '',
        dnsTxt: res.data.saml_config.dns_txt || '',
        domainVerified: res.data.saml_config.domain_verified || false,
        idpCertificate: res.data.saml_config.idp_certificate || '',
      });
      toaster.success(gettext('SAML config updated'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  verifyDomain = () => {
    const { domain } = this.state;
    orgAdminAPI.orgAdminVerifyDomain(orgID, domain).then((res) => {
      this.setState({ domainVerified: res.data.domain_verified });
      toaster.success(gettext('Domain verified'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onCopyValue = (value) => {
    copy(value);
    toaster.success(gettext('Copied'));
  };

  render() {
    const { loading, errorMsg, metadataUrl, domain, dnsTxt, domainVerified, idpCertificate } = this.state;
    let entityID = `${serviceURL}/org/custom/${orgID}/saml2/metadata/`;
    let acsURL = `${serviceURL}/org/custom/${orgID}/saml2/acs/`;
    let logoutURL = `${serviceURL}/org/custom/${orgID}/saml2/ls/`;

    return (
      <Fragment>
        <MainPanelTopbar />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('SAML config')}</h3>
            </div>
            <div className="cur-view-content container mw-100">
              {loading && <Loading />}
              {errorMsg && <p className="error text-center mt-4">{errorMsg}</p>}
              {(!loading && !errorMsg) &&
                <Fragment>
                  <Section headingText={gettext('Configure your Identity Provider')}>
                    <p className="text-secondary mt-1">{gettext('Use these values to configure your Identity Provider')}</p>
                    <Fragment>
                      <Row className="my-4">
                        <Col md="3">
                          <Label className="web-setting-label">Identifier (Entity ID)</Label>
                        </Col>
                        <Col md="5">
                          <InputGroup>
                            <Input type="text" readOnly={true} value={entityID} />
                            <Button color="primary" onClick={this.onCopyValue.bind(this, entityID)} className="border-0">{gettext('Copy')}</Button>
                          </InputGroup>
                        </Col>
                      </Row>

                      <Row className="my-4">
                        <Col md="3">
                          <Label className="web-setting-label">Reply URL (Assertion Consumer Service URL)</Label>
                        </Col>
                        <Col md="5">
                          <InputGroup>
                            <Input type="text" readOnly={true} value={acsURL} />
                            <Button color="primary" onClick={this.onCopyValue.bind(this, acsURL)} className="border-0">{gettext('Copy')}</Button>
                          </InputGroup>
                        </Col>
                      </Row>

                      <Row className="my-4">
                        <Col md="3">
                          <Label className="web-setting-label">Sign on URL</Label>
                        </Col>
                        <Col md="5">
                          <InputGroup>
                            <Input type="text" readOnly={true} value={serviceURL} />
                            <Button color="primary" onClick={this.onCopyValue.bind(this, serviceURL)} className="border-0">{gettext('Copy')}</Button>
                          </InputGroup>
                        </Col>
                      </Row>

                      <Row className="my-4">
                        <Col md="3">
                          <Label className="web-setting-label">Logout URL</Label>
                        </Col>
                        <Col md="5">
                          <InputGroup>
                            <Input type="text" readOnly={true} value={logoutURL} />
                            <Button color="primary" onClick={this.onCopyValue.bind(this, logoutURL)} className="border-0">{gettext('Copy')}</Button>
                          </InputGroup>
                        </Col>
                      </Row>
                    </Fragment>
                  </Section>

                  <Section headingText={gettext('Configure Seafile')}>
                    <p className="text-secondary mt-1">{gettext('Use information from your Identity Provider to configure Seafile')}</p>
                    <Fragment>
                      <OrgSamlConfigInput
                        value={metadataUrl}
                        changeType={'metadataUrl'}
                        changeValue={this.updateSamlConfig}
                        displayName={'SAML App Federation Metadata URL'}
                      />

                      <OrgSamlConfigInput
                        value={idpCertificate}
                        changeType={'idpCertificate'}
                        changeValue={this.updateSamlConfig}
                        displayName={gettext('Certificate')}
                        isCertificate={true}
                      />
                    </Fragment>
                  </Section>

                  <Section headingText={gettext('Verify Domain')}>
                    <p className="text-secondary mt-1">{gettext('Create a DNS TXT record to confirm the ownership of your Email Domain.')}</p>
                    <Fragment>
                      <OrgSamlConfigInput
                        value={domain}
                        changeType={'domain'}
                        changeValue={this.updateSamlConfig}
                        displayName={gettext('Email Domain')}
                        domainVerified={domainVerified}
                      />

                      <Row className="my-4">
                        <Col md="3">
                          <Label className="web-setting-label">{gettext('DNS TXT Value')}</Label>
                        </Col>
                        <Col md="5">
                          <InputGroup>
                            <Input type="text" readOnly={true} value={dnsTxt}/>
                            {(dnsTxt && !domainVerified) &&
                            <Button color="primary" onClick={this.onCopyValue.bind(this, dnsTxt)} className="border-0">{gettext('Copy')}</Button>
                            }
                          </InputGroup>
                          {(dnsTxt && !domainVerified) &&
                            <p className="small text-secondary mt-1">
                              {gettext('Copy the domain DNS TXT and add it to your domain\'s DNS records, then click the button to verify domain ownership. You must verify the ownership of domain before Single Sign-On.')}
                            </p>
                          }
                        </Col>
                        <Col md="4">
                          {(domain && dnsTxt && !domainVerified) &&
                            <Button color="secondary" onClick={this.verifyDomain}>{gettext('Verify')}</Button>
                          }
                        </Col>
                      </Row>
                    </Fragment>
                  </Section>
                </Fragment>
              }
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default OrgSAMLConfig;
