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
              <div id="thumbnails-header" className="p-4 d-flex justify-content-between">
                <h3 className="m-0 title font-weight-normal">{gettext('Thumbnail')}</h3>
                <button id="close-thumbnail-panel" className="close-thumbnail-panel sf2-icon-x3 border-0 bg-transparent" aria-controls="sidebarContainer"></button>
              </div>
              <div id="toolbarSidebarLeft" className="sf-hide">
                <div id="sidebarViewButtons" className="splitToolbarButton toggled" role="radiogroup">
                  <button id="viewThumbnail" className="toolbarButton toggled" title="Show Thumbnails" tabIndex={2} data-l10n-id="pdfjs-thumbs-button" role="radio" aria-checked="true" aria-controls="thumbnailView">
                    <span data-l10n-id="pdfjs-thumbs-button-label">Thumbnails</span>
                  </button>
                  <button id="viewOutline" className="toolbarButton" title="Show Document Outline (double-click to expand/collapse all items)" tabIndex={3} data-l10n-id="pdfjs-document-outline-button" role="radio" aria-checked="false" aria-controls="outlineView">
                    <span data-l10n-id="pdfjs-document-outline-button-label">Document Outline</span>
                  </button>
                  <button id="viewAttachments" className="toolbarButton" title="Show Attachments" tabIndex={4} data-l10n-id="pdfjs-attachments-button" role="radio" aria-checked="false" aria-controls="attachmentsView">
                    <span data-l10n-id="pdfjs-attachments-button-label">Attachments</span>
                  </button>
                  <button id="viewLayers" className="toolbarButton" title="Show Layers (double-click to reset all layers to the default state)" tabIndex={5} data-l10n-id="pdfjs-layers-button" role="radio" aria-checked="false" aria-controls="layersView">
                    <span data-l10n-id="pdfjs-layers-button-label">Layers</span>
                  </button>
                </div>
              </div>
              <div id="toolbarSidebarRight">
                <div id="outlineOptionsContainer" className="sf-hide">
                  <div className="verticalToolbarSeparator" />
                  <button id="currentOutlineItem" className="toolbarButton" disabled="disabled" title="Find Current Outline Item" tabIndex={6} data-l10n-id="pdfjs-current-outline-item-button">
                    <span data-l10n-id="pdfjs-current-outline-item-button-label">Current Outline Item</span>
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
            <div id="sidebarResizer" />
          </div>  {/* sidebarContainer */}
          <div id="mainContainer">
            <div className="findbar hidden doorHanger" id="findbar">
              <div id="findbarInputContainer">
                <input id="findInput" className="toolbarField" title="Find" placeholder="Find in document…" tabIndex={91} data-l10n-id="pdfjs-find-input" aria-invalid="false" />

                <div className="splitToolbarButton">
                  <button id="findPrevious" className="toolbarButton" title="Find the previous occurrence of the phrase" tabIndex={92} data-l10n-id="pdfjs-find-previous-button">
                    <span data-l10n-id="pdfjs-find-previous-button-label">Previous</span>
                  </button>
                  <div className="splitToolbarButtonSeparator" />
                  <button id="findNext" className="toolbarButton" title="Find the next occurrence of the phrase" tabIndex={93} data-l10n-id="pdfjs-find-next-button">
                    <span data-l10n-id="pdfjs-find-next-button-label">Next</span>
                  </button>
                </div>
              </div>
              <div id="findbarOptionsOneContainer">
                <input type="checkbox" id="findHighlightAll" className="toolbarField" tabIndex={94} />
                <label htmlFor="findHighlightAll" className="toolbarLabel" data-l10n-id="pdfjs-find-highlight-checkbox">Highlight All</label>
                <input type="checkbox" id="findMatchCase" className="toolbarField" tabIndex={95} />
                <label htmlFor="findMatchCase" className="toolbarLabel" data-l10n-id="pdfjs-find-match-case-checkbox-label">Match Case</label>
              </div>
              <div id="findbarOptionsTwoContainer">
                <input type="checkbox" id="findMatchDiacritics" className="toolbarField" tabIndex={96} />
                <label htmlFor="findMatchDiacritics" className="toolbarLabel" data-l10n-id="pdfjs-find-match-diacritics-checkbox-label">Match Diacritics</label>
                <input type="checkbox" id="findEntireWord" className="toolbarField" tabIndex={97} />
                <label htmlFor="findEntireWord" className="toolbarLabel" data-l10n-id="pdfjs-find-entire-word-checkbox-label">Whole Words</label>
              </div>
              <div id="findbarMessageContainer" aria-live="polite">
                <span id="findResultsCount" className="toolbarLabel" />
                <span id="findMsg" className="toolbarLabel" />
              </div>
            </div>  {/* findbar */}
            <div className="editorParamsToolbar hidden doorHangerRight" id="editorHighlightParamsToolbar">
              <div id="highlightParamsToolbarContainer" className="editorParamsToolbarContainer">
                <div id="editorHighlightColorPicker" className="colorPicker">
                  <span id="highlightColorPickerLabel" className="editorParamsLabel" data-l10n-id="pdfjs-editor-highlight-colorpicker-label">Highlight color</span>
                </div>
                <div id="editorHighlightThickness">
                  <label htmlFor="editorFreeHighlightThickness" className="editorParamsLabel" data-l10n-id="pdfjs-editor-free-highlight-thickness-input">Thickness</label>
                  <div className="thicknessPicker">
                    <input type="range" id="editorFreeHighlightThickness" className="editorParamsSlider" data-l10n-id="pdfjs-editor-free-highlight-thickness-title" defaultValue={12} min={8} max={24} step={1} tabIndex={101} />
                  </div>
                </div>
                <div id="editorHighlightVisibility">
                  <div className="divider" />
                  <div className="toggler">
                    <label htmlFor="editorHighlightShowAll" className="editorParamsLabel" data-l10n-id="pdfjs-editor-highlight-show-all-button-label">Show all</label>
                    <button id="editorHighlightShowAll" className="toggle-button" data-l10n-id="pdfjs-editor-highlight-show-all-button" aria-pressed="true" tabIndex={102} />
                  </div>
                </div>
              </div>
            </div>
            <div className="editorParamsToolbar hidden doorHangerRight" id="editorFreeTextParamsToolbar">
              <div className="editorParamsToolbarContainer">
                <div className="editorParamsSetter">
                  <label htmlFor="editorFreeTextColor" className="editorParamsLabel" data-l10n-id="pdfjs-editor-free-text-color-input">Color</label>
                  <input type="color" id="editorFreeTextColor" className="editorParamsColor" tabIndex={103} />
                </div>
                <div className="editorParamsSetter">
                  <label htmlFor="editorFreeTextFontSize" className="editorParamsLabel" data-l10n-id="pdfjs-editor-free-text-size-input">Size</label>
                  <input type="range" id="editorFreeTextFontSize" className="editorParamsSlider" defaultValue={10} min={5} max={100} step={1} tabIndex={104} />
                </div>
              </div>
            </div>
            <div className="editorParamsToolbar hidden doorHangerRight" id="editorInkParamsToolbar">
              <div className="editorParamsToolbarContainer">
                <div className="editorParamsSetter">
                  <label htmlFor="editorInkColor" className="editorParamsLabel" data-l10n-id="pdfjs-editor-ink-color-input">Color</label>
                  <input type="color" id="editorInkColor" className="editorParamsColor" tabIndex={105} />
                </div>
                <div className="editorParamsSetter">
                  <label htmlFor="editorInkThickness" className="editorParamsLabel" data-l10n-id="pdfjs-editor-ink-thickness-input">Thickness</label>
                  <input type="range" id="editorInkThickness" className="editorParamsSlider" defaultValue={1} min={1} max={20} step={1} tabIndex={106} />
                </div>
                <div className="editorParamsSetter">
                  <label htmlFor="editorInkOpacity" className="editorParamsLabel" data-l10n-id="pdfjs-editor-ink-opacity-input">Opacity</label>
                  <input type="range" id="editorInkOpacity" className="editorParamsSlider" defaultValue={100} min={1} max={100} step={1} tabIndex={107} />
                </div>
              </div>
            </div>
            <div className="editorParamsToolbar hidden doorHangerRight" id="editorStampParamsToolbar">
              <div className="editorParamsToolbarContainer">
                <button id="editorStampAddImage" className="secondaryToolbarButton" title="Add image" tabIndex={108} data-l10n-id="pdfjs-editor-stamp-add-image-button">
                  <span className="editorParamsLabel" data-l10n-id="pdfjs-editor-stamp-add-image-button-label">Add image</span>
                </button>
              </div>
            </div>
            <div id="secondaryToolbar" className="secondaryToolbar hidden doorHangerRight">
              <div id="secondaryToolbarButtonContainer">
                <button id="secondaryOpenFile" className="secondaryToolbarButton" title="Open File" tabIndex={51} data-l10n-id="pdfjs-open-file-button">
                  <span data-l10n-id="pdfjs-open-file-button-label">Open</span>
                </button>
                <button id="secondaryPrint" className="secondaryToolbarButton visibleMediumView" title="Print" tabIndex={52} data-l10n-id="pdfjs-print-button">
                  <span data-l10n-id="pdfjs-print-button-label">Print</span>
                </button>
                <button id="secondaryDownload" className="secondaryToolbarButton visibleMediumView" title="Save" tabIndex={53} data-l10n-id="pdfjs-save-button">
                  <span data-l10n-id="pdfjs-save-button-label">Save</span>
                </button>
                <div className="horizontalToolbarSeparator" />
                <button id="presentationMode" className="secondaryToolbarButton" title="Switch to Presentation Mode" tabIndex={54} data-l10n-id="pdfjs-presentation-mode-button">
                  <span data-l10n-id="pdfjs-presentation-mode-button-label">Presentation Mode</span>
                </button>
                <a href="#" id="viewBookmark" className="secondaryToolbarButton" title="Current Page (View URL from Current Page)" tabIndex={55} data-l10n-id="pdfjs-bookmark-button">
                  <span data-l10n-id="pdfjs-bookmark-button-label">Current Page</span>
                </a>
                <div id="viewBookmarkSeparator" className="horizontalToolbarSeparator" />
                {/*
                  <button id="firstPage" className="secondaryToolbarButton" title="Go to First Page" tabIndex={56} data-l10n-id="pdfjs-first-page-button">
                    <span data-l10n-id="pdfjs-first-page-button-label">Go to First Page</span>
                  </button>
                  <button id="lastPage" className="secondaryToolbarButton" title="Go to Last Page" tabIndex={57} data-l10n-id="pdfjs-last-page-button">
                    <span data-l10n-id="pdfjs-last-page-button-label">Go to Last Page</span>
                  </button>
                */}
                <div className="horizontalToolbarSeparator" />
                <button id="pageRotateCw" className="secondaryToolbarButton" title="Rotate Clockwise" tabIndex={58} data-l10n-id="pdfjs-page-rotate-cw-button">
                  <span data-l10n-id="pdfjs-page-rotate-cw-button-label">Rotate Clockwise</span>
                </button>
                <button id="pageRotateCcw" className="secondaryToolbarButton" title="Rotate Counterclockwise" tabIndex={59} data-l10n-id="pdfjs-page-rotate-ccw-button">
                  <span data-l10n-id="pdfjs-page-rotate-ccw-button-label">Rotate Counterclockwise</span>
                </button>
                <div className="horizontalToolbarSeparator" />
                <div id="cursorToolButtons" role="radiogroup">
                  <button id="cursorSelectTool" className="secondaryToolbarButton toggled" title="Enable Text Selection Tool" tabIndex={60} data-l10n-id="pdfjs-cursor-text-select-tool-button" role="radio" aria-checked="true">
                    <span data-l10n-id="pdfjs-cursor-text-select-tool-button-label">Text Selection Tool</span>
                  </button>
                  <button id="cursorHandTool" className="secondaryToolbarButton" title="Enable Hand Tool" tabIndex={61} data-l10n-id="pdfjs-cursor-hand-tool-button" role="radio" aria-checked="false">
                    <span data-l10n-id="pdfjs-cursor-hand-tool-button-label">Hand Tool</span>
                  </button>
                </div>
                <div className="horizontalToolbarSeparator" />
                <div id="scrollModeButtons" role="radiogroup">
                  <button id="scrollPage" className="secondaryToolbarButton" title="Use Page Scrolling" tabIndex={62} data-l10n-id="pdfjs-scroll-page-button" role="radio" aria-checked="false">
                    <span data-l10n-id="pdfjs-scroll-page-button-label">Page Scrolling</span>
                  </button>
                  <button id="scrollVertical" className="secondaryToolbarButton toggled" title="Use Vertical Scrolling" tabIndex={63} data-l10n-id="pdfjs-scroll-vertical-button" role="radio" aria-checked="true">
                    <span data-l10n-id="pdfjs-scroll-vertical-button-label">Vertical Scrolling</span>
                  </button>
                  <button id="scrollHorizontal" className="secondaryToolbarButton" title="Use Horizontal Scrolling" tabIndex={64} data-l10n-id="pdfjs-scroll-horizontal-button" role="radio" aria-checked="false">
                    <span data-l10n-id="pdfjs-scroll-horizontal-button-label">Horizontal Scrolling</span>
                  </button>
                  <button id="scrollWrapped" className="secondaryToolbarButton" title="Use Wrapped Scrolling" tabIndex={65} data-l10n-id="pdfjs-scroll-wrapped-button" role="radio" aria-checked="false">
                    <span data-l10n-id="pdfjs-scroll-wrapped-button-label">Wrapped Scrolling</span>
                  </button>
                </div>
                <div className="horizontalToolbarSeparator" />
                <div id="spreadModeButtons" role="radiogroup">
                  <button id="spreadNone" className="secondaryToolbarButton toggled" title="Do not join page spreads" tabIndex={66} data-l10n-id="pdfjs-spread-none-button" role="radio" aria-checked="true">
                    <span data-l10n-id="pdfjs-spread-none-button-label">No Spreads</span>
                  </button>
                  <button id="spreadOdd" className="secondaryToolbarButton" title="Join page spreads starting with odd-numbered pages" tabIndex={67} data-l10n-id="pdfjs-spread-odd-button" role="radio" aria-checked="false">
                    <span data-l10n-id="pdfjs-spread-odd-button-label">Odd Spreads</span>
                  </button>
                  <button id="spreadEven" className="secondaryToolbarButton" title="Join page spreads starting with even-numbered pages" tabIndex={68} data-l10n-id="pdfjs-spread-even-button" role="radio" aria-checked="false">
                    <span data-l10n-id="pdfjs-spread-even-button-label">Even Spreads</span>
                  </button>
                </div>
                <div className="horizontalToolbarSeparator" />
                <button id="documentProperties" className="secondaryToolbarButton" title="Document Properties…" tabIndex={69} data-l10n-id="pdfjs-document-properties-button" aria-controls="documentPropertiesDialog">
                  <span data-l10n-id="pdfjs-document-properties-button-label">Document Properties…</span>
                </button>
              </div>
            </div>  {/* secondaryToolbar */}
            <div className="toolbar">
              <div id="toolbarContainer">
                <div id="toolbarViewer">
                  <div id="toolbarViewerLeft">
                    <button id="sidebarToggle" className="toolbarButton" title="Toggle Sidebar" tabIndex={11} data-l10n-id="pdfjs-toggle-sidebar-button" aria-expanded="false" aria-controls="sidebarContainer">
                      <span data-l10n-id="pdfjs-toggle-sidebar-button-label">Toggle Sidebar</span>
                    </button>
                    <div className="toolbarButtonSpacer d-none" />
                    <button id="viewFind" className="toolbarButton d-none" title="Find in Document" tabIndex={12} data-l10n-id="pdfjs-findbar-button" aria-expanded="false" aria-controls="findbar">
                      <span data-l10n-id="pdfjs-findbar-button-label">Find</span>
                    </button>
                    <div className="splitToolbarButton hiddenSmallView ml-2 d-flex align-items-center">
                      <div className="splitToolbarButtonSeparator mr-2"></div>
                      <button id="firstPage" className="toolbarButton" title="Go to First Page" tabIndex="56" data-l10n-id="pdfjs-first-page-button">
                        <span data-l10n-id="pdfjs-first-page-button-label">{gettext('Go to First Page')}</span>
                      </button>
                      <button className="toolbarButton" title="Previous Page" id="previous" tabIndex={13} data-l10n-id="pdfjs-previous-button">
                        <span data-l10n-id="pdfjs-previous-button-label">{gettext('Previous')}</span>
                      </button>
                      <input type="number" id="pageNumber" className="toolbarField" title="Page" defaultValue="1" min="1" tabIndex="15" data-l10n-id="page" autoComplete="off" />
                      <span id="numPages" className="toolbarLabel"></span>
                      <button className="toolbarButton" title="Next Page" id="next" tabIndex={14} data-l10n-id="pdfjs-next-button">
                        <span data-l10n-id="pdfjs-next-button-label">{gettext('Next')}</span>
                      </button>
                      <button id="lastPage" className="toolbarButton" title="Go to Last Page" tabIndex="57" data-l10n-id="pdfjs-last-page-button">
                        <span data-l10n-id="pdfjs-last-page-button-label">{gettext('Go to Last Page')}</span>
                      </button>
                    </div>
                  </div>
                  <div id="toolbarViewerRight" className="sf-hide">
                    <div id="editorModeButtons" className="splitToolbarButton toggled" role="radiogroup">
                      <button id="editorHighlight" className="toolbarButton" hidden disabled="disabled" title="Highlight" role="radio" aria-checked="false" aria-controls="editorHighlightParamsToolbar" tabIndex={31} data-l10n-id="pdfjs-editor-highlight-button">
                        <span data-l10n-id="pdfjs-editor-highlight-button-label">Highlight</span>
                      </button>
                      <button id="editorFreeText" className="toolbarButton" disabled="disabled" title="Text" role="radio" aria-checked="false" aria-controls="editorFreeTextParamsToolbar" tabIndex={32} data-l10n-id="pdfjs-editor-free-text-button">
                        <span data-l10n-id="pdfjs-editor-free-text-button-label">Text</span>
                      </button>
                      <button id="editorInk" className="toolbarButton" disabled="disabled" title="Draw" role="radio" aria-checked="false" aria-controls="editorInkParamsToolbar" tabIndex={33} data-l10n-id="pdfjs-editor-ink-button">
                        <span data-l10n-id="pdfjs-editor-ink-button-label">Draw</span>
                      </button>
                      <button id="editorStamp" className="toolbarButton hidden" disabled="disabled" title="Add or edit images" role="radio" aria-checked="false" aria-controls="editorStampParamsToolbar" tabIndex={34} data-l10n-id="pdfjs-editor-stamp-button">
                        <span data-l10n-id="pdfjs-editor-stamp-button-label">Add or edit images</span>
                      </button>
                    </div>

                    <div id="editorModeSeparator" className="verticalToolbarSeparator" />

                    <button id="print" className="toolbarButton hiddenMediumView" title="Print" tabIndex={41} data-l10n-id="pdfjs-print-button">
                      <span data-l10n-id="pdfjs-print-button-label">Print</span>
                    </button>
                    <button id="download" className="toolbarButton hiddenMediumView" title="Save" tabIndex={42} data-l10n-id="pdfjs-save-button">
                      <span data-l10n-id="pdfjs-save-button-label">Save</span>
                    </button>
                    <div className="verticalToolbarSeparator hiddenMediumView" />

                    <button id="secondaryToolbarToggle" className="toolbarButton" title="Tools" tabIndex={43} data-l10n-id="pdfjs-tools-button" aria-expanded="false" aria-controls="secondaryToolbar">
                      <span data-l10n-id="pdfjs-tools-button-label">Tools</span>
                    </button>
                  </div>
                  <div id="toolbarViewerMiddle" className="d-flex align-items-center">
                    <div className="splitToolbarButton float-none">
                      <button id="zoomOut" className="toolbarButton" title="Zoom Out" tabIndex={21} data-l10n-id="pdfjs-zoom-out-button">
                        <span data-l10n-id="pdfjs-zoom-out-button-label">{gettext('Zoom Out')}</span>
                      </button>
                      <div className="splitToolbarButtonSeparator d-none" />
                    </div>
                    <span id="scaleSelectContainer" className="dropdownToolbarButton">
                      <select id="scaleSelect" title="Zoom" tabIndex={23} data-l10n-id="pdfjs-zoom-select">
                        <option id="pageAutoOption" value="auto" defaultValue={'auto'} data-l10n-id="pdfjs-page-scale-auto">{gettext('Automatic Zoom')}</option>
                        <option id="pageActualOption" value="page-actual" data-l10n-id="pdfjs-page-scale-actual">{gettext('Actual Size')}</option>
                        <option id="pageFitOption" value="page-fit" data-l10n-id="pdfjs-page-scale-fit">{gettext('Page Fit')}</option>
                        <option id="pageWidthOption" value="page-width" data-l10n-id="pdfjs-page-scale-width">{gettext('Page Width')}</option>
                        <option id="customScaleOption" value="custom" disabled="disabled" hidden={true} data-l10n-id="pdfjs-page-scale-percent" data-l10n-args="{ scale: 0 }">0%</option>
                        <option value="0.5" data-l10n-id="pdfjs-page-scale-percent" data-l10n-args="{ scale: 50 }">50%</option>
                        <option value="0.75" data-l10n-id="pdfjs-page-scale-percent" data-l10n-args="{ scale: 75 }">75%</option>
                        <option value={1} data-l10n-id="pdfjs-page-scale-percent" data-l10n-args="{ scale: 100 }">100%</option>
                        <option value="1.25" data-l10n-id="pdfjs-page-scale-percent" data-l10n-args="{ scale: 125 }">125%</option>
                        <option value="1.5" data-l10n-id="pdfjs-page-scale-percent" data-l10n-args="{ scale: 150 }">150%</option>
                        <option value={2} data-l10n-id="pdfjs-page-scale-percent" data-l10n-args="{ scale: 200 }">200%</option>
                        <option value={3} data-l10n-id="pdfjs-page-scale-percent" data-l10n-args="{ scale: 300 }">300%</option>
                        <option value={4} data-l10n-id="pdfjs-page-scale-percent" data-l10n-args="{ scale: 400 }">400%</option>
                      </select>
                    </span>
                    <button id="zoomIn" className="toolbarButton" title="Zoom In" tabIndex={22} data-l10n-id="pdfjs-zoom-in-button">
                      <span data-l10n-id="pdfjs-zoom-in-button-label">{gettext('Zoom In')}</span>
                    </button>
                  </div>
                </div>
                <div id="loadingBar">
                  <span className="loading-icon loading-tip"></span>
                  {/*<div className="progress">
                <div className="glimmer">
                </div>*/}
                </div>
              </div>
            </div>
            <div id="viewerContainer" tabIndex={0}>
              <div id="viewer" className="pdfViewer" />
            </div>
          </div> {/* mainContainer */}

          <div id="dialogContainer">
            <dialog id="passwordDialog">
              <div className="row">
                <label htmlFor="password" id="passwordText" data-l10n-id="pdfjs-password-label">Enter the password to open this PDF file:</label>
              </div>
              <div className="row">
                <input type="password" id="password" className="toolbarField" />
              </div>
              <div className="buttonRow">
                <button id="passwordCancel" className="dialogButton"><span data-l10n-id="pdfjs-password-cancel-button">Cancel</span></button>
                <button id="passwordSubmit" className="dialogButton"><span data-l10n-id="pdfjs-password-ok-button">OK</span></button>
              </div>
            </dialog>
            <dialog id="documentPropertiesDialog">
              <div className="row">
                <span id="fileNameLabel" data-l10n-id="pdfjs-document-properties-file-name">File name:</span>
                <p id="fileNameField" aria-labelledby="fileNameLabel">-</p>
              </div>
              <div className="row">
                <span id="fileSizeLabel" data-l10n-id="pdfjs-document-properties-file-size">File size:</span>
                <p id="fileSizeField" aria-labelledby="fileSizeLabel">-</p>
              </div>
              <div className="separator" />
              <div className="row">
                <span id="titleLabel" data-l10n-id="pdfjs-document-properties-title">Title:</span>
                <p id="titleField" aria-labelledby="titleLabel">-</p>
              </div>
              <div className="row">
                <span id="authorLabel" data-l10n-id="pdfjs-document-properties-author">Author:</span>
                <p id="authorField" aria-labelledby="authorLabel">-</p>
              </div>
              <div className="row">
                <span id="subjectLabel" data-l10n-id="pdfjs-document-properties-subject">Subject:</span>
                <p id="subjectField" aria-labelledby="subjectLabel">-</p>
              </div>
              <div className="row">
                <span id="keywordsLabel" data-l10n-id="pdfjs-document-properties-keywords">Keywords:</span>
                <p id="keywordsField" aria-labelledby="keywordsLabel">-</p>
              </div>
              <div className="row">
                <span id="creationDateLabel" data-l10n-id="pdfjs-document-properties-creation-date">Creation Date:</span>
                <p id="creationDateField" aria-labelledby="creationDateLabel">-</p>
              </div>
              <div className="row">
                <span id="modificationDateLabel" data-l10n-id="pdfjs-document-properties-modification-date">Modification Date:</span>
                <p id="modificationDateField" aria-labelledby="modificationDateLabel">-</p>
              </div>
              <div className="row">
                <span id="creatorLabel" data-l10n-id="pdfjs-document-properties-creator">Creator:</span>
                <p id="creatorField" aria-labelledby="creatorLabel">-</p>
              </div>
              <div className="separator" />
              <div className="row">
                <span id="producerLabel" data-l10n-id="pdfjs-document-properties-producer">PDF Producer:</span>
                <p id="producerField" aria-labelledby="producerLabel">-</p>
              </div>
              <div className="row">
                <span id="versionLabel" data-l10n-id="pdfjs-document-properties-version">PDF Version:</span>
                <p id="versionField" aria-labelledby="versionLabel">-</p>
              </div>
              <div className="row">
                <span id="pageCountLabel" data-l10n-id="pdfjs-document-properties-page-count">Page Count:</span>
                <p id="pageCountField" aria-labelledby="pageCountLabel">-</p>
              </div>
              <div className="row">
                <span id="pageSizeLabel" data-l10n-id="pdfjs-document-properties-page-size">Page Size:</span>
                <p id="pageSizeField" aria-labelledby="pageSizeLabel">-</p>
              </div>
              <div className="separator" />
              <div className="row">
                <span id="linearizedLabel" data-l10n-id="pdfjs-document-properties-linearized">Fast Web View:</span>
                <p id="linearizedField" aria-labelledby="linearizedLabel">-</p>
              </div>
              <div className="buttonRow">
                <button id="documentPropertiesClose" className="dialogButton"><span data-l10n-id="pdfjs-document-properties-close-button">Close</span></button>
              </div>
            </dialog>
            <dialog id="altTextDialog" aria-labelledby="dialogLabel" aria-describedby="dialogDescription">
              <div id="altTextContainer">
                <div id="overallDescription">
                  <span id="dialogLabel" data-l10n-id="pdfjs-editor-alt-text-dialog-label" className="title">Choose an option</span>
                  <span id="dialogDescription" data-l10n-id="pdfjs-editor-alt-text-dialog-description">
                    Alt text (alternative text) helps when people can’t see the image or when it doesn’t load.
                  </span>
                </div>
                <div id="addDescription">
                  <div className="radio">
                    <div className="radioButton">
                      <input type="radio" id="descriptionButton" name="altTextOption" tabIndex={0} aria-describedby="descriptionAreaLabel" defaultChecked />
                      <label htmlFor="descriptionButton" data-l10n-id="pdfjs-editor-alt-text-add-description-label">Add a description</label>
                    </div>
                    <div className="radioLabel">
                      <span id="descriptionAreaLabel" data-l10n-id="pdfjs-editor-alt-text-add-description-description">
                        Aim for 1-2 sentences that describe the subject, setting, or actions.
                      </span>
                    </div>
                  </div>
                  <div className="descriptionArea">
                    <textarea id="descriptionTextarea" placeholder="For example, “A young man sits down at a table to eat a meal”" aria-labelledby="descriptionAreaLabel" data-l10n-id="pdfjs-editor-alt-text-textarea" tabIndex={0} defaultValue={''} />
                  </div>
                </div>
                <div id="markAsDecorative">
                  <div className="radio">
                    <div className="radioButton">
                      <input type="radio" id="decorativeButton" name="altTextOption" aria-describedby="decorativeLabel" />
                      <label htmlFor="decorativeButton" data-l10n-id="pdfjs-editor-alt-text-mark-decorative-label">Mark as decorative</label>
                    </div>
                    <div className="radioLabel">
                      <span id="decorativeLabel" data-l10n-id="pdfjs-editor-alt-text-mark-decorative-description">
                        This is used for ornamental images, like borders or watermarks.
                      </span>
                    </div>
                  </div>
                </div>
                <div id="buttons">
                  <button id="altTextCancel" tabIndex={0}><span data-l10n-id="pdfjs-editor-alt-text-cancel-button">Cancel</span></button>
                  <button id="altTextSave" tabIndex={0}><span data-l10n-id="pdfjs-editor-alt-text-save-button">Save</span></button>
                </div>
              </div>
            </dialog>
            <dialog id="printServiceDialog" style={{minWidth: '200px'}}>
              <div className="row">
                <span data-l10n-id="pdfjs-print-progress-message">{gettext('Preparing document for printing')}…</span>
              </div>
              <div className="row">
                <progress value={0} max={100} />
                <span data-l10n-id="pdfjs-print-progress-percent" data-l10n-args="{ progress: 0 }" className="relative-progress">0%</span>
              </div>
              <div className="buttonRow">
                <button id="printCancel" className="dialogButton"><span data-l10n-id="pdfjs-print-progress-close-button">{gettext('Cancel')}</span></button>
              </div>
            </dialog>
          </div>  {/* dialogContainer */}

        </div> {/* outerContainer */}
        {/*<div id="printContainer"></div>*/}
        <input type="file" id="fileInput" className="hidden" />
      </React.Fragment>
    );
  }
}

export default PDFViewer;
