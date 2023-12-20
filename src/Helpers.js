import { Duration, DateTime } from 'luxon'
import { useTitle } from '@vueuse/core'

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

export function humanFriendlyDuration(value) {
  let hoursMinutesSeconds = Duration.fromObject({ seconds: value }).shiftTo('hours', 'minutes', 'seconds').toObject()

  let timeString = ''

  if (hoursMinutesSeconds.hours > 0) {
    timeString += hoursMinutesSeconds.hours + ' hr'
  }

  if (hoursMinutesSeconds.minutes > 0) {
    timeString += ' ' + hoursMinutesSeconds.minutes + ' min'
  }

  if (hoursMinutesSeconds.seconds > 0) {
    timeString += ' ' + hoursMinutesSeconds.seconds + ' sec'
  }

  return timeString
}

export function prepareDateString(string) {
  return DateTime.fromISO(string).toFormat('D')
}

export function customTitle(title) {
  return useTitle(title, { titleTemplate: title ? '%s | Podrain' : 'Podrain' })
}