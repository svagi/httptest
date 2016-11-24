import React, { PropTypes } from 'react'
import { Circle } from 'rc-progress'
import Rule from './Rule'

export default class Analysis extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      score: 0,
      colorHue: 1.0
    }
    this.tick = this.tick.bind(this)
    this.rules = {
      general: this.mapRules(props.rules, 'general'),
      h2: this.mapRules(props.rules, 'h2')
    }
  }
  mapRules (rules, type) {
    return Object.keys(rules)
      .filter(rule => rules[rule].type === type)
      .map(rule => <Rule key={rule} {...rules[rule]} />)
  }
  componentDidMount () {
    this.raf = window.requestAnimationFrame(this.tick)
  }
  componentWillUnmount () {
    window.cancelAnimationFrame(this.raf)
  }
  shouldComponentUpdate (nextProps, nextState) {
    return this.state.score !== nextState.score
  }
  tick () {
    const { score } = this.state
    if (score < this.props.totalScore) {
      this.raf = window.requestAnimationFrame(this.tick)
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
        <section id='score'>
          <Circle
            percent={score}
            strokeWidth='10'
            trailWidth='10'
            strokeColor={color} />
          <div id='score-val' style={{ color: color }}>
            <div>TOTAL SCORE</div>
            <div>
              <span>{score}</span>
              <span>/100</span>
            </div>
          </div>
        </section>
        <section className='box overview'>
          <header>
          Page overview
          </header>
          <div className='content'>
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
          </div>
        </section>
        <section className='box recommendation'>
          <header>General best practices</header>
          <div className='content'>{this.rules.general}</div>
        </section>
        <section className='box recommendation'>
          <header>HTTP/2 best practices</header>
          <div className='content'>{this.rules.h2}</div>
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
