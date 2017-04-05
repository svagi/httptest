import React, { PropTypes } from 'react'

export default class Html extends React.Component {
  render ({ children, assets, title } = this.props) {
    return (
      <html lang='en'>
        <head>
          <title>{title}</title>
          <meta name='viewport' content='width=device-width, initial-scale=1' />
          <link type='text/css' rel='stylesheet' href={`/${assets.app.css}`} />
          <link rel='dns-prefetch' href='https://github.com/' />
          <link rel='dns-prefetch' href='https://www.svager.cz/' />
          <meta name='description' content='Analyze your site’s speed according to HTTP best practices.' />
          <meta name='author' content='Jan Svager <https://www.svager.cz>' />
        </head>
        <body>
          <div id='app' dangerouslySetInnerHTML={{ __html: children }} />
          <script src={`/${assets.init.js}`} />
          <script src={`/${assets.react.js}`} />
          <script src={`/${assets.app.js}`} />
        </body>
      </html>
    )
  }
}

Html.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired
}
