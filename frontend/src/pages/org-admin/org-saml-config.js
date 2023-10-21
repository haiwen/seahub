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
import FileItem from './file-item';

class OrgSAMLConfig extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      samlConfigID: '',
      newUrlPrefix: '',
      orgUrlPrefix: '',
      metadataUrl: '',
      domain: '',
      dns_txt: '',
      domain_verified: false,
      isBtnsShown: false,
    };
  }

  toggleBtns = () => {
    this.setState({isBtnsShown: !this.state.isBtnsShown});
  };

  hideBtns = () => {
    if (!this.state.isBtnsShown) return;
    if (this.state.newUrlPrefix !== this.state.orgUrlPrefix) {
      this.setState({newUrlPrefix: this.state.orgUrlPrefix});
    }
    this.toggleBtns();
  };

  onSubmit = () => {
    const newUrlPrefix = this.state.newUrlPrefix.trim();
    if (newUrlPrefix !== this.state.orgUrlPrefix) {
      this.updateUrlPrefix(newUrlPrefix);
    }
    this.toggleBtns();
  };

  inputOrgUrlPrefix = (e) => {
    this.setState({newUrlPrefix: e.target.value});
  };

  componentDidMount() {
    seafileAPI.orgAdminGetUrlPrefix(orgID).then((res) => {
      this.setState({
        newUrlPrefix: res.data.org_url_prefix,
        orgUrlPrefix: res.data.org_url_prefix,
      });
      seafileAPI.orgAdminGetSamlConfig(orgID).then((res) => {
        this.setState({
          loading: false,
          samlConfigID: res.data.saml_config.id || '',
          metadataUrl: res.data.saml_config.metadata_url || '',
          domain: res.data.saml_config.domain || '',
          dns_txt: res.data.saml_config.dns_txt || '',
          domain_verified: res.data.saml_config.domain_verified || false,
        });
      }).catch(error => {
        this.setState({
          loading: false,
          errorMsg: Utils.getErrorMsg(error, true),
        });
      });
    }).catch(error => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true),
      });
    });
  };

  updateUrlPrefix = (newUrlPrefix) => {
    seafileAPI.orgAdminUpdateUrlPrefix(orgID, newUrlPrefix).then((res) => {
      this.setState({
        newUrlPrefix: res.data.org_url_prefix,
        orgUrlPrefix: res.data.org_url_prefix,
      });
      toaster.success(gettext('Success'));
    }).catch((error) => {
      this.setState({newUrlPrefix: this.state.orgUrlPrefix});
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  postIdpCertificate = (file) => {
    seafileAPI.orgAdminUploadIdpCertificate(orgID, file).then(() => {
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
        metadataUrl: res.data.saml_config.metadata_url,
        domain: res.data.saml_config.domain,
        dns_txt: res.data.saml_config.dns_txt,
        domain_verified: res.data.saml_config.domain_verified,
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
        metadataUrl: res.data.saml_config.metadata_url,
        domain: res.data.saml_config.domain,
        dns_txt: res.data.saml_config.dns_txt,
        domain_verified: res.data.saml_config.domain_verified,
      });
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  deleteSamlConfig = () => {
    seafileAPI.orgAdminDeleteSamlConfig(orgID).then(() => {
      this.setState({
        samlConfigID: '',
        metadataUrl: '',
        domain: '',
        dns_txt: '',
        domain_verified: false,
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

  onCopyDnsTxt = () => {
    const {dns_txt} = this.state;
    copy(dns_txt);
    toaster.success(gettext('DNS TXT is copied to the clipboard.'));
  };

  render() {
    const { loading, errorMsg, newUrlPrefix, metadataUrl, domain, dns_txt, domain_verified, isBtnsShown } = this.state;

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
                  <Section headingText={gettext('Custom Login URL')}>
                    <Fragment>
                      <Row className="my-4">
                        <Col md="3">
                          <Label className="web-setting-label">{gettext('Your custom login URL')}</Label>
                        </Col>
                        <Col md="5">
                          {`${serviceURL}/org/custom/`}<input value={newUrlPrefix} onChange={this.inputOrgUrlPrefix} onFocus={this.toggleBtns} onBlur={this.hideBtns}></input>
                          <p className="small text-secondary mt-1">
                            {gettext('The custom part of the URL should be 6 to 20 characters, and can only contain alphanumeric characters and hyphens.')}
                          </p>
                        </Col>
                        {isBtnsShown &&
                          <Col md="4">
                            <Button className="sf2-icon-tick web-setting-icon-btn web-setting-icon-btn-submit" onMouseDown={this.onSubmit} title={gettext('Submit')}></Button>
                            <Button className="ml-1 sf2-icon-x2 web-setting-icon-btn web-setting-icon-btn-cancel" title={gettext('Cancel')}></Button>
                          </Col>
                        }
                      </Row>
                    </Fragment>
                  </Section>

                  <Section headingText={gettext('Manage SAML Config')}>
                    <Fragment>
                      <InputItem
                        value={metadataUrl}
                        changeValue={this.updateSamlMetadataUrl}
                        displayName={gettext('App Federation Metadata URL')}
                      />

                      <InputItem
                        value={domain}
                        changeValue={this.updateSamlDomain}
                        displayName={gettext('Email Domain')}
                        isDomainItem={true}
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
                                <Button color="primary" onClick={this.onCopyDnsTxt} className="border-0">{gettext('Copy')}</Button>
                              </InputGroupAddon>
                            }
                          </InputGroup>
                          <p className="small text-secondary mt-1">
                            {gettext("Generate a domain DNS TXT, then copy it and add it to your domain's DNS records, then click the button to verify domain ownership.")}
                          </p>
                        </Col>
                        <Col md="4">
                          {!dns_txt &&
                            <Button color="secondary" onClick={this.generateDnsTxt}>{gettext('Generate')}</Button>
                          }
                          {(dns_txt && !domain_verified) &&
                            <Button color="secondary" onClick={this.verifyDomain}>{gettext('Verify')}</Button>
                          }
                        </Col>
                      </Row>
                    </Fragment>
                  </Section>

                  <Section headingText={gettext('Upload IdP Files')}>
                    <FileItem
                      postFile={this.postIdpCertificate}
                      displayName={gettext('IdP Certificate')}
                    />
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
