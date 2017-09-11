# How to Make and Manage Your Appointments  With CosmicJS

Your time is valuable but you can't waste a second of it. People need to see you because work needs to get done and there are collaborations to be made. Instead of letting people communicate with you directly to schedule their use of your time - which only wastes it more - we'll use CosmicJS to build an appointment scheduler. That way, the people who need to talk to you only have to once.

CosmicJS is an API-first CMS, meaning it is language independent, database independent, and practically everything-else independent. This is great for a small project like this one because we can extend it quickly with any language or framework in the future and we can define data structures that are only as complex as we need them to be.

Our Appointment Scheduler will let users select a day and a one-hour time slot between 9AM and 5PM to meet with us. We'll then integrate our app with Twilio to send them a confirmation text that their appointment has been scheduled. Finally, we'll build a CosmicJS Extension so we can manage the appointments right from within the CosmicJS dashboard.

We'll complete our project in 3 major sections: 

1. Building out the front-end in React and Webpack, with the help of the Material UI component library
2. Wiring it up to a simple Express backend that will serve to make API calls to Twilio and to expose our Appointment objects to the front-end (in the spirit of keeping our Cosmic bucket keys out of our frontend code)
3. Building the Extension in React, again using the Material UI library

But, before any of that, we need to get our Cosmic bucket ready to store and serve data.

## Part 0: Setting Up CosmicJS

We'll use two types of Objects to store our data: one for appointments and one for site configurations. In CosmicJS, first create the ```Appointments``` object type with the specified metafields. Then, we'll create a ```Configs``` object type with no default metafields and a ```Site``` object in which we'll define object-specific metafields.

**Appointments**

| Metafield Name | Type |
| -------------- | ---- |
| email          | text |
| phone          | text |
| date           | text |
| slot           | text |

Here, ```email``` and ```phone``` will be the user's metadata — we'll use their name as the Appointment object's title. ```Date``` will hold the appointment date in ```YYYY-DD-MM``` format and ```slot``` will be how many hours away the appointment is from 9AM.

**Configs**/**Site**

| Metafield Name   | Type | Value                        |
| ---------------- | ---- | ---------------------------- |
| site_title       | text | Cosmic Appointment Scheduler |
| about_page_url   | text | https://cosmicjs.com/about   |
| contact_page_url | text | https://cosmicjs.com/contact |
| home_page_url    | text | https://cosmicjs.com         |

We're using the ```Config``` object to define details about the app that we want to be able to change on the fly, rather than having to redeploy for.

And with our simple data scheme in place, we're ready to get building.

## Part 1: Building the Front End

### 1. Boilerplate setup

1. First, we'll make our ```appointment-scheduler``` directory, run ```yarn init``` (feel free to use npm), and set up the project structure as follows:

```
appointment-scheduler
|
|--dist
|--src
|. |--Components
|. |. |--App.js
|. |--index.html
|. |--index.js
|--.babelrc
|--.gitignore
|--package.json
|--webpack.config.js
```

2. Then, we'll make our HTML template:

```html
<!-- ./src/index.html -->

<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">
    <title>Appointment Scheduler</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

3. Next, we'll install the packages we need. Of interest, alongside any standard packages needed to develop a React app in ES6, we'll be using:

   - ```async``` for an easy way to make ajax calls in series
   - ```axios``` as a useful ajax utility
   - ```babel-preset-stage-3``` to make use of the ```const { property } = object``` destructuring pattern
   - ```material-ui``` for a convenient set of React-built Material Design components
   - ```moment``` for parsing times
   - ```normalize.css``` to clear browser-default styles
   - ```react-tap-event-plugin``` - a necessary companion to ```material-ui```

   To install everything we need, run ```yarn add async axios babel-preset-stage-3 material-ui moment normalze.css react react-dom react-tap-event-plugin```, and for our dev-dependencies, ```yarn add babel-core babel-loader babel-preset-env babel-preset-react css-loader eslint file-loader html-webpack-plugin path style-loader webpack``` 

4. Having installed the Babel packages we need,  we'll tell Babel to use them in it's config file and we'll tell git to ignore everyhing we just installed:

   ```json
   // ./.babelrc

   { "presets": ["env", "react", "stage-3"] }
   ```

   ```
   # ./.gitignore

   node_modules
   ```

5. Finally, we'll set up Webpack so everything's in place for build time

   ```js
   const path = require('path')
   const HtmlWebpackPlugin = require('html-webpack-plugin')
   const webpack = require('webpack')

   module.exports = {
     entry: './src/index.js',
     output: {
       path: path.resolve('dist'),
       filename: 'bundle.js',
       sourceMapFilename: 'bundle.map.js'
     },
     devtool: 'source-map',
     devServer: {
       port: 8080
     },
     module: {
       rules: [{
         test: /\.js$/,
         use: { loader: 'babel-loader' },
         exclude: path.resolve('node_modules')
       }, {
         test: [/\.scss$/,/\.css$/],
         loader: ['style-loader', 'css-loader', 'sass-loader']
       }, {
         test: /\.(png|jpg|gif|svg)$/,
         use: [
           { loader: 'file-loader' }
         ]
       }]
     },
     plugins: [
       new HtmlWebpackPlugin({
         template: './src/index.html',
         filename: 'index.html',
         inject: true,
         xhtml: true
       }),
       new webpack.DefinePlugin({
         PRODUCTION: process.env.NODE_ENV === 'production'
       })
     ]
   }
   ```

We've configured Webpack to output ```bundle.js```, it's source map, and ```index.html``` (according to the template in ```src```) to ```dist``` on building. You also have the option to use SCSS throughout the project and have access to your Node environment via ```window.PRODUCTION``` at build-time.

### 2. Create an Entry Point

Before we go any further we need to define an entry point for our app. Here, we'll import any necessary global libraries or wrapper components. We'll also use it as the render point for our React app. This will be our ```src/index.js``` file and it will look like this:

```js
// ./src/index.js

import React from 'react'
import ReactDom from 'react-dom'
import App from './Components/App'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'

import 'normalize.css'

require('./scss/app.scss')

window.React = React

ReactDom.render(
  <MuiThemeProvider>
    <App />
  </MuiThemeProvider>,
  document.getElementById('root')
)

// MuiThemeProvider is a wrapper component for MaterialUI's components
```

### 3. Work out a Skeleton

Having eveything in place to get our app working, we have a few things to consider and a few choices to make about how we want our app to work before we start building it. To help us think, we'll build out a basic skeleton of how we need it to look:

```Jsx
// ./src/Components/App.js

import { Component } from 'react'
import injectTapEventPlugin from 'react-tap-event-plugin'

injectTapEventPlugin()

export default class App extends Component {
    constructor() {
    	super()
      	this.state = {
            // initial state
        }
        
  		//method bindings
    }
  
  	//component methods?
  
  	//lifecycle methods
	componentWillMount() {
        //fetch data from cosmic, watch window width
    }
  	componentWillUnmount() {
        //remove window width event listener
    }
  	render() {
     	//define variables
      	return (
        	<div>
          	</div>
        )
    }
}
```

To start, we need to think about what the app's state will look like. Here are some considerations:

- The app loads data from an external server, so it would be useful to show our user's when that's happening
- Material Design implements a drawer-style navigation, so we need to track when that's open
- To confirm the user's appointment details before submitting, we'll show them a confirmation modal and for other notifactions we'll use Material Design's snackbar, which displays small notifications at the bottom of the page. We'll need to track the open state of both of these.
- Our appointment scheduling process we'll take place in three steps: selecting a date, selecting a time slot, and filling out personal information. We need to track which step the user is on, the date and time they've selected, their contact details, and we also need to validate their email address and phone number.
- We'll be loading configuration data and a schedule appointments that we'd benefit from cacheing in the state.
- As our user procedes through the 3 scheduling steps, we'll show a friendly sentence tracking their progress. (Example: "Scheduling a 1 hour appointment at 3pm on…"). We need to know if that should be displayed.
- When the user is selecting an appoitment slot, they'll be able to filter by AM/PM, so we need to track which they're looking for.
- Finally, we'll add some responsiveness to our styling and we need to keep track of the screen width.

We then arrive at this as our initial state:

```jsx
// ./src/Components/App.js

// ...
this.state = {
  loading: true,
  navOpen: false,
  confirmationModalOpen: false,
  confirmationTextVisible: false,
  stepIndex: 0,
  appointmentDateSelected: false,
  appointmentMeridiem: 0,
  validEmail: false,
  validPhone: false,
  smallScreen: window.innerWidth < 768,
  confirmationSnackbarOpen: false
}
```

Note that ```appointmentMeridiem``` takes on ```0``` or ```1```, such that ```0 => 'AM'``` and ```1 => 'PM'```.

### 4. Draft Out Functionality

We've defined an initial state for our app, but before we build out a view with Material components we'll find it useful to brainstorm what needs done with our data. Our app will boil down to the following functionality:

- As decided in the previous step, our navitgation will be in a drawer so we need a ```handleNavToggle()``` method to display/hide it
- The three scheduling steps are revealed to the user in succession upon completing a previous step, so we need a ```handleNextStep()``` method to handle the flow of user input
- We'll user a Material UI date picker to set our appointment date and we need a ```handleSetAppointmentDate()``` method to process data from that component. Likewise, we need a ```handleSetAppointmentSlot()``` and ```handleSetAppointmentMeridiem()``` method. We don't want the date picker to show unavailable days (including ```today```) so we need to pass a ```checkDisableDate()``` method to it.
- In the ```componentWillMount()``` lifecycle method we'll fetch our data from our backend, then handle that data with a separate ```handleFetch()``` method. For a fetching error, we'll need a ```handleFetchError()``` method.
- Upon submitting the appointment data, we'll use ```handleSubmit()``` to send it to our backend. We'll need a ```validateEmail()``` and ```validatePhone()``` method for when the user is filling out contact information.
- The user-friendly string above the form will be rendered in a separate method with ```renderConfirmationString()```. So will available appointment times and the confirmation modal with ```renderAppointmentTimes()``` and ```renderAppointmentConfirmation()``` respectively.
- Finally, we'll use a handy ```resize()``` method to respond to the browser window changing in width

All in all, unwritten methods included, our ```App.js``` now looks like this (method bindings included):

```Jsx
// ./src/Components/App.js

import { Component } from 'react'
import injectTapEventPlugin from 'react-tap-event-plugin'

injectTapEventPlugin()

export default class App extends Component {
    constructor() {
    	super()
      	this.state = {
          loading: true,
          navOpen: false,
          confirmationModalOpen: false,
          confirmationTextVisible: false,
          stepIndex: 0,
          appointmentDateSelected: false,
          appointmentMeridiem: 0,
          validEmail: false,
          validPhone: false,
          smallScreen: window.innerWidth < 768,
          confirmationSnackbarOpen: false
        }
       
      //method bindings
      this.handleNavToggle = this.handleNavToggle.bind(this)
      this.handleNextStep = this.handleNextStep.bind(this)
      this.handleSetAppointmentDate = this.handleSetAppointmentDate.bind(this)
      this.handleSetAppointmentSlot = this.handleSetAppointmentSlot.bind(this)
      this.handleSetAppointmentMeridiem = this.handleSetAppointmentMeridiem.bind(this)
      this.handleSubmit = this.handleSubmit.bind(this)
      this.validateEmail = this.validateEmail.bind(this)
      this.validatePhone = this.validatePhone.bind(this)
      this.checkDisableDate = this.checkDisableDate.bind(this)
      this.renderAppointmentTimes = this.renderAppointmentTimes.bind(this)
      this.renderConfirmationString = this.renderConfirmationString.bind(this)
      this.renderAppointmentConfirmation = this.renderAppointmentConfirmation.bind(this)
      this.resize = this.resize.bind(this)
    }
  
  	handleNavToggle() {
        
   }
  
  	handleNextStep() {
        
    }
  
  	handleSetAppointmentDate(date) {
        
    }
  
  	handleSetAppointmentSlot(slot) {
        
    }
  
  	handleSetAppointmentMeridiem(meridiem) {
        
    }
  
  	handleFetch(response) {
        
    }
  
  	handleFetchError(err) {
        
    }
  
  	handleSubmit() {
        
    }
  
  	validateEmail(email) {
        
    }
  
  	validatePhone(phoneNumber) {
        
    }
  
  	checkDisableDate(date) {
        
    }
  
  	renderConfirmationString() {
        
    }
  
  	renderAppointmentTimes() {
        
    }
  
  	renderAppointmentConfirmation() {
        
    }
  
  	resize() {
        
    }
  
  	//lifecycle methods
	componentWillMount() {
        //fetch data from cosmic, watch window width
    }
  	componentWillUnmount() {
        //remove window width event listener
    }
  	render() {
     	//define variables
      	return (
        	<div>
          	</div>
        )
    }
}
```

### 5. Build Out the View

Having a basic idea of how our app is going to function, we can start building out its UI. Besides a couple of wrappers and a few custom styles, the majority of our app will be constructed with pre-packaged Material UI components. 

In order, we need:

- An ```AppBar``` which acts as the primary toolbar

- A ```Drawer```, which is opened from the ```AppBar```'s primary button and serves as the app's navigation, following Material Design.

- Within the ```Drawer```, ```MenuItem```s to display links

- A ```Card``` as the primary content container

- A ```Stepper``` to break the scheduling process into 3 discreet steps. The active step will be expanded while the others are collapsed. The first step will be disabled if ```state.loading``` is true and the last two will be disabled as long as the user hasn't filled out the previous step.

- Nested in the ```Stepper```, three ```Steps``` which contain ```StepButton``` and ```StepContent``` components.

- In the first ```Step```, we'll use a ```DatePicker``` to let the user choose an appointment date. Unavailable days will be disabled according to the return value of ```checkDisableDate()```. Selection of a date will be handled with ```handleSetAppointmentDate()```

- In the second ```Step```, we want the user to be able to pick a time slot for their selected day from the slots available. We also want them to be able to filter times according to AM/PM. We'll use a ```SelectField``` for the filter and a ```RadioButtonGroup``` to hold the time slot buttons. We need extra logic to render the radio buttons, so will do that in the ```renderAppointmentTimes()``` method. That will return a set of ```RadioButton```s.

- The last ```Step``` will ask the user to input their name, email address, and phone number using ```TextField``` components. A ```RaisedButton``` will be used a submit button to open the confirmation ```Dialog```. The users inputted phone number and email address will be validated with ```validatePhone()``` and ```validateEmail()``` respectively.

- Finally, we'll include a convenient ```SnackBar``` to display notifcations about the loading state and submission at the bottom of the page.

  All in all, after having written out the ```render()``` method, our app will look like this:

```jsx
// ./src/Components/App.js

// .. previous imports

import AppBar from 'material-ui/AppBar'
import Drawer from 'material-ui/Drawer'
import Dialog from 'material-ui/Dialog'
import Divider from 'material-ui/Divider'
import MenuItem from 'material-ui/MenuItem'
import Card from 'material-ui/Card'
import DatePicker from 'material-ui/DatePicker'
import TimePicker from 'material-ui/TimePicker'
import TextField from 'material-ui/TextField'
import SelectField from 'material-ui/SelectField'
import SnackBar from 'material-ui/Snackbar'
import {
  Step,
  Stepper,
  StepLabel,
  StepContent,
  StepButton
} from 'material-ui/stepper'
import {
  RadioButton,
  RadioButtonGroup
} from 'material-ui/RadioButton'
import RaisedButton from 'material-ui/RaisedButton';
import FlatButton from 'material-ui/FlatButton'
import logo from './../../dist/assets/logo.svg'

export default class App extends Component {
    // ... component methods, lifecycle methods
  render() {
    const { stepIndex, loading, navOpen, smallScreen, confirmationModalOpen, confirmationSnackbarOpen, ...data } = this.state
    const contactFormFilled = data.firstName && data.lastName && data.phone && data.email && data.validPhone && data.validEmail
    const modalActions = [
      <FlatButton
        label="Cancel"
        primary={false}
        onClick={() => this.setState({ confirmationModalOpen : false})} />,
      <FlatButton
        label="Confirm"
        primary={true}
        onClick={() => this.handleSubmit()} />
    ]
    return (
      <div>
        <AppBar
          title={data.siteTitle}
          onLeftIconButtonTouchTap={() => this.handleNavToggle() }/>
        <Drawer
          docked={false}
          width={300}
          open={navOpen}
          onRequestChange={(navOpen) => this.setState({navOpen})} >
          <img src={logo}
               style={{
                 height: 70,
                 marginTop: 50,
                 marginBottom: 30,
                 marginLeft: '50%',
                 transform: 'translateX(-50%)'
               }}/>
          <a style={{textDecoration: 'none'}} href={this.state.homePageUrl}><MenuItem>Home</MenuItem></a>
          <a style={{textDecoration: 'none'}} href={this.state.aboutPageUrl}><MenuItem>About</MenuItem></a>
          <a style={{textDecoration: 'none'}} href={this.state.contactPageUrl}><MenuItem>Contact</MenuItem></a>

          <MenuItem disabled={true}
                    style={{
                      marginLeft: '50%',
                      transform: 'translate(-50%)'
                    }}>
            {"© Copyright " + moment().format('YYYY')}</MenuItem>
        </Drawer>
        <section style={{
            maxWidth: !smallScreen ? '80%' : '100%',
            margin: 'auto',
            marginTop: !smallScreen ? 20 : 0,
          }}>
          {this.renderConfirmationString()}
          <Card style={{
              padding: '10px 10px 25px 10px',
              height: smallScreen ? '100vh' : null
            }}>
            <Stepper
              activeStep={stepIndex}
              linear={false}
              orientation="vertical">
              <Step disabled={loading}>
                <StepButton onClick={() => this.setState({ stepIndex: 0 })}>
                  Choose an available day for your appointment
                </StepButton>
                <StepContent>
                  <DatePicker
                      style={{
                        marginTop: 10,
                        marginLeft: 10
                      }}
                      value={data.appointmentDate}
                      hintText="Select a date"
                      mode={smallScreen ? 'portrait' : 'landscape'}
                      onChange={(n, date) => this.handleSetAppointmentDate(date)}
                      shouldDisableDate={day => this.checkDisableDate(day)}
                       />
                  </StepContent>
              </Step>
              <Step disabled={ !data.appointmentDate }>
                <StepButton onClick={() => this.setState({ stepIndex: 1 })}>
                  Choose an available time for your appointment
                </StepButton>
                <StepContent>
                  <SelectField
                    floatingLabelText="AM or PM"
                    value={data.appointmentMeridiem}
                    onChange={(evt, key, payload) => this.handleSetAppointmentMeridiem(payload)}
                    selectionRenderer={value => value ? 'PM' : 'AM'}>
                    <MenuItem value={0}>AM</MenuItem>
                    <MenuItem value={1}>PM</MenuItem>
                  </SelectField>
                  <RadioButtonGroup
                    style={{ marginTop: 15,
                             marginLeft: 15
                           }}
                    name="appointmentTimes"
                    defaultSelected={data.appointmentSlot}
                    onChange={(evt, val) => this.handleSetAppointmentSlot(val)}>
                    {this.renderAppointmentTimes()}
                  </RadioButtonGroup>
                </StepContent>
              </Step>
              <Step disabled={ !Number.isInteger(this.state.appointmentSlot) }>
                <StepButton onClick={() => this.setState({ stepIndex: 2 })}>
                  Share your contact information with us and we'll send you a reminder
                </StepButton>
                <StepContent>
                  <section>
                    <TextField
                      style={{ display: 'block' }}
                      name="first_name"
                      hintText="First Name"
                      floatingLabelText="First Name"
                      onChange={(evt, newValue) => this.setState({ firstName: newValue })}/>
                    <TextField
                      style={{ display: 'block' }}
                      name="last_name"
                      hintText="Last Name"
                      floatingLabelText="Last Name"
                      onChange={(evt, newValue) => this.setState({ lastName: newValue })}/>
                    <TextField
                      style={{ display: 'block' }}
                      name="email"
                      hintText="name@mail.com"
                      floatingLabelText="Email"
                      errorText={data.validEmail ? null : 'Enter a valid email address'}
                      onChange={(evt, newValue) => this.validateEmail(newValue)}/>
                    <TextField
                      style={{ display: 'block' }}
                      name="phone"
                      hintText="(888) 888-8888"
                      floatingLabelText="Phone"
                      errorText={data.validPhone ? null: 'Enter a valid phone number'}
                      onChange={(evt, newValue) => this.validatePhone(newValue)} />
                    <RaisedButton
                      style={{ display: 'block' }}
                      label={contactFormFilled ? 'Schedule' : 'Fill out your information to schedule'}
                      labelPosition="before"
                      primary={true}
                      fullWidth={true}
                      onClick={() => this.setState({ confirmationModalOpen: !this.state.confirmationModalOpen })}
                      disabled={!contactFormFilled || data.processed }
                      style={{ marginTop: 20, maxWidth: 100}} />
                  </section>
                </StepContent>
              </Step>
            </Stepper>
          </Card>
          <Dialog
            modal={true}
            open={confirmationModalOpen}
            actions={modalActions}
            title="Confirm your appointment">
            {this.renderAppointmentConfirmation()}
          </Dialog>
          <SnackBar
            open={confirmationSnackbarOpen || loading}
            message={loading ? 'Loading... ' : data.confirmationSnackbarMessage || ''}
            autoHideDuration={10000}
            onRequestClose={() => this.setState({ confirmationSnackbarOpen: false })} />
        </section>
      </div>
    )
  }
}
```

Before moving on, notice that, because they take some extra logic to render, we'll be handing the radio buttons for the time slots and the confirmation strings in their own methods.

With the view components in place, our last big step will be to write all of the functionality we've mapped out.

### 6. Component Lifecycle Methods

#### ```componentWillMount()``` 

The first step in adding functionality will be to write out the ```componentWillMount()``` method. In ```componentWillMount()``` we'll use ```axios``` to fetch our configuration and appointments data from our backend. Again, we're using our backend as a middleman so we can selectively expose data to our front end and omit things like users' contact information.

```js
// ./src/Components/App.js

// previous imports
import async from 'async'
import axios from 'axios'

export default class App extends Component {
	constructor() {}
  
  	componentWillMount() {
    	async.series({
        	configs(callback) {
          		axios.get(HOST + 'api/config').then(res =>
            		callback(null, res.data.data)
          		)
        	},
        	appointments(callback) {
          		axios.get(HOST + 'api/appointments').then(res => {
            		callback(null, res.data.data)
          		})
       		}
      	}, (err,response) => {
        err ? this.handleFetchError(err) : this.handleFetch(response)
    })
    	addEventListener('resize', this.resize)
    }
  
 	// rest...
}
```

We use ```async``` to make our ```axios``` calls in series, and name them so we have access to them as ```response.configs``` and ```response.appointments``` in ```handleFetch()```. We also use ```componentWillMount``` to start tracking the window width with ```resize()```.

####  ```componentWillUnmount()```

Practicing good form, we'll remove the event listener in ```componentWillUnmount()```.

```js
// ./src/Components/App.js

// previous imports
import async from 'async'
import axios from 'axios'

export default class App extends Component {
	constructor() {}
  
  	componentWillUnmount() {
		removeEventListener('resize', this.resize)
    }
  
 	// rest...
}
```

### 7. Processing Data

Having fetched the data we need, we'll process a successful fetch with ```handleFetch()``` and an error with ```handleFetchError()```. In ```handleFetch()``` we'll build a schedule of appointmens to store in the state, such that ```schedule = { appointmentDate: [slots] }```. We also use this method to store the app's configuration data in the state.

#### ```handleFetch()```

```js
handleFetch(response) {
	const { configs, appointments } = response
    const initSchedule = {}
    const today = moment().startOf('day')
    initSchedule[today.format('YYYY-DD-MM')] = true
    const schedule = !appointments.length ? initSchedule : 			appointments.reduce((currentSchedule, appointment) => {
      const { date, slot } = appointment
      const dateString = moment(date, 'YYYY-DD-MM').format('YYYY-DD-MM')
      !currentSchedule[date] ? currentSchedule[dateString] = Array(8).fill(false) : null
      Array.isArray(currentSchedule[dateString]) ?
        currentSchedule[dateString][slot] = true : null
      return currentSchedule
    }, initSchedule)

    for (let day in schedule) {
      let slots = schedule[day]
      slots.length ? (slots.every(slot => slot === true)) ? schedule[day] = true : null : null
    }

    this.setState({
      schedule,
      siteTitle: configs.site_title,
      aboutPageUrl: configs.about_page_url,
      contactPageUrl: configs.contact_page_url,
      homePageUrl: configs.home_page_url,
      loading: false
    })
  }
```

#### ```handleFetchError()```

For handling errors, we'll simply show the users an error message in the ```SnackBar```.

```js
handleFetchError(err) {
	console.log('Error fetching data:' + err)
    this.setState({ confirmationSnackbarMessage: 'Error fetching data', confirmationSnackbarOpen: true })
}
```

### 8. Handle UI Changes

We need to manage the state whenever the user opens the ```Drawer```, moves onto another step, or if the browser width changes. First we'll handle the drawer toggle.

```js
handleNavToggle() {
  return this.setState({ navOpen: !this.state.navOpen })
}
```

Then, as long as the user isn't on the last step, we'll handle incrementing the step.

```js
handleNextStep() {
  const { stepIndex } = this.state
  return (stepIndex < 3) ? this.setState({ stepIndex: stepIndex + 1}) : null
}
```

Finally, we'll simply change the state on resize if the window width is less than 768px.

```js
resize() {
  this.setState({ smallScreen: window.innerWidth < 768 })
}
```

### 9. Handle Setting Appointment Data

When the user selects appointment options in steps one and two, we need three simple setters to change the state to reflect those selections.

```js
handleSetAppointmentDate(date) {
  this.handleNextStep()
  this.setState({ appointmentDate: date, confirmationTextVisible: true })
}

handleSetAppointmentSlot(slot) {
  this.handleNextStep()
  this.setState({ appointmentSlot: slot })
}

handleSetAppointmentMeridiem(meridiem) {
  this.setState({ appointmentMeridiem: meridiem})
}
```

### 10. Handle Validations

We need to validate the user's inputted email address, phone number, and we need to feed the ```DatePicker``` component a function to check which days should be disabled. Although naive, we'll be using regex's to check the inputs for simplicities sake.

```js
validateEmail(email) {
  const regex = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
  return regex.test(email) ? this.setState({ email: email, validEmail: true }) : this.setState({ validEmail: false })
}

validatePhone(phoneNumber) {
  const regex = /^(1\s|1|)?((\(\d{3}\))|\d{3})(\-|\s)?(\d{3})(\-|\s)?(\d{4})$/
  return regex.test(phoneNumber) ? this.setState({ phone: phoneNumber, validPhone: true }) : this.setState({ validPhone: false })
}
```

For checking if a date should be disabled, we need to check if the date passed by ```DatePicker``` is either in ```state.schedule``` or is today.

```js
  checkDisableDate(day) {
    const dateString = moment(day).format('YYYY-DD-MM')
    return this.state.schedule[dateString] === true || moment(day).startOf('day').diff(moment().startOf('day')) < 0
  }
```

### 11. Build the Render Methods for the confirmation strings and the time slot radio buttons

In our ```render()``` lifecycle method we abstracted out the logic for displaying the dynamic confirmation string above the ```Card```, the confirmation details we'll show in the confirmation modal, and the radio buttons for selecting a time slot.

Starting with the confirmation string, we'll display the parts of it that correspond to inputted data only as it's entered.

```Jsx
renderConfirmationString() {
  const spanStyle = {color: '#00bcd4'}
  return this.state.confirmationTextVisible ? <h2 style={{ textAlign: 	this.state.smallScreen ? 'center' : 'left', color: '#bdbdbd', lineHeight: 1.5, padding: '0 10px', fontFamily: 'Roboto'}}>
    { <span>
     Scheduling a

     <span style={spanStyle}> 1 hour </span>

appointment {this.state.appointmentDate && <span>
  on <span style={spanStyle}>{moment(this.state.appointmentDate).format('dddd[,] MMMM Do')}</span>
             </span>} {Number.isInteger(this.state.appointmentSlot) && <span>at <span style={spanStyle}>{moment().hour(9).minute(0).add(this.state.appointmentSlot, 'hours').format('h:mm a')}</span></span>}
             </span>}
             </h2> : null
}
```

Then, similarly, we'll let the user verify their data before confirming submission.

```js
renderAppointmentConfirmation() {
  const spanStyle = { color: '#00bcd4' }
  return <section>
    <p>Name: <span style={spanStyle}>{this.state.firstName} {this.state.lastName}</span></p>
      <p>Number: <span style={spanStyle}>{this.state.phone}</span></p>
        <p>Email: <span style={spanStyle}>{this.state.email}</span></p>
          <p>Appointment: <span style={spanStyle}>{moment(this.state.appointmentDate).format('dddd[,] MMMM Do[,] YYYY')}</span> at <span style={spanStyle}>{moment().hour(9).minute(0).add(this.state.appointmentSlot, 'hours').format('h:mm a')}</span></p>
  </section>
}
```

Finally, we'll write the method to render the appointment slot radio buttons. To do this we first have to filter the slots by availabity and by whether AM or PM is selected. Both are simple checks; for the first we see if it exists in ```state.schedule```, for the later, we check the meridiem part with ```moment().format('a')```. To compute the time string in 12 hour format, we add the slot to 9AM in units of hours.

```js
renderAppointmentTimes() {
  if (!this.state.loading) {
    const slots = [...Array(8).keys()]
    return slots.map(slot => {
      const appointmentDateString = moment(this.state.appointmentDate).format('YYYY-DD-MM')
      const t1 = moment().hour(9).minute(0).add(slot, 'hours')
      const t2 = moment().hour(9).minute(0).add(slot + 1, 'hours')
      const scheduleDisabled = this.state.schedule[appointmentDateString] ? this.state.schedule[moment(this.state.appointmentDate).format('YYYY-DD-MM')][slot] : false
      const meridiemDisabled = this.state.appointmentMeridiem ? t1.format('a') === 'am' : t1.format('a') === 'pm'
      return <RadioButton
      label={t1.format('h:mm a') + ' - ' + t2.format('h:mm a')}
      key={slot}
      value={slot}
      style={{marginBottom: 15, display: meridiemDisabled ? 'none' : 'inherit'}}
                     disabled={scheduleDisabled || meridiemDisabled}/>
                     })
  } else {
    return null
  }
}
```

### 13. Handle the Form Submission

Once we show the user the confirmation modal, upon final submission we'll send the data to our backend with an ```axios``` POST. We'll notifty them of either a success or an error.

```js
  handleSubmit() {
    const appointment = {
      date: moment(this.state.appointmentDate).format('YYYY-DD-MM'),
      slot: this.state.appointmentSlot,
      name: this.state.firstName + ' ' + this.state.lastName,
      email: this.state.email,
      phone: this.state.phone
    }
    axios.post(HOST + 'api/appointments', )
    axios.post(HOST + 'api/appointments', appointment)
    .then(response => this.setState({ confirmationSnackbarMessage: "Appointment succesfully added!", confirmationSnackbarOpen: true, processed: true }))
    .catch(err => {
      console.log(err)
      return this.setState({ confirmationSnackbarMessage: "Appointment failed to save.", confirmationSnackbarOpen: true })
    })
  }
```

### 14. Conclusion: Seeing it All Together

Before moving on to building the backend, here's what we have as our final product.

```jsx
// ./src/Components/App.js

import { Component } from 'react'
import injectTapEventPlugin from 'react-tap-event-plugin'
import axios from 'axios'
import async from 'async'
import moment from 'moment'
import AppBar from 'material-ui/AppBar'
import Drawer from 'material-ui/Drawer'
import Dialog from 'material-ui/Dialog'
import Divider from 'material-ui/Divider'
import MenuItem from 'material-ui/MenuItem'
import Card from 'material-ui/Card'
import DatePicker from 'material-ui/DatePicker'
import TimePicker from 'material-ui/TimePicker'
import TextField from 'material-ui/TextField'
import SelectField from 'material-ui/SelectField'
import SnackBar from 'material-ui/Snackbar'
import {
  Step,
  Stepper,
  StepLabel,
  StepContent,
  StepButton
} from 'material-ui/stepper'
import {
  RadioButton,
  RadioButtonGroup
} from 'material-ui/RadioButton'
import RaisedButton from 'material-ui/RaisedButton';
import FlatButton from 'material-ui/FlatButton'
import logo from './../../dist/assets/logo.svg'

injectTapEventPlugin()
const HOST = PRODUCTION ? '/' : 'http://localhost:3000/'

export default class App extends Component {
  constructor() {
    super()
    this.state = {
      loading: true,
      navOpen: false,
      confirmationModalOpen: false,
      confirmationTextVisible: false,
      stepIndex: 0,
      appointmentDateSelected: false,
      appointmentMeridiem: 0,
      validEmail: true,
      validPhone: true,
      smallScreen: window.innerWidth < 768,
      confirmationSnackbarOpen: false
    }

    this.handleNavToggle = this.handleNavToggle.bind(this)
    this.handleNextStep = this.handleNextStep.bind(this)
    this.handleSetAppointmentDate = this.handleSetAppointmentDate.bind(this)
    this.handleSetAppointmentSlot = this.handleSetAppointmentSlot.bind(this)
    this.handleSetAppointmentMeridiem = this.handleSetAppointmentMeridiem.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
    this.validateEmail = this.validateEmail.bind(this)
    this.validatePhone = this.validatePhone.bind(this)
    this.checkDisableDate = this.checkDisableDate.bind(this)
    this.renderAppointmentTimes = this.renderAppointmentTimes.bind(this)
    this.renderConfirmationString = this.renderConfirmationString.bind(this)
    this.renderAppointmentConfirmation = this.renderAppointmentConfirmation.bind(this)
    this.resize = this.resize.bind(this)
  }

  handleNavToggle() {
    return this.setState({ navOpen: !this.state.navOpen })
  }

  handleNextStep() {
    const { stepIndex } = this.state
    return (stepIndex < 3) ? this.setState({ stepIndex: stepIndex + 1}) : null
  }

  handleSetAppointmentDate(date) {
    this.handleNextStep()
    this.setState({ appointmentDate: date, confirmationTextVisible: true })
  }

  handleSetAppointmentSlot(slot) {
    this.handleNextStep()
    this.setState({ appointmentSlot: slot })
  }

  handleSetAppointmentMeridiem(meridiem) {
    this.setState({ appointmentMeridiem: meridiem})
  }

  handleFetch(response) {
    const { configs, appointments } = response
    const initSchedule = {}
    const today = moment().startOf('day')
    initSchedule[today.format('YYYY-DD-MM')] = true
    const schedule = !appointments.length ? initSchedule : appointments.reduce((currentSchedule, appointment) => {
      const { date, slot } = appointment
      const dateString = moment(date, 'YYYY-DD-MM').format('YYYY-DD-MM')
      !currentSchedule[date] ? currentSchedule[dateString] = Array(8).fill(false) : null
      Array.isArray(currentSchedule[dateString]) ?
        currentSchedule[dateString][slot] = true : null
      return currentSchedule
    }, initSchedule)

    for (let day in schedule) {
      let slots = schedule[day]
      slots.length ? (slots.every(slot => slot === true)) ? schedule[day] = true : null : null
    }

    this.setState({
      schedule,
      siteTitle: configs.site_title,
      aboutPageUrl: configs.about_page_url,
      contactPageUrl: configs.contact_page_url,
      homePageUrl: configs.home_page_url,
      loading: false
    })
  }

  handleFetchError(err) {
    console.log('Error fetching data:' + err)
    this.setState({ confirmationSnackbarMessage: 'Error fetching data', confirmationSnackbarOpen: true })
  }

  handleSubmit() {
    const appointment = {
      date: moment(this.state.appointmentDate).format('YYYY-DD-MM'),
      slot: this.state.appointmentSlot,
      name: this.state.firstName + ' ' + this.state.lastName,
      email: this.state.email,
      phone: this.state.phone
    }
    axios.post(HOST + 'api/appointments', )
    axios.post(HOST + 'api/appointments', appointment)
    .then(response => this.setState({ confirmationSnackbarMessage: "Appointment succesfully added!", confirmationSnackbarOpen: true, processed: true }))
    .catch(err => {
      console.log(err)
      return this.setState({ confirmationSnackbarMessage: "Appointment failed to save.", confirmationSnackbarOpen: true })
    })
  }

  validateEmail(email) {
    const regex = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
    return regex.test(email) ? this.setState({ email: email, validEmail: true }) : this.setState({ validEmail: false })
  }

  validatePhone(phoneNumber) {
    const regex = /^(1\s|1|)?((\(\d{3}\))|\d{3})(\-|\s)?(\d{3})(\-|\s)?(\d{4})$/
    return regex.test(phoneNumber) ? this.setState({ phone: phoneNumber, validPhone: true }) : this.setState({ validPhone: false })
  }

  checkDisableDate(day) {
    const dateString = moment(day).format('YYYY-DD-MM')
    return this.state.schedule[dateString] === true || moment(day).startOf('day').diff(moment().startOf('day')) < 0
  }

  renderConfirmationString() {
    const spanStyle = {color: '#00bcd4'}
    return this.state.confirmationTextVisible ? <h2 style={{ textAlign: this.state.smallScreen ? 'center' : 'left', color: '#bdbdbd', lineHeight: 1.5, padding: '0 10px', fontFamily: 'Roboto'}}>
      { <span>
        Scheduling a

          <span style={spanStyle}> 1 hour </span>

        appointment {this.state.appointmentDate && <span>
          on <span style={spanStyle}>{moment(this.state.appointmentDate).format('dddd[,] MMMM Do')}</span>
      </span>} {Number.isInteger(this.state.appointmentSlot) && <span>at <span style={spanStyle}>{moment().hour(9).minute(0).add(this.state.appointmentSlot, 'hours').format('h:mm a')}</span></span>}
      </span>}
    </h2> : null
  }

  renderAppointmentTimes() {
    if (!this.state.loading) {
      const slots = [...Array(8).keys()]
      return slots.map(slot => {
        const appointmentDateString = moment(this.state.appointmentDate).format('YYYY-DD-MM')
        const t1 = moment().hour(9).minute(0).add(slot, 'hours')
        const t2 = moment().hour(9).minute(0).add(slot + 1, 'hours')
        const scheduleDisabled = this.state.schedule[appointmentDateString] ? this.state.schedule[moment(this.state.appointmentDate).format('YYYY-DD-MM')][slot] : false
        const meridiemDisabled = this.state.appointmentMeridiem ? t1.format('a') === 'am' : t1.format('a') === 'pm'
        return <RadioButton
          label={t1.format('h:mm a') + ' - ' + t2.format('h:mm a')}
          key={slot}
          value={slot}
          style={{marginBottom: 15, display: meridiemDisabled ? 'none' : 'inherit'}}
          disabled={scheduleDisabled || meridiemDisabled}/>
      })
    } else {
      return null
    }
  }

  renderAppointmentConfirmation() {
    const spanStyle = { color: '#00bcd4' }
    return <section>
      <p>Name: <span style={spanStyle}>{this.state.firstName} {this.state.lastName}</span></p>
      <p>Number: <span style={spanStyle}>{this.state.phone}</span></p>
      <p>Email: <span style={spanStyle}>{this.state.email}</span></p>
      <p>Appointment: <span style={spanStyle}>{moment(this.state.appointmentDate).format('dddd[,] MMMM Do[,] YYYY')}</span> at <span style={spanStyle}>{moment().hour(9).minute(0).add(this.state.appointmentSlot, 'hours').format('h:mm a')}</span></p>
    </section>
  }

  resize() {
    this.setState({ smallScreen: window.innerWidth < 768 })
  }

  componentWillMount() {
    async.series({
      configs(callback) {
        axios.get(HOST + 'api/config').then(res =>
          callback(null, res.data.data)
        )
      },
      appointments(callback) {
        axios.get(HOST + 'api/appointments').then(res => {
          callback(null, res.data.data)
        })
      }
    }, (err,response) => {
      err ? this.handleFetchError(err) : this.handleFetch(response)
    })
    addEventListener('resize', this.resize)
  }

  componentWillUnmount() {
    removeEventListener('resize', this.resize)
  }

  render() {
    const { stepIndex, loading, navOpen, smallScreen, confirmationModalOpen, confirmationSnackbarOpen, ...data } = this.state
    const contactFormFilled = data.firstName && data.lastName && data.phone && data.email && data.validPhone && data.validEmail
    const modalActions = [
      <FlatButton
        label="Cancel"
        primary={false}
        onClick={() => this.setState({ confirmationModalOpen : false})} />,
      <FlatButton
        label="Confirm"
        primary={true}
        onClick={() => this.handleSubmit()} />
    ]
    return (
      <div>
        <AppBar
          title={data.siteTitle}
          onLeftIconButtonTouchTap={() => this.handleNavToggle() }/>
        <Drawer
          docked={false}
          width={300}
          open={navOpen}
          onRequestChange={(navOpen) => this.setState({navOpen})} >
          <img src={logo}
               style={{
                 height: 70,
                 marginTop: 50,
                 marginBottom: 30,
                 marginLeft: '50%',
                 transform: 'translateX(-50%)'
               }}/>
          <a style={{textDecoration: 'none'}} href={this.state.homePageUrl}><MenuItem>Home</MenuItem></a>
          <a style={{textDecoration: 'none'}} href={this.state.aboutPageUrl}><MenuItem>About</MenuItem></a>
          <a style={{textDecoration: 'none'}} href={this.state.contactPageUrl}><MenuItem>Contact</MenuItem></a>

          <MenuItem disabled={true}
                    style={{
                      marginLeft: '50%',
                      transform: 'translate(-50%)'
                    }}>
            {"© Copyright " + moment().format('YYYY')}</MenuItem>
        </Drawer>
        <section style={{
            maxWidth: !smallScreen ? '80%' : '100%',
            margin: 'auto',
            marginTop: !smallScreen ? 20 : 0,
          }}>
          {this.renderConfirmationString()}
          <Card style={{
              padding: '10px 10px 25px 10px',
              height: smallScreen ? '100vh' : null
            }}>
            <Stepper
              activeStep={stepIndex}
              linear={false}
              orientation="vertical">
              <Step disabled={loading}>
                <StepButton onClick={() => this.setState({ stepIndex: 0 })}>
                  Choose an available day for your appointment
                </StepButton>
                <StepContent>
                  <DatePicker
                      style={{
                        marginTop: 10,
                        marginLeft: 10
                      }}
                      value={data.appointmentDate}
                      hintText="Select a date"
                      mode={smallScreen ? 'portrait' : 'landscape'}
                      onChange={(n, date) => this.handleSetAppointmentDate(date)}
                      shouldDisableDate={day => this.checkDisableDate(day)}
                       />
                  </StepContent>
              </Step>
              <Step disabled={ !data.appointmentDate }>
                <StepButton onClick={() => this.setState({ stepIndex: 1 })}>
                  Choose an available time for your appointment
                </StepButton>
                <StepContent>
                  <SelectField
                    floatingLabelText="AM or PM"
                    value={data.appointmentMeridiem}
                    onChange={(evt, key, payload) => this.handleSetAppointmentMeridiem(payload)}
                    selectionRenderer={value => value ? 'PM' : 'AM'}>
                    <MenuItem value={0}>AM</MenuItem>
                    <MenuItem value={1}>PM</MenuItem>
                  </SelectField>
                  <RadioButtonGroup
                    style={{ marginTop: 15,
                             marginLeft: 15
                           }}
                    name="appointmentTimes"
                    defaultSelected={data.appointmentSlot}
                    onChange={(evt, val) => this.handleSetAppointmentSlot(val)}>
                    {this.renderAppointmentTimes()}
                  </RadioButtonGroup>
                </StepContent>
              </Step>
              <Step disabled={ !Number.isInteger(this.state.appointmentSlot) }>
                <StepButton onClick={() => this.setState({ stepIndex: 2 })}>
                  Share your contact information with us and we'll send you a reminder
                </StepButton>
                <StepContent>
                  <section>
                    <TextField
                      style={{ display: 'block' }}
                      name="first_name"
                      hintText="First Name"
                      floatingLabelText="First Name"
                      onChange={(evt, newValue) => this.setState({ firstName: newValue })}/>
                    <TextField
                      style={{ display: 'block' }}
                      name="last_name"
                      hintText="Last Name"
                      floatingLabelText="Last Name"
                      onChange={(evt, newValue) => this.setState({ lastName: newValue })}/>
                    <TextField
                      style={{ display: 'block' }}
                      name="email"
                      hintText="name@mail.com"
                      floatingLabelText="Email"
                      errorText={data.validEmail ? null : 'Enter a valid email address'}
                      onChange={(evt, newValue) => this.validateEmail(newValue)}/>
                    <TextField
                      style={{ display: 'block' }}
                      name="phone"
                      hintText="(888) 888-8888"
                      floatingLabelText="Phone"
                      errorText={data.validPhone ? null: 'Enter a valid phone number'}
                      onChange={(evt, newValue) => this.validatePhone(newValue)} />
                    <RaisedButton
                      style={{ display: 'block' }}
                      label={contactFormFilled ? 'Schedule' : 'Fill out your information to schedule'}
                      labelPosition="before"
                      primary={true}
                      fullWidth={true}
                      onClick={() => this.setState({ confirmationModalOpen: !this.state.confirmationModalOpen })}
                      disabled={!contactFormFilled || data.processed }
                      style={{ marginTop: 20, maxWidth: 100}} />
                  </section>
                </StepContent>
              </Step>
            </Stepper>
          </Card>
          <Dialog
            modal={true}
            open={confirmationModalOpen}
            actions={modalActions}
            title="Confirm your appointment">
            {this.renderAppointmentConfirmation()}
          </Dialog>
          <SnackBar
            open={confirmationSnackbarOpen || loading}
            message={loading ? 'Loading... ' : data.confirmationSnackbarMessage || ''}
            autoHideDuration={10000}
            onRequestClose={() => this.setState({ confirmationSnackbarOpen: false })} />
        </section>
      </div>
    )
  }
}
```

## Part 2: Building the Backend

### 1. Installations and Directory Structure

Our backend will be simple. All it needs to do is act as an intermediary between our frontend and Cosmic and handle interfacing with Twilio.

First, we'll get our directory structure in place.

```
AppointmentScheduler
|
|--public
|--app.js
|--.gitignore
|--package.json
```

```public``` will be where we serve our built frontend from and ```.gitignore``` will hide ```node_modules```.

```
# .gitignore

node_modules
```

We'll use the following packages:

- ```axios``` for pushing ```Appointment``` objects to Cosmic
- ```body-parser```, ```cors```, ```http```, ```morgan```, ```path```, and ```express``` for server-ware
- ```cosmicjs``` - the official client, for fetching objects from Cosmic
- ```twilio``` - the official client, for sending confirmation texts
- ```moment``` for parsing times

Run ```yarn init```, then edit ```package.json``` with a start script so we can deploy on Cosmic.

```json
{
    // etc...
  	"scripts": {
        "start": "node app.js"
    }
}
```

Then, before we start working: 

```yarn add axios body-parser cors cosmicjs express express-session http moment morgan path twilio```

### 2. Outline the Backend's Structure

Our Express app will be fairly basic as far as configuration and middleware goes. For ```Appointment``` submissions we'll handle post requests at ```/api/appointments```. We'll serve our site configs and appointments from ```/api/config``` and ```/api/appointments``` respectively. Finally, since our Frontend is an SPA, we'll serve ```index.html``` from ```/``` and redirect all other requests there. 

Before getting into much logic, our server will start off looking like this:

```js
const express = require('express')
const path = require('path')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const cors = require('cors')
const config = require('./config')
const http = require('http')
const Cosmic = require('cosmicjs')
const twilio = require('twilio')
const moment = require('moment')
const axios = require('axios')

const config = {
  bucket: {
    slug: process.env.COSMIC_BUCKET,
    read_key: process.env.COSMIC_READ_KEY,
    write_key: process.env.COSMIC_WRITE_KEY
  },
  twilio: {
    auth: process.env.TWILIO_AUTH,
    sid: process.env.TWILIO_SID,
    number: process.env.TWILIO_NUMBER
  }
}

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

app.post('/api/appointments', (req, res) => {
    //handle posting new appointments to Cosmic
  	//and sending a confirmation text with Twilio
})

app.get('/api/config', (req, res) => {
    //fetch configs from Cosmic, expose to frontend
})

app.get('/api/appointments', (req, res) => {
    //fetch appointments from Cosmic, expose to frontend without personal data
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
```

Note: we'll provide all ```process.env``` variables at deployment with Cosmic. Cosmic-specific variables are supplied automatically.

### 3. Handle Post Requests

Two things need to happen here. We'll use the official Twilio client to send a text to the user, and we'll use ```axios``` to make a POST request to the CosmicJS API. Before doing both, we'll strip the user-inputted phone number of any non-digits and compute the time from the selected slot. We have:

```js
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
  .then(response => res.json({ data: 'success' })).catch(err => res.json({ data: 'error '}))
})
```

### 4. Expose Site Configs

We'll simply use ```cosmicjs``` to get the ```site-config``` object we need for the frontend to display links in the navigation.

```js
app.get('/api/config', (req,res) => {
  Cosmic.getObject(config, { slug: 'site-config' }, (err, response) => {
    const data = response.object.metadata
    err ? res.status(500).json({ data: 'error' }) : res.json({ data })
  })
})
```

### 5. Expose Appointments

Where it's definitely redundant to expose the site configurations through our backends API, its definitely important that we're doing it with the ```Appointment``` objects. First, we can conveniently reorganize the data to expose only what we need, but second, and infinitely more important, we don't publicly expose our users' personal information. We'll use ```cosmicjs``` to fetch all ```Appointment``` objects, but only expose an array of objects with the form ```{ date, slot }```.

```js
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
```

### 6. The Finished Product

Within minutes, entirely thanks to the simplicity of Express, CosmicJs's official client, and Twilio's official client, we have a backend that does everything we wanted it to do and nothing more. Pure zen.

```js
const express = require('express')
const path = require('path')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const cors = require('cors')
const config = require('./config')
const http = require('http')
const Cosmic = require('cosmicjs')
const twilio = require('twilio')
const moment = require('moment')
const axios = require('axios')

const config = {
  bucket: {
    slug: process.env.COSMIC_BUCKET,
    read_key: process.env.COSMIC_READ_KEY,
    write_key: process.env.COSMIC_WRITE_KEY
  },
  twilio: {
    auth: process.env.TWILIO_AUTH,
    sid: process.env.TWILIO_SID,
    number: process.env.TWILIO_NUMBER
  }
}

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
  .then(response => res.json({ data: 'success' })).catch(err => res.json({ data: 'error '}))
})

app.get('/api/config', (req,res) => {
  Cosmic.getObject(config, { slug: 'site-config' }, (err, response) => {
    const data = response.object.metadata
    err ? res.status(500).json({ data: 'error' }) : res.json({ data })
  })
})

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
```

## Part 3: Build and Deploy

Before we build an extension to manage our Appointments, we'll bundle the frontend and deploy the app to Cosmic so we can have even have some appointments to manage. 

In the frontend directory, ```appointment-scheduler```, run ```webpack``` to build out into ```dist```. Then move the contents of ```dist``` to the backend's public folder - ```AppointmentScheduler/public```. The ```index.html``` that Webpack builds will then be the ```index.html``` we serve from `/`.

From ```AppointmentScheduler```, commit the app to a new Github repo. Then, create a trial Twilio account and within the CosmicJS dashboard, add the following ```env``` variables from the deploy menu.

- ```TWILIO_AUTH``` - your Twilio auth key
- `TWILIO_SID` - your Twilio sid
- `TWILIO_NUMBER` - the phone number you have associated with your Twilio trial.

Now go ahead and deploy and add a few sample appointments that we can use to test our extension.

## Part 4. Build the Extension

CosmicJS let's you upload SPA's that you can use to access and manipulate your bucket's data right within the CosmicJS dashboard. These are called Extensions and we'll be building one to be able to view a table of all scheduled appointments, as well as providing us with an easy way to delete them.

Just as with the frontend, we'll be using React with Material UI and the steps here will be similar to Part 1.

### 1. Boilerplate setup

1. First, make our ```appointment-scheduler-extension``` directory, run ```yarn init```, and create the following project structure.

```
appointment-scheduler-extension
|
|--dist
|--src
|. |--Components
|. |. |--App.js
|. |--index.html
|. |--index.js
|--.babelrc
|--.gitignore
|--package.json
|--webpack.config.js
```

2. Use the same exact ```index.html``` template we used for the frontend.

```html
<!-- ./src/index.html -->

<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">
    <title>Appointment Scheduler</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

3. We'll be using almost all of the same packages as the frontend. Refer to Part 1 for installations, including adding ```lodash``` and ```query-string```. We'll use ```lodash``` for filtering data and ```query-string``` as a convenient way to get our Cosmic keys, which Cosmic supplies as url parameters. 

4. Likewise, ```webpack.config.js```, ```.gitignore```, and ```.babelrc``` will all be entirely the same as in Part 1.

5. ```index.js``` won't change either besides a new scheme for config variables:

   ```jsx
   import React from 'react'
   import ReactDom from 'react-dom'
   import App from './Components/App'
   import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
   import QueryString from 'query-string'
   import 'normalize.css'

   window.React = React

   const url = QueryString.parse(location.search)

   const config = { bucket: {
       slug: url.bucket_slug,
       write_key: url.write_key,
       read_key: url.read_key
     }
   }


   ReactDom.render(
     <MuiThemeProvider>
       <App config={config}/>
     </MuiThemeProvider>,
     document.getElementById('root')
   )
   ```

### 3. Work Out a Skeleton

From here, our extesion and frontend start to diverge. 

At it's barest, our extension will look like this:

```jsx
import { Component } from 'react'
import injectTapEventPlugin from 'react-tap-event-plugin'

injectTapEventPlugin()

export default class App extends Component {
    constructor(props) {
        super(props)
      	// set initial state
      	// bind component methods
    }
  
  	// component methods, lifecycle methods
  
  	render() {
        return (
        	//Material UI components 
        )
    }
}
```

Thinking about what we need for an initial state:

- We're getting our Cosmic config variables from url parametes in ```index.js``` and we're passing them to ```App``` as props, so we'll need to move those to it's state.
- We'll be using a ```SnackBar``` like we did in the frontend so we need to keep track of its state and message. We'll also be using a ```DatePicker``` and need a similar strategy.
- We'll have a toolbar with a dropdown that lets the user select between listing all appointments for filtering them by day. We'll track which is being done by assigning ```1``` to a state variable when the first is selected, ```0``` for the latter.
- We're loading our appointments data from Cosmic so it will be useful to cache them. We'll also need to do this separately for filtering appointments by date.
- We can select rows in the table of appointments and need to track which are selected. It will also be useful to track the state of *all* rows being selected.

Thus, for an initial state, we have:

```js
this.state = {
  config: props.config,
  snackbarDisabled: false,
  snackbarMessage: 'Loading...',
  toolbarDropdownValue: 1,
  appointments: {},
  filteredAppointments: {},
  datePickerDisabled: true,
  selectedRows: [],
  deleteButtonDisabled: true,
  allRowsSelected: false
}
```

#### 4. Draft Out Functionality

Our Extension needs to have the following functions to get it working the way we need it to:

- Fetch data from CosmicJS in ```componentWillMount()``` and handle it in a seperate ```handleFetchMethod``` (and it's companion ```handleFetchError()```)
- Change the state when the filter option is changed with ```handleToobarDropdownChange()```
- Override default Material UI ```Table``` selections with ```handleRowSelection()```
- Handle deleting `Appointment` objects with `handleDelete()`
- Feed disabled dates to the ```DatePicker``` with `checkDisableDate()`
- Filter appointments with ```filterAppointments()```
- Render appointments as ```TableRow```s with ```setTableChildren()```

Including those in our extension's skeleton, we now have:

```jsx
import { Component } from 'react'
import injectTapEventPlugin from 'react-tap-event-plugin'

injectTapEventPlugin()

export default class App extends Component {
    constructor(props) {
        super(props)
      	this.state = {
          config: props.config,
          snackbarDisabled: false,
          snackbarMessage: 'Loading...',
          toolbarDropdownValue: 1,
          appointments: {},
          filteredAppointments: {},
          datePickerDisabled: true,
          selectedRows: [],
          deleteButtonDisabled: true,
          allRowsSelected: false
        }
    }
  
  	handleFetchError(err) {
        //handle errors fetching data from CosmicJS
    }
  
  	handleFetch(response) {
        //process data fetched from CosmicJS
    }
  
  	handleToolbarDropdownChange(val) {
        // set the dropdown value and clear filteredAppointments() if
      	// "List All" is selected. (State 1). 
    }
  
  	handleRowSelection(rowsToSelect) {
        // Table returns 'all' if the select-all button was used, an array of selected
      	// row numbers, otherwise. We need to make sense of this.
    }
  
  	handleDelete(selectedRows) {
        //send a post request to CosmicJS's api to get rid of unwanted appointments
    }
  
  	checkDisableDate(date) {
        //feed the DatePicker days based on availability determined by appointments
      	//retrieved from Cosmic
    }
  
  	filterAppointments(date) {
        //Only show appointments occuring on date
    }
  
 	setTableChildren(selectedRows = this.state.selectedRows, appointments = this.state.appointments) {
        //render a TableRow for each appointment loaded
    }
  
  	componentWillMount() {
        //fetch data immediately
    }
  
  	render() {
        return (
        	//Material UI components 
        )
    }
}
```

### 5. Build Out the View

Like the frontend, we'll use all Material UI components to display our data. 

```jsx
render() {
  const { snackbarDisabled, appointments, datePickerDisabled, deleteButtonDisabled, ...data } = this.state
  return (
    <div style={{ fontFamily: 'Roboto' }}>
      <AppBar
        showMenuIconButton={false}
        title="Appointment Manager"/>
      <SnackBar
        message={data.snackbarMessage}
        open={!snackbarDisabled} />
      <Toolbar>
        <ToolbarGroup firstChild={true}>
          <DropDownMenu
            value={data.toolbarDropdownValue}
            onChange={(evt, key, val) => this.handleToolbarDropdownChange(val)}>
            <MenuItem value={0} primaryText="Filter Appointments By Date" />
            <MenuItem value={1} primaryText="List All Appointments" />
          </DropDownMenu>
          <DatePicker
            hintText="Select a date"
            autoOk={true}
            disabled={datePickerDisabled}
            name="date-select"
            onChange={(n, date) => this.filterAppointments(date)}
            shouldDisableDate={(day) => this.checkDisableDate(day)} />
        </ToolbarGroup>
        <ToolbarGroup lastChild={true}>
          <RaisedButton
            primary={true}
            onClick={() => this.handleDelete(data.selectedRows)}
            disabled={deleteButtonDisabled}
            label={`Delete Selected ${data.selectedRows.length ? '(' + data.selectedRows.length + ')' : ''}`} />
        </ToolbarGroup>
      </Toolbar>
      <Table
        onRowSelection={rowsToSelect => this.handleRowSelection(rowsToSelect)}
        multiSelectable={true} >
        <TableHeader>
          <TableRow>
            <TableHeaderColumn>ID</TableHeaderColumn>
            <TableHeaderColumn>Name</TableHeaderColumn>
            <TableHeaderColumn>Email</TableHeaderColumn>
            <TableHeaderColumn>Phone</TableHeaderColumn>
            <TableHeaderColumn>Date</TableHeaderColumn>
            <TableHeaderColumn>Time</TableHeaderColumn>
          </TableRow>
        </TableHeader>
        <TableBody
          children={data.tableChildren}
          allRowsSelected={data.allRowsSelected}>
        </TableBody>
      </Table>
    </div>
  )
}
```

### 6. Fetch Appointment Data

Unllike with the frontend, we don't have to worry about exposing sensitive data to the public, so we can easily use ```cosmicjs``` to handle the fetch. We'll do this in ```componentWillMount()```.

```js
componentWillMount() {
  Cosmic.getObjectType(this.state.config, { type_slug: 'appointments' }, (err, response) => err ? this.handleFetchError(err) : this.handleFetch(response)
  )
}
```

We'll handle errors with ```handleFetchError()```, which will show the user that an error occured in the ```SnackBar```.

```js
handleFetchError(err) {
  console.log(err)
  this.setState({ snackbarMessage: 'Error loading data' })
}
```

If data is successfully returned, we'll process it with ```handleFetch()```.

```js
handleFetch(response) {
  const appointments = response.objects.all ? response.objects.all.reduce((currentAppointments, appointment) => {
    const date = appointment.metadata.date
    if (!currentAppointments[date]) currentAppointments[date] = []
    const appointmentData = {
      slot: appointment.metadata.slot,
      name: appointment.title,
      email: appointment.metadata.email,
      phone: appointment.metadata.phone,
      slug: appointment.slug
    }
    currentAppointments[date].push(appointmentData)
    currentAppointments[date].sort((a,b) => a.slot - b.slot)
    return currentAppointments
  }, {}) : {}

  this.setState({ appointments, snackbarDisabled: true, tableChildren: this.setTableChildren([], appointments) })
}
```

From the array of `Appointment` objects our bucket sends, we create a schedule of all loaded appointments, `appointments`. We then save that to the state and pass it to `setTableChildren()` to use in rendering the ```Table```.

### 7. Handle UI Changes

We need a few simple methods to handle the filter dropdown in the toolbar, selecting rows, filtering appointments, feeding a check for disabling dates to the ```DatePicker```. Starting with handling the dropdown filter, `0` maps to filtering the appointments by date, `1` maps to listing all. For listing all, we reset `state.filteredAppointments`. 

```js
handleToolbarDropdownChange(val) {
  //0: filter by date, 1: list all
  val ? this.setState({ filteredAppointments: {}, datePickerDisabled: true, toolbarDropdownValue: 1 }) : this.setState({ toolbarDropdownValue: 0, datePickerDisabled: false })
}
```

For handling row selection, we save the selected rows to the state, set the table children based on the rows selected, and enable the delete button if at least one row is selected.

```js
handleRowSelection(rowsToSelect) {
  const allRows = [...Array(this.state.tableChildren.length).keys()]
  const allRowsSelected = rowsToSelect === 'all'
  const selectedRows = Array.isArray(rowsToSelect) ? rowsToSelect : allRowsSelected ? allRows : []
  const appointments = _.isEmpty(this.state.filteredAppointments) ? this.state.appointments : this.state.filteredAppointments
  const deleteButtonDisabled = selectedRows.length == 0
  const tableChildren = allRowsSelected ? this.setTableChildren([], appointments) : this.setTableChildren(selectedRows, appointments)
  this.setState({ selectedRows, deleteButtonDisabled, tableChildren })
}
```

For disabling dates, we only make them active if `state.appointments.date`, where `date = 'YYYY-DD-MM'`, exists.

```js
checkDisableDate(day) {
  return !this.state.appointments[moment(day).format('YYYY-DD-MM')]
}
```

### 8. Filtering Appointments and Rendering the Table

When the user changes the filter dropdown to `Filter By Date` they then pick a date from the date picker. Upon choosing a date, the date picker fires ```filterAppointments()``` to set ```state.filteredAppoitments``` to the sub-schedule ```state.appointments[selectedDate]``` and pass that sub-schedule ```setTableChildren()```. 

```js
filterAppointments(date) {
  const dateString = moment(date).format('YYYY-DD-MM')
  const filteredAppointments = {}
  filteredAppointments[dateString] = this.state.appointments[dateString]
  this.setState({ filteredAppointments, tableChildren: this.setTableChildren([], filteredAppointments) })
}
```

When `filterAppointments()` (or any other method) calls ```setTableChildren()``` we can optionally pass an array of selected rows and an ```appointments``` object or let it default to `state.selectedRows` and `state.appointments`. If the appointments are filtered, we sort them by time before rendering.

```jsx
setTableChildren(selectedRows = this.state.selectedRows, appointments = this.state.appointments) {
  const renderAppointment = (date, appointment, index) => {
    const { name, email, phone, slot } = appointment
    const rowSelected = selectedRows.includes(index)
    return <TableRow key={index} selected={rowSelected}>
      <TableRowColumn>{index}</TableRowColumn>
      <TableRowColumn>{name}</TableRowColumn>
      <TableRowColumn>{email}</TableRowColumn>
      <TableRowColumn>{phone}</TableRowColumn>
      <TableRowColumn>{moment(date, 'YYYY-DD-MM').format('M[/]D[/]YYYY')}</TableRowColumn>
      <TableRowColumn>{moment().hour(9).minute(0).add(slot, 'hours').format('h:mm a')}</TableRowColumn>
    </TableRow>
  }
  const appointmentsAreFiltered = !_.isEmpty(this.state.filteredAppointments)
  const schedule = appointmentsAreFiltered ? this.state.filteredAppointments : appointments
  const els = []
  let counter = 0
  appointmentsAreFiltered ?
    Object.keys(schedule).forEach(date => {
    schedule[date].forEach((appointment, index) => els.push(renderAppointment(date, appointment, index)))
  }) :
  Object.keys(schedule).sort((a,b) => moment(a, 'YYYY-DD-MM').isBefore(moment(b, 'YYYY-MM-DD')))
    .forEach((date, index) => {
    schedule[date].forEach(appointment => {
      els.push(renderAppointment(date, appointment, counter))
      counter++
    })
  })
  return els
}
```

### 9. Deleting Appointments

The last thing we need to handle is letting the user delete appointments, leveraging ```cosmicjs``` for deleting objects found using ```lodash``` from ```state.appointments``` according to ```selectedRows```.

```js
handleDelete(selectedRows) {
  const { config } = this.state
  return selectedRows.map(row => {
    const { tableChildren, appointments } = this.state
    const date = moment(tableChildren[row].props.children[4].props.children, 'M-D-YYYY').format('YYYY-DD-MM')
    const slot = moment(tableChildren[row].props.children[5].props.children, 'h:mm a').diff(moment().hours(9).minutes(0).seconds(0), 'hours') + 1
    return _.find(appointments[date], appointment =>
                  appointment.slot === slot
                 )
  }).map(appointment => appointment.slug).forEach(slug =>
                                                  Cosmic.deleteObject(config, { slug, write_key: config.bucket.write_key }, (err, response) => {
    if (err) {
      console.log(err)
      this.setState({ snackbarDisabled: false, snackbarMessage: 'Failed to delete appointments' })
    } else {
      this.setState({ snackbarMessage: 'Loading...', snackbarDisabled: false })
      Cosmic.getObjectType(this.state.config, { type_slug: 'appointments' }, (err, response) =>
                           err ? this.handleFetchError(err) : this.handleFetch(response)
                          )}
  }
                                                                     )
                                                 )
  this.setState({ selectedRows: [], deleteButtonDisabled: true})
}
```

### 10. Putting It All Together

At this point, including all necessary imports, our completed extension looks like this:

```jsx
// ./src/Components/App.js

import { Component } from 'react'
import injectTapEventPlugin from 'react-tap-event-plugin'
import axios from 'axios'
import async from 'async'
import _ from 'lodash'
import moment from 'moment'
import Cosmic from 'cosmicjs'
import AppBar from 'material-ui/AppBar'
import FlatButton from 'material-ui/FlatButton'
import RaisedButton from 'material-ui/RaisedButton'
import SnackBar from 'material-ui/SnackBar'
import DropDownMenu from 'material-ui/DropDownMenu'
import MenuItem from 'material-ui/MenuItem'
import DatePicker from 'material-ui/DatePicker'
import {
  Toolbar,
  ToolbarGroup
} from 'material-ui/Toolbar'
import {
  Table,
  TableBody,
  TableHeader,
  TableHeaderColumn,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table';

injectTapEventPlugin()

export default class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      config: props.config,
      snackbarDisabled: false,
      snackbarMessage: 'Loading...',
      toolbarDropdownValue: 1,
      appointments: {},
      filteredAppointments: {},
      datePickerDisabled: true,
      selectedRows: [],
      deleteButtonDisabled: true,
      allRowsSelected: false
    }
    this.handleFetchError = this.handleFetchError.bind(this)
    this.handleFetch = this.handleFetch.bind(this)
    this.handleRowSelection = this.handleRowSelection.bind(this)
    this.handleToolbarDropdownChange = this.handleToolbarDropdownChange.bind(this)
    this.handleDelete = this.handleDelete.bind(this)
    this.checkDisableDate = this.checkDisableDate.bind(this)
    this.setTableChildren = this.setTableChildren.bind(this)
  }

  handleFetchError(err) {
    console.log(err)
    this.setState({ snackbarMessage: 'Error loading data' })
  }

  handleFetch(response) {
    const appointments = response.objects.all ? response.objects.all.reduce((currentAppointments, appointment) => {
      const date = appointment.metadata.date
      if (!currentAppointments[date]) currentAppointments[date] = []
      const appointmentData = {
        slot: appointment.metadata.slot,
        name: appointment.title,
        email: appointment.metadata.email,
        phone: appointment.metadata.phone,
        slug: appointment.slug
      }
      currentAppointments[date].push(appointmentData)
      currentAppointments[date].sort((a,b) => a.slot - b.slot)
      return currentAppointments
    }, {}) : {}

    this.setState({ appointments, snackbarDisabled: true, tableChildren: this.setTableChildren([], appointments) })
  }

  handleToolbarDropdownChange(val) {
    //0: filter by date, 1: list all
    val ? this.setState({ filteredAppointments: {}, datePickerDisabled: true, toolbarDropdownValue: 1 }) : this.setState({ toolbarDropdownValue: 0, datePickerDisabled: false })
  }

  handleRowSelection(rowsToSelect) {
    const allRows = [...Array(this.state.tableChildren.length).keys()]
    const allRowsSelected = rowsToSelect === 'all'
    const selectedRows = Array.isArray(rowsToSelect) ? rowsToSelect : allRowsSelected ? allRows : []
    const appointments = _.isEmpty(this.state.filteredAppointments) ? this.state.appointments : this.state.filteredAppointments
    const deleteButtonDisabled = selectedRows.length == 0
    const tableChildren = allRowsSelected ? this.setTableChildren([], appointments) : this.setTableChildren(selectedRows, appointments)
    this.setState({ selectedRows, deleteButtonDisabled, tableChildren })
  }

  handleDelete(selectedRows) {
    const { config } = this.state
    return selectedRows.map(row => {
      const { tableChildren, appointments } = this.state
      const date = moment(tableChildren[row].props.children[4].props.children, 'M-D-YYYY').format('YYYY-DD-MM')
      const slot = moment(tableChildren[row].props.children[5].props.children, 'h:mm a').diff(moment().hours(9).minutes(0).seconds(0), 'hours') + 1
      return _.find(appointments[date], appointment =>
        appointment.slot === slot
      )
    }).map(appointment => appointment.slug).forEach(slug =>
      Cosmic.deleteObject(config, { slug, write_key: config.bucket.write_key }, (err, response) => {
        if (err) {
          console.log(err)
          this.setState({ snackbarDisabled: false, snackbarMessage: 'Failed to delete appointments' })
        } else {
          this.setState({ snackbarMessage: 'Loading...', snackbarDisabled: false })
          Cosmic.getObjectType(this.state.config, { type_slug: 'appointments' }, (err, response) =>
            err ? this.handleFetchError(err) : this.handleFetch(response)
          )}
        }
      )
    )
    this.setState({ selectedRows: [], deleteButtonDisabled: true})
  }

  checkDisableDate(day) {
    return !this.state.appointments[moment(day).format('YYYY-DD-MM')]
  }

  filterAppointments(date) {
    const dateString = moment(date).format('YYYY-DD-MM')
    const filteredAppointments = {}
    filteredAppointments[dateString] = this.state.appointments[dateString]
    this.setState({ filteredAppointments, tableChildren: this.setTableChildren([], filteredAppointments) })
  }

  setTableChildren(selectedRows = this.state.selectedRows, appointments = this.state.appointments) {
    const renderAppointment = (date, appointment, index) => {
      const { name, email, phone, slot } = appointment
      const rowSelected = selectedRows.includes(index)
      return <TableRow key={index} selected={rowSelected}>
        <TableRowColumn>{index}</TableRowColumn>
        <TableRowColumn>{name}</TableRowColumn>
        <TableRowColumn>{email}</TableRowColumn>
        <TableRowColumn>{phone}</TableRowColumn>
        <TableRowColumn>{moment(date, 'YYYY-DD-MM').format('M[/]D[/]YYYY')}</TableRowColumn>
        <TableRowColumn>{moment().hour(9).minute(0).add(slot, 'hours').format('h:mm a')}</TableRowColumn>
      </TableRow>
    }
    const appointmentsAreFiltered = !_.isEmpty(this.state.filteredAppointments)
    const schedule = appointmentsAreFiltered ? this.state.filteredAppointments : appointments
    const els = []
    let counter = 0
    appointmentsAreFiltered ?
      Object.keys(schedule).forEach(date => {
        schedule[date].forEach((appointment, index) => els.push(renderAppointment(date, appointment, index)))
      }) :
      Object.keys(schedule).sort((a,b) => moment(a, 'YYYY-DD-MM').isBefore(moment(b, 'YYYY-MM-DD')))
      .forEach((date, index) => {
        schedule[date].forEach(appointment => {
          els.push(renderAppointment(date, appointment, counter))
          counter++
        })
      })
    return els
  }

  componentWillMount() {
    Cosmic.getObjectType(this.state.config, { type_slug: 'appointments' }, (err, response) =>
      err ? this.handleFetchError(err) : this.handleFetch(response)
    )
  }

  render() {
    const { snackbarDisabled, appointments, datePickerDisabled, deleteButtonDisabled, ...data } = this.state
    return (
      <div style={{ fontFamily: 'Roboto' }}>
        <AppBar
          showMenuIconButton={false}
          title="Appointment Manager"/>
        <SnackBar
          message={data.snackbarMessage}
          open={!snackbarDisabled} />
        <Toolbar>
          <ToolbarGroup firstChild={true}>
            <DropDownMenu
              value={data.toolbarDropdownValue}
              onChange={(evt, key, val) => this.handleToolbarDropdownChange(val)}>
              <MenuItem value={0} primaryText="Filter Appointments By Date" />
              <MenuItem value={1} primaryText="List All Appointments" />
            </DropDownMenu>
            <DatePicker
              hintText="Select a date"
              autoOk={true}
              disabled={datePickerDisabled}
              name="date-select"
              onChange={(n, date) => this.filterAppointments(date)}
              shouldDisableDate={(day) => this.checkDisableDate(day)} />
          </ToolbarGroup>
          <ToolbarGroup lastChild={true}>
            <RaisedButton
              primary={true}
              onClick={() => this.handleDelete(data.selectedRows)}
              disabled={deleteButtonDisabled}
              label={`Delete Selected ${data.selectedRows.length ? '(' + data.selectedRows.length + ')' : ''}`} />
          </ToolbarGroup>
        </Toolbar>
        <Table
          onRowSelection={rowsToSelect => this.handleRowSelection(rowsToSelect)}
          multiSelectable={true} >
          <TableHeader>
            <TableRow>
              <TableHeaderColumn>ID</TableHeaderColumn>
              <TableHeaderColumn>Name</TableHeaderColumn>
              <TableHeaderColumn>Email</TableHeaderColumn>
              <TableHeaderColumn>Phone</TableHeaderColumn>
              <TableHeaderColumn>Date</TableHeaderColumn>
              <TableHeaderColumn>Time</TableHeaderColumn>
            </TableRow>
          </TableHeader>
          <TableBody
            children={data.tableChildren}
            allRowsSelected={data.allRowsSelected}>
          </TableBody>
        </Table>
      </div>
    )
  }
}
```

## Part 5: Conclusion

Once you run ```webpack``` in ```appointment-scheduler-extension```, create `extension.json` in `dist` to make Cosmic recognize it:

```json
// appointment-scheduler-extension/dist/extension.json

{
  "title": "Appointment Manager",
  "font_awesome_class": "fa-calendar",
  "image_url": ""
}
```

Then, compress `dist`, upload it to Cosmic, and we're ready to start managing appointments.



Using CosmicJS, Twilio, Express, and React, we've built a modular, easy to extend appointment scheduler to both give others easy access to our time while saving more of it for ourselves. The speed at which we're able to get our app deployed and the simplicity of managing our data reinforces that it was an obvious choice to use CosmicJS both for CMS and deployment. Although our appointment scheduler will definitely save us time in the future, it's a sure thing that it can never compete with the time Cosmic will save us on future projects.

---

*Matt Cain builds smart web applications and writes about the tech used to build them. You can learn more about him on his [portfolio](http://mattcain.io)*.