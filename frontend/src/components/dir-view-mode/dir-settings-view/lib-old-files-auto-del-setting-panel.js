import React from 'react';
import PropTypes from 'prop-types';
import { Form, FormGroup, Label, Input, Alert } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';

const propTypes = {
  repoID: PropTypes.string.isRequired
};

class LibOldFilesAutoDelSetting extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      autoDelDays: 0,
      isAutoDel: false,
      errorInfo: '',
    };
  }

  componentDidMount() {
    seafileAPI.getRepoOldFilesAutoDelDays(this.props.repoID).then(res => {
      const { auto_delete_days: autoDelDays } = res.data;
      this.setState({
        autoDelDays,
        isAutoDel: autoDelDays > 0,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  submit = () => {
    let daysNeedTobeSet;
    if (this.state.isAutoDel) {
      daysNeedTobeSet = this.state.autoDelDays;
      let reg = /^-?\d+$/;
      let isvalid_days = reg.test(daysNeedTobeSet);
      if (!isvalid_days || daysNeedTobeSet <= 0) {
        this.setState({
          errorInfo: gettext('Please enter a positive integer'),
        });
        return;
      }
    } else {
      daysNeedTobeSet = 0; // if no auto del, give 0 to server
    }


    let repoID = this.props.repoID;

    seafileAPI.setRepoOldFilesAutoDelDays(repoID, daysNeedTobeSet).then(res => {
      toaster.success(gettext('Successfully set it.'));
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      this.submit();
      e.preventDefault();
    }
  };

  onChange = (e) => {
    let days = e.target.value;
    this.setState({
      autoDelDays: days,
    });
  };

  updateRadioCheck = (type) => {
    if (type === 'noAutoDel') {
      this.setState({
        isAutoDel: false,
      });
    } else if (type === 'autoDel') {
      this.setState({
        isAutoDel: true,
      });
    }
    this.submit();
  };

  render() {
    return (
      <div className='library-setting-item'>
        <h3 className='library-setting-item-heading'>{gettext('Auto deletion')}</h3>
        <Form>
          <FormGroup check>
            <Input type="radio" name="radio1" checked={!this.state.isAutoDel} onChange={() => {this.updateRadioCheck('noAutoDel');}}/>{' '}
            <Label>{gettext('Do not automatically delete files')}</Label>
          </FormGroup>
          <FormGroup check>
            <Input type="radio" name="radio1" checked={this.state.isAutoDel} onChange={() => {this.updateRadioCheck('autoDel');}}/>{' '}
            <Label className='d-flex'>
              {gettext('Automatically delete files that are not modified within certain days:')}
              <Input
                type="text"
                className="expire-input"
                value={this.state.autoDelDays}
                disabled={!this.state.isAutoDel}
                onChange={this.onChange}
                onKeyDown={this.handleKeyDown}
              />
              <span>{gettext('days')}</span>
            </Label>
          </FormGroup>
          {this.state.errorInfo && <Alert color="danger">{this.state.errorInfo}</Alert>}
        </Form>
      </div>
    );
  }
}

LibOldFilesAutoDelSetting.propTypes = propTypes;

export default LibOldFilesAutoDelSetting;
