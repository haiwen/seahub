import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter,
  Nav, NavItem, NavLink, TabContent, TabPane, Label } from 'reactstrap';
import makeAnimated from 'react-select/animated';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, isPro } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import { SeahubSelect } from '../common/select';
import '../../css/repo-office-suite-dialog.css';

const propTypes = {
  itemName: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
  canTransferToDept: PropTypes.bool,
  isOrgAdmin: PropTypes.bool,
  isSysAdmin: PropTypes.bool,
  isDepAdminTransfer: PropTypes.bool,

};

const OFFICE_SUITE = 'officeSuite';

class OfficeSuiteDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
      errorMsg: [],
      transferToUser: true,
      transferToGroup: false,
      reshare: false,
      activeTab: OFFICE_SUITE,
    };
    this.options = [];
  }

  handleSelectChange = (option) => {
    this.setState({ selectedOption: option });
  };

  submit = () => {
    const { activeTab, reshare } = this.state;
    if (activeTab === OFFICE_SUITE) {
      let department = this.state.selectedOption;
      this.props.submit(department, reshare);
    }
  };

  componentDidMount() {
    if (isPro) {
      seafileAPI.listDepartments().then((res) => {
        this.updateOptions(res);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }

  updateOptions = (departmentsRes) => {
    departmentsRes.data.forEach(item => {
      let option = {
        value: item.name,
        email: item.email,
        label: item.name,
      };
      this.options.push(option);
    });
  };

  onClick = () => {
    this.setState({
      transferToUser: !this.state.transferToUser,
    });
  };

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
      this.setState({
        activeTab: tab,
        reshare: false,
        selectedOption: null,
      });
    }
  };

  toggleReshareStatus = () => {
    this.setState({
      reshare: !this.state.reshare
    });
  };

  renderTransContent = () => {
    let activeTab = this.state.activeTab;
    return (
      <Fragment>
        <div className="repo-office-suite-dialog-side">
          <Nav pills>
            {isPro &&
            <NavItem role="tab" aria-selected={activeTab === OFFICE_SUITE} aria-controls="office-suite-panel">
              <NavLink
                className={activeTab === OFFICE_SUITE ? 'active' : ''}
                onClick={this.toggle.bind(this, OFFICE_SUITE)}
                tabIndex="0"
              >
                {gettext('Office Suite Change')}
              </NavLink>
            </NavItem>}
          </Nav>
        </div>
        <div className="repo-office-suite-dialog-main">
          <TabContent activeTab={this.state.activeTab}>
            <Fragment>
              {isPro &&
              <TabPane tabId="officeSuite" role="tabpanel" id="office-suite-panel">
                <Label className='office-suite-label'>{gettext('Office Suite')}</Label>
                <SeahubSelect
                  isClearable
                  maxMenuHeight={200}
                  hideSelectedOptions={true}
                  components={makeAnimated()}
                  placeholder={gettext('Select a office suite')}
                  options={this.options}
                  onChange={this.handleSelectChange}
                  value={this.state.selectedOption}
                  className="repo-select-office-suite"
                />
              </TabPane>}
            </Fragment>
          </TabContent>
        </div>
      </Fragment>
    );
  };

  render() {
    const { itemName: repoName } = this.props;
    let title = gettext('{library_name} Office Suite');
    title = title.replace('{library_name}', '<span class="op-target text-truncate mx-1">' + Utils.HTMLescape(repoName) + '</span>');
    return (
      <Modal isOpen={true} style={{ maxWidth: '720px' }} toggle={this.props.toggleDialog} className="repo-office-suite-dialog">
        <ModalHeader toggle={this.props.toggleDialog}>
          <span dangerouslySetInnerHTML={{ __html: title }} className="d-flex mw-100"></span>
        </ModalHeader>
        <ModalBody className="repo-office-suite-dialog-content" role="tablist">
          {this.renderTransContent()}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.submit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

OfficeSuiteDialog.propTypes = propTypes;

export default OfficeSuiteDialog;
