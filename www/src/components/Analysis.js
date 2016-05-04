import React from 'react'

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

export default class Analysis extends React.Component {
  constructor (props) {
    super(props)
  }
  render (props = this.props) {
    const { stats, rules } = props.analysis
    console.log(props)
    return (
    <div style={style.analysis}>
      <header style={style.header}>
        Webpage statistics
      </header>
      <div style={style.box}>
        <div style={style.rule}>
          <span style={style.title}>Requests</span>
          <span style={style.score}>{stats.totalRequests}</span>
        </div>
        <div style={style.rule}>
          <span style={style.title}>DOM load time</span>
          <span style={style.score}>{stats.domLoadTime ? <span>{stats.domLoadTime / 1000} s</span> : '-'}</span>
        </div>
        <div style={style.rule}>
          <span style={style.title}>Load time</span>
          <span style={style.score}>{stats.loadTime ? <span>{stats.loadTime / 1000} s</span> : '-'}</span>
        </div>
        <div style={style.rule}>
          <span style={style.title}>Total page size</span>
          <span style={style.score}>{stats.totalBytes / 1000} kB</span>
        </div>
      </div>
      <header style={style.header}>
        Recommendation
      </header>
      <div style={style.box}>
        {Object.keys(rules).map((key) => (
           <div style={style.rule} key={key}>
             <span style={style.title}>{rules[key].title}</span>
             <span style={style.score}>{rules[key].score}/100</span>
           </div>
         ))}
      </div>
    </div>
    )
  }
}
