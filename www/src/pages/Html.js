import React, { PropTypes } from 'react'

export default class Html extends React.Component {
  render () {
    return (
    <html>
    <head>
      <title>
        {this.props.title}
      </title>
      <meta name='viewport' content='width=device-width, initial-scale=1' />
      <link type='text/css' rel='stylesheet' href='/static/pure.min.css' />
      <link type='text/css' rel='stylesheet' href='/static/app.bundle.css' />
    </head>
    <body>
      <div id='root' dangerouslySetInnerHTML={{ __html: this.props.children }} />
      <script src='/static/init.bundle.js' />
      <script async src='/static/react.bundle.js' />
      <script async src='/static/app.bundle.js' />
    </body>
    </html>
    )
  }
}

Html.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired
}
