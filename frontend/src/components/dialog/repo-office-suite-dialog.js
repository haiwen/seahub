import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter, TabContent, TabPane } from 'reactstrap';
import makeAnimated from 'react-select/animated';
import toaster from '../toast';
import { userAPI } from '../../utils/user-api';
import { gettext, isPro } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { SeahubSelect } from '../common/select';
import SeahubModalHeader from '../common/seahub-modal-header';

import '../../css/repo-office-suite-dialog.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class OfficeSuiteDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
      errorMsg: []
    };
    this.options = [];
  }

  handleSelectChange = (option) => {
    this.setState({ selectedOption: option });
  };

  submit = () => {
    const { repoID } = this.props;
    const { selectedOption } = this.state;
    if (!selectedOption) {
      return false;
    }

    const { value: suiteID } = selectedOption;
    userAPI.setOfficeSuite(repoID, suiteID).then(res => {
      const message = gettext('Successfully changed the office suite.');
      toaster.success(message);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    this.props.toggleDialog();
  };

  componentDidMount() {
    if (isPro) {
      userAPI.getOfficeSuite(this.props.repoID).then((res) => {
        this.updateOptions(res);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }

  updateOptions = (officeSuites) => {
    officeSuites.data.suites_info.forEach(item => {
      let option = {
        value: item.id,
        label: item.name,
        is_selected: item.is_selected,
      };
      this.options.push(option);
    });
    let selectedOption = this.options.find(op => op.is_selected);
    this.setState({ selectedOption });
  };


  renderOfficeSuiteContent = () => {
    return (
      <div className="repo-office-suite-dialog-main">
        <TabContent>
          {isPro &&
            <TabPane role="tabpanel" id="office-suite-panel">
              <SeahubSelect
                isClearable
                maxMenuHeight={200}
                hideSelectedOptions={true}
                components={makeAnimated()}
                placeholder={gettext('Select an office suite')}
                options={this.options}
                onChange={this.handleSelectChange}
                value={this.state.selectedOption}
                className="repo-select-office-suite"
              />
            </TabPane>
          }
        </TabContent>
      </div>
    );
  };

  render() {
    const { repoName } = this.props;
    let title = gettext('{library_name} Office Suite');
    title = title.replace('{library_name}', '<span class="op-target text-truncate mx-1">' + Utils.HTMLescape(repoName) + '</span>');
    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog} className="repo-office-suite-dialog">
        <SeahubModalHeader toggle={this.props.toggleDialog}>
          <span dangerouslySetInnerHTML={{ __html: title }} className="d-flex mw-100"></span>
        </SeahubModalHeader>
        <ModalBody className="repo-office-suite-dialog-content" role="tablist">
          {this.renderOfficeSuiteContent()}
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
