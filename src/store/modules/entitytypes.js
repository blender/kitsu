import entityTypesApi from '../api/entitytypes'
import {
  LOAD_ENTITY_TYPES_START,
  LOAD_ENTITY_TYPES_ERROR,
  LOAD_ENTITY_TYPES_END,

  EDIT_ENTITY_TYPE_END,
  DELETE_ENTITY_TYPE_END,

  RESET_ALL
} from '../mutation-types'
import { sortByName } from '../../lib/sorting'

const initialState = {
  entityTypes: [],
  entityTypeMap: new Map(),
  // Entity types that Kitsu ships with, these should not be edited.
  builtinEntityTypeNames: [
    'Characters',
    'Edit',
    'Environment',
    'Episode',
    'FX',
    'Props',
    'Scene',
    'Sequence',
    'Shot'
  ]
}

const state = { ...initialState }

const getters = {
  entityTypes: state => state.entityTypes,
  entityTypeMap: state => state.entityTypeMap,

  customEntityTypes: state => state.entityTypes.filter(
    e => !state.builtinEntityTypeNames.includes(e.name)
  ),

  customEntityTypeOptions: (state, getters) => getters.customEntityTypes.map(
    (type) => { return { label: type.name, value: type.name } }
  ),

  getEntityType: (state, getters) => (id) => {
    return state.entityTypes.find(
      (entityType) => entityType.id === id
    )
  }
}

const actions = {

  loadEntityTypes ({ commit, state }) {
    commit(LOAD_ENTITY_TYPES_START)
    return entityTypesApi.getEntityTypes()
      .then(entityTypes => {
        commit(LOAD_ENTITY_TYPES_END, entityTypes)
        Promise.resolve(entityTypes)
      })
      .catch(err => {
        console.error(err)
        Promise.reject(err)
      })
  },

  loadEntityType ({ commit, state }, entityTypeId) {
    entityTypesApi.getEntityType(entityTypeId, (err, entityType) => {
      if (err) console.error(err)
      else commit(EDIT_ENTITY_TYPE_END, entityType)
    })
  },

  newEntityType ({ commit, state }, data) {
    return entityTypesApi.newEntityType(data)
      .then((entityType) => {
        commit(EDIT_ENTITY_TYPE_END, entityType)
        Promise.resolve(entityType)
      })
  },

  editEntityType ({ commit, state }, data) {
    return entityTypesApi.updateEntityType(data)
      .then((entityType) => {
        commit(EDIT_ENTITY_TYPE_END, entityType)
        Promise.resolve(entityType)
      })
  },

  deleteEntityType ({ commit, state }, entityType) {
    return entityTypesApi.deleteEntityType(entityType)
      .then(() => {
        commit(DELETE_ENTITY_TYPE_END, entityType)
        Promise.resolve(entityType)
      })
  }
}

const mutations = {
  [LOAD_ENTITY_TYPES_START] (state) {
    state.isEntityTypesLoading = true
    state.isEntityTypesLoadingError = false
  },

  [LOAD_ENTITY_TYPES_ERROR] (state) {
    state.isEntityTypesLoading = false
    state.isEntityTypesLoadingError = true
  },

  [LOAD_ENTITY_TYPES_END] (state, entityTypes) {
    state.isEntityTypesLoading = false
    state.isEntityTypesLoadingError = false
    state.entityTypes = entityTypes
    state.entityTypes = sortByName(state.entityTypes)
    state.entityTypeMap = new Map()
    state.entityTypes.forEach((entityType) => {
      state.entityTypeMap.set(entityType.id, entityType)
    })
  },

  [EDIT_ENTITY_TYPE_END] (state, newEntityType) {
    const entityType = getters.getEntityType(state)(newEntityType.id)

    if (entityType && entityType.id) {
      Object.assign(entityType, newEntityType)
    } else {
      state.entityTypes.push(newEntityType)
      state.entityTypeMap.set(newEntityType.id, newEntityType)
    }
    state.entityTypes = sortByName(state.entityTypes)
  },

  [DELETE_ENTITY_TYPE_END] (state, entityTypeToDelete) {
    const entityTypeToDeleteIndex = state.entityTypes.findIndex(
      (entityType) => entityType.id === entityTypeToDelete.id
    )
    if (entityTypeToDeleteIndex >= 0) {
      state.entityTypes.splice(entityTypeToDeleteIndex, 1)
    }
    state.entityTypeMap.delete(entityTypeToDelete.id)
  },

  [RESET_ALL] (state) {
    Object.assign(state, { ...initialState })
  }
}

export default {
  state,
  getters,
  actions,
  mutations
}
