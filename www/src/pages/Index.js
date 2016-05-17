import React from 'react'
import { history } from './router'

export default class Index extends React.Component {
  constructor (props) {
    super(props)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  componentDidMount () {
    require('./Index.css')
  }

  handleSubmit (e) {
    let url = this.refs.url.value
    if (!/^https?:\/\//i.test(url)) {
      url = 'http://' + url
    }
    e.preventDefault()
    history.push({
      pathname: '/analyze/',
      search: `?url=${url}`
    })
  }
  render () {
    return (
    <div id='index'>
      <h2>Analyze your site's performance now</h2>
      <form onSubmit={this.handleSubmit}>
        <input
          ref='url'
          type='text'
          name='url'
          placeholder='Enter URL to analyze...'
          required/>
        <input type='submit' value='Analyze' />
      </form>
    </div>
    )
  }
}
