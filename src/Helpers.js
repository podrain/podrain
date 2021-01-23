export function cleanHTMLString(string) {
  return new DOMParser().parseFromString(string, 'text/html').body.textContent
}

export function truncateString(string, allowedChars = 125) {
  if (string.length > allowedChars) {
    return string.substr(0, allowedChars) + '...'
  } else {
    return string
  }
}

export function floatToISO(float = 0) {
  return new Date(float * 1000).toISOString().substr(11, 8)
}

export function iOS() {
  return [
    'iPad',
    'iPhone',
    'iPod',
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator'
  ].includes(navigator.platform)
  || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}

export function getPercent(value, total) {
  return Math.floor((value / total) * 100)
}