import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter, Popover } from 'reactstrap';
import toaster from '../../../components/toast';
import { gettext, orgID } from '../../../utils/constants';
import { orgAdminAPI } from '../../../utils/org-admin-api';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { Utils } from '../../../utils/utils';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import SearchInput from '../../search-input';
import ClickOutside from '../../click-outside';
import classnames from 'classnames';

import '../../../css/department-select.css';

export default class MoveDepartmentDialog extends React.Component {

  static propTypes = {
    toggle: PropTypes.func.isRequired,
    nodeId: PropTypes.number.isRequired,
    onDepartmentChanged: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      selectedDepartment: null,
      searchedDepartments: [],
      searchValue: '',
      highlightIndex: -1,
      isPopoverOpen: false,
      errMsgs: '',
    };
  }

  onValueChanged = (newSearchValue) => {
    this.setState({
      searchValue: newSearchValue
    });
    const searchValue = newSearchValue.trim();
    if (searchValue.length === 0) {
      this.setState({
        searchedDepartments: [],
        highlightIndex: -1,
      });
    } else {
      if (orgID) {
        orgAdminAPI.orgAdminSearchGroup(orgID, searchValue).then((res) => {
          const filteredGroupList = res.data.group_list
            .filter(item => item.creator_email === 'system admin')
            .map(item => ({
              id: item.id,
              name: item.group_name,
              creator_email: item.creator_email,
              creator_name: item.creator_name,
              ctime: item.ctime,
              creator_contact_email: item.creator_contact_email,
            }));
          this.setState({
            searchedDepartments: filteredGroupList,
            highlightIndex: filteredGroupList.length > 0 ? 0 : -1,
          });
        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      } else {
        systemAdminAPI.sysAdminSearchGroups(searchValue).then((res) => {
          const filteredGroupList = res.data.group_list
            .filter(item => item.owner === 'system admin')
            .map(item => ({
              id: item.id,
              name: item.name,
              creator_email: item.owner,
              creator_name: item.owner_name,
              ctime: item.ctime,
              creator_contact_email: item.creator_contact_email,
            }));
          this.setState({
            searchedDepartments: filteredGroupList,
            highlightIndex: filteredGroupList.length > 0 ? 0 : -1,
          });
        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      }
    }
  };

  onDepartmentClick = (department) => {
    this.setState({
      selectedDepartment: department,
      isPopoverOpen: false,
      searchValue: '',
      searchedDepartments: [],
    });
  };

  onClickOutside = (e) => {
    if (e.target.id !== 'department-select' && this.state.isPopoverOpen) {
      this.setState({
        isPopoverOpen: false,
        searchedDepartments: [],
        searchValue: '',
        highlightIndex: -1,
      });
    }
  };

  onTogglePopover = () => {
    this.setState({ isPopoverOpen: !this.state.isPopoverOpen });
    if (!this.state.isPopoverOpen) {
      this.onValueChanged(this.state.searchValue);
    }
  };

  handleSubmit = () => {
    if (!this.state.selectedDepartment) return;

    const { nodeId } = this.props;
    const targetDepartmentId = this.state.selectedDepartment.id;
    const req = orgID ?
      orgAdminAPI.orgAdminMoveDepartment(orgID, nodeId, targetDepartmentId) :
      systemAdminAPI.sysAdminMoveDepartment(nodeId, targetDepartmentId);

    req.then((res) => {
      this.props.toggle();
      this.props.onDepartmentChanged(this.state.selectedDepartment);
      toaster.success(gettext('Department moved successfully'));
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { searchValue, searchedDepartments, selectedDepartment, errMsgs } = this.state;

    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <SeahubModalHeader toggle={this.props.toggle}>{gettext('Move to department')}</SeahubModalHeader>
        <ModalBody>
          <div className="department-select-component">
            <ClickOutside onClickOutside={this.onClickOutside}>
              <div className="department-select-wrapper">
                <div
                  className={classnames('department-select-input', { 'focus': this.state.isPopoverOpen })}
                  id="department-select"
                  onClick={this.onTogglePopover}
                >
                  {selectedDepartment ? (
                    <div className="selected-department">
                      {selectedDepartment.name}
                    </div>
                  ) : (
                    <div className="department-select-placeholder">
                      {gettext('Select target department')}
                    </div>
                  )}
                </div>
                <Popover
                  placement="bottom-start"
                  isOpen={this.state.isPopoverOpen}
                  target={'department-select'}
                  hideArrow={true}
                  fade={false}
                  className="department-select-popover"
                >
                  <div className="department-select-container">
                    <div className="department-search-container">
                      <SearchInput
                        autoFocus={true}
                        placeholder={gettext('Search departments')}
                        value={searchValue}
                        onChange={this.onValueChanged}
                      />
                    </div>
                    <div className="department-list-container">
                      {searchedDepartments.length > 0 ? (
                        searchedDepartments.map((department, index) => {
                          return (
                            <div
                              key={department.id}
                              className={classnames('department-item', {
                                'department-item-highlight': index === this.state.highlightIndex
                              })}
                              onClick={() => this.onDepartmentClick(department)}
                            >
                              <span className="department-name">{department.name}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="no-search-result">
                          {searchValue ? gettext('Department not found') : gettext('Enter characters to start searching')}
                        </div>
                      )}
                    </div>
                  </div>
                </Popover>
              </div>
            </ClickOutside>
          </div>
          {errMsgs.length > 0 && (
            <ul className="list-unstyled">
              {errMsgs.map((item, index) => {
                return <li key={index} className="error mt-2">{item}</li>;
              })}
            </ul>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!selectedDepartment}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}
