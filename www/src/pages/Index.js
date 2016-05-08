import React from 'react'
import { history } from './router'

const style = {
  form: {
    display: 'flex',
    alignContent: 'stretch',
    width: '100%'
  },
  inputUrl: {
    borderWidth: 5,
    width: '100%',
    marginRight: 5
  },
  inputSubmit: {
    borderWidth: 5,
    width: '6em'
  }
}

export default class Index extends React.Component {
  constructor (props) {
    super(props)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  componentDidMount () {
    require('./Index.css')
  }

  handleSubmit (e) {
    e.preventDefault()
    history.push({
      pathname: '/analyze/',
      search: `?url=${this.refs.url.value}`
    })
  }
  render () {
    return (
    <div>
      <form style={style.form} onSubmit={this.handleSubmit}>
        <input
          ref='url'
          type='url'
          style={style.inputUrl}
          name='url'
          placeholder='Enter URL to analyze...'
          required/>
        <input type='submit' style={style.inputSubmit} value='Analyze' />
      </form>
    </div>
    )
  }
}
