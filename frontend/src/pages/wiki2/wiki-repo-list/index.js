import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter, Alert } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import RepoSelect from '../../../components/repo-select';

import './index.css';


const propTypes = {
  repoOptions: PropTypes.array,
  onAddLinkedRepo: PropTypes.func.isRequired,
  onDialogClose: PropTypes.func.isRequired,
};

class WikiRepoListDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOptions: [],
      errMessage: '',
    };
  }

  onSelectOption = (option) => {
    this.setState({ selectedOptions: [option] });
  };

  handleSubmit = () => {
    if (this.state.selectedOptions.length === 0) {
      let errMessage = gettext('Please select a library to link.');
      this.setState({ errMessage: errMessage });
      return;
    }

    this.props.onAddLinkedRepo(this.state.selectedOptions[0]);
    this.toggle();
  };

  toggle = () => {
    this.props.onDialogClose();
  };

  render() {
    const { repoOptions, linkedRepos } = this.props;
    const existIdsMap = linkedRepos.reduce((idMap, item) => {
      idMap[item.id] = true;
      return idMap;
    }, {});
    const currentOptions = repoOptions.filter(item => !existIdsMap[item.id]);

    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{gettext('Select libraries')}</SeahubModalHeader>
        <ModalBody className="dialog-list-container wiki-repo-list">
          <div>{gettext('Libraries')}</div>
          <RepoSelect
            selectedOptions={this.state.selectedOptions}
            options={currentOptions}
            onSelectOption={this.onSelectOption}
            onDeleteOption={this.onDeleteOption}
            searchPlaceholder={gettext('Search libraries')}
            isInModal={true}
          />
        </ModalBody>
        {this.state.errMessage && <Alert color="danger" className="mt-2">{this.state.errMessage}</Alert>}
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Close')}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

WikiRepoListDialog.propTypes = propTypes;

export default WikiRepoListDialog;
