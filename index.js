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
// const api = express()
var WebSocketServer = require('uws').Server


var googleWSConnections = {}

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.set('port', (process.env.PORT || 8080))

// enable CORS
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  next()
})
app.get('/',(req,res)=>{
  res.status(200).send('server OK!!')
})

// app.post('/api.ai',(req,res)=>{
//   var bodyReq = req.body.result
//   var msg,lifespan
//   if(bodyReq.parameters.screen=='screen' || (bodyReq.parameters.app.length == 0 && bodyReq.parameters.screen.length == 0)) {
//     msg = 'Which screen do you want?'
//     lifespan = 4
//   }else if((bodyReq.parameters.app.length == 0 && bodyReq.parameters.playlist.length == 0) && bodyReq.parameters.screen.length != 0 ) {
//     msg = 'Which app do you want to show on '+bodyReq.parameters.screen+'?'
//     lifespan = 4
//   }else if(bodyReq.parameters.playlist.length != 0 && bodyReq.parameters.screen.length != 0){
//     if(bodyReq.contexts.length>0) {
//       let context = bodyReq.contexts[0]
//       msg = 'Show '+context.parameters['playlist']+' on '+context.parameters['screen']
//       lifespan = 1
//     }else {
//       msg = 'I dont understand that.'
//       lifespan = 4
//     }
//   }else {
//     if(bodyReq.contexts.length>0) {
//       let context = bodyReq.contexts[0]
//       msg = 'Show '+context.parameters['app']+' on '+context.parameters['screen']
//       lifespan = 1
//     }else {
//       msg = 'I dont understand that.'
//       lifespan = 4
//     }
    
//   }

//   console.log('Check Request : ',bodyReq)
  
//   bodyReq.contexts.forEach(function(element) {
//     console.log('context :: ',element.parameters)  
//   }, this);
  
//   var slack_message = {
//     "text": msg,
//   }
//   // render

//    var jsonRes = {
//             "speech": msg,
//             "displayText": msg,
//             "data":  {"slack":slack_message},
//             "contextOut": [{"name":"ScreenCloud", "lifespan":lifespan, "parameters":{"app":bodyReq.parameters.app,"screen":bodyReq.parameters.screen,"playlist":bodyReq.parameters.playlist}}],
//             "source": "ScreenCloud"
//             }
              
//    res.type('application/json')         
//    res.status(200).json(jsonRes)             
// })
app.post('/api.ai',(req,res)=>{
  var bodyReq = req.body.result
  var msg,lifespan
 
  console.log('Check Request : ',bodyReq)
  
  bodyReq.contexts.forEach(function(element) {
    console.log('context :: ',element.parameters)  
  }, this);
  // render
  if(bodyReq.parameters.app == '' || bodyReq.parameters.actions === '') {
    msg = 'Sorry, Command not complete'
  }else {
    msg = bodyReq.resolvedQuery
    search_msg = msg.replace(new RegExp(bodyReq.parameters.actions+'|'+bodyReq.parameters.app, 'gi'), '')
    switch ( bodyReq.parameters.app ) {
      case 'youtube':
        search_msg = search_msg.replace(new RegExp('of|on', 'gi'), '');
        break;
      case 'message':
        // search_msg = search_msg.replace(new RegExp('of|on', 'gi'), '');

        break;
      case 'nba':
				// appURL = 'sports/index.html?sports=nba&delay=30&version=1.0.5'
        break;
      case 'nfl':
				// appURL = 'sports/index.html?sports=nfl&delay=30&version=1.0.5'
        break;
      case 'epl':
				// appURL = 'sports/index.html?sports=epl&delay=30&version=1.0.5'
        break;
      case 'time':
        search_msg = search_msg.replace(new RegExp('current', 'gi'), '');
				// appURL = 'clock/index.html?style=digital&theme=dark&ampm=true&date=true&second=false&address='+this.state.display_text+'&version=1.0.15'
        break;  
      case 'weather':
        search_msg = search_msg.replace(new RegExp('of|on', 'gi'), '');
				// appURL = 'weather/index.html?location1='+this.state.display_text+'&location2=&location3=&unit=c&version=1.1.45'
        break;
      case 'skynews':
				// appURL = 'live_news/index.html?news_id=sky_news&version=1.0.3'
        break;       
      default:
        
      }

    broadcastWebhook( JSON.stringify({params:bodyReq.parameters,message:search_msg}) )
  }
  // msg = bodyReq.resolvedQuery
  var slack_message = {
    "text": msg,
  }
  
  // ws.send(JSON.stringify(bodyReq.parameters))

  var jsonRes = {
          "speech": msg,
          "displayText":msg,
          "data":  {"slack":slack_message},
          "contextOut": [{"name":"ScreenCloud", "lifespan":1, "parameters":{"app":bodyReq.parameters.app,"action":bodyReq.parameters.keywords}}],
          "source": "Screen-Cloud"
        }
              
  res.type('application/json')         
  res.status(200).json(jsonRes)             
})

app.get('/sampleHook',(req,res)=>{
  console.log('sample hook : ' , req.query )
  broadcastWebhook(req.query.action || 'test')
  res.send('done')
})

// app.listen((process.env.PORT || 8080),(req,res)=>{

// })
var server = http.createServer(app).listen(process.env.PORT,function(){
  
  // connect('https://voicewebsocket.herokuapp.com')

  console.log('server start poperly');
});

var wss = new WebSocketServer({ server })

function broadcastWebhook (message) {
  var wsClientKeys = Object.keys(googleWSConnections)
  console.log('wsClientKeys = ', wsClientKeys)
  wsClientKeys.map( (clientKey) => {
    var ws = googleWSConnections[clientKey]
    try {
      ws.send(message)
    } catch ( e ){
      console.log('can not send message to client : ' + clientKey, e)
      delete googleWSConnections[clientKey]
    }
  })
}

function connectWS (ws, clientKey) {
  console.log('clientKey = ', clientKey)
}

wss.on('connection', function (ws) {
  console.log('[wss] connection', ws)
  var clientKey = ''

  ws.once('message', (message)=>{
    console.log('msg = ', message)
    var jsonMsg = JSON.parse(message)
    clientKey = jsonMsg.clientKey
    googleWSConnections[clientKey] = ws 
  });

  ws.once('close', ()=> {
    console.log('client is close : ', clientKey)
    delete googleWSConnections[clientKey]
  })
})