import React from 'react'

const style = {
  form: {
    paddingTop: '1em',
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
  }

  render () {
    return (
    <div>
      <form style={style.form}>
        <input
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
