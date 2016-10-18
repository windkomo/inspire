export default function fetchMetrics(catalogId) {
  if (!catalogId) return Promise.reject(new Error('catalogId is required'))
  return fetch(`https://inspire.data.gouv.fr/api/geogw/catalogs/${catalogId}/metrics`)
    .then(response => response.json())
    .catch((err) => {
      console.error(err)
    })
  }