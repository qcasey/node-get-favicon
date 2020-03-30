# node-get-favicon

## Usage

```js
var Favicon = require('node-get-favicon')

var favicon = new Favicon({
  verboseMode: true
})

favicon.getFavicon('https://www.google.com')
  .then(function (data) {
    console.log(data)
    console.log(data.data)
  })
  .catch(function (e) {
    console.log(e.message)
  })
```
