import React from 'react'
import ReactDom from 'react-dom'
import App from './Components/App'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import QueryString from 'query-string'
import 'normalize.css'

window.React = React

let url = QueryString.parse(location.search)

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
