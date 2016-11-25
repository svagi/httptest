import React, { PropTypes } from 'react'
import { isWebUri } from 'valid-url'

export default class UrlForm extends React.Component {
  constructor (props) {
    super(props)
    this.state = { invalid: false, url: '' }
    this.handleSubmit = this.handleSubmit.bind(this)
    this.handleUrlChange = this.handleUrlChange.bind(this)
  }
  handleSubmit (e) {
    e.preventDefault()
    let url = this.state.url
    if (!/^https?:\/\//i.test(url)) {
      url = 'http://' + url
    }
    url = isWebUri(url)
    if (!url) {
      this.setState({ invalid: true })
      return false
    }
    const submit = this.props.onSubmit || (url => url)
    submit(url)
  }
  handleUrlChange (e) {
    this.setState({ invalid: false, url: e.target.value })
  }
  render () {
    const { invalid, url } = this.state
    return <form action='/analyze' onSubmit={this.handleSubmit}>
      <input
        type='text'
        name='url'
        placeholder='Enter URL to analyze...'
        className={invalid ? 'invalid' : ''}
        onChange={this.handleUrlChange}
        value={url}
        required />
      <input type='submit' value='Analyze' />
    </form>
  }
}

UrlForm.propTypes = {
  onSubmit: PropTypes.func
}
