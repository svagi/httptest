import React, { PropTypes } from 'react'

export default function RankingBox (props) {
  const { rankings = {}, mapUrl = (url) => url } = props
  const placeholders = [...Array(props.count).keys()]
  const keys = Object.keys(rankings)
  const values = keys.map(key => rankings[key])
  return <div className='box rankings'>
    <header>{props.title}</header>
    <div className='content'>
      <ul>
        {placeholders.map(idx => {
          const url = keys[idx]
          const score = values[idx]
          const active = typeof url !== 'undefined' && typeof score !== 'undefined'
          const style = {
            score: {
              color: active ? '#fff' : null,
              background: active ? `hsl(${120 * (score / 100)}, 50%, 50%)` : null
            },
            ...props.style
          }
          return (
            <li key={idx} className={active ? 'active' : null}>
              <div className='url' style={style.url}>
                {active ? mapUrl(url) : '----------------'}
              </div>
              <div className='score' style={style.score}>
                {active ? score : '--'}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  </div>
}

RankingBox.propTypes = {
  title: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
  mapUrl: PropTypes.func,
  rankings: PropTypes.object,
  style: PropTypes.object

}
