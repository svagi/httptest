import React, { PropTypes } from 'react'
import { Circle } from 'rc-progress'
import Rule from './Rule'

function mapRules (rules, fn) {
  return Object.keys(rules).map((key, idx) => fn(rules[key], key, idx))
}

export default class Analysis extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      score: 0,
      colorHue: 1.0
    }
    this.tick = this.tick.bind(this)
  }
  componentDidMount () {
    window.requestAnimationFrame(this.tick)
  }
  shouldComponentUpdate (nextProps, nextState) {
    return this.state.score !== nextState.score
  }
  tick () {
    const { score } = this.state
    if (score < this.props.totalScore) {
      window.requestAnimationFrame(this.tick)
      this.setState({
        score: score + 1,
        colorHue: 120 * (score / 100)
      })
    }
  }
  render ({ page, rules, totalScore } = this.props) {
    const { score, colorHue } = this.state
    const color = `hsl(${colorHue}, 50%, 50%)`
    return (
      <div id='analysis'>
        <div id='score'>
          <Circle
            percent={score}
            strokeWidth='10'
            trailWidth='10'
            strokeColor={color} />
          <div id='score-val' style={{ color: color }}>
            <span>{score}</span>
            <span>/100</span>
          </div>
        </div>
        <header>
        Page overview
        </header>
        <section>
          <div className='rule'>
            <header>
              <div className='title'>Protocol</div>
              <div className='score'>{page.protocol}</div>
            </header>
          </div>
          <div className='rule'>
            <header>
              <div className='title'>Requests</div>
              <div className='score'>
                <span title='Total number of requests'>{page.totalRequests}</span>
              </div>
            </header>
          </div>
          <div className='rule'>
            <header>
              <div className='title'>HTTP/2 Requests</div>
              <div className='score'>
                <span title='Total number of HTTP/2 requests'>{page.http2Requests}</span>
              </div>
            </header>
          </div>
          <div className='rule'>
            <header>
              <div className='title'>DNS lookups</div>
              <div className='score'>{page.dnsLookups}</div>
            </header>
          </div>
          <div className='rule'>
            <header>
              <div className='title'>Time to first Byte (TTFB)</div>
              <div className='score'>
                {page.timeToFirstByte
                  ? <span>{(page.timeToFirstByte / 1000).toFixed(3)}s</span>
                  : '-'}
              </div>
            </header>
          </div>
          <div className='rule'>
            <header>
              <div className='title'>DOM load time</div>
              <div className='score'>
                {page.domLoadTime
                  ? <span>{(page.domLoadTime / 1000).toFixed(3)}s</span>
                  : '-'
                }
              </div>
            </header>
          </div>
          <div className='rule'>
            <header>
              <div className='title'>Load time</div>
              <div className='score'>
                {page.loadTime
                  ? <span>{(page.loadTime / 1000).toFixed(3)}s</span>
                  : '-'
                }
              </div>
            </header>
          </div>
          <div className='rule'>
            <header>
              <div className='title'>Total page size</div>
              <div className='score'>{page.totalBytes / 1000}kB</div>
            </header>
          </div>
        </section>
        <header>
        Recommendations
        </header>
        <section className='recommendation'>
          {mapRules(rules, (props, key) => <Rule {...props} key={key} />)}
        </section>
      </div>
    )
  }
}

Analysis.propTypes = {
  page: PropTypes.object.isRequired,
  rules: PropTypes.object.isRequired,
  totalScore: PropTypes.number.isRequired
}
