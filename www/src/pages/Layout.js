import React, { PropTypes } from 'react'

export default class Layout extends React.Component {
  render () {
    return (
    <html>
    <head>
      <meta charSet='utf-8' />
      <title>
        {this.props.title}
      </title>
      <link type='text/css' rel='stylesheet' href='static/pure.min.css' />
      <link type='text/css' rel='stylesheet' href='static/app.css' />
      <script async src='static/bundle.js' />
    </head>
    <body>
      <div id='root' dangerouslySetInnerHTML={{ __html: this.props.children }} />
    </body>
    </html>
    )
  }
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired
}
