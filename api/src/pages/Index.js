import React from 'react'
import { Link } from 'react-router'
import { history } from './router'
import RankingBox from '../components/RankingBox'

export default class Index extends React.Component {
  constructor (props) {
    super(props)
    this.handleSubmit = this.handleSubmit.bind(this)
    this.state = {}
  }
  componentDidMount () {
    require('./Index.css')
    if (this.state.mounted) return
    const source = this.source = new window.EventSource('/rankings')
    source.addEventListener('latest', ({ data }) => {
      this.setState({ latest: JSON.parse(data) })
    })
    source.addEventListener('best', ({ data }) => {
      this.setState({ best: JSON.parse(data) })
    })
    source.addEventListener('worst', ({ data }) => {
      this.setState({ worst: JSON.parse(data) })
    })
    source.addEventListener('totals', ({ data }) => {
      const totals = JSON.parse(data)
      const grandTotal = Object.keys(totals)
        .reduce((sum, key) => sum + totals[key], 0)
      this.setState({ totals: totals, grandTotal: grandTotal })
    })
    source.addEventListener('error', (e) => {
      source.close()
    })
  }
  componentWillUnmount () {
    this.source.close()
    this.source = null
  }
  handleSubmit (e) {
    let url = this.refs.url.value
    if (!/^https?:\/\//i.test(url)) {
      url = 'http://' + url
    }
    e.preventDefault()
    history.push({
      pathname: '/analyze/',
      search: `?url=${url}`
    })
  }
  render () {
    const { latest, best, worst, totals } = this.state
    const mapUrl = (url) =>
      <Link to={`/analyze?url=${url}`} title={`Performance analysis of ${url}`}>
        {url}
      </Link>
    return (
      <div id='index'>
        <h2>Analyze your site's performance now</h2>
        <form action='/analyze' onSubmit={this.handleSubmit}>
          <input
            ref='url'
            type='text'
            name='url'
            placeholder='Enter URL to analyze...'
            required />
          <input type='submit' value='Analyze' />
        </form>
        <section id='rankings'>
          <RankingBox
            title='Recent analysis'
            rankings={latest}
            mapUrl={mapUrl}
            count={10} />
          <RankingBox
            title='Recent best'
            rankings={best}
            mapUrl={mapUrl}
            count={10} />
          <RankingBox
            title='Recent worst'
            rankings={worst}
            mapUrl={mapUrl}
            count={10} />
          <RankingBox
            title='Totals'
            rankings={totals}
            count={10}
            style={{ score: { background: 'none', color: '#333' } }}
            disableLinks />
        </section>
      </div>
    )
  }
}
