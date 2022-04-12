const defaultStyle = {
  control: {
    backgroundColor: '#fff',
    fontSize: 14,
    fontWeight: 'normal',
  },
  highlighter: {
    overflow: 'hidden',
  },
  input: {
    margin: 0,
  },
  '&singleLine': {
    control: {
      display: 'inline-block',
      width: 130,
    },
    highlighter: {
      padding: 1,
      border: '2px inset transparent',
    },
    input: {
      padding: 1,
      border: '2px inset',
    },
  },
  '&multiLine': {
    control: {
    },
    highlighter: {
      padding: 9,
    },
    input: {
      padding: '8px 6px',
      minHeight: 90,
      height: 90,
      border: '1px solid #e6e6dd',
      borderBottom: 'none',
      borderRadius: '5px 5px 0 0',
      overfflowY: 'auto',
      outline: 'none',
      '&focused': {
        /*
        backgroundColor: '#cee4e5',
        outlineOffset: '-2px',
        outlineColor: '-webkit-focus-ring-color',
        outlineStyle: 'auto',
        outlineWidth: '5px',
        */
      },
    },
  },
  suggestions: {
    list: {
      backgroundColor: 'white',
      border: '1px solid rgba(0,0,0,0.15)',
      fontSize: 14,
      maxHeight: 200,
      overflow: 'auto',
      position: 'absolute',
      bottom: 14,
      width: '150px',
    },
    item: {
      width: 'auto',
      padding: '5px 15px',
      overflowX: 'auto',
      borderBottom: '1px solid rgba(0,0,0,0.15)',
      '&focused': {
        backgroundColor: '#f19654',
        color: '#fff',
        fontWeight: '400',
      },
    },
  },
};

const defaultMentionStyle = {
};

export { defaultStyle, defaultMentionStyle };
