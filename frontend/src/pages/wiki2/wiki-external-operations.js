import React from 'react';
import PropTypes from 'prop-types';
import { EventBus, EXTERNAL_EVENT } from '@seafile/seafile-sdoc-editor';
import AddWikiPageDialog from '../../components/dialog/add-wiki-page-dialog';
import { INSERT_POSITION } from './wiki-nav/constants';

const propTypes = {
  onAddWikiPage: PropTypes.func.isRequired,
};

class WikiExternalOperations extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowAddWikiPageDialog: false,
      wikiPageName: '',
    };
  }

  componentDidMount() {
    const eventBus = EventBus.getInstance();
    this.unsubscribeCreateWikiPage = eventBus.subscribe(EXTERNAL_EVENT.CREATE_WIKI_PAGE, this.onAddWikiPageDialogDisplayed);
  }

  componentWillUnmount() {
    this.unsubscribeCreateWikiPage();
  }

  onAddWikiPageDialogDisplayed = ({ newFileName: wikiPageName = '' }) => {
    this.props.onAddWikiPage(false, wikiPageName, INSERT_POSITION.INNER);
  };

  changeAddWikiPageDialogDisplayed = () => {
    this.setState({ isShowAddWikiPageDialog: !this.state.isShowAddWikiPageDialog });
  };

  render() {
    const { onAddWikiPage } = this.props;
    const { isShowAddWikiPageDialog, wikiPageName } = this.state;

    return (
      <>
        {isShowAddWikiPageDialog && (
          <AddWikiPageDialog
            wikiPageName={wikiPageName}
            onAddPage={onAddWikiPage}
            handleClose={this.changeAddWikiPageDialogDisplayed}
          />
        )}
      </>
    );
  }
}

WikiExternalOperations.propTypes = propTypes;

export default WikiExternalOperations;
