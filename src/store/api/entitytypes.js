import client from './client'

export default {
  getEntityTypes () {
    return client.pget('/api/data/entity-types')
  },

  getEntityType (entityTypeId, callback) {
    client.get(`/api/data/entity-types/${entityTypeId}`, callback)
  },

  newEntityType (entityType, callback) {
    const data = {
      name: entityType.name
    }
    return client.ppost('/api/data/entity-types', data)
  },

  updateEntityType (entityType, callback) {
    const data = {
      name: entityType.name
    }
    return client.pput(`/api/data/entity-types/${entityType.id}`, data)
  },

  deleteEntityType (entityType, callback) {
    return client.pdel(`/api/data/entity-types/${entityType.id}`)
  }
}
