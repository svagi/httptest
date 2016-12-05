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
          <div className='wrapper'>
            <Link to='/'>
              <h1>httptest</h1>
            </Link>
          </div>
        </header>
        <main>
          <div className='wrapper'>
            {this.props.children}
          </div>
        </main>
        <footer>
          <div className='wrapper'>
            <div className='left'>
              <a href='https://github.com/svagi/httptest'>Source code</a>
            </div>
            <div className='right'>
              <a href='https://www.svager.cz'>
                <span>Made with &#9829; </span><span>{year}</span>
              </a>
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
