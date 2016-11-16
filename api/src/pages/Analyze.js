import React, { PropTypes } from 'react'
import { history } from './router'
import Analysis from '../components/Analysis'

const STATUS = {
  LOADING: 'Loading...',
  CONNECTING: 'Connecting...',
  QUEUING: 'Waiting in queue...',
  GENERATING: 'Generating...',
  ANALYZING: 'Analyzing...',
  DONE: 'Analysis complete.',
  ERROR: 'Sorry, something went wrong.'
}

export default class Analyze extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      status: STATUS.LOADING
    }
  }
  componentDidMount () {
    require('./Analyze.css')
    const { url } = this.props.location.query
    if (!url) return history.push('/')
    const source = this.source = new window.EventSource(`/events?url=${url}`)
    source.addEventListener('open', (e) => {
      this.setState({
        status: STATUS.CONNECTING
      })
    })
    source.addEventListener('subscribe', (e) => {
      this.setState({ status: STATUS.QUEUING })
    })
    source.addEventListener('har-start', (e) => {
      this.setState({ status: STATUS.GENERATING })
    })
    source.addEventListener('analysis-start', (e) => {
      this.setState({ status: STATUS.ANALYZING })
    })
    source.addEventListener('analysis-done', (e) => {
      const data = JSON.parse(e.data)
      this.setState({
        status: STATUS.DONE,
        data: data
      })
      source.close()
    })
    source.addEventListener('error', (e) => {
      this.setState({ status: STATUS.ERROR })
      source.close()
    })
  }
  contentSwitch (status, props) {
    switch (status) {
      case STATUS.DONE:
        return <Analysis {...props} />
      default:
        return ''
    }
  }
  render (props = this.props) {
    const { url } = props.location.query
    const { status, data } = this.state
    return (
      <div id='analyze'>
        <h2>Performance analysis of</h2>
        <h3><a href={url} target='_blank'>{url}</a></h3>
        <h4>Status: {status}</h4>
        {this.contentSwitch(status, data)}
      </div>
    )
  }
}

Analyze.propTypes = {
  location: PropTypes.object.isRequired
}
