import React, { PropTypes } from 'react'
import Link from 'react-router/lib/Link'

const style = {
  wrapper: {
    width: '80%',
    margin: '0 auto'
  },
  header: {
    backgroundColor: '#1f8dd6',
    color: '#fff'
  },
  h1: {
    display: 'inline-block',
    padding: '.5em 0',
    margin: 0
  },
  link: {
    color: '#fff'
  },
  section: {
    paddingTop: '1em'
  }
}

export default class Root extends React.Component {
  constructor (props) {
    super(props)
  }

  componentDidMount () {
    require('./Root.css')
  }

  render () {
    return (
    <div>
      <header style={style.header}>
        <div style={style.wrapper}>
          <Link to='/' style={style.link}>
          <h1 style={style.h1}>httptest</h1>
          </Link>
        </div>
      </header>
      <section style={style.section}>
        <div style={style.wrapper}>
          {this.props.children}
        </div>
      </section>
    </div>
    )
  }
}

Root.propTypes = {
  children: PropTypes.node.isRequired
}
