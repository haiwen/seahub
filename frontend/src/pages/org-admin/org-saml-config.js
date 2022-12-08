import React, { Fragment, Component } from 'react';
import { Row, Col, Button } from 'reactstrap';
import MainPanelTopbar from './main-panel-topbar';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import { gettext, orgID } from '../../utils/constants';
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
      countryName: '',
      provinceName: '',
      localityName: '',
      organizationName: '',
      uintName: '',
      commonName: '',
      emailAddress: '',
      days: '',
      samlConfigID: '',
      metadataUrl: '',
      singleSignOnService: '',
      singleLogoutService: '',
      validDays: '',
    };
  }

  componentDidMount() {
    seafileAPI.orgAdminGetSamlConfig(orgID).then((res) => {
      this.setState({
        loading: false,
        samlConfigID: res.data.saml_config.id || '',
        metadataUrl: res.data.saml_config.metadata_url || '',
        singleSignOnService: res.data.saml_config.single_sign_on_service || '',
        singleLogoutService: res.data.saml_config.single_logout_service || '',
        validDays: res.data.saml_config.valid_days || '',
      });
    }).catch(error => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true),
      });
    });
  }

  inputCountryName = (e) => {
    this.setState({
      countryName: e.target.value,
    });
  }

  inputProvinceName = (e) => {
    this.setState({
      provinceName: e.target.value,
    });
  }

  inputLocalityName = (e) => {
    this.setState({
      localityName: e.target.value,
    });
  }

  inputOrganizationName = (e) => {
    this.setState({
      organizationName: e.target.value,
    });
  }

  inputUintName = (e) => {
    this.setState({
      uintName: e.target.value,
    });
  }

  inputCommonName = (e) => {
    this.setState({
      commonName: e.target.value,
    });
  }

  inputEmailAddress = (e) => {
    this.setState({
      emailAddress: e.target.value,
    });
  }

  inputDays = (e) => {
    this.setState({
      days: e.target.value,
    });
  }

  inputMetadataUrl = (e) => {
    this.setState({
      metadataUrl: e.target.value,
    });
  }

  inputSingleSignOnService = (e) => {
    this.setState({
      singleSignOnService: e.target.value,
    });
  }

  inputSingleLogoutService = (e) => {
    this.setState({
      singleLogoutService: e.target.value,
    });
  }

  inputValidDays = (e) => {
    this.setState({
      validDays: e.target.value,
    });
  }

  generateSpCertificate = () => {
    const { countryName, provinceName, localityName, organizationName, uintName, commonName, emailAddress, days } = this.state;
    seafileAPI.orgAdminGenerateSPCertificate(orgID, countryName, provinceName, localityName, organizationName, uintName, commonName, emailAddress, days).then(() => {
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  postIdpCertificate = (file) => {
    seafileAPI.orgAdminUploadIdpCertificate(orgID, file).then(() => {
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  postIdpMetadataXml = (file) => {
    seafileAPI.orgAdminUploadIdpMetadataXml(orgID, file).then(() => {
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  addSamlConfig = () => {
    const { metadataUrl, singleSignOnService, singleLogoutService, validDays } = this.state;
    seafileAPI.orgAdminAddSamlConfig(orgID, metadataUrl, singleSignOnService, singleLogoutService, validDays).then((res) => {
      this.setState({
        samlConfigID: res.data.saml_config.id,
        metadataUrl: res.data.saml_config.metadata_url,
        singleSignOnService: res.data.saml_config.single_sign_on_service,
        singleLogoutService: res.data.saml_config.single_logout_service,
        validDays: res.data.saml_config.valid_days,
      });
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  updateSamlConfig = () => {
    const { metadataUrl, singleSignOnService, singleLogoutService, validDays } = this.state;
    seafileAPI.orgAdminUpdateSamlConfig(orgID, metadataUrl, singleSignOnService, singleLogoutService, validDays).then((res) => {
      this.setState({
        samlConfigID: res.data.saml_config.id,
        metadataUrl: res.data.saml_config.metadata_url,
        singleSignOnService: res.data.saml_config.single_sign_on_service,
        singleLogoutService: res.data.saml_config.single_logout_service,
        validDays: res.data.saml_config.valid_days,
      });
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteSamlConfig = () => {
    seafileAPI.orgAdminDeleteSamlConfig(orgID).then(() => {
      this.setState({
        samlConfigID: '',
        metadataUrl: '',
        singleSignOnService: '',
        singleLogoutService: '',
        validDays: '',
      });
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    const { loading, errorMsg, samlConfigID, metadataUrl, singleSignOnService, singleLogoutService, validDays,
      countryName, provinceName, localityName, organizationName, uintName, commonName, emailAddress, days
    } = this.state;

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
                  <Section headingText={gettext('Generate SP Certificate')}>
                    <Fragment>
                      <InputItem
                        value={countryName}
                        changeValue={this.inputCountryName}
                        displayName={gettext('Country Name (2 letter code)')}
                      />
                      <InputItem
                        value={provinceName}
                        changeValue={this.inputProvinceName}
                        displayName={gettext('State or Province Name (full name)')}
                      />
                      <InputItem
                        value={localityName}
                        changeValue={this.inputLocalityName}
                        displayName={gettext('Locality Name (eg, city)')}
                      />
                      <InputItem
                        value={organizationName}
                        changeValue={this.inputOrganizationName}
                        displayName={gettext('Organization Name (eg, company)')}
                      />
                      <InputItem
                        value={uintName}
                        changeValue={this.inputUintName}
                        displayName={gettext('Organizational Unit Name (eg, section)')}
                      />
                      <InputItem
                        value={commonName}
                        changeValue={this.inputCommonName}
                        displayName={gettext('Common Name (e.g. server FQDN or YOUR name)')}
                      />
                      <InputItem
                        value={emailAddress}
                        changeValue={this.inputEmailAddress}
                        displayName={gettext('Email Address')}
                      />
                      <InputItem
                        value={days}
                        changeValue={this.inputDays}
                        displayName={gettext('Number of days the certificate is valid for')}
                      />
                      <Row className="my-4">
                        <Col md="5">
                          <Button color="secondary" onClick={this.generateSpCertificate}>{gettext('Generate')}</Button>
                        </Col>
                      </Row>
                    </Fragment>
                  </Section>
                  <Section headingText={gettext('Upload Idp Certificate')}>
                    <Fragment>
                      <FileItem
                        postFile={this.postIdpCertificate}
                        displayName={gettext('IdP Certificate')}
                      />
                      <FileItem
                        postFile={this.postIdpMetadataXml}
                        displayName={gettext('Federation Metadata XML')}
                      />
                    </Fragment>
                  </Section>
                  <Section headingText={gettext('Create or Update SAML Config')}>
                    <Fragment>
                      <InputItem
                        value={metadataUrl}
                        changeValue={this.inputMetadataUrl}
                        displayName={gettext('App Federation Metadata URL')}
                      />
                      <InputItem
                        value={singleSignOnService}
                        changeValue={this.inputSingleSignOnService}
                        displayName={gettext('Login URL')}
                      />
                      <InputItem
                        value={singleLogoutService}
                        changeValue={this.inputSingleLogoutService}
                        displayName={gettext('Logout URL')}
                      />
                      <InputItem
                        value={validDays}
                        changeValue={this.inputValidDays}
                        displayName={gettext('Valid Days (how long is our metadata valid)')}
                      />
                      <Row className="my-4">
                        <Col md="5">
                          {samlConfigID ?
                            <Button color="secondary" onClick={this.updateSamlConfig}>{gettext('Update')}</Button> :
                            <Button color="secondary" onClick={this.addSamlConfig}>{gettext('Save')}</Button>
                          }
                        </Col>
                      </Row>
                    </Fragment>
                  </Section>
                  <Section headingText={gettext('Delete Config')}>
                    <Fragment>
                      <Row className="my-4">
                        <Col md="5">
                          <Button color="secondary" onClick={this.deleteSamlConfig}>{gettext('Delete')}</Button>
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
