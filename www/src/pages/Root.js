import React, { PropTypes } from 'react'

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
  }
}

export default class Root extends React.Component {
  constructor (props) {
    super(props)
  }

  render () {
    return (
    <div>
      <header style={style.header}>
        <div style={style.wrapper}>
          <h1 style={style.h1}>httptest</h1>
        </div>
      </header>
      <section>
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
