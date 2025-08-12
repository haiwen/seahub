# Metadata Table Search Feature

This document describes the frontend search functionality implemented for metadata table views.

## Overview

The search feature allows users to search through table records without making API requests. It provides a search interface similar to the one used in the all-tags view.

## Components

### MetadataTableSearcher (`/frontend/src/metadata/views/table/table-searcher.js`)
- Main searcher component that handles search logic
- Uses `SFTableSearcher` UI component for consistent interface
- Searches across multiple columns: file names, descriptions, tags, and keywords
- Provides navigation between search results

### Integration Points
- **TableFilesToolbar**: Shows searcher when no records are selected
- **Table Component**: Manages search state and event bus integration
- **Records Component**: Receives searchResult prop for highlighting matches

## Features

### Search Interface
- Search button shows a search icon initially
- Clicking expands to a search bar with a close button
- Matches the style and behavior of the all-tags view searcher

### Search Functionality
- **No API Requests**: Pure frontend filtering using regex patterns
- **Multiple Columns**: Searches file names, descriptions, tags, and keywords
- **Result Navigation**: Previous/next buttons to cycle through matches
- **Live Search**: Results update as you type

### Auto-Reset
Search automatically resets when:
- View changes (switching between table views)
- Groupby configuration changes
- Filters are modified
- Sorting is changed
- Hidden columns configuration changes

## Searchable Columns

1. **File Name** (`_name`): The display name of the file/record
2. **Description** (`_description`): File description text
3. **Tags** (`_tags`): Tag names associated with the file
4. **Keywords** (`_keywords`): Keyword metadata

## Event Bus Integration

Uses the metadata context event bus for:
- `UPDATE_SEARCH_RESULT`: Broadcasting search results
- Listening for search state changes across components

## Usage

The search feature is automatically available in metadata table views. Users can:

1. Click the search icon in the toolbar
2. Type search terms to filter records
3. Use Previous/Next buttons to navigate results
4. Press Escape or click the X button to close search

The search will automatically highlight matching cells in the table and scroll to show results.