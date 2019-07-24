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
      fontFamily: 'monospace',
      border: '1px solid silver',
    },
    highlighter: {
      padding: 9,
    },
    input: {
      padding: 5,
      minHeight: 90,
      height: 90,
      outline: 0,
      border: '1px solid #e6e6dd',
      backgroundColor: '#fff',
      overfflowY: 'auto'
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
    },
    item: {
      padding: '5px 15px',
      borderBottom: '1px solid rgba(0,0,0,0.15)',
      '&focused': {
        backgroundColor: '#cee4e5',
      },
    },
  },
};

const defaultMentionStyle = {
  backgroundColor: '#cee4e5'
};

export { defaultStyle, defaultMentionStyle };
