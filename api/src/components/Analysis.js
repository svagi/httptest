import React from 'react'
import Rule from './Rule'

function mapRules (rules, fn) {
  return Object.keys(rules).map((key, idx) => fn(rules[key], key, idx))
}

export default class Analysis extends React.Component {
  constructor (props) {
    super(props)
  }
  render ({ page, rules } = this.props) {
    return (
      <div id='analysis'>
        <header>
        Page rules
        </header>
        <section>
          <div className='rule'>
            <header>
              <span className='left'>Protocol</span>
              <span className='right'>{page.protocol}</span>
            </header>
          </div>
          <div className='rule'>
            <header>
              <span className='left'>Requests</span>
              <span className='right'>{page.totalRequests}</span>
            </header>
          </div>
          <div className='rule'>
            <header>
              <span className='left'>DNS lookups</span>
              <span className='right'>{page.dnsLookups}</span>
            </header>
          </div>
          <div className='rule'>
            <header>
              <span className='left'>Time to first Byte (TTFB)</span>
              <span className='right'>{page.timeToFirstByte ? <span>{page.timeToFirstByte / 1000} s</span> : '-'}</span>
            </header>
          </div>
          <div className='rule'>
            <header>
              <span className='left'>DOM load time</span>
              <span className='right'>{page.domLoadTime ? <span>{page.domLoadTime / 1000} s</span> : '-'}</span>
            </header>
          </div>
          <div className='rule'>
            <header>
              <span className='left'>Load time</span>
              <span className='right'>{page.loadTime ? <span>{page.loadTime / 1000} s</span> : '-'}</span>
            </header>
          </div>
          <div className='rule'>
            <header>
              <span className='left'>Total page size</span>
              <span className='right'>{page.totalBytes / 1000} kB</span>
            </header>
          </div>
        </section>
        <header>
        Recommendation
        </header>
        <section>
          {mapRules(rules, (props, key) => <Rule {...props} key={key} />)}
        </section>
      </div>
    )
  }
}
