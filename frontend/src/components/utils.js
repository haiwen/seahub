export const keyCodes = {
  esc:   27,
  space: 32,
  tab:   9,
  up:    38,
  down:  40
}

export function bytesToSize(bytes) {
  if(bytes < 0) return '--'
  const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
  if (bytes === 0) return bytes + sizes[0]
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1000)), 10)
  if (i === 0) return bytes + ' ' + sizes[i]
  return (bytes / (1000 ** i)).toFixed(1) + ' ' + sizes[i]
}
