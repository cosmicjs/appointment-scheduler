const express = require('express')
const path = require('path')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const session = require('express-session')
const cors = require('cors')
const config = require('./config')
const http = require('http')
const Cosmic = require('cosmicjs')
const twilio = require('twilio')
const moment = require('moment')
const axios = require('axios')

const app = express()
const env = process.env.NODE_ENV || 'development'
const twilioSid = config.twilio.sid
const twilioAuth = config.twilio.auth
const twilioClient = twilio(twilioSid, twilioAuth)
const twilioNumber = config.twilio.number

app.set('trust proxy', 1)
app.use(session({
  secret: 'sjcimsoc',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}))
app.use(cors())
app.use(morgan('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.set('port', process.env.PORT || 3000)

//handle requests for new appointments
app.post('/api/appointments', (req, res) => {
  const appointment = req.body
  appointment.phone = appointment.phone.replace(/\D/g,'')
  const date = moment(appointment.date, 'YYYY-DD-MM').startOf('day')
  const time = date.hour(9).add(appointment.slot, 'hours')
  const smsBody = `${appointment.name}, this message is to confirm your appointment at ${time.format('h:mm a')} on ${date.format('dddd MMMM Do[,] YYYY')}.`
  //send confirmation message to user
  twilioClient.messages.create({
    to: '+1' + appointment.phone,
    from: twilioNumber,
    body: smsBody
  }, (err, message) => console.log(message, err))
  //push to cosmic
  const cosmicObject = {
    "title": appointment.name,
    "type_slug": "appointments",
    "write_key": config.bucket.write_key,
    "metafields": [
      {
        "key": "date",
        "type": "text",
        "value": date.format('YYYY-DD-MM')
      },
      {
        "key": "slot",
        "type": "text",
        "value": appointment.slot
      },
      {
        "key": "email",
        "type": "text",
        "value": appointment.email
      },{
        "key": "phone",
        "type": "text",
        "value": appointment.phone //which is now stripped of all non-digits
      }
    ]
  }
  axios.post(`https://api.cosmicjs.com/v1/${config.bucket.slug}/add-object`, cosmicObject)
  .then(responst => res.json({ data: 'succes' })).catch(err => res.json({ data: 'error '}))
})

//expose site configs
app.get('/api/config', (req,res) => {
  Cosmic.getObject(config, { slug: 'site-config' }, (err, response) => {
    const data = response.object.metadata
    err ? res.status(500).json({ data: 'error' }) : res.json({ data })
  })
})

//expose appointments
app.get('/api/appointments', (req, res) => {
  Cosmic.getObjectType(config, { type_slug: 'appointments' }, (err, response) => {
    const appointments = response.objects.all ? response.objects.all.map(appointment => {
      return {
        date: appointment.metadata.date,
        slot: appointment.metadata.slot
      }
    }) : {}
    res.json({ data: appointments })
  })
})

app.get('/', (req, res) => {
  res.send('index.html')
})

app.get('*', (req, res) => {
  res.redirect('/')
})

http.createServer(app).listen(app.get('port'), () =>
  console.log('Server running at: ' + app.get('port'))
)
