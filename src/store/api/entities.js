import client from './client'

export default {
  getEntity (entityId, callback) {
    return client.getModel('entities', entityId)
  },

  getEntities (production, episode, entityTypeId) {
    let path = '/api/data/entities/with-tasks'
    if (production) path += `?project_id=${production.id}`
    if (episode) path += `&episode_id=${episode.id}`
    if (entityTypeId) path += `&entity_type_id=${entityTypeId}`
    return client.pget(path)
  },

  getEpisode (episodeId) {
    return client.getModel('episodes', episodeId)
  },

  getEpisodes (production) {
    const path = `/api/data/projects/${production.id}/episodes`
    return client.pget(path)
  },

  getEntityType (callback) {
    client.get('/api/data/entity-type', callback)
  },

  newEntity (entity) {
    const data = {
      name: entity.name,
      description: entity.description
    }
    if (entity.parent_id !== 'null') {
      data.episode_id = entity.parent_id
    }
    return client.ppost(`/api/data/projects/${entity.project_id}/entities`, data)
  },

  updateEntity (entity) {
    const data = {
      name: entity.name,
      description: entity.description,
      data: entity.data
    }
    if (entity.parent_id === 'null' || entity.parent_id) {
      data.parent_id = entity.parent_id
    }
    const path = `/api/data/entities/${entity.id}`
    return client.pput(path, data)
  },

  deleteEntity (entity) {
    if (entity.canceled) {
      return client.pdel(`/api/data/entities/${entity.id}?force=true`)
    } else {
      return client.pdel(`/api/data/entities/${entity.id}`)
    }
  },

  restoreEntity (entity, callback) {
    const data = { canceled: false }
    return client.pput(`/api/data/entities/${entity.id}`, data)
  },

  postCsv (production, formData, toUpdate) {
    let path = `/api/import/csv/projects/${production.id}/entities`
    if (toUpdate) path += '?update=true'
    return client.ppost(path, formData)
  },

  getEpisodeStats (productionId) {
    return client.pget(`/api/data/projects/${productionId}/episodes/stats`)
  },

  getEpisodeRetakeStats (productionId) {
    const path = `/api/data/projects/${productionId}/episodes/retake-stats`
    return client.pget(path)
  },

  loadEntityHistory (entityId) {
    return client.pget(`/api/data/entities/${entityId}/versions`)
  }
}
