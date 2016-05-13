import React from 'react'
import Rule from './Rule'

const style = {
  analysis: {
    padding: '1em 0'
  },
  header: {
    marginTop: '.5em',
    fontSize: '1.1em'
  },
  box: {
    margin: '.5em 0',
    border: 'solid 5px #c9c9c9'
  },
  rule: {
    padding: '.5em',
    display: 'flex'
  },
  title: {
    width: '70%'
  },
  score: {
    width: '30%',
    textAlign: 'right'
  }
}

function mapRules (rules, fn) {
  return Object.keys(rules).map((key, idx) => fn(rules[key], key, idx))
}

export default class Analysis extends React.Component {
  constructor (props) {
    super(props)
  }
  render (props = this.props) {
    const { page, rules } = props.analysis
    console.log(props)
    return (
    <div style={style.analysis}>
      <header style={style.header}>
        Webpage statistics
      </header>
      <div style={style.box}>
        <div style={style.rule}>
          <span style={style.title}>Protocol</span>
          <span style={style.score}>{page.protocol}</span>
        </div>
        <div style={style.rule}>
          <span style={style.title}>Requests</span>
          <span style={style.score}>{page.totalRequests}</span>
        </div>
        <div style={style.rule}>
          <span style={style.title}>DNS lookups</span>
          <span style={style.score}>{page.dnsLookups}</span>
        </div>
        <div style={style.rule}>
          <span style={style.title}>Time to first Byte (TTFB)</span>
          <span style={style.score}>{page.timeToFirstByte ? <span>{page.timeToFirstByte / 1000} s</span> : '-'}</span>
        </div>
        <div style={style.rule}>
          <span style={style.title}>DOM load time</span>
          <span style={style.score}>{page.domLoadTime ? <span>{page.domLoadTime / 1000} s</span> : '-'}</span>
        </div>
        <div style={style.rule}>
          <span style={style.title}>Load time</span>
          <span style={style.score}>{page.loadTime ? <span>{page.loadTime / 1000} s</span> : '-'}</span>
        </div>
        <div style={style.rule}>
          <span style={style.title}>Total page size</span>
          <span style={style.score}>{page.totalBytes / 1000} kB</span>
        </div>
      </div>
      <header style={style.header}>
        Recommendation
      </header>
      <div style={style.box}>
        {mapRules(rules, (props, key) => <Rule {...props} key={key} />)}
      </div>
    </div>
    )
  }
}
