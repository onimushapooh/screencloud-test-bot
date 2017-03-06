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
  // render
  if(bodyReq.parameters.app == '') {
    msg = 'Sorry, i did not quite catch that'
  }else {
    msg = bodyReq.resolvedQuery
    search_msg = msg.replace(new RegExp(bodyReq.parameters.actions+'|'+bodyReq.parameters.app+'|show', 'gi'), '')
    switch ( bodyReq.parameters.app ) {
      case 'youtube':
        search_msg = search_msg.replace(new RegExp('of|on', 'gi'), '');
        break;
      case 'message':
        break;
      case 'nba':
        break;
      case 'nfl':
        break;
      case 'epl':
        break;
      case 'time':
        search_msg = search_msg.replace(new RegExp('current|in', 'gi'), '');
	     break;  
      case 'weather':
        search_msg = search_msg.replace(new RegExp('in', 'gi'), '');
				break;
      case 'slack':
        break;
      case 'trello':
        break;
      case 'instagram':
        search_msg = search_msg.replace(new RegExp('of|on', 'gi'), '');
        search_msg = search_msg.replace(new RegExp(' ', 'gi'), '');
        break;  
      case 'skynews':		
        break;       
      default:
        
    }
    
    if(bodyReq.parameters.any != '' || bodyReq.parameters.any.length > 0) {
      search_msg = bodyReq.parameters.any
      if(bodyReq.parameters.app=='instagram') {
        search_msg = search_msg.replace(new RegExp(' ', 'gi'), '');
      }
      console.log('new message = ',search_msg)
    }else if(bodyReq.parameters['geo-city'].length > 0) {
      search_msg = bodyReq.parameters['geo-city']
      console.log('city message = ',search_msg)
    }else {
      console.log('fallback msg = ',search_msg)
    }
    var params = bodyReq.parameters
    params.voice = 'google'
    broadcastWebhook( JSON.stringify({params:params,message:search_msg}) )
  }

  var slack_message = {
    "text": msg,
  }

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

app.post('/alexa.ai',(req,res)=>{
  var bodyReq = req.body.request
  var msg,params = {},search_msg,endSession = false

  console.log('Check Request : ',bodyReq)
  if(bodyReq.type=='LaunchRequest') {
    msg = '<speak>Hi, I\'m screencloud how can i help?</speak>'
    endSession = false
  }else if(bodyReq.type=='IntentRequest') {
    console.log('Check Intent : ',bodyReq.intent.slots)
    if(bodyReq.intent.name=='OpenApps') {
      var appName = (bodyReq.intent.slots.appslot.value=='premier league' || bodyReq.intent.slots.appslot.value =='soccer' || bodyReq.intent.slots.appslot.value=='football') ? 'epl':bodyReq.intent.slots.appslot.value
      params = {"app":appName,
                  "actions":'Open',
                  "voice":"amazon"
                }

      msg = "<speak>Open "+bodyReq.intent.slots.appslot.value+"</speak>"
      search_msg = ''      
      console.log('OpenApps params = ',params)          
    }else if(bodyReq.intent.name=='PlayLimit') {
      search_msg = (typeof bodyReq.intent.slots.any.value != 'undefined')? bodyReq.intent.slots.any.value : bodyReq.intent.slots.instahash.value
      var appName = (bodyReq.intent.slots.appspecific.value=='U2') ? 'Youtube': bodyReq.intent.slots.appspecific.value
      params = {"app":appName,
                  "geo-city":'',
                  "any":search_msg,
                  "actions":"display",
                  "voice":"amazon"
                }
      console.log('PlayLimit params = ',params)  
      msg = "<speak>Display "+search_msg+" on "+bodyReq.intent.slots.appspecific.value+"</speak>"

    }else if(bodyReq.intent.name=='OpenWords') {
      search_msg = bodyReq.intent.slots.appwords.value  

      params = {"app":bodyReq.intent.slots.appspecific.value,
                  "geo-city":'',
                  "any":search_msg,
                  "actions":"display",
                  "voice":"amazon"
                }
      console.log('OpenWords params = ',params)  
              
      msg = "<speak>Show "+search_msg+" on "+bodyReq.intent.slots.appspecific.value+"</speak>"

    }else if(bodyReq.intent.name=='PlaceAndLocal') {

      search_msg = (typeof bodyReq.intent.slots.uscity.value != 'undefined') ? bodyReq.intent.slots.uscity.value : ' '
      search_msg += (typeof bodyReq.intent.slots.europecity.value != 'undefined') ? bodyReq.intent.slots.europecity.value : ' '
      search_msg += (typeof bodyReq.intent.slots.city.value != 'undefined') ? bodyReq.intent.slots.city.value : ' '
      search_msg = (typeof bodyReq.intent.slots.country.value != 'undefined') ? search_msg+' '+ bodyReq.intent.slots.country.value : search_msg

      search_msg = search_msg.trim()

      params = {"app":bodyReq.intent.slots.appplace.value,
                  "geo-city":search_msg,
                  "any":'',
                  "actions":"Show",
                  "voice":"amazon"
                }
      console.log('PlaceAndLocal params = ',params)  

      msg = "<speak>Show "+bodyReq.intent.slots.appplace.value+" in "+search_msg+"</speak>"

    }else if(bodyReq.intent.name=='OpenMessage') {

      search_msg = (typeof bodyReq.intent.slots.anymessage.value != 'undefined') ? bodyReq.intent.slots.anymessage.value : ''

      search_msg = search_msg.trim()

      params = {"app":bodyReq.intent.slots.appmessage.value,
                  "geo-city":'',
                  "any":search_msg,
                  "actions":"Show",
                  "voice":"amazon"
                }
      console.log('OpenMessage params = ',params)  

      msg = "<speak>Show "+search_msg+" on "+bodyReq.intent.slots.appmessage.value+"</speak>"

    }

    endSession = true

    broadcastWebhook( JSON.stringify({params:params,message:search_msg}) )
  }else {
    endSession = true
  }

  var jsonRes = {
          "version": "1.0",
          "sessionAttributes":{},
          "response": {
            "shouldEndSession": endSession,
            "outputSpeech":{
              "type":"SSML",
              "ssml":msg
            }
          }
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