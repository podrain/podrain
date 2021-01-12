export default {
  dexieDB: null,
  playingAudio: null,

  cleanHTMLString(string) {
    return new DOMParser().parseFromString(string, 'text/html').body.textContent
  },

  truncateString(string, allowedChars = 125) {
    if (string.length > allowedChars) {
      return string.substr(0, allowedChars) + '...'
    } else {
      return string
    }
  },

  floatToISO(float = 0) {
    return new Date(float * 1000).toISOString().substr(11, 8)
  },

  iOS() {
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
}