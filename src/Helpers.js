export default {
  dexieDB: null,

  cleanHTMLString(string) {
    return new DOMParser().parseFromString(string, 'text/html').body.textContent
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