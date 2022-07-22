import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { processor } from '@seafile/seafile-editor';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import getPreviewContent from '../../../utils/markdown-utils';
import AddOrUpdateTermDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-or-update-term-dialog';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import TermsPerviewDialog from '../../../components/dialog/terms-preview-dialog';
import ModalPortal from '../../../components/modal-portal';
import OpMenu from '../../../components/dialog/op-menu';

const propsTypes = {
  item: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  deleteTerm: PropTypes.func.isRequired,
  updateTerm: PropTypes.func.isRequired,
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      itemContent: '...',
      isOpIconShown: false,
      isUpdateDialogOpen: false,
      isDeleteDialogOpen: false,
      isTermsPerviewDialogOpen: false,
    };
  }

  componentDidMount() {
    let mdFile = this.props.item.text;
    processor.process(mdFile).then((result) => {
      let innerHtml = String(result);
      this.setState({itemContent: innerHtml});
    });
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.item.text !== this.props.item.text) {
      let mdFile = nextProps.item.text;
      processor.process(mdFile).then((result) => {
        let innerHtml = String(result);
        this.setState({itemContent: innerHtml});
      });
    }
  }

  handleMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: true,
        highlight: true
      });
    }
  }

  handleMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: false,
        highlight: false
      });
    }
  }

  toggleUpdateDialog = (e) => {
    this.setState({isUpdateDialogOpen: !this.state.isUpdateDialogOpen});
  }

  toggleDeleteDialog = (e) => {
    this.setState({isDeleteDialogOpen: !this.state.isDeleteDialogOpen});
  }

  toggleTermsContentDialog = (e) => {
    this.setState({isTermsPerviewDialogOpen: !this.state.isTermsPerviewDialogOpen});
  }

  onMenuItemClick = (operation) => {
    switch(operation) {
      case 'Update':
        this.toggleUpdateDialog();
        break;
      case 'Delete':
        this.toggleDeleteDialog();
        break;
    }
  }

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOpIconShow: false
    });
    this.props.onUnfreezedItem();
  }

  deleteTerm = () => {
    this.props.deleteTerm(this.props.item.id);
    this.toggleDeleteDialog();
  }

  updateTerm = (name, versionNumber, text, isActive) => {
    this.props.updateTerm(this.props.item.id, name, versionNumber, text, isActive);
    this.toggleUpdateDialog();
  }

  translateOperations = (item) => {
    let translateResult = '';
    switch(item) {
      case 'Update':
        translateResult = gettext('Update');
        break;
      case 'Delete':
        translateResult = gettext('Delete');
        break;
      default:
        break;
    }

    return translateResult;
  }

  render() {
    let { item } = this.props;
    let { isDeleteDialogOpen, isUpdateDialogOpen, isTermsPerviewDialogOpen } = this.state;
    let previewContent = getPreviewContent(item.text);
    let itemName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?').replace('{placeholder}', itemName);
    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td>{item.name}</td>
          <td>{item.version_number}</td>
          <td className="ellipsis">
            <a href='#' onClick={this.toggleTermsContentDialog}>{previewContent.previewText}</a>
          </td>
          <td>{moment(item.ctime).fromNow()}</td>
          <td>{item.activate_time ? moment(item.activate_time).fromNow() : '--'}</td>
          <td>
            {this.state.isOpIconShown &&
              <OpMenu
                operations={['Update', 'Delete']}
                translateOperations={this.translateOperations}
                onMenuItemClick={this.onMenuItemClick}
                onFreezedItem={this.props.onFreezedItem}
                onUnfreezedItem={this.onUnfreezedItem}
              />
            }
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <ModalPortal>
            <CommonOperationConfirmationDialog
              title={gettext('Delete T&C')}
              message={deleteDialogMsg}
              toggleDialog={this.toggleDeleteDialog}
              executeOperation={this.deleteTerm}
              confirmBtnText={gettext('Delete')}
            />
          </ModalPortal>
        }
        {isUpdateDialogOpen &&
          <ModalPortal>
            <AddOrUpdateTermDialog
              updateTerm={this.updateTerm}
              toggle={this.toggleUpdateDialog}
              isUpdate={true}
              oldTermObj={item}
            />
          </ModalPortal>
        }
        {isTermsPerviewDialogOpen &&
          <ModalPortal>
            <TermsPerviewDialog
              content={item.text}
              onClosePreviewDialog={this.toggleTermsContentDialog}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

Item.propTypes = propsTypes;

export default Item;
