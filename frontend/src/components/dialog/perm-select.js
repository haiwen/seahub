import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { Utils } from '../../utils/utils';
import CustomPermission from '../../models/custom-permission';
import Loading from '../loading';
import toaster from '../toast';
import { seafileAPI } from '../../utils/seafile-api';

const propTypes = {
  repoID: PropTypes.string,
  currentPerm: PropTypes.string.isRequired,
  permissions: PropTypes.array.isRequired,
  changePerm: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class PermSelect extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      isLoading: true,
      currentOption: this.props.currentPerm,
      customPermissions: []
    };

    this.customPermissions = null;
  }

  componentDidMount() {
    if (this.props.repoID) {
      this.listCustomPermissions();
    } else {
      this.setState({isLoading: false});
    }
  }

  listCustomPermissions = () => {
    const { repoID } = this.props;
    seafileAPI.listCustomPermissions(repoID).then(res => {
      const { permission_list: permissions } = res.data;
      const customPermissions = permissions.map(item => new CustomPermission(item));
      this.setState({
        isLoading: false,
        customPermissions: customPermissions
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      this.setState({isLoading: false});
    });
  }

  switchOption = (e) => {
    if (!e.target.checked) {
      return;
    }

    const currentOption = e.target.value;
    this.setState({
      currentOption: currentOption
    });

    this.props.changePerm(currentOption);
    this.props.toggleDialog();
  }

  translatePermission = (permission) => {
    let value = Utils.sharePerms(permission);
    if (!value) {
      const { customPermissions } = this.state;
      const item = customPermissions.find(item => item.id + '' === permission);
      value = item && item.name;
    }
    return value;
    
  }
  
  translateExplanation = (explanation) => {
    let value = Utils.sharePermsExplanation(explanation);
    if (!value) {
      const { customPermissions } = this.state;
      const item = customPermissions.find(item => item.id + '' === explanation);
      value = item && item.description;
    }
    return value;
  }

  getPermissions = () => {
    const { permissions } = this.props;
    let newPermissions = permissions.slice();
    const { customPermissions } = this.state;
    if (!this.customPermissions) {
      if (customPermissions.length > 0) {
        customPermissions.forEach(item => {
          newPermissions.push(item.id + '');
        });
      }
      this.customPermissions = newPermissions;
    }
    return this.customPermissions;
  }


  render() {
    const { isLoading, currentOption } = this.state;
    let permissions = [];
    if (!isLoading) {
      permissions = this.getPermissions();
    }

    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog}>
        <ModalBody style={{maxHeight: '400px', overflow: 'auto'}}>
          {isLoading && <Loading />}
          {!isLoading && permissions.map((item, index) => {
            return (
              <div className="d-flex" key={index}>
                <input id={`option-${index}`} className="mt-1" type="radio" name="permission" value={item} checked={currentOption == item} onChange={this.switchOption} />
                <label htmlFor={`option-${index}`} className="ml-2">
                  {this.translatePermission(item)}
                  <p className="text-secondary small m-0">
                    {this.translateExplanation(item)}
                  </p>
                </label>
              </div>
            );
          })}
        </ModalBody>
      </Modal>
    );
  }
}

PermSelect.propTypes = propTypes;

export default PermSelect;
