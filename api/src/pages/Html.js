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
          <link type='text/css' rel='stylesheet' href='/pure.min.css' />
          <link type='text/css' rel='stylesheet' href='/app.bundle.css' />
          <link rel='dns-prefetch' href='https://github.com/' />
          <link rel='dns-prefetch' href='https://www.svager.cz/' />
        </head>
        <body>
          <div id='app' dangerouslySetInnerHTML={{ __html: this.props.children }} />
          <script src='/init.bundle.js' />
          <script async defer src='/react.bundle.js' />
          <script async defer src='/app.bundle.js' />
        </body>
      </html>
    )
  }
}

Html.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired
}
