import React from 'react'

const Citations = ({ citations }) => {
    if(!citations || citations.length === 0){
        return null;
    }
  return (
    <div className='citations'>
        <span className='citations-label'>Sources:</span>
        {citations.map((c, i) => (
            <a key={i} href={c.url} target='_blank' rel="noopener noreferrer" className='citation-Link'>
                {i + 1}. {c.hostname || c.title || 'Source'}
            </a>
        ))}
    </div>
  )
}

export default Citations
