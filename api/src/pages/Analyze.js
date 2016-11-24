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
    const { url, purge } = this.props.location.query
    if (!url) return history.push('/')
    const encUrl = encodeURIComponent(url)
    const useCache = typeof purge === 'undefined'
    const endpoint = `/events?url=${encUrl}${useCache ? '' : '&purge'}`
    const source = this.source = new window.EventSource(endpoint)
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
  componentWillUnmount () {
    this.source.close()
    this.source = null
  }
  contentSwitch (status, props) {
    switch (status) {
      case STATUS.DONE:
        return <Analysis {...props} />
      default:
        return <div id='spinner'><div className='spinner' /></div>
    }
  }
  render (props = this.props) {
    const { url } = props.location.query
    const { status, data = {} } = this.state
    return (
      <div id='analyze'>
        <header>
          <h2>Performance analysis of</h2>
          <h3><a href={url} target='_blank' rel='nofollow'>{url}</a></h3>
          <div id='status'>
            <span>Status: </span>
            <span>{status}</span>
          </div>
        </header>
        {this.contentSwitch(status, data)}
      </div>
    )
  }
}

Analyze.propTypes = {
  location: PropTypes.object.isRequired
}
