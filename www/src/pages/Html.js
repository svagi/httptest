import React, { PropTypes } from 'react'

export default class Html extends React.Component {
  render () {
    return (
    <html>
    <head>
      <title>
        {this.props.title}
      </title>
      <link type='text/css' rel='stylesheet' href='/static/pure.min.css' />
      <link type='text/css' rel='stylesheet' href='/static/app.css' />
      <script async src='/static/bundle.js' />
    </head>
    <body>
      <div id='root' dangerouslySetInnerHTML={{ __html: this.props.children }} />
    </body>
    </html>
    )
  }
}

Html.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired
}
