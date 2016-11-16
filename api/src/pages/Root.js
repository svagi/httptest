import React, { PropTypes } from 'react'
import Link from 'react-router/lib/Link'

const year = new Date().getFullYear()

export default class Root extends React.Component {
  constructor (props) {
    super(props)
  }

  componentDidMount () {
    require('./Root.css')
  }

  render () {
    return (
    <div id='root'>
      <header>
        <div>
          <Link to='/'>
          <h1>httptest</h1>
          </Link>
        </div>
      </header>
      <main>
        <div>
          {this.props.children}
        </div>
      </main>
      <footer>
        <div>
          <div className='left'>
            <a href='https://github.com/svagi/httptest' target='_blank'>Source code</a>
          </div>
          <div className='right'>
            <a href='https://www.svager.cz' target='_blank'>Made with &#9829; {year}</a>
          </div>
        </div>
      </footer>
    </div>
    )
  }
}

Root.propTypes = {
  children: PropTypes.node.isRequired
}
