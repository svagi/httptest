import React from 'react'
import { Link } from 'react-router'
import { connect } from 'react-redux'
import { actions } from '../store'
import { history } from './router'
import { parseUrl } from '../url'
import RankingBox from '../components/RankingBox'
import UrlForm from '../components/UrlForm'

class Index extends React.Component {
  componentDidMount () {
    require('./Index.css')
  }
  render ({ latest, best, worst, totals } = this.props) {
    const makePath = url =>
      `/analyze?url=${parseUrl(url).encoded}`
    const mapUrl = url =>
      <Link
        to={makePath(url)}
        title={`Performance analysis of ${url}`}
        children={url} />
    return (
      <div id='index'>
        <h2>Analyze your site's performance now</h2>
        <UrlForm onSubmit={url => history.push(makePath(url))} />
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
            style={totals && { score: { background: 'none', color: '#333' } }}
            disableLinks />
        </section>
      </div>
    )
  }
}

export default connect(state => state.rankings, actions)(Index)
