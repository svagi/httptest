import React, { PropTypes } from 'react'

export default class Rule extends React.Component {

  constructor (props) {
    super(props)
    this.state = {
      showInfo: false
    }
    this.handleClick = this.handleClick.bind(this)
  }

  handleClick () {
    this.setState({ showInfo: !this.state.showInfo })
  }

  render () {
    const { title, score, description, values = [], reason } = this.props
    const showInfo = this.state.showInfo ? 'block' : 'none'
    return (
    <div className='rule' onClick={this.handleClick}>
      <header>
        <span className='title'>{title}</span>
        <span className='score'>{score === null ? '-' : `${score}/100`}</span>
      </header>
      <div className='info' style={{ display: showInfo }}>
        <div className='description'>
          {description || 'No description.'}
        </div>
        <div className='reason'>
          {reason}
        </div>
        <div className='values'>
          <ul>
            {values.map((val, key) => (
               <li key={key}>
                 {val}
               </li>
             ))}
          </ul>
        </div>
      </div>
    </div>
    )
  }
}

Rule.propTypes = {
  title: PropTypes.string,
  score: PropTypes.number,
  description: PropTypes.string,
  values: PropTypes.array,
  reason: PropTypes.string
}
