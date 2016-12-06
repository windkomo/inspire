import React from 'react'
import { strRightBack } from 'underscore.string'
import { theme  } from '../../tools'
import './Download.css'

const styles = {
  button: {
    padding: '5px 11px',
    backgroundColor: theme.blue,
    color: '#fff',
    border: 'none',
  },
  disabled: {
    padding: '5px 10px',
    backgroundColor: '#ddd',
    color: '#000',
    border: 'none',
  }
}

const Download = ({distribution, dlFormat, style}) => {
  const { format, projection } = dlFormat
  let link = 'https://inspire.data.gouv.fr/api/geogw/'
  let layerName

  if (distribution.type === 'file-package') {
    layerName = strRightBack(distribution.layer, '/')
    link += `file-packages/${distribution.hashedLocation}/${layerName}/download`
  }

  if (distribution.type === 'wfs-featureType') {
    link += `services/${distribution.service}/feature-types/${distribution.typeName}/download`
  }

  let dl = <div style={styles.disabled}>Indisponible</div>
  if (distribution.available) {
    dl = <a href={link + `?format=${format}&projection=${projection}`} style={styles.button}>Télécharger</a>
  }

  return (
    <div style={style} className="download">
      <a href={link}>{layerName || distribution.typeName}</a>
      {dl}
    </div>
  )
}

export default Download