import React from 'react'

const style = {
  analysis: {
    padding: '1em 0'
  },
  item: {
    paddingRight: '1em'
  }
}

export default class Analysis extends React.Component {
  constructor (props) {
    super(props)
  }
  render (props = this.props) {
    const { stats } = props.analysis
    console.log(props)
    return (
    <div style={style.analysis}>
      <div>
        <div style={style.item}>
          <span>Requests:&nbsp;</span>
          <span>{stats.totalRequests}</span>
        </div>
        <div style={style.item}>
          <span>DOM load time:&nbsp;</span>
          <span>{stats.domLoadTime ? <span>{stats.domLoadTime / 1000} s</span> : '-'}</span>
        </div>
        <div style={style.item}>
          <span>Load time:&nbsp;</span>
          <span>{stats.loadTime ? <span>{stats.loadTime / 1000} s</span> : '-'}</span>
        </div>
        <div style={style.item}>
          <span>Total page size:&nbsp;</span>
          <span>{stats.totalBytes / 1000} kB</span>
        </div>
      </div>
    </div>
    )
  }
}
