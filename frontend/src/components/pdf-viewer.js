import React from 'react';
import { gettext } from '../utils/constants';

class PDFViewer extends React.Component {

  render() {
    return (
      <React.Fragment>
        <div id="outerContainer">

          <div id="sidebarContainer" className="sf-hide">
            <div id="toolbarSidebar">
              <div id="toolbarSidebarLeft">
                <div className="splitToolbarButton toggled">
                  <button id="viewThumbnail" className="toolbarButton toggled" title="Show Thumbnails" tabIndex="2" data-l10n-id="thumbs">
                    <span data-l10n-id="thumbs_label">Thumbnails</span>
                  </button>
                  <button id="viewOutline" className="toolbarButton" title="Show Document Outline (double-click to expand/collapse all items)" tabIndex="3" data-l10n-id="document_outline">
                    <span data-l10n-id="document_outline_label">Document Outline</span>
                  </button>
                  <button id="viewAttachments" className="toolbarButton" title="Show Attachments" tabIndex="4" data-l10n-id="attachments">
                    <span data-l10n-id="attachments_label">Attachments</span>
                  </button>
                  <button id="viewLayers" className="toolbarButton" title="Show Layers (double-click to reset all layers to the default state)" tabIndex="5" data-l10n-id="layers">
                    <span data-l10n-id="layers_label">Layers</span>
                  </button>
                </div>
              </div>

              <div id="toolbarSidebarRight">
                <div id="outlineOptionsContainer" className="hidden">
                  <div className="verticalToolbarSeparator"></div>

                  <button id="currentOutlineItem" className="toolbarButton" disabled="disabled" title="Find Current Outline Item" tabIndex="6" data-l10n-id="current_outline_item">
                    <span data-l10n-id="current_outline_item_label">Current Outline Item</span>
                  </button>
                </div>
              </div>
            </div>
            <div id="sidebarContent">
              <div id="thumbnailView">
              </div>
              <div id="outlineView" className="hidden">
              </div>
              <div id="attachmentsView" className="hidden">
              </div>
              <div id="layersView" className="hidden">
              </div>
            </div>
            <div id="sidebarResizer"></div>
          </div>
          {/* <!-- sidebarContainer --> */}

          <div id="mainContainer">
            <div className="findbar hidden doorHanger sf-hide" id="findbar">
              <div id="findbarInputContainer">
                <input id="findInput" className="toolbarField" title="Find" placeholder="Find in document…" tabIndex="91" data-l10n-id="find_input" />
                <div className="splitToolbarButton">
                  <button id="findPrevious" className="toolbarButton findPrevious" title="Find the previous occurrence of the phrase" tabIndex="92" data-l10n-id="find_previous">
                    <span data-l10n-id="find_previous_label">Previous</span>
                  </button>
                  <div className="splitToolbarButtonSeparator"></div>
                  <button id="findNext" className="toolbarButton findNext" title="Find the next occurrence of the phrase" tabIndex="93" data-l10n-id="find_next">
                    <span data-l10n-id="find_next_label">Next</span>
                  </button>
                </div>
              </div>

              <div id="findbarOptionsOneContainer">
                <input type="checkbox" id="findHighlightAll" className="toolbarField" tabIndex="94" />
                <label htmlFor="findHighlightAll" className="toolbarLabel" data-l10n-id="find_highlight">Highlight all</label>
                <input type="checkbox" id="findMatchCase" className="toolbarField" tabIndex="95" />
                <label htmlFor="findMatchCase" className="toolbarLabel" data-l10n-id="find_match_case_label">Match case</label>
              </div>
              <div id="findbarOptionsTwoContainer">
                <input type="checkbox" id="findEntireWord" className="toolbarField" tabIndex="96" />
                <label htmlFor="findEntireWord" className="toolbarLabel" data-l10n-id="find_entire_word_label">Whole words</label>
                <span id="findResultsCount" className="toolbarLabel hidden"></span>
              </div>

              <div id="findbarMessageContainer">
                <span id="findMsg" className="toolbarLabel"></span>
              </div>
            </div>
            {/*<!-- findbar -->*/}

            <div id="secondaryToolbar" className="secondaryToolbar hidden doorHangerRight sf-hide">
              <div id="secondaryToolbarButtonContainer">
                <button id="secondaryPresentationMode" className="secondaryToolbarButton presentationMode visibleLargeView" title="Switch to Presentation Mode" tabIndex="51" data-l10n-id="presentation_mode">
                  <span data-l10n-id="presentation_mode_label">Presentation Mode</span>
                </button>

                <button id="secondaryOpenFile" className="secondaryToolbarButton openFile visibleLargeView" title="Open File" tabIndex="52" data-l10n-id="open_file">
                  <span data-l10n-id="open_file_label">Open</span>
                </button>

                <button id="secondaryPrint" className="secondaryToolbarButton print visibleMediumView" title="Print" tabIndex="53" data-l10n-id="print">
                  <span data-l10n-id="print_label">Print</span>
                </button>

                <button id="secondaryDownload" className="secondaryToolbarButton download visibleMediumView" title="Download" tabIndex="54" data-l10n-id="download">
                  <span data-l10n-id="download_label">Download</span>
                </button>

                <a href="#" id="secondaryViewBookmark" className="secondaryToolbarButton bookmark visibleSmallView" title="Current view (copy or open in new window)" tabIndex="55" data-l10n-id="bookmark">
                  <span data-l10n-id="bookmark_label">Current View</span>
                </a>

                <div className="horizontalToolbarSeparator visibleLargeView"></div>

                <button id="firstPage" className="secondaryToolbarButton firstPage" title="Go to First Page" tabIndex="56" data-l10n-id="first_page">
                  <span data-l10n-id="first_page_label">Go to First Page</span>
                </button>
                <button id="lastPage" className="secondaryToolbarButton lastPage" title="Go to Last Page" tabIndex="57" data-l10n-id="last_page">
                  <span data-l10n-id="last_page_label">Go to Last Page</span>
                </button>

                <div className="horizontalToolbarSeparator"></div>

                <button id="pageRotateCw" className="secondaryToolbarButton rotateCw" title="Rotate Clockwise" tabIndex="58" data-l10n-id="page_rotate_cw">
                  <span data-l10n-id="page_rotate_cw_label">Rotate Clockwise</span>
                </button>
                <button id="pageRotateCcw" className="secondaryToolbarButton rotateCcw" title="Rotate Counterclockwise" tabIndex="59" data-l10n-id="page_rotate_ccw">
                  <span data-l10n-id="page_rotate_ccw_label">Rotate Counterclockwise</span>
                </button>

                <div className="horizontalToolbarSeparator"></div>

                <button id="cursorSelectTool" className="secondaryToolbarButton selectTool toggled" title="Enable Text Selection Tool" tabIndex="60" data-l10n-id="cursor_text_select_tool">
                  <span data-l10n-id="cursor_text_select_tool_label">Text Selection Tool</span>
                </button>
                <button id="cursorHandTool" className="secondaryToolbarButton handTool" title="Enable Hand Tool" tabIndex="61" data-l10n-id="cursor_hand_tool">
                  <span data-l10n-id="cursor_hand_tool_label">Hand Tool</span>
                </button>

                <div className="horizontalToolbarSeparator"></div>

                <button id="scrollVertical" className="secondaryToolbarButton scrollModeButtons scrollVertical toggled" title="Use Vertical Scrolling" tabIndex="62" data-l10n-id="scroll_vertical">
                  <span data-l10n-id="scroll_vertical_label">Vertical Scrolling</span>
                </button>
                <button id="scrollHorizontal" className="secondaryToolbarButton scrollModeButtons scrollHorizontal" title="Use Horizontal Scrolling" tabIndex="63" data-l10n-id="scroll_horizontal">
                  <span data-l10n-id="scroll_horizontal_label">Horizontal Scrolling</span>
                </button>
                <button id="scrollWrapped" className="secondaryToolbarButton scrollModeButtons scrollWrapped" title="Use Wrapped Scrolling" tabIndex="64" data-l10n-id="scroll_wrapped">
                  <span data-l10n-id="scroll_wrapped_label">Wrapped Scrolling</span>
                </button>

                <div className="horizontalToolbarSeparator scrollModeButtons"></div>

                <button id="spreadNone" className="secondaryToolbarButton spreadModeButtons spreadNone toggled" title="Do not join page spreads" tabIndex="65" data-l10n-id="spread_none">
                  <span data-l10n-id="spread_none_label">No Spreads</span>
                </button>
                <button id="spreadOdd" className="secondaryToolbarButton spreadModeButtons spreadOdd" title="Join page spreads starting with odd-numbered pages" tabIndex="66" data-l10n-id="spread_odd">
                  <span data-l10n-id="spread_odd_label">Odd Spreads</span>
                </button>
                <button id="spreadEven" className="secondaryToolbarButton spreadModeButtons spreadEven" title="Join page spreads starting with even-numbered pages" tabIndex="67" data-l10n-id="spread_even">
                  <span data-l10n-id="spread_even_label">Even Spreads</span>
                </button>

                <div className="horizontalToolbarSeparator spreadModeButtons"></div>

                <button id="documentProperties" className="secondaryToolbarButton documentProperties" title="Document Properties…" tabIndex="68" data-l10n-id="document_properties">
                  <span data-l10n-id="document_properties_label">Document Properties…</span>
                </button>
              </div>
            </div>
            {/*<!-- secondaryToolbar -->*/}

            <div className="toolbar">
              <div id="toolbarContainer">
                <div id="toolbarViewer">
                  <div id="toolbarViewerLeft" className="sf-hide">
                    <button id="sidebarToggle" className="toolbarButton" title="Toggle Sidebar" tabIndex="11" data-l10n-id="toggle_sidebar" aria-expanded="false" aria-controls="sidebarContainer">
                      <span data-l10n-id="toggle_sidebar_label">Toggle Sidebar</span>
                    </button>
                    <div className="toolbarButtonSpacer"></div>
                    <button id="viewFind" className="toolbarButton" title="Find in Document" tabIndex="12" data-l10n-id="findbar" aria-expanded="false" aria-controls="findbar">
                      <span data-l10n-id="findbar_label">Find</span>
                    </button>
                    <div className="splitToolbarButton hiddenSmallView">
                      <button className="toolbarButton pageUp" title="Previous Page" id="previous" tabIndex="13" data-l10n-id="previous">
                        <span data-l10n-id="previous_label">Previous</span>
                      </button>
                      <div className="splitToolbarButtonSeparator"></div>
                      <button className="toolbarButton pageDown" title="Next Page" id="next" tabIndex="14" data-l10n-id="next">
                        <span data-l10n-id="next_label">Next</span>
                      </button>
                    </div>
                    <input type="number" id="pageNumber" className="toolbarField pageNumber" title="Page" defaultValue="1" size="4" min="1" tabIndex="15" data-l10n-id="page" autoComplete="off" />
                    <span id="numPages" className="toolbarLabel"></span>
                  </div>
                  <div id="toolbarViewerRight" className="sf-hide">
                    <button id="presentationMode" className="toolbarButton presentationMode hiddenLargeView" title="Switch to Presentation Mode" tabIndex="31" data-l10n-id="presentation_mode">
                      <span data-l10n-id="presentation_mode_label">Presentation Mode</span>
                    </button>

                    <button id="openFile" className="toolbarButton openFile hiddenLargeView" title="Open File" tabIndex="32" data-l10n-id="open_file">
                      <span data-l10n-id="open_file_label">Open</span>
                    </button>

                    <button id="print" className="toolbarButton print hiddenMediumView" title="Print" tabIndex="33" data-l10n-id="print">
                      <span data-l10n-id="print_label">Print</span>
                    </button>

                    <button id="download" className="toolbarButton download hiddenMediumView" title="Download" tabIndex="34" data-l10n-id="download">
                      <span data-l10n-id="download_label">Download</span>
                    </button>
                    <a href="#" id="viewBookmark" className="toolbarButton bookmark hiddenSmallView" title="Current view (copy or open in new window)" tabIndex="35" data-l10n-id="bookmark">
                      <span data-l10n-id="bookmark_label">Current View</span>
                    </a>

                    <div className="verticalToolbarSeparator hiddenSmallView"></div>

                    <button id="secondaryToolbarToggle" className="toolbarButton" title="Tools" tabIndex="36" data-l10n-id="tools" aria-expanded="false" aria-controls="secondaryToolbar">
                      <span data-l10n-id="tools_label">Tools</span>
                    </button>
                  </div>
                  <div id="toolbarViewerMiddle" className="d-none">
                    <div className="splitToolbarButton">
                    </div>
                    <span id="scaleSelectContainer" className="dropdownToolbarButton">
                      <select id="scaleSelect" title="Zoom" tabIndex="23" data-l10n-id="zoom" defaultValue="auto">
                        <option id="pageAutoOption" title="" value="auto" data-l10n-id="page_scale_auto">Automatic Zoom</option>
                        <option id="pageActualOption" title="" value="page-actual" data-l10n-id="page_scale_actual">Actual Size</option>
                        <option id="pageFitOption" title="" value="page-fit" data-l10n-id="page_scale_fit">Page Fit</option>
                        <option id="pageWidthOption" title="" value="page-width" data-l10n-id="page_scale_width">Page Width</option>
                        <option id="customScaleOption" title="" value="custom" disabled="disabled" hidden={true}></option>
                        <option title="" value="0.5" data-l10n-id="page_scale_percent" data-l10n-args='{ "scale": 50 }'>50%</option>
                        <option title="" value="0.75" data-l10n-id="page_scale_percent" data-l10n-args='{ "scale": 75 }'>75%</option>
                        <option title="" value="1" data-l10n-id="page_scale_percent" data-l10n-args='{ "scale": 100 }'>100%</option>
                        <option title="" value="1.25" data-l10n-id="page_scale_percent" data-l10n-args='{ "scale": 125 }'>125%</option>
                        <option title="" value="1.5" data-l10n-id="page_scale_percent" data-l10n-args='{ "scale": 150 }'>150%</option>
                        <option title="" value="2" data-l10n-id="page_scale_percent" data-l10n-args='{ "scale": 200 }'>200%</option>
                        <option title="" value="3" data-l10n-id="page_scale_percent" data-l10n-args='{ "scale": 300 }'>300%</option>
                        <option title="" value="4" data-l10n-id="page_scale_percent" data-l10n-args='{ "scale": 400 }'>400%</option>
                      </select>
                    </span>
                  </div>
                </div>
                <div id="loadingBar">
                  <span className="loading-icon loading-tip"></span>
                  <div className="progress hidden">
                    <div className="glimmer">
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex flex-column" id="zoom-toolbar">
              <button id="restoreToAuto" title={gettext('Default Size')} aria-label={gettext('Default Size')} className="sf3-font sf3-font-page-size btn btn-icon rounded mb-4"></button>
              <button id="zoomIn" className="toolbarButton zoomIn sf3-font sf3-font-enlarge btn btn-icon rounded mb-2" title={gettext('Zoom In')} aria-label={gettext('Zoom In')} tabIndex="22"></button>
              <button id="zoomOut" className="toolbarButton zoomOut sf3-font sf3-font-narrow btn btn-icon rounded" title={gettext('Zoom Out')} aria-label={gettext('Zoom Out')} tabIndex="21"></button>
            </div>

            <div id="viewerContainer" tabIndex="0">
              <div id="viewer" className="pdfViewer"></div>
            </div>

            <div id="errorWrapper" hidden={true}>
              <div id="errorMessageLeft">
                <span id="errorMessage"></span>
                <button id="errorShowMore" data-l10n-id="error_more_info">
                  More Information
                </button>
                <button id="errorShowLess" data-l10n-id="error_less_info" hidden={true}>
                  Less Information
                </button>
              </div>
              <div id="errorMessageRight">
                <button id="errorClose" data-l10n-id="error_close">
                  Close
                </button>
              </div>
              <div className="clearBoth"></div>
              <textarea id="errorMoreInfo" hidden={true} readOnly={true}></textarea>
            </div>
          </div>
          {/*<!-- mainContainer -->*/}

          <div id="overlayContainer" className="hidden">
            <div id="passwordOverlay" className="container hidden">
              <div className="dialog">
                <div className="row">
                  <p id="passwordText" data-l10n-id="password_label">Enter the password to open this PDF file:</p>
                </div>
                <div className="row">
                  <input type="password" id="password" className="toolbarField" />
                </div>
                <div className="buttonRow">
                  <button id="passwordCancel" className="overlayButton"><span data-l10n-id="password_cancel">Cancel</span></button>
                  <button id="passwordSubmit" className="overlayButton"><span data-l10n-id="password_ok">OK</span></button>
                </div>
              </div>
            </div>
            <div id="documentPropertiesOverlay" className="container hidden">
              <div className="dialog">
                <div className="row">
                  <span data-l10n-id="document_properties_file_name">File name:</span> <p id="fileNameField">-</p>
                </div>
                <div className="row">
                  <span data-l10n-id="document_properties_file_size">File size:</span> <p id="fileSizeField">-</p>
                </div>
                <div className="separator"></div>
                <div className="row">
                  <span data-l10n-id="document_properties_title">Title:</span> <p id="titleField">-</p>
                </div>
                <div className="row">
                  <span data-l10n-id="document_properties_author">Author:</span> <p id="authorField">-</p>
                </div>
                <div className="row">
                  <span data-l10n-id="document_properties_subject">Subject:</span> <p id="subjectField">-</p>
                </div>
                <div className="row">
                  <span data-l10n-id="document_properties_keywords">Keywords:</span> <p id="keywordsField">-</p>
                </div>
                <div className="row">
                  <span data-l10n-id="document_properties_creation_date">Creation Date:</span> <p id="creationDateField">-</p>
                </div>
                <div className="row">
                  <span data-l10n-id="document_properties_modification_date">Modification Date:</span> <p id="modificationDateField">-</p>
                </div>
                <div className="row">
                  <span data-l10n-id="document_properties_creator">Creator:</span> <p id="creatorField">-</p>
                </div>
                <div className="separator"></div>
                <div className="row">
                  <span data-l10n-id="document_properties_producer">PDF Producer:</span> <p id="producerField">-</p>
                </div>
                <div className="row">
                  <span data-l10n-id="document_properties_version">PDF Version:</span> <p id="versionField">-</p>
                </div>
                <div className="row">
                  <span data-l10n-id="document_properties_page_count">Page Count:</span> <p id="pageCountField">-</p>
                </div>
                <div className="row">
                  <span data-l10n-id="document_properties_page_size">Page Size:</span> <p id="pageSizeField">-</p>
                </div>
                <div className="separator"></div>
                <div className="row">
                  <span data-l10n-id="document_properties_linearized">Fast Web View:</span> <p id="linearizedField">-</p>
                </div>
                <div className="buttonRow">
                  <button id="documentPropertiesClose" className="overlayButton"><span data-l10n-id="document_properties_close">Close</span></button>
                </div>
              </div>
            </div>
            <div id="printServiceOverlay" className="container hidden sf-hide">
              <div className="dialog">
                <div className="row">
                  <span data-l10n-id="print_progress_message">Preparing document for printing…</span>
                </div>
                <div className="row">
                  <progress value="0" max="100"></progress>
                  <span data-l10n-id="print_progress_percent" data-l10n-args='{ "progress": 0 }' className="relative-progress">0%</span>
                </div>
                <div className="buttonRow">
                  <button id="printCancel" className="overlayButton"><span data-l10n-id="print_progress_close">Cancel</span></button>
                </div>
              </div>
            </div>
          </div>
          {/*<!-- overlayContainer -->*/}

        </div>
        {/*<!-- outerContainer -->*/}
        <div id="printContainer" className="sf-hide"></div>
      </React.Fragment>
    );
  }
}

export default PDFViewer;
