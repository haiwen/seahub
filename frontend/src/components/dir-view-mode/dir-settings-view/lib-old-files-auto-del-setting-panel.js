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

  submit = (nextType) => {
    let days;
    if (nextType === 'noAutoDel') {
      days = 0;
    } else if (nextType === 'autoDel' || this.state.isAutoDel) {
      days = this.state.autoDelDays;
      const reg = /^-?\d+$/;
      const isValidDays = reg.test(days);
      if (!isValidDays || Number(days) <= 0) {
        this.setState({
          errorInfo: gettext('Please enter a positive integer'),
        });
        return;
      }
    }

    const { repoID } = this.props;
    seafileAPI.setRepoOldFilesAutoDelDays(repoID, parseInt(days)).then(res => {
      toaster.success(gettext('Successfully set it.'));
      if (nextType === 'noAutoDel') {
        this.setState({
          isAutoDel: false,
          errorInfo: '',
        });
      } else {
        this.setState({
          autoDelDays: parseInt(days),
          isAutoDel: true,
          errorInfo: '',
        });
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  handleKeyDown = (e) => {
    const { isAutoDel } = this.state;
    if (isAutoDel && e.key === 'Enter') {
      this.submit();
      e.preventDefault();
    }
  };

  onDaysInputChange = (e) => {
    const days = e.target.value;
    this.setState({
      autoDelDays: days,
    });
  };

  onAutoDelSelectionChange = (nextType) => {
    this.submit(nextType);
  };

  render() {
    return (
      <div className='library-setting-item'>
        <h3 className='library-setting-item-heading'>{gettext('Auto deletion')}</h3>
        <Form>
          <FormGroup check>
            <Input type="radio" name="auto-delete" checked={!this.state.isAutoDel} onChange={() => {this.onAutoDelSelectionChange('noAutoDel');}}/>{' '}
            <Label>{gettext('Do not automatically delete files')}</Label>
          </FormGroup>
          <FormGroup check>
            <Input type="radio" name="auto-delete" checked={this.state.isAutoDel} onChange={() => {this.onAutoDelSelectionChange('autoDel');}}/>{' '}
            <Label className='d-flex'>
              {gettext('Automatically delete files that are not modified within certain days:')}
              <Input
                type="text"
                className="expire-input"
                value={this.state.autoDelDays}
                disabled={!this.state.isAutoDel && this.state.autoDelDays > 0}
                onChange={this.onDaysInputChange}
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
