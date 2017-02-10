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
const api = express()


app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.set('port', (process.env.PORT || 8080))

// enable CORS
api.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  next()
})
app.get('/',(req,res)=>{
  res.status(200).send('server OK!!')
})

app.post('/api.ai',(req,res)=>{
  var bodyReq = req.body.result
  var msg,lifespan
  if(bodyReq.parameters.screen=='screen' || (bodyReq.parameters.app.length == 0 && bodyReq.parameters.screen.length == 0)) {
    msg = 'Which screen do you want?'
    lifespan = 4
  }else if((bodyReq.parameters.app.length == 0 && bodyReq.parameters.playlist.length == 0) && bodyReq.parameters.screen.length != 0 ) {
    msg = 'Which app do you want to show on '+bodyReq.parameters.screen+'?'
    lifespan = 4
  }else if(bodyReq.parameters.playlist.length != 0 && bodyReq.parameters.screen.length != 0){
    if(bodyReq.contexts.length>0) {
      let context = bodyReq.contexts[0]
      msg = 'Show '+context.parameters['playlist.original']+' on '+context.parameters['screen.original']
      lifespan = 1
    }else {
      msg = 'I dont understand that.'
      lifespan = 4
    }
  }else {
    if(bodyReq.contexts.length>0) {
      let context = bodyReq.contexts[0]
      msg = 'Show '+context.parameters['app.original']+' on '+context.parameters['screen.original']
      lifespan = 1
    }else {
      msg = 'I dont understand that.'
      lifespan = 4
    }
    
  }
  console.log('Check Request : ',bodyReq)
  
  bodyReq.contexts.forEach(function(element) {
    console.log('context :: ',element.parameters)  
  }, this);
  
  let slack_message = {
    "text": msg,
    "attachments": [
        {
            "title": "test title",
            "title_link": "test link",
            "color": "#36a64f",

            "fields": [
                {
                    "title": "Condition",
                    "value": "Temp TEST",
                    "short": "false"
                }
            ],
            "thumb_url": ""
        }
    ]
}  
   var jsonRes = {
            "speech": msg,
            "displayText": msg,
            "data":  {"slack":slack_message},
            "contextOut": [{"name":"ScreenCloud", "lifespan":lifespan, "parameters":{"app":bodyReq.parameters.app,"screen":bodyReq.parameters.screen}}],
            "source": "ScreenCloud"
            }     
   res.type('application/json')         
   res.status(200).json(jsonRes)             
})

// app.listen((process.env.PORT || 8080),(req,res)=>{

// })
var server = http.createServer(app).listen(process.env.PORT,function(){
  console.log('server start poperly');
});