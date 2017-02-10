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
  // var jsonRes = {"status": {
  //                   "code": 206,
  //                   "errorType": "partial_content",
  //                   "errorDetails": "Webhook call failed. Status code 503. Error:503 Service Unavailable"
  //                 }
  //               }
   jsonRes = {"fulfillment": {
            "speech": "Today in Boston: Fair, the temperature is 37 F",
            "source": "apiai-weather-webhook-sample",
            "displayText": "Today in Boston: Fair, the temperature is 37 F"
          }}             

   res.status(200).json(jsonRes)             
})

// app.listen((process.env.PORT || 8080),(req,res)=>{

// })
var server = http.createServer(app).listen(process.env.PORT,function(){
  console.log('server start poperly');
});