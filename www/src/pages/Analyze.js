import React, { PropTypes } from 'react'
import { history } from './router'
import Analysis from '../components/Analysis'

const STATUS = {
  LOADING: { msg: 'Loading...' },
  CONNECTING: { msg: 'Connecting...' },
  GENERATING: { msg: 'Generating...' },
  DONE: { msg: 'Analysis complete.' },
  ERROR: { msg: 'Sorry, something went wrong.' }
}

export default class Analyze extends React.Component {

  constructor (props) {
    super(props)
    this.state = {
      status: STATUS.LOADING,
      isFetching: true,
      analysis: null
    }
  }

  componentDidMount () {
    require('./Analyze.css')
    const { url } = this.props.location.query
    if (!url) return history.push('/')
    this.source = new window.EventSource(`/pubsub?url=${url}`)
    this.source.addEventListener('open', (e) => {
      this.setState({
        isFetching: true,
        status: STATUS.CONNECTING
      })
    })
    this.source.addEventListener('analysis:start', (e) => {
      this.setState({ status: STATUS.GENERATING })
    })
    this.source.addEventListener('analysis:done', (e) => {
      this.setState({
        status: STATUS.DONE,
        data: JSON.parse(e.data)
      })
      this.source.close()
    })
    this.source.addEventListener('analysis:error', (e) => {
      this.setState({ status: STATUS.ERROR })
      this.source.close()
    })
    this.source.addEventListener('error', (e) => {
      this.setState({ status: STATUS.ERROR })
      this.source.close()
    })
  }

  contentSwitch (status, props) {
    switch (status) {
      case STATUS.DONE:
        return <Analysis {...props}/>
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
      <h4>Status:&nbsp;{status.msg}</h4>
      {this.contentSwitch(status, data)}
    </div>
    )
  }
}

Analyze.propTypes = {
  location: PropTypes.object.isRequired
}
