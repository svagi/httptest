import React, { PropTypes } from 'react'
import history from '../history'

export default class Analyze extends React.Component {

  constructor (props) {
    super(props)
    this.state = {
      status: 'Connecting...',
      isFetching: true,
      analysis: null
    }
  }

  componentDidMount () {
    const { url } = this.props.location.query
    if (!url) return history.push('/')
    this.source = new window.EventSource(`/sub?url=${url}`)
    this.source.addEventListener('open', (e) => {
      this.setState({
        isFetching: true,
        status: 'Preparing...'
      })
    })
    this.source.addEventListener('analysis:start', (e) => {
      this.setState({
        isFetching: true,
        status: 'Generating...'
      })
    })
    this.source.addEventListener('analysis:done', (e) => {
      this.setState({
        isFetching: false,
        status: 'Done',
        data: JSON.parse(e.data)
      })
      this.source.close()
    })
    this.source.addEventListener('error', (e) => {
      this.setState({
        isFetching: false,
        status: 'Failure'
      })
      this.source.close()
    })
  }

  renderAnalysis (props) {
    console.log(props)
    return (
    <div>
      <span>Requests:&nbsp;{props.har.log.entries.length}&nbsp;</span>
    </div>
    )
  }

  render () {
    const { url } = this.props.location.query
    const { status, isFetching, data } = this.state
    return (
    <div>
      <h2>Analysis</h2>
      <h3>{url}</h3>
      <div>
        <span>Status:&nbsp;{status}</span>
      </div>
      <div>
        {isFetching ? '' : this.renderAnalysis(data)}
      </div>
    </div>
    )
  }
}

Analyze.propTypes = {
  location: PropTypes.object.isRequired
}
