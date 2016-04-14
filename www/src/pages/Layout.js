import React, { PropTypes } from 'react'

export default class App extends React.Component {
  render () {
    return (
    <html>
    <head>
      <title>
        {this.props.title}
      </title>
    </head>
    <body>
      <div dangerouslySetInnerHTML={{ __html: this.props.children }} />
    </body>
    </html>
    )
  }
}

App.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired
}
