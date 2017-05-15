/**
 *
 * @author    Jerry Bendy
 * @since     5/15/2017
 */
var Url = require('url')
var assign = require('object-assign')
var Promise = require('bluebird')
var fetch = require('node-fetch')

fetch.Promise = Promise

/**
 * Favicon
 *
 * @param {object|null} config
 * @author Jerry Bendy
 * @link   https://icewing.cc
 */
function Favicon (config) {

  this.config = {
    /**
     * Is enable verbose mode, it'll output all debug information
     * when set to `true`
     *
     * @var {boolean}
     */
    verboseMode: false,

    /**
     * Default icon url
     * It'll return this icon when request failed
     *
     * @var {Buffer}
     */
    defaultIcon: new Buffer(''),

    /**
     * Is remove URL query string when build a request
     */
    ignoreQuery: true,

    ignoreAuth: true,

    ignorePort: false
  }

  this.config = assign({}, this.config, config || {})
}


/**
 * Get icon buffer from an url
 *
 * @param {string} url
 * @return {Promise<{data, spendTime}>}
 */
Favicon.prototype.getFavicon = function (url) {
  // valid url
  if (!url) {
    throw new TypeError('Url cannot be empty')
  }

  var self = this,
    timeStart = Date.now(),
    fullUrl = this.formatUrl(url)

  this._logMessage('Begin to get icon for ' + url)

  return new Promise(function (resolve) {
    self._getFaviconPathFromHTML(fullUrl)
      .then(function (iconInfo) {
        self._logMessage('Get icon info ' + JSON.stringify(iconInfo))

        // Get icon path from HTML failed, then try to
        // get icon from website root
        if (!iconInfo.path) {
          iconInfo.path = Url.resolve(iconInfo.finalUrl, '/favicon.ico')
        }
        return iconInfo
      })
      .then(function (iconInfo) {
        // get icon from path
        self._getIconBuffer(iconInfo.path)
          .then(function (iconBuffer) {
            resolve({
              data: iconBuffer,
              spendTime: Date.now() - timeStart
            })
          })
      })
  })
}

/**
 *
 * @param {string} fullUrl
 * @return {Promise<{path, finalUrl}>}
 * @private
 */
Favicon.prototype._getFaviconPathFromHTML = function (fullUrl) {
  var self = this
  var finalUrl = ''

  return fetch(fullUrl, {
    redirect: 'follow',
    follow: 5, // TODO max follow times
    timeout: 10000  // TODO request timeout
  })
    .then(function (resp) {
      finalUrl = resp.url
      return resp.text()
    })
    .then(function (data) {
      if (!data) {
        return {
          path: '',
          finalUrl: finalUrl
        }
      }

      var regLink = /<link[^>]+rel=.(icon|shortcut icon|alternate icon)[^>]+>/ig,
        regHref = /href=('|")(.*?)\1/i

      // get Link tag from HTML
      var matchLink = regLink.exec(data)
      if (!matchLink) {
        self._logMessage('Cannot get link tag')
        return {
          path: '',
          finalUrl: finalUrl
        }
      }
      self._logMessage('Get link tag: ' + matchLink)

      var link = matchLink[0]

      // get href from link content
      var matchHref = regHref.exec(link)
      if (!matchHref) {
        self._logMessage('Cannot get href from link tag')
        return {
          path: '',
          finalUrl: finalUrl
        }
      }
      self._logMessage('Get href from link: ' + matchHref)

      return {
        path: matchHref[2],
        finalUrl: finalUrl
      }
    })
}


/**
 * Get icon buffer content from url
 *
 * @param {string} iconPath
 * @returns {Promise<Buffer>}
 * @private
 */
Favicon.prototype._getIconBuffer = function (iconPath) {
  var self = this

  return fetch(iconPath, {
    redirect: 'follow',
    follow: 5, // TODO max follow times
    timeout: 10000  // TODO request timeout
  })
    .then(function (resp) {
      if (resp.status >= 200 && resp.status <= 299 && /image\//i.test(resp.headers.get('Content-Type').toString())) {
        self._logMessage('Successfully get icon from url ' + iconPath)
        return resp.buffer()

      } else {
        // return default icon
        self._logMessage('Return default icon')
        return self.config.defaultIcon
      }
    })
}

/**
 * Reformat an URL to a common format with config
 *
 * @param {string} url
 * @returns {string}
 */
Favicon.prototype.formatUrl = function (url) {
  var urlPart = Url.parse(url)

  // try to add a `http` prefix when it cannot parse
  if (!urlPart.host) {
    url = 'http://' + url
    urlPart = Url.parse(url)
  }

  if (urlPart.protocol !== 'http:' && urlPart.protocol !== 'https:') {
    throw new Error('Url must be HTTP/HTTPS protocol')
  }

  return urlPart.protocol + '//' +
    (this.config.ignoreAuth ? '' : (urlPart.auth + '@')) +
    urlPart.hostname +
    (this.config.ignorePort ? '' : (urlPart.port ? (':' + urlPart.port) : '')) +
    urlPart.pathname +
    (this.config.ignoreQuery ? '' : urlPart.search)
}


/**
 * Output log message to console when verbose mode is enable
 *
 * @param message
 */
Favicon.prototype._logMessage = function (message) {
  if (this.config.verboseMode) {
    console.log('[node-get-favicon] ' + message)
  }
}

module.exports = Favicon
