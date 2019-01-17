import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import moment from 'moment';
import { Utils } from '../../utils/utils';
import Draft from '../../models/draft';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  toggle: PropTypes.func.isRequired,
};

class ListRepoDraftsDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      drafts: [],
    }
  }
  componentDidMount() { 
    seafileAPI.listRepoDrafts(this.props.repoID).then(res => {
      this.setState({
        drafts: res.data.drafts 
      })  
    })
  }

  toggle = () => {
    this.props.toggle();
  }

  render() {
    let drafts = this.state.drafts;
    return (
      <Fragment>
        <ModalHeader toggle={this.toggle}>
          <span className="tag-dialog-back fas fa-sm fa-arrow-left" onClick={this.toggle} aria-label={gettext('Back')}></span>
          {gettext('Drafts')}
        </ModalHeader>
        <ModalBody className="dialog-list-container">
          <table className="table-thead-hidden">
            <thead>
              <tr>
                <th width='50%' className="ellipsis">{gettext('Name')}</th>
                <th width='25%'>{gettext('Owner')}</th>
                <th width='25%'>{gettext('Last Update')}</th>
              </tr>
            </thead>
            <tbody>
              {this.state.drafts.map((item) => {
                let draft = new Draft(item);
                let href = siteRoot + 'lib/' + draft.originRepoID + '/file' + Utils.encodePath(draft.draftFilePath);
                return (
                  <tr key={draft.id}>
                    <td className="name">
                      <a href={href} target='_blank'>{Utils.getFileName(draft.draftFilePath)}</a>
                    </td>
                    <td>{draft.ownerNickname}</td>
                    <td>{moment(draft.createdStr).fromNow()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Close')}</Button>
        </ModalFooter>
      </Fragment>
    );
  }
}

ListRepoDraftsDialog.propTypes = propTypes;

export default ListRepoDraftsDialog;
