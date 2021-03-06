try {
  require('dotenv').config()
} catch (e) {
  console.log('error', e)
}
const fs = require('fs')
const http = require('http')
const https = require('https')
const express = require('express')

const bodyParser = require('body-parser')
const app = express()
const exphbs = require('express-handlebars')

// const api = express()
var WebSocketServer = require('uws').Server
var Redis = require('ioredis')
var redis = new Redis(process.env.REDIS_URL)

var crypto = require('crypto'),
  algorithm = 'aes-128-cfb',
  password = 'cokefugu'

var googleWSConnections = {}
var amazonWSConnections = {}
var googlePairCode = ''
var appsList = ['youtube', 'notice', 'message', 'nba', 'nfl', 'football', 'soccer', 'epl', 'premier league', 'time', 'weather', 'skynews', 'board', 'trello', 'slack', 'facebook', 'twitter', 'instagram', 'giphy', 'bbc',
  'cnn', 'techcrunch', 'stock', 'livenews', 'nasa']

function encrypt (text) {
  var cipher = crypto.createCipher(algorithm, password)
  var crypted = cipher.update(text, 'utf8', 'base64')
  crypted += cipher.final('base64')
  return crypted
}

function decrypt (text) {
  var decipher = crypto.createDecipher(algorithm, password)
  var dec = decipher.update(text, 'base64', 'utf8')
  dec += decipher.final('utf8')
  return dec
}

function randomString (length) {
    // var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  var chars = '0123456789ABCDEFGHIJKLMNPQRSTUVWXYZ'
  var result = ''
  for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)]
  return result
}

// var CheckKeyExist = function(oauth_code){
//   return redis.get(oauth_code).then(function (result) {
//       if(result=='' || result.length == 0 ) {
//         return oauth_code
//       }else {
//         var auth_gen = randomString(6)
//         return CheckKeyExist(auth_gen)
//       }
//   });
// }

// enable CORS
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  next()
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.engine('handlebars', exphbs({defaultLayout: 'main'}))
app.set('view engine', 'handlebars')

app.set('port', (process.env.PORT || 8080))

app.get('/', (req, res) => {
  res.status(200).send('server OK!!')
})

app.get('/getLastCmd', (req, res) => {
  var code = req.query.gcode
  redis.get(code).then((result) => {
    if (result != '' && typeof result !== 'undefined') {
      res.status(200).json({lastCmd: result})
    } else {
      res.status(200).json({lastCmd: ''})
    }
  }).catch((error) => {
    res.status(200).json({lastCmd: result})
  })
})

app.get('/oauth', (req, res) => {
  var client_id = req.query.client_id
  var client_key = randomString(8)
  var authorization_code = encrypt(client_id + '-' + client_key)
  redis.set(authorization_code, client_key)
  // CheckKeyExist(authorization_code).then(function (result){
  var redirect_url = req.query.redirect_uri + '#access_token=' + authorization_code + '&token_type=bearer&scope=' + req.query.scope + '&state=' + req.query.state
    // console.log('redirect url = ',redirect_url)

  console.log('query = ', req.query)
    // res.send('hello')
  res.render('pair', {PairCode: client_key, RedirectURL: redirect_url})
  // })
})

app.post('/api.ai', (req, res) => {
  var bodyReq = req.body.result
  var msg, lifespan, invalidapp = false
  var fallback_data
  console.log('Check Request : ', bodyReq)
  // render
  console.log('orignal REQ = ', req.body.originalRequest)
  var accessTK = req.body.originalRequest.data.user.access_token.replace(' ', '+')
  // console.log('pair code = ',googlePairCode)

  if (bodyReq.parameters.app == '') {
    msg = 'Sorry, i did not quite catch that'
  } else {
    msg = bodyReq.resolvedQuery
    search_msg = msg.replace(new RegExp(bodyReq.parameters.actions + '|' + bodyReq.parameters.app + '|show', 'gi'), '')
    switch (bodyReq.parameters.app) {
      case 'youtube':
        search_msg = search_msg.replace(new RegExp('of|on', 'gi'), '')
        break
      case 'notice':
      case 'message':
        break
      case 'nba':
        break
      case 'nfl':
        break
      case 'premier league':
      case 'soccer':
      case 'football':
      case 'epl':
        break
      case 'time':
        search_msg = search_msg.replace(new RegExp('current|in', 'gi'), '')
	     break
      case 'weather':
        search_msg = search_msg.replace(new RegExp('in', 'gi'), '')
        break
      case 'slack':
        break
      case 'trello':
        break
      case 'instagram':
        search_msg = search_msg.replace(new RegExp('of|on', 'gi'), '')
        search_msg = search_msg.replace(new RegExp(' ', 'gi'), '')
        break
      case 'sky news':
      case 'skynews':
        break
      case 'stock':
        break
      default:
        // invalidapp = true;
        break
    }

    if (bodyReq.parameters.any != '' || bodyReq.parameters.any.length > 0) {
      search_msg = bodyReq.parameters.any
      if (bodyReq.parameters.app == 'instagram') {
        search_msg = search_msg.replace(new RegExp(' ', 'gi'), '')
      }
      console.log('new message = ', search_msg)
    } else if (bodyReq.parameters['geo-city'].length > 0) {
      search_msg = bodyReq.parameters['geo-city']
      console.log('city message = ', search_msg)
    } else {
      console.log('fallback msg = ', search_msg)
    }
    var params = bodyReq.parameters
    params.voice = 'google'
    if (typeof bodyReq.parameters.app === 'undefined' || bodyReq.parameters.app.length == 0) {
      invalidapp = true
      // Or using a promise if the last argument isn't a function
      var lastCMD = ''
      redis.get(accessTK).then((code) => {
        googlePairCode = code
        return redis.get(code)
      }).then((lastCmd) => {
        broadcastWebhook(lastCmd)
      })
      // redis.get('google_voice').then(function (result) {
      //   //
      //   lastCMD = result
      //   return redis.get(accessTK)
      // }).then((pairCode)=>{
      //   googlePairCode = pairCode
      //   broadcastWebhook(result)
      // })
    } else {
      console.log('cmd = ', accessTK)
      redis.get(accessTK).then((code) => {
        googlePairCode = code
        redis.set(code, JSON.stringify({params: params, message: search_msg}))
        broadcastWebhook(JSON.stringify({params: params, message: search_msg}))
      })
    }
  }

  var slack_message = {
    'text': msg
  }

  var jsonRes = {
    'speech': msg,
    'displayText': msg,
    'data': {'slack': slack_message},
    'contextOut': [{'name': 'ScreenCloud', 'lifespan': 1, 'parameters': {'app': bodyReq.parameters.app, 'action': bodyReq.parameters.keywords}}],
    'source': 'Screen-Cloud'
  }

  res.type('application/json')
  res.status(200).json(jsonRes)
})

app.post('/alexa.ai', (req, res) => {
  var bodyReq = req.body.request
  var msg, params = {}, search_msg, endSession = false

  console.log('Check Request : ', bodyReq)
  if (bodyReq.type == 'LaunchRequest') {
    msg = '<speak>Hi, I\'m screencloud how can i help?</speak>'
    endSession = false
  } else if (bodyReq.type == 'IntentRequest') {
    console.log('Check Intent : ', bodyReq.intent.slots)
    if (bodyReq.intent.name == 'OpenApps') {
      var appName = (bodyReq.intent.slots.appslot.value == 'premier league' || bodyReq.intent.slots.appslot.value == 'soccer' || bodyReq.intent.slots.appslot.value == 'football') ? 'epl' : bodyReq.intent.slots.appslot.value

      appName = (bodyReq.intent.slots.appslot.value == 'live news' || bodyReq.intent.slots.appslot.value == 'livenews') ? 'nasa' : bodyReq.intent.slots.appslot.value

      params = {'app': appName,
        'actions': 'Open',
        'voice': 'amazon'
      }

      msg = '<speak>Open ' + bodyReq.intent.slots.appslot.value + '</speak>'
      search_msg = ''
      console.log('OpenApps params = ', params)
    } else if (bodyReq.intent.name == 'PlayLimit') {
      search_msg = (typeof bodyReq.intent.slots.any.value !== 'undefined') ? bodyReq.intent.slots.any.value : bodyReq.intent.slots.instahash.value
      var appName = (bodyReq.intent.slots.appspecific.value == 'U2') ? 'Youtube' : bodyReq.intent.slots.appspecific.value
      params = {'app': appName,
        'geo-city': '',
        'any': search_msg,
        'actions': 'display',
        'voice': 'amazon'
      }
      console.log('PlayLimit params = ', params)
      msg = '<speak>Display ' + search_msg + ' on ' + bodyReq.intent.slots.appspecific.value + '</speak>'
    } else if (bodyReq.intent.name == 'OpenWords') {
      search_msg = bodyReq.intent.slots.appwords.value
      var appName = (bodyReq.intent.slots.appspecific.value == 'U2') ? 'Youtube' : bodyReq.intent.slots.appspecific.value
      params = {'app': appName,
        'geo-city': '',
        'any': search_msg,
        'actions': 'display',
        'voice': 'amazon'
      }
      console.log('OpenWords params = ', params)

      msg = '<speak>Show ' + search_msg + ' on ' + bodyReq.intent.slots.appspecific.value + '</speak>'
    } else if (bodyReq.intent.name == 'PlaceAndLocal') {
      search_msg = (typeof bodyReq.intent.slots.uscity.value !== 'undefined') ? bodyReq.intent.slots.uscity.value : ' '
      search_msg += (typeof bodyReq.intent.slots.europecity.value !== 'undefined') ? bodyReq.intent.slots.europecity.value : ' '
      search_msg += (typeof bodyReq.intent.slots.city.value !== 'undefined') ? bodyReq.intent.slots.city.value : ' '
      search_msg = (typeof bodyReq.intent.slots.country.value !== 'undefined') ? search_msg + ' ' + bodyReq.intent.slots.country.value : search_msg

      search_msg = search_msg.trim()

      params = {'app': bodyReq.intent.slots.appplace.value,
        'geo-city': search_msg,
        'any': '',
        'actions': 'Show',
        'voice': 'amazon'
      }
      console.log('PlaceAndLocal params = ', params)

      msg = '<speak>Show ' + bodyReq.intent.slots.appplace.value + ' in ' + search_msg + '</speak>'
    } else if (bodyReq.intent.name == 'OpenMessage') {
      search_msg = (typeof bodyReq.intent.slots.anymessage.value !== 'undefined') ? bodyReq.intent.slots.anymessage.value : ''

      search_msg = search_msg.trim()

      params = {'app': bodyReq.intent.slots.appmessage.value,
        'geo-city': '',
        'any': search_msg,
        'actions': 'Show',
        'voice': 'amazon'
      }
      console.log('OpenMessage params = ', params)

      msg = '<speak>Show ' + search_msg + ' on ' + bodyReq.intent.slots.appmessage.value + '</speak>'
    }

    endSession = true
    console.log('appsList = ', appsList)
    if (typeof params.app === 'undefined' || appsList.indexOf(params.app.toLowerCase()) === -1) {
      redis.get('amazon_voice').then(function (result) {
        console.log('amazon voice = ', result)
        var tmpParams = JSON.parse(result)
        msg = '<speak>Show ' + tmpParams.message + ' on ' + tmpParams.params.app + '</speak>'
        broadcastWebhook(result)
      })
    } else {
      redis.set('amazon_voice', JSON.stringify({params: params, message: search_msg}))
      broadcastAmazonAlexa(JSON.stringify({params: params, message: search_msg}))
    }
  } else {
    endSession = true
  }

  var jsonRes = {
    'version': '1.0',
    'sessionAttributes': {},
    'response': {
      'shouldEndSession': endSession,
      'outputSpeech': {
        'type': 'SSML',
        'ssml': msg
      }
    }
  }

  res.type('application/json')
  res.status(200).json(jsonRes)
})

app.get('/sampleHook', (req, res) => {
  console.log('sample hook : ', req.query)
  broadcastWebhook(req.query.action || 'test')
  res.send('done')
})

// app.listen((process.env.PORT || 8080),(req,res)=>{

// })
var server = http.createServer(app).listen(process.env.PORT, function () {
  // connect('https://voicewebsocket.herokuapp.com')

  console.log('server start poperly')
})

var wss = new WebSocketServer({ server })

function broadcastWebhook (message) {
  if (typeof googleWSConnections[googlePairCode] === 'undefined' || googleWSConnections[googlePairCode] == null) {
    return
  }
  var wsClientKeys = Object.keys(googleWSConnections[googlePairCode])
  // var wsClientKeys = googleWSConnections[googlePairCode]
  console.log('wsClientKeys = ', wsClientKeys)

  console.log('paringCode', googlePairCode)

  wsClientKeys.map((clientKey) => {
    console.log('matching code ')
    var ws = googleWSConnections[googlePairCode][clientKey]
    try {
      ws.send(message)
    } catch (e) {
      console.log('can not send message to client : ' + clientCode, e)
      delete googleWSConnections[googlePairCode][clientKey]
    }
  })
}

function broadcastAmazonAlexa (message) {
  var wsClientKeys = Object.keys(amazonWSConnections)
  console.log('wsClientKeys = ', wsClientKeys)
  wsClientKeys.map((clientKey) => {
    var ws = amazonWSConnections[clientKey]
    try {
      ws.send(message)
    } catch (e) {
      console.log('can not send message to client : ' + clientKey, e)
      delete amazonWSConnections[clientKey]
    }
  })
}

function connectWS (ws, clientKey) {
  console.log('clientKey = ', clientKey)
}

wss.on('connection', function (ws) {
  console.log('[wss] connection', ws)
  var clientKey = ''
  var clientName = ''
  var clientCode = ''
  ws.once('message', (message) => {
    console.log('msg = ', message)
    var jsonMsg = JSON.parse(message)
    clientKey = jsonMsg.clientKey
    clientName = jsonMsg.clientName
    clientCode = jsonMsg.clientCode
    if (clientName === 'google') {
      if (typeof googleWSConnections[clientCode] === 'undefined') {
        googleWSConnections[clientCode] = {}
      }

      googleWSConnections[clientCode][clientKey] = ws

      redis.get(clientCode).then((result) => {
        console.log('got last cmd = ', result)
        if (result !== '' && typeof result !== 'undefined') {
          ws.send(result)
        }
      }).catch((err) => {
        console.log('no last command = ', err)
        ws.send('no')
      })
    } else {
      amazonWSConnections[clientKey] = ws
      ws.send('no')
    }
  })

  ws.once('close', () => {
    console.log('client is close : ', clientKey)
    if (clientName === 'google') {
      delete googleWSConnections[clientCode][clientKey]
    } else {
      delete amazonWSConnections[clientKey]
    }
  })
})
