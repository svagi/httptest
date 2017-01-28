import React, { PropTypes } from 'react'
import { history } from './router'
import Analysis from '../components/Analysis'
import { parseUrl } from '../url'
import { connect } from 'react-redux'
import { actions } from '../store'

const STATUS = {
  'connecting': 'Connecting...',
  'queuing': 'Waiting in the queue...',
  'analyzing': 'Analyzing...',
  'complete': 'Analysis complete.',
  'error': 'Sorry, something went wrong.'
}

class Analyze extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      url: parseUrl(props.location.query.url),
      reload: false
    }
    this.handleRefresh = this.handleRefresh.bind(this)
    this.handleReTest = this.handleReTest.bind(this)
  }
  componentDidMount () {
    require('./Analyze.css')
    const props = this.props
    const { url } = this.state
    if (!url) {
      return history.push('/')
    }
    const analysis = props.analyses[url.formatted]
    if (!analysis) {
      props.getAnalysis(url)
    }
  }
  handleRefresh () {
    this.setState({ reloading: true })
    window.location.reload()
  }
  handleReTest () {
    this.setState({ reloading: true })
    this.props.createAnalysis(this.state.url).then(() => {
      this.setState({ reloading: false })
    })
  }
  render (props = this.props, state = this.state) {
    const url = state.url.formatted
    const analysis = props.analyses[url] || {}
    const status = analysis.message || STATUS[analysis.status] || STATUS.connecting
    return (
      <div id='analyze'>
        <header>
          <h2>Performance analysis of</h2>
          <h3>
            <a href={url} target='_blank' rel='nofollow noopener'>{url}</a>
          </h3>
          <div id='status'>
            <span>Status: </span>
            <span>{status}</span>
          </div>
          {analysis.status === 'error' && (
            <button className='reload' onClick={this.handleRefresh}>
              {state.reloading ? 'Re-freshing...' : 'Re-fresh'}
            </button>
          )}
          {analysis.status === 'complete' && (
            <button className='reload' onClick={this.handleReTest}>
              {state.reloading ? 'Re-testing...' : 'Re-test' }
            </button>
          )}
        </header>
        {analysis.status !== 'error' && (
          analysis.status === 'complete'
            ? <Analysis {...analysis} />
            : <div id='spinner'><div className='spinner' /></div>
        )}
      </div>
    )
  }
}

Analyze.propTypes = {
  location: PropTypes.object.isRequired
}

export default connect(state => state, actions)(Analyze)
