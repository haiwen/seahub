import React, { Fragment, Component } from 'react';
import { Row, Col, Label, Button, Input, InputGroup, InputGroupAddon } from 'reactstrap';
import copy from 'copy-to-clipboard';
import MainPanelTopbar from './main-panel-topbar';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import { gettext, orgID, serviceURL } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import Section from './section';
import InputItem from './input-item';

class OrgSAMLConfig extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      samlConfigID: '',
      metadataUrl: '',
      domain: '',
      dns_txt: '',
      domain_verified: false,
      idp_certificate: '',
    };
  }

  componentDidMount() {
    seafileAPI.orgAdminGetSamlConfig(orgID).then((res) => {
      this.setState({
        loading: false,
        samlConfigID: res.data.saml_config.id,
        metadataUrl: res.data.saml_config.metadata_url || '',
        domain: res.data.saml_config.domain || '',
        dns_txt: res.data.saml_config.dns_txt || '',
        domain_verified: res.data.saml_config.domain_verified || false,
        idp_certificate: res.data.saml_config.idp_certificate || '',
      });
    }).catch(error => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true),
      });
    });
  }

  updateIdpCertificate = (idp_certificate) => {
    seafileAPI.orgAdminUpdateIdpCertificate(orgID, idp_certificate).then((res) => {
      this.setState({
        samlConfigID: res.data.saml_config.id,
        metadataUrl: res.data.saml_config.metadata_url,
        domain: res.data.saml_config.domain || '',
        dns_txt: res.data.saml_config.dns_txt || '',
        domain_verified: res.data.saml_config.domain_verified || false,
        idp_certificate: res.data.saml_config.idp_certificate || '',
      });
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  updateSamlMetadataUrl = (metadataUrl) => {
    seafileAPI.orgAdminUpdateSamlMetadataUrl(orgID, metadataUrl).then((res) => {
      this.setState({
        samlConfigID: res.data.saml_config.id,
        metadataUrl: res.data.saml_config.metadata_url || '',
        domain: res.data.saml_config.domain || '',
        dns_txt: res.data.saml_config.dns_txt || '',
        domain_verified: res.data.saml_config.domain_verified || false,
        idp_certificate: res.data.saml_config.idp_certificate || '',
      });
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  updateSamlDomain = (domain) => {
    seafileAPI.orgAdminUpdateSamlDomain(orgID, domain).then((res) => {
      this.setState({
        samlConfigID: res.data.saml_config.id,
        metadataUrl: res.data.saml_config.metadata_url || '',
        domain: res.data.saml_config.domain || '',
        dns_txt: res.data.saml_config.dns_txt || '',
        domain_verified: res.data.saml_config.domain_verified || false,
        idp_certificate: res.data.saml_config.idp_certificate || '',
      });
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  verifyDomain = () => {
    const {domain} = this.state;
    seafileAPI.orgAdminVerifyDomain(orgID, domain).then((res) => {
      this.setState({domain_verified: res.data.domain_verified});
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  generateDnsTxt = () => {
    seafileAPI.orgAdminCreateDnsTxt(orgID).then((res) => {
      this.setState({dns_txt: res.data.dns_txt});
      toaster.success(gettext('Success'));
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
    const { loading, errorMsg, metadataUrl, domain, dns_txt, domain_verified, idp_certificate } = this.state;
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
                            <InputGroupAddon addonType="append">
                              <Button color="primary" onClick={this.onCopyValue.bind(this, entityID)} className="border-0">{gettext('Copy')}</Button>
                            </InputGroupAddon>
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
                            <InputGroupAddon addonType="append">
                              <Button color="primary" onClick={this.onCopyValue.bind(this, acsURL)} className="border-0">{gettext('Copy')}</Button>
                            </InputGroupAddon>
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
                            <InputGroupAddon addonType="append">
                              <Button color="primary" onClick={this.onCopyValue.bind(this, serviceURL)} className="border-0">{gettext('Copy')}</Button>
                            </InputGroupAddon>
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
                            <InputGroupAddon addonType="append">
                              <Button color="primary" onClick={this.onCopyValue.bind(this, logoutURL)} className="border-0">{gettext('Copy')}</Button>
                            </InputGroupAddon>
                          </InputGroup>
                        </Col>
                      </Row>
                    </Fragment>
                  </Section>

                  <Section headingText={gettext('Configure Seafile')}>
                    <p className="text-secondary mt-1">{gettext('Use information from your Identity Provider to configure Seafile')}</p>
                    <Fragment>
                      <InputItem
                        value={metadataUrl}
                        changeValue={this.updateSamlMetadataUrl}
                        displayName={'SAML App Federation Metadata URL'}
                      />

                      <InputItem
                        value={idp_certificate}
                        changeValue={this.updateIdpCertificate}
                        displayName={gettext('Certificate')}
                        isCertificate={true}
                      />
                    </Fragment>
                  </Section>

                  <Section headingText={gettext('Verify Domain')}>
                    <p className="text-secondary mt-1">{gettext('Create a DNS TXT record to confirm the ownership of your Email Domain.')}</p>
                    <Fragment>
                      <InputItem
                        value={domain}
                        changeValue={this.updateSamlDomain}
                        displayName={gettext('Email Domain')}
                        domainVerified={domain_verified}
                      />

                      <Row className="my-4">
                        <Col md="3">
                          <Label className="web-setting-label">{gettext('DNS TXT Value')}</Label>
                        </Col>
                        <Col md="5">
                          <InputGroup>
                            <Input type="text" readOnly={true} value={dns_txt}/>
                            {(dns_txt && !domain_verified) &&
                              <InputGroupAddon addonType="append">
                                <Button color="primary" onClick={this.onCopyValue.bind(this, dns_txt)} className="border-0">{gettext('Copy')}</Button>
                              </InputGroupAddon>
                            }
                          </InputGroup>
                          {(!dns_txt && !domain_verified) &&
                            <p className="small text-secondary mt-1">
                              {gettext('Generate a domain DNS TXT, then copy it and add it to your domain\'s DNS records, then click the button to verify domain ownership.')}
                            </p>
                          }
                          {(dns_txt && !domain_verified) &&
                            <p className="small text-secondary mt-1">
                              {gettext('You must verify the ownership of domain before Single Sign-On.')}
                            </p>
                          }
                        </Col>
                        <Col md="4">
                          {(domain && !dns_txt && !domain_verified) &&
                            <Button color="secondary" onClick={this.generateDnsTxt}>{gettext('Generate DNS TXT')}</Button>
                          }
                          {(domain && dns_txt && !domain_verified) &&
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
