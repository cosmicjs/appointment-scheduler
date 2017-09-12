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
      allRowsSelected: false,
      selectedRowsPersist: []
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
    this.setState({ selectedRows, tableChildren })
    if (selectedRows.length !== 0) this.setState({ selectedRowsPersist: selectedRows })
    const delay = this.state.deleteButtonDisabled ? 0 : 1000
    setTimeout(() => this.setState({ deleteButtonDisabled }), delay)
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
    this.setState({ selectedRows: [], deleteButtonDisabled: true, lastSelectedRows: []})
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
              onClick={(evt) => this.handleDelete(data.selectedRowsPersist)}
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
