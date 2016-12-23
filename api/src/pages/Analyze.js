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
      url: parseUrl(props.location.query.url)
    }
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
  render (props = this.props) {
    const url = this.state.url.formatted
    const analysis = props.analyses[url] || {}
    const status = analysis.message || STATUS[analysis.status] || STATUS.connecting
    console.log(status)
    return (
      <div id='analyze'>
        <header>
          <h2>Performance analysis of</h2>
          <h3><a href={url} target='_blank' rel='nofollow noopener'>{url}</a></h3>
          <div id='status'>
            <span>Status: </span>
            <span>{status}</span>
          </div>
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
