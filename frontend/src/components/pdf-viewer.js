import React from 'react';
import { gettext } from '../utils/constants';

class PDFViewer extends React.Component {

  componentDidMount() {
    const el = document.createElement('div');
    el.id = 'printContainer';
    document.body.append(el);
  }

  render() {
    return (
      <React.Fragment>
        <div id="outerContainer">

          <div id="sidebarContainer">
            <div id="toolbarSidebar">
              <div id="sidebarHeader" className="px-4 py-2 d-flex justify-content-between align-items-center">
                <h3 id="thumbnailHeader" className="m-0 title font-weight-normal">{gettext('Thumbnail')}</h3>
                <h3 id="outlineHeader" className="m-0 title font-weight-normal hidden">{gettext('Outline')}</h3>
                <button id="close-thumbnail-panel" className="close-thumbnail-panel sf2-icon-x3 border-0 bg-transparent" aria-controls="sidebarContainer"></button>
              </div>
              <div id="toolbarSidebarLeft" className="sf-hide">
                <div id="sidebarViewButtons" className="splitToolbarButton toggled" role="radiogroup">
                  <button id="viewThumbnail" className="toolbarButton toggled" title="Show Thumbnails" tabIndex="2" data-l10n-id="thumbs" role="radio" aria-checked="true" aria-controls="thumbnailView">
                    <span data-l10n-id="thumbs_label">Thumbnails</span>
                  </button>
                  <button id="viewOutline" className="toolbarButton" title="Show Document Outline (double-click to expand/collapse all items)" tabIndex="3" data-l10n-id="document_outline" role="radio" aria-checked="false" aria-controls="outlineView">
                    <span data-l10n-id="document_outline_label">Document Outline</span>
                  </button>
                  <button id="viewAttachments" className="toolbarButton" title="Show Attachments" tabIndex="4" data-l10n-id="attachments" role="radio" aria-checked="false" aria-controls="attachmentsView">
                    <span data-l10n-id="attachments_label">Attachments</span>
                  </button>
                  <button id="viewLayers" className="toolbarButton" title="Show Layers (double-click to reset all layers to the default state)" tabIndex="5" data-l10n-id="layers" role="radio" aria-checked="false" aria-controls="layersView">
                    <span data-l10n-id="layers_label">Layers</span>
                  </button>
                </div>
              </div>

              <div id="toolbarSidebarRight" className="sf-hide">
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
          {/* <!-- sidebarContainer -->*/}

          <div id="mainContainer">
            <div className="findbar hidden doorHanger d-flex align-items-center" id="findbar">
              <div id="findbarInputContainer">
                <input id="findInput" className="form-control" title="Find" placeholder="Find in document…" tabIndex="91" data-l10n-id="find_input" aria-invalid="false" />
                <div className="position-absolute d-flex align-items-center" id="findbarMiscContainer">
                  <div id="findbarMessageContainer" aria-live="polite">
                    <span id="findResultsCount"></span>
                    <span id="findMsg" className="toolbarLabel d-none"></span>
                  </div>
                  <div className="splitToolbarButton m-0">
                    <button id="findPrevious" className="hidden border-0 sf3-font sf3-font-down" title="Find the previous occurrence of the phrase" tabIndex="92" data-l10n-id="find_previous">
                      <span data-l10n-id="find_previous_label" className="find-label">Previous</span>
                    </button>
                    <div className="splitToolbarButtonSeparator d-none"></div>
                    <button id="findNext" className="hidden border-0 sf3-font sf3-font-down" title="Find the next occurrence of the phrase" tabIndex="93" data-l10n-id="find_next">
                      <span data-l10n-id="find_next_label" className="find-label">Next</span>
                    </button>
                  </div>
                  <button id="findClearQuery" className="hidden border-0 ml-1 sf3-font sf3-font-close"></button>
                </div>
              </div>

              <div id="findbarOptionsOneContainer">
                <input type="checkbox" id="findHighlightAll" className="toolbarField" tabIndex="94" />
                <label htmlFor="findHighlightAll" className="toolbarLabel" data-l10n-id="find_highlight">Highlight All</label>
                <input type="checkbox" id="findMatchCase" className="toolbarField" tabIndex="95" />
                <label htmlFor="findMatchCase" className="toolbarLabel" data-l10n-id="find_match_case_label">Match Case</label>
              </div>
              <div id="findbarOptionsTwoContainer">
                <input type="checkbox" id="findMatchDiacritics" className="toolbarField" tabIndex="96" />
                <label htmlFor="findMatchDiacritics" className="toolbarLabel" data-l10n-id="find_match_diacritics_label">Match Diacritics</label>
                <input type="checkbox" id="findEntireWord" className="toolbarField" tabIndex="97" />
                <label htmlFor="findEntireWord" className="toolbarLabel" data-l10n-id="find_entire_word_label">Whole Words</label>
              </div>
            </div>
            {/* <!-- findbar -->*/}

            <div className="editorParamsToolbar hidden doorHangerRight" id="editorFreeTextParamsToolbar">
              <div className="editorParamsToolbarContainer">
                <div className="editorParamsSetter">
                  <label htmlFor="editorFreeTextColor" className="editorParamsLabel" data-l10n-id="editor_free_text_color">Color</label>
                  <input type="color" id="editorFreeTextColor" className="editorParamsColor" tabIndex="100" />
                </div>
                <div className="editorParamsSetter">
                  <label htmlFor="editorFreeTextFontSize" className="editorParamsLabel" data-l10n-id="editor_free_text_size">Size</label>
                  <input type="range" id="editorFreeTextFontSize" className="editorParamsSlider" defaultValue="10" min="5" max="100" step="1" tabIndex="101" />
                </div>
              </div>
            </div>

            <div className="editorParamsToolbar hidden doorHangerRight" id="editorInkParamsToolbar">
              <div className="editorParamsToolbarContainer">
                <div className="editorParamsSetter">
                  <label htmlFor="editorInkColor" className="editorParamsLabel" data-l10n-id="editor_ink_color">Color</label>
                  <input type="color" id="editorInkColor" className="editorParamsColor" tabIndex="102" />
                </div>
                <div className="editorParamsSetter">
                  <label htmlFor="editorInkThickness" className="editorParamsLabel" data-l10n-id="editor_ink_thickness">Thickness</label>
                  <input type="range" id="editorInkThickness" className="editorParamsSlider" defaultValue="1" min="1" max="20" step="1" tabIndex="103" />
                </div>
                <div className="editorParamsSetter">
                  <label htmlFor="editorInkOpacity" className="editorParamsLabel" data-l10n-id="editor_ink_opacity">Opacity</label>
                  <input type="range" id="editorInkOpacity" className="editorParamsSlider" defaultValue="100" min="1" max="100" step="1" tabIndex="104" />
                </div>
              </div>
            </div>

            <div id="secondaryToolbar" className="secondaryToolbar hidden doorHangerRight">
              <div id="secondaryToolbarButtonContainer">
                <button id="secondaryOpenFile" className="secondaryToolbarButton visibleLargeView" title="Open File" tabIndex="51" data-l10n-id="open_file">
                  <span data-l10n-id="open_file_label">Open</span>
                </button>

                <button id="secondaryPrint" className="secondaryToolbarButton visibleMediumView" title="Print" tabIndex="52" data-l10n-id="print">
                  <span data-l10n-id="print_label">Print</span>
                </button>

                <button id="secondaryDownload" className="secondaryToolbarButton visibleMediumView" title="Save" tabIndex="53" data-l10n-id="save">
                  <span data-l10n-id="save_label">Save</span>
                </button>

                <div className="horizontalToolbarSeparator visibleLargeView"></div>

                <button id="presentationMode" className="secondaryToolbarButton" title="Switch to Presentation Mode" tabIndex="54" data-l10n-id="presentation_mode">
                  <span data-l10n-id="presentation_mode_label">Presentation Mode</span>
                </button>

                <a href="#" id="viewBookmark" className="secondaryToolbarButton" title="Current Page (View URL from Current Page)" tabIndex="55" data-l10n-id="bookmark1">
                  <span data-l10n-id="bookmark1_label">Current Page</span>
                </a>

                <div id="viewBookmarkSeparator" className="horizontalToolbarSeparator"></div>
                {/*
                <button id="firstPage" className="secondaryToolbarButton" title="Go to First Page" tabIndex="56" data-l10n-id="first_page">
                  <span data-l10n-id="first_page_label">Go to First Page</span>
                </button>
                <button id="lastPage" className="secondaryToolbarButton" title="Go to Last Page" tabIndex="57" data-l10n-id="last_page">
                  <span data-l10n-id="last_page_label">Go to Last Page</span>
                </button>
                */}

                <div className="horizontalToolbarSeparator"></div>

                <button id="pageRotateCw" className="secondaryToolbarButton" title="Rotate Clockwise" tabIndex="58" data-l10n-id="page_rotate_cw">
                  <span data-l10n-id="page_rotate_cw_label">Rotate Clockwise</span>
                </button>
                <button id="pageRotateCcw" className="secondaryToolbarButton" title="Rotate Counterclockwise" tabIndex="59" data-l10n-id="page_rotate_ccw">
                  <span data-l10n-id="page_rotate_ccw_label">Rotate Counterclockwise</span>
                </button>

                <div className="horizontalToolbarSeparator"></div>

                <div id="cursorToolButtons" role="radiogroup">
                  <button id="cursorSelectTool" className="secondaryToolbarButton toggled" title="Enable Text Selection Tool" tabIndex="60" data-l10n-id="cursor_text_select_tool" role="radio" aria-checked="true">
                    <span data-l10n-id="cursor_text_select_tool_label">Text Selection Tool</span>
                  </button>
                  <button id="cursorHandTool" className="secondaryToolbarButton" title="Enable Hand Tool" tabIndex="61" data-l10n-id="cursor_hand_tool" role="radio" aria-checked="false">
                    <span data-l10n-id="cursor_hand_tool_label">Hand Tool</span>
                  </button>
                </div>

                <div className="horizontalToolbarSeparator"></div>

                <div id="scrollModeButtons" role="radiogroup">
                  <button id="scrollPage" className="secondaryToolbarButton" title="Use Page Scrolling" tabIndex="62" data-l10n-id="scroll_page" role="radio" aria-checked="false">
                    <span data-l10n-id="scroll_page_label">Page Scrolling</span>
                  </button>
                  <button id="scrollVertical" className="secondaryToolbarButton toggled" title="Use Vertical Scrolling" tabIndex="63" data-l10n-id="scroll_vertical" role="radio" aria-checked="true">
                    <span data-l10n-id="scroll_vertical_label" >Vertical Scrolling</span>
                  </button>
                  <button id="scrollHorizontal" className="secondaryToolbarButton" title="Use Horizontal Scrolling" tabIndex="64" data-l10n-id="scroll_horizontal" role="radio" aria-checked="false">
                    <span data-l10n-id="scroll_horizontal_label">Horizontal Scrolling</span>
                  </button>
                  <button id="scrollWrapped" className="secondaryToolbarButton" title="Use Wrapped Scrolling" tabIndex="65" data-l10n-id="scroll_wrapped" role="radio" aria-checked="false">
                    <span data-l10n-id="scroll_wrapped_label">Wrapped Scrolling</span>
                  </button>
                </div>

                <div className="horizontalToolbarSeparator"></div>

                <div id="spreadModeButtons" role="radiogroup">
                  <button id="spreadNone" className="secondaryToolbarButton toggled" title="Do not join page spreads" tabIndex="66" data-l10n-id="spread_none" role="radio" aria-checked="true">
                    <span data-l10n-id="spread_none_label">No Spreads</span>
                  </button>
                  <button id="spreadOdd" className="secondaryToolbarButton" title="Join page spreads starting with odd-numbered pages" tabIndex="67" data-l10n-id="spread_odd" role="radio" aria-checked="false">
                    <span data-l10n-id="spread_odd_label">Odd Spreads</span>
                  </button>
                  <button id="spreadEven" className="secondaryToolbarButton" title="Join page spreads starting with even-numbered pages" tabIndex="68" data-l10n-id="spread_even" role="radio" aria-checked="false">
                    <span data-l10n-id="spread_even_label">Even Spreads</span>
                  </button>
                </div>

                <div className="horizontalToolbarSeparator"></div>

                <button id="documentProperties" className="secondaryToolbarButton" title="Document Properties…" tabIndex="69" data-l10n-id="document_properties" aria-controls="documentPropertiesDialog">
                  <span data-l10n-id="document_properties_label">Document Properties…</span>
                </button>
              </div>
            </div>
            {/* <!-- secondaryToolbar -->*/}

            <div className="toolbar">
              <div id="toolbarContainer">
                <div id="toolbarViewer">
                  <div id="toolbarViewerLeft">
                    <button id="sidebarToggle" className="toolbarButton" title="Toggle Sidebar" tabIndex="11" data-l10n-id="toggle_sidebar" aria-expanded="false" aria-controls="sidebarContainer">
                      <span data-l10n-id="toggle_sidebar_label">Toggle Sidebar</span>
                    </button>
                    <div className="toolbarButtonSpacer d-none"></div>
                    <button id="viewFind" className="toolbarButton d-none" title="Find in Document" tabIndex="12" data-l10n-id="findbar" aria-expanded="false" aria-controls="findbar">
                      <span data-l10n-id="findbar_label">Find</span>
                    </button>
                    <div className="splitToolbarButton hiddenSmallView ml-2 d-flex align-items-center">
                      <div className="splitToolbarButtonSeparator mr-2"></div>
                      <button id="firstPage" className="toolbarButton" title="Go to First Page" tabIndex="56" data-l10n-id="first_page">
                        <span data-l10n-id="first_page_label">Go to First Page</span>
                      </button>
                      <button className="toolbarButton" title="Previous Page" id="previous" tabIndex="13" data-l10n-id="previous">
                        <span data-l10n-id="previous_label">Previous</span>
                      </button>
                      <input type="number" id="pageNumber" className="toolbarField" title="Page" defaultValue="1" min="1" tabIndex="15" data-l10n-id="page" autoComplete="off" />
                      <span id="numPages" className="toolbarLabel"></span>
                      <button className="toolbarButton" title="Next Page" id="next" tabIndex="14" data-l10n-id="next">
                        <span data-l10n-id="next_label">Next</span>
                      </button>
                      <button id="lastPage" className="toolbarButton" title="Go to Last Page" tabIndex="57" data-l10n-id="last_page">
                        <span data-l10n-id="last_page_label">Go to Last Page</span>
                      </button>
                    </div>
                  </div>
                  <div id="toolbarViewerRight" className="sf-hide">
                    <button id="openFile" className="toolbarButton hiddenLargeView" title="Open File" tabIndex="31" data-l10n-id="open_file">
                      <span data-l10n-id="open_file_label">Open</span>
                    </button>

                    <button id="print" className="toolbarButton hiddenMediumView" title="Print" tabIndex="32" data-l10n-id="print">
                      <span data-l10n-id="print_label">Print</span>
                    </button>

                    <button id="download" className="toolbarButton hiddenMediumView" title="Save" tabIndex="33" data-l10n-id="save">
                      <span data-l10n-id="save_label">Save</span>
                    </button>

                    <div className="verticalToolbarSeparator hiddenMediumView"></div>

                    <div id="editorModeButtons" className="splitToolbarButton toggled" role="radiogroup">
                      <button id="editorFreeText" className="toolbarButton" disabled="disabled" title="Text" role="radio" aria-checked="false" aria-controls="editorFreeTextParamsToolbar" tabIndex="34" data-l10n-id="editor_free_text2">
                        <span data-l10n-id="editor_free_text2_label">Text</span>
                      </button>
                      <button id="editorInk" className="toolbarButton" disabled="disabled" title="Draw" role="radio" aria-checked="false" aria-controls="editorInkParamsToolbar" tabIndex="35" data-l10n-id="editor_ink2">
                        <span data-l10n-id="editor_ink2_label">Draw</span>
                      </button>
                    </div>

                    <div id="editorModeSeparator" className="verticalToolbarSeparator"></div>

                    <button id="secondaryToolbarToggle" className="toolbarButton" title="Tools" tabIndex="48" data-l10n-id="tools" aria-expanded="false" aria-controls="secondaryToolbar">
                      <span data-l10n-id="tools_label">Tools</span>
                    </button>
                  </div>
                  <div id="toolbarViewerMiddle" className="d-flex align-items-center">
                    <div className="splitToolbarButton float-none">
                      <button id="zoomOut" className="toolbarButton" title="Zoom Out" tabIndex="21" data-l10n-id="zoom_out">
                        <span data-l10n-id="zoom_out_label">Zoom Out</span>
                      </button>
                      <div className="splitToolbarButtonSeparator d-none"></div>
                    </div>
                    <div id="scaleSelectContainer" className="dropdownToolbarButton my-0 mx-1 float-none">
                      <select id="scaleSelect" title="Zoom" tabIndex="23" data-l10n-id="zoom" defaultValue="auto" className="bg-white border rounded py-0 px-1">
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
                    </div>
                    <div className="splitToolbarButton float-none">
                      <button id="zoomIn" className="toolbarButton" title="Zoom In" tabIndex="22" data-l10n-id="zoom_in">
                        <span data-l10n-id="zoom_in_label">Zoom In</span>
                      </button>
                    </div>

                  </div>
                </div>
                <div id="loadingBar">
                  <span className="loading-icon loading-tip"></span>
                  {/* <div className="progress">
                    <div className="glimmer">
                    </div>
                  </div>*/}
                </div>
              </div>
            </div>

            <div id="viewerContainer" tabIndex="0">
              <div id="viewer" className="pdfViewer"></div>
            </div>
          </div>
          {/* <!-- mainContainer -->*/}

          <div id="dialogContainer" className="modal">
            <dialog id="passwordDialog" className="modal-dialog p-0 rounded border-0 shadow-none">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{gettext('Decrypt document')}</h5>
                  <button type="button" id="passwordCancel2" className="align-self-center bg-transparent border-0 sf3-font sf3-font-x-01 modal-close" aria-label={gettext('Close')}></button>
                </div>
                <div className="modal-body py-6 text-start">
                  <label htmlFor="password" id="passwordText" data-l10n-id="password_label" className="form-label">Enter the password to open this PDF file:</label>
                  <input type="password" id="password" className="form-control" />
                </div>
                <div className="modal-footer">
                  <button id="passwordCancel" className="btn btn-secondary"><span data-l10n-id="password_cancel">Cancel</span></button>
                  <button id="passwordSubmit" className="btn btn-primary"><span data-l10n-id="password_ok">OK</span></button>
                </div>
              </div>
            </dialog>
            <dialog id="documentPropertiesDialog">
              <div className="row">
                <span id="fileNameLabel" data-l10n-id="document_properties_file_name">File name:</span>
                <p id="fileNameField" aria-labelledby="fileNameLabel">-</p>
              </div>
              <div className="row">
                <span id="fileSizeLabel" data-l10n-id="document_properties_file_size">File size:</span>
                <p id="fileSizeField" aria-labelledby="fileSizeLabel">-</p>
              </div>
              <div className="separator"></div>
              <div className="row">
                <span id="titleLabel" data-l10n-id="document_properties_title">Title:</span>
                <p id="titleField" aria-labelledby="titleLabel">-</p>
              </div>
              <div className="row">
                <span id="authorLabel" data-l10n-id="document_properties_author">Author:</span>
                <p id="authorField" aria-labelledby="authorLabel">-</p>
              </div>
              <div className="row">
                <span id="subjectLabel" data-l10n-id="document_properties_subject">Subject:</span>
                <p id="subjectField" aria-labelledby="subjectLabel">-</p>
              </div>
              <div className="row">
                <span id="keywordsLabel" data-l10n-id="document_properties_keywords">Keywords:</span>
                <p id="keywordsField" aria-labelledby="keywordsLabel">-</p>
              </div>
              <div className="row">
                <span id="creationDateLabel" data-l10n-id="document_properties_creation_date">Creation Date:</span>
                <p id="creationDateField" aria-labelledby="creationDateLabel">-</p>
              </div>
              <div className="row">
                <span id="modificationDateLabel" data-l10n-id="document_properties_modification_date">Modification Date:</span>
                <p id="modificationDateField" aria-labelledby="modificationDateLabel">-</p>
              </div>
              <div className="row">
                <span id="creatorLabel" data-l10n-id="document_properties_creator">Creator:</span>
                <p id="creatorField" aria-labelledby="creatorLabel">-</p>
              </div>
              <div className="separator"></div>
              <div className="row">
                <span id="producerLabel" data-l10n-id="document_properties_producer">PDF Producer:</span>
                <p id="producerField" aria-labelledby="producerLabel">-</p>
              </div>
              <div className="row">
                <span id="versionLabel" data-l10n-id="document_properties_version">PDF Version:</span>
                <p id="versionField" aria-labelledby="versionLabel">-</p>
              </div>
              <div className="row">
                <span id="pageCountLabel" data-l10n-id="document_properties_page_count">Page Count:</span>
                <p id="pageCountField" aria-labelledby="pageCountLabel">-</p>
              </div>
              <div className="row">
                <span id="pageSizeLabel" data-l10n-id="document_properties_page_size">Page Size:</span>
                <p id="pageSizeField" aria-labelledby="pageSizeLabel">-</p>
              </div>
              <div className="separator"></div>
              <div className="row">
                <span id="linearizedLabel" data-l10n-id="document_properties_linearized">Fast Web View:</span>
                <p id="linearizedField" aria-labelledby="linearizedLabel">-</p>
              </div>
              <div className="buttonRow">
                <button id="documentPropertiesClose" className="dialogButton"><span data-l10n-id="document_properties_close">Close</span></button>
              </div>
            </dialog>
            <dialog id="printServiceDialog" className="modal-dialog p-0 rounded border-0 shadow-none">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{gettext('Print document')}</h5>
                  <button type="button" id="printCancel2" className="align-self-center bg-transparent border-0 sf3-font sf3-font-x-01 modal-close" aria-label={gettext('Close')}></button>
                </div>
                <div className="modal-body py-6">
                  <p className="mb-2">
                    <span data-l10n-id="print_progress_message">Preparing document for printing…</span>
                    <span data-l10n-id="print_progress_percent" data-l10n-args='{ "progress": 0 }' className="relative-progress">0%</span>
                  </p>
                  <progress value="0" max="100" className="d-none"></progress>
                  <div className="progress">
                    <div className="progress-bar" role="progressbar" style={{ width: '0%' }} aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button id="printCancel" className="btn btn-secondary"><span data-l10n-id="print_progress_close">Cancel</span></button>
                </div>
              </div>
            </dialog>
          </div>
          {/* <!-- dialogContainer -->*/}

        </div>
        {/* <!-- outerContainer -->*/}
        {/* <div id="printContainer"></div>*/}
        <input type="file" id="fileInput" className="hidden" />
      </React.Fragment>
    );
  }
}

export default PDFViewer;
