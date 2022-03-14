import Vue from 'vue'
import moment from 'moment'
import peopleApi from '../api/people'
import entitiesApi from '../api/entities'
import tasksStore from './tasks'
import peopleStore from './people'
import productionsStore from './productions'
import taskTypesStore from './tasktypes'

import { PAGE_SIZE } from '../../lib/pagination'
import { getTaskTypePriorityOfProd } from '@/lib/productions'
import {
  sortByName,
  sortEntityResult,
  sortEntities,
  sortTasks,
  sortValidationColumns
} from '../../lib/sorting'
import {
  appendSelectionGrid,
  buildSelectionGrid,
  clearSelectionGrid
} from '../../lib/selection'
import {
  getFilledColumns,
  removeModelFromList
} from '../../lib/models'
import {
  minutesToDays
} from '../../lib/time'
import {
  buildEntityIndex,
  indexSearch
} from '../../lib/indexing'
import {
  applyFilters,
  getFilters,
  getKeyWords
} from '../../lib/filtering'

import {
  LOAD_ENTITIES_START,
  LOAD_ENTITIES_ERROR,
  LOAD_ENTITIES_END,
  SORT_VALIDATION_COLUMNS,

  LOAD_ENTITY_END,

  ENTITY_CSV_FILE_SELECTED,
  IMPORT_ENTITIES_END,

  LOAD_OPEN_PRODUCTIONS_END,

  NEW_ENTITY_END,
  ENTITY_ENTITY_END,
  ADD_ENTITY,
  UPDATE_ENTITY,
  REMOVE_ENTITY,
  CANCEL_ENTITY,
  RESTORE_ENTITY_END,

  NEW_TASK_COMMENT_END,
  NEW_TASK_END,
  CREATE_TASKS_END,

  SET_ENTITY_SEARCH,

  SET_CURRENT_PRODUCTION,
  DISPLAY_MORE_ENTITIES,

  SET_ENTITY_LIST_SCROLL_POSITION,

  REMOVE_SELECTED_TASK,
  ADD_SELECTED_TASK,
  ADD_SELECTED_TASKS,
  DELETE_TASK_END,
  CLEAR_SELECTED_TASKS,

  SET_PREVIEW,

  SAVE_ENTITY_SEARCH_END,
  REMOVE_ENTITY_SEARCH_END,

  UPDATE_METADATA_DESCRIPTOR_END,

  LOCK_ENTITY,
  UNLOCK_ENTITY,

  RESET_ALL,

  CLEAR_SELECTED_ENTITIES,
  SET_ENTITY_SELECTION
} from '../mutation-types'
import async from 'async'

const cache = {
  entities: {},
  entityIndex: {}
}

const helpers = {
  getCurrentProduction () {
    return productionsStore.getters.currentProduction(productionsStore.state)
  },
  getTask (taskId) {
    return tasksStore.state.taskMap.get(taskId)
  },
  getTaskStatus (taskStatusId) {
    return tasksStore.state.taskStatusMap.get(taskStatusId)
  },
  getTaskType (taskTypeId) {
    return taskTypesStore.state.taskTypeMap.get(taskTypeId)
  },
  getPerson (personId) {
    return peopleStore.state.personMap.get(personId)
  },

  getEntityName (entity) {
    return `${entity.name}`
  },

  dateDigit (date) {
    return date.toString().padStart(2, '0')
  },

  populateTask (task, entity) {
    task.name = getTaskTypePriorityOfProd(
      helpers.getTaskType(task.task_type_id),
      helpers.getCurrentProduction()
    ).toString()
    task.task_status_short_name =
      helpers.getTaskStatus(task.task_status_id).short_name

    const entityName = helpers.getEntityName(entity)
    Object.assign(task, {
      project_id: entity.production_id,
      episode_id: entity.parent_id,
      entity_name: entityName,
      entity_type_name: entity.entity_type,
      entity: {
        id: entity.id,
        preview_file_id: entity.preview_file_id
      }
    })

    return task
  },

  setListStats (state, entities) {
    let timeSpent = 0
    let estimation = 0
    entities.forEach(entity => {
      timeSpent += entity.timeSpent
      estimation += entity.estimation
    })
    Object.assign(state, {
      displayedEntitiesLength: entities.length,
      displayedEntitiesTimeSpent: timeSpent,
      displayedEntitiesEstimation: estimation
    })
  },

  sortValidationColumns (validationColumns, entityFilledColumns, taskTypeMap) {
    const columns = [...validationColumns]
    return sortValidationColumns(
      columns, taskTypeMap, helpers.getCurrentProduction()
    )
  },

  getPeriod (task, detailLevel) {
    const endDateString = helpers.getTaskEndDate(task, detailLevel)
    let period
    if (detailLevel === 'day') {
      period = moment(endDateString, 'YYYY-MM').format('YYYY-MM')
    } else if (detailLevel === 'month') {
      period = moment(endDateString, 'YYYY').format('YYYY')
    } else if (detailLevel === 'week') {
      period = moment(endDateString, 'YYYY-MM-DD').format('GGGG')
    }
    return period
  },

  getDateFromParameters ({ detailLevel, year, week, month, day }) {
    if (detailLevel === 'day') {
      return `${year}-${helpers.dateDigit(month)}-${helpers.dateDigit(day)}`
    } else if (detailLevel === 'month') {
      return `${year}-${helpers.dateDigit(month)}`
    } else if (detailLevel === 'week') {
      return `${year}-${week}`
    } else {
      return `${year}`
    }
  },

  getTaskEndDate (task, detailLevel) {
    let endDateString
    if (detailLevel === 'day') {
      endDateString = moment(task.end_date, 'YYYY-MM-DD').format('YYYY-MM-DD')
    } else if (detailLevel === 'month') {
      endDateString = moment(task.end_date, 'YYYY-MM').format('YYYY-MM')
    } else if (detailLevel === 'week') {
      endDateString = moment(task.end_date, 'YYYY-MM-DD').format('GGGG-W')
    }
    return endDateString
  },

  initEntitiesCache (state, entityType) {
    if (cache.entityIndex[entityType] === undefined) {
      cache.entityIndex[entityType] = []
    }
    if (cache.entities[entityType] === undefined) {
      cache.entities[entityType] = []
    }
  },

  buildResult (state, {
    entitySearch,
    entityType,
    production,
    sorting,
    taskStatusMap,
    taskTypeMap,
    persons,
    taskMap
  }) {
    const taskTypes = Array.from(taskTypeMap.values())
    const taskStatuses = Array.from(taskStatusMap.values())
    const query = entitySearch
    const keywords = getKeyWords(query) || []
    helpers.initEntitiesCache(state, entityType)
    const filters = getFilters({
      entryIndex: cache.entityIndex[entityType],
      taskTypes,
      taskStatuses,
      descriptors: production.descriptors || [],
      persons,
      query
    })
    let result = indexSearch(cache.entityIndex[entityType], keywords) || cache.entities[entityType]
    result = applyFilters(result, filters, taskMap)
    console.log('buildResult', entityType, result, cache.entities, cache.entityIndex)
    result = sortEntityResult(
      result,
      sorting,
      taskTypeMap,
      taskMap
    )
    cache.result = result

    const displayedEntities = result.slice(0, PAGE_SIZE)
    const maxX = displayedEntities.length
    const maxY = state.nbValidationColumns

    state.displayedEntities = displayedEntities
    state.entityFilledColumns = getFilledColumns(displayedEntities)
    helpers.setListStats(state, result)
    state.entitySearchText = entitySearch
    state.entitySelectionGrid = buildSelectionGrid(maxX, maxY)
  },

  sortStatColumns (stats, taskTypeMap) {
    const validationColumnsMap = {}
    if (stats.all) {
      Object.keys(stats.all).forEach(entryId => {
        if (entryId !== 'all' && !stats.all[entryId].name) {
          validationColumnsMap[entryId] = true
        }
      })
    }
    const validationColumns = Object.keys(validationColumnsMap)
    return sortValidationColumns(
      validationColumns, taskTypeMap, helpers.getCurrentProduction()
    )
  }
}

const initialState = {
  entityMap: new Map(),
  entitySearchText: '',
  entitySearchQueries: [],
  entitySorting: [],

  currentEpisode: null,

  isEntityDescription: false,
  isEntityEstimation: false,
  isEntityTime: false,

  displayedEntities: [],
  displayedEntitiesLength: 0,
  displayedEntitiesTimeSpent: 0,
  displayedEntitiesEstimation: 0,
  entityFilledColumns: {},

  entityCreated: '',
  entitySelectionGrid: {},

  isEntitiesLoading: false,
  isEntitiesLoadingError: false,
  entitiesCsvFormData: null,

  entityListScrollPosition: 0,

  entityValidationColumns: [],

  selectedEntities: new Map()
}

const state = {
  ...initialState
}

const getters = {
  entities: state => cache.entities,
  entityValidationColumns: state => state.entityValidationColumns,

  entitySearchQueries: state => state.entitySearchQueries,
  entityMap: state => state.entityMap,
  entitySorting: state => state.entitySorting,

  isEntityDescription: state => state.isEntityDescription,
  isEntityEstimation: state => state.isEntityEstimation,
  isEntityTime: state => state.isEntityTime,

  entitySearchText: state => state.entitySearchText,
  entitySelectionGrid: state => state.entitySelectionGrid,

  displayedEntities: state => state.displayedEntities,
  displayedEntitiesLength: state => state.displayedEntitiesLength,
  displayedEntitiesTimeSpent: state => state.displayedEntitiesTimeSpent,
  displayedEntitiesEstimation: state => state.displayedEntitiesEstimation,
  entityFilledColumns: state => state.entityFilledColumns,

  isEntitiesLoading: state => state.isEntitiesLoading,
  isEntitiesLoadingError: state => state.isEntitiesLoadingError,
  entityCreated: state => state.entityCreated,

  isLongEntityList: state => state.entityMap.size > 500,
  entitiesCsvFormData: state => state.entitiesCsvFormData,
  entityListScrollPosition: state => state.entityListScrollPosition,

  selectedEntities: state => state.selectedEntities
}

const actions = {

  loadEntities ({ commit, dispatch, state, rootGetters }, entityType) {
    const production = rootGetters.currentProduction
    const userFilters = rootGetters.userFilters
    const taskTypeMap = rootGetters.taskTypeMap
    const taskMap = rootGetters.taskMap
    const personMap = rootGetters.personMap
    const isTVShow = rootGetters.isTVShow
    let episode = isTVShow ? rootGetters.currentEpisode : null

    if (isTVShow) {
      if (!episode) {
        if (rootGetters.episodes.length > 0) {
          episode = rootGetters.episodes.length > 0 ? rootGetters.episodes[0] : null
        } else {
          return Promise.resolve([])
        }
      } else if (['all'].includes(episode.id)) {
        episode = null
      }
    }

    if (!isTVShow && episode) {
      episode = null
    }

    if (state.isEntitiesLoading) {
      return Promise.resolve([])
    }

    commit(LOAD_ENTITIES_START, { entityType })
    const entityTypeId = rootGetters.getEntityTypeByName(entityType).id
    return entitiesApi.getEntities(production, episode, entityTypeId)
      .then((entities) => {
        commit(
          LOAD_ENTITIES_END,
          { production, entityType, entities, userFilters, personMap, taskMap, taskTypeMap }

        )
        return Promise.resolve(entities)
      })
      .catch(err => {
        console.error('an error occured while loading entities', err)
        commit(LOAD_ENTITIES_ERROR)
        return Promise.resolve([])
      })
  },

  /*
   * Function useds mainly to reload entity data after an update or creation
   * event. If the entity was updated a few times ago, it is not reloaded.
   */
  loadEntity ({ commit, state, rootGetters }, entityId) {
    const entity = rootGetters.entityMap.get(entityId)
    if (entity && entity.lock) return

    const personMap = rootGetters.personMap
    const production = rootGetters.currentProduction
    const taskMap = rootGetters.taskMap
    const taskTypeMap = rootGetters.taskTypeMap
    return entitiesApi.getEntity(entityId)
      .then((entity) => {
        if (state.entityMap.get(entity.id)) {
          commit(UPDATE_ENTITY, entity)
        } else {
          commit(ADD_ENTITY, {
            entity,
            taskTypeMap,
            taskMap,
            personMap,
            production
          })
        }
      })
      .catch((err) => console.error(err))
  },

  newEntity ({ commit, dispatch, rootGetters }, entity) {
    return entitiesApi.newEntity(entity)
      .then(entity => {
        commit(NEW_ENTITY_END, entity)
        const taskTypeIds = rootGetters.productionEntityTaskTypeIds
        const createTaskPromises = taskTypeIds.map(
          taskTypeId => dispatch('createTask', {
            entityId: entity.id,
            projectId: entity.project_id,
            taskTypeId: taskTypeId,
            type: 'entities'
          })
        )
        return Promise.all(createTaskPromises)
          .then(() => Promise.resolve(entity))
          .catch(console.error)
      })
  },

  editEntity ({ commit, state }, data) {
    commit(LOCK_ENTITY, data)
    commit(ENTITY_ENTITY_END, data)
    return entitiesApi.updateEntity(data)
      .then(entity => {
        setTimeout(() => {
          commit(UNLOCK_ENTITY, entity)
        }, 2000)
        return Promise.resolve(entity)
      })
  },

  deleteEntity ({ commit, state }, entity) {
    return entitiesApi.deleteEntity(entity)
      .then(() => {
        const previousEntity = state.entityMap.get(entity.id)
        if (
          previousEntity &&
          previousEntity.tasks.length > 0 &&
          !previousEntity.canceled
        ) {
          commit(CANCEL_ENTITY, previousEntity)
        } else {
          commit(REMOVE_ENTITY, entity)
        }
        return Promise.resolve()
      })
  },

  restoreEntity ({ commit, state }, entity) {
    return entitiesApi.restoreEntity(entity)
      .then((entity) => {
        commit(RESTORE_ENTITY_END, entity)
        return Promise.resolve(entity)
      })
  },

  uploadEntityFile ({ commit, state, rootGetters }, toUpdate) {
    const production = rootGetters.currentProduction
    return entitiesApi.postCsv(production, state.entitiesCsvFormData, toUpdate)
      .then(() => {
        commit(IMPORT_ENTITIES_END)
        return Promise.resolve()
      })
  },

  displayMoreEntities ({ commit, rootGetters }) {
    commit(DISPLAY_MORE_ENTITIES, {
      taskTypeMap: rootGetters.taskTypeMap,
      taskStatusMap: rootGetters.taskStatusMap,
      taskMap: rootGetters.taskMap,
      production: rootGetters.currentProduction
    })
  },

  initEntities ({ dispatch }) {
    dispatch('setLastProductionScreen', 'production-entities')
    return dispatch('loadEntities')
  },

  setEntitySearch ({ commit, rootGetters }, { entityType, entitySearch }) {
    const taskStatusMap = rootGetters.taskStatusMap
    const taskTypeMap = rootGetters.taskTypeMap
    const taskMap = rootGetters.taskMap
    const production = rootGetters.currentProduction
    const persons = rootGetters.people
    console.log('setEntitySearch', arguments, entityType, entitySearch)
    commit(
      SET_ENTITY_SEARCH,
      {
        entitySearch,
        entityType,
        persons,
        taskStatusMap,
        taskMap,
        taskTypeMap,
        production
      }
    )
  },

  saveEntitySearch ({ commit, rootGetters }, searchQuery) {
    return new Promise((resolve, reject) => {
      const query = state.entitySearchQueries.find(
        (query) => query.name === searchQuery
      )
      const production = rootGetters.currentProduction

      if (!query) {
        peopleApi.createFilter(
          'entity',
          searchQuery,
          searchQuery,
          production.id,
          null,
          (err, searchQuery) => {
            commit(SAVE_ENTITY_SEARCH_END, { searchQuery, production })
            if (err) {
              reject(err)
            } else {
              resolve(searchQuery)
            }
          }
        )
      } else {
        resolve()
      }
    })
  },

  removeEntitySearch ({ commit, rootGetters }, searchQuery) {
    const production = rootGetters.currentProduction
    return peopleApi.removeFilter(searchQuery)
      .then(() => {
        commit(REMOVE_ENTITY_SEARCH_END, { searchQuery, production })
        return Promise.resolve()
      })
  },

  getEntitiesCsvLines ({ state, rootGetters }) {
    const production = rootGetters.currentProduction
    // const isTVShow = rootGetters.isTVShow
    const organisation = rootGetters.organisation
    const personMap = rootGetters.personMap
    let entities = cache.entities
    if (cache.result && cache.result.length > 0) {
      entities = cache.result
    }
    const lines = entities.map((entity) => {
      let entityLine = []
      entityLine = entityLine.concat([
        entity.name,
        entity.description
      ])
      sortByName([...production.descriptors])
        .filter(d => d.entity_type === 'Entity')
        .forEach((descriptor) => {
          entityLine.push(entity.data[descriptor.field_name])
        })
      if (state.isEntityTime) {
        entityLine.push(minutesToDays(organisation, entity.timeSpent).toFixed(2))
      }
      if (state.isEntityEstimation) {
        entityLine.push(minutesToDays(organisation, entity.estimation).toFixed(2))
      }
      state.entityValidationColumns
        .forEach(validationColumn => {
          const task = rootGetters.taskMap.get(
            entity.validations.get(validationColumn)
          )
          if (task) {
            entityLine.push(task.task_status_short_name)
            entityLine.push(
              task.assignees.map(id => personMap.get(id).full_name).join(',')
            )
          } else {
            entityLine.push('') // Status
            entityLine.push('') // Assignations
          }
        })
      return entityLine
    })
    return lines
  },

  loadEntityHistory ({ commit, state }, entityId) {
    return entitiesApi.loadEntityHistory(entityId)
  },

  deleteAllEntityTasks (
    { commit, dispatch, state }, { projectId, taskTypeId, selectionOnly }
  ) {
    let taskIds = []
    if (selectionOnly) {
      taskIds = cache.result
        .filter(a => a.validations.get(taskTypeId))
        .map(a => a.validations.get(taskTypeId))
    }
    return dispatch('deleteAllTasks', { projectId, taskTypeId, taskIds })
  },

  setEntitySelection ({ commit }, { entity, selected }) {
    commit(SET_ENTITY_SELECTION, { entity, selected })
  },

  clearSelectedEntities ({ commit }) {
    commit(CLEAR_SELECTED_ENTITIES)
  },

  deleteSelectedEntities ({ state, dispatch }) {
    return new Promise((resolve, reject) => {
      let selectedEntityIds = [...state.selectedEntities.values()].filter(entity => !entity.canceled).map(entity => entity.id)
      if (selectedEntityIds.length === 0) {
        selectedEntityIds = [...state.selectedEntities.keys()]
      }
      async.eachSeries(selectedEntityIds, (entityId, next) => {
        const entity = state.entityMap.get(entityId)
        if (entity) {
          dispatch('deleteEntity', entity)
        }
        next()
      }, (err) => {
        if (err) reject(err)
        else {
          resolve()
        }
      })
    })
  }
}

const mutations = {
  [LOAD_ENTITIES_START] (state, { entityType }) {
    cache.entities[entityType] = []
    cache.result[entityType] = []
    cache.entityIndex[entityType] = []
    state.entityMap[entityType] = new Map()
    state.entityValidationColumns = []

    state.isEntitiesLoading = true
    state.isEntitiesLoadingError = false

    state.displayedEntities[entityType] = []
    state.displayedEntitiesLength = 0
    state.displayedEstimation = 0
    state.entitySearchQueries = []

    state.selectedEntities = new Map()
  },

  [LOAD_ENTITIES_ERROR] (state) {
    state.isEntitiesLoading = false
    state.isEntitiesLoadingError = true
  },

  [LOAD_ENTITIES_END] (
    state,
    { production, entityType, entities, userFilters, taskMap, taskTypeMap, personMap }
  ) {
    const validationColumns = {}
    let isDescription = false
    let isTime = false
    let isEstimation = false
    state.entityMap[entityType] = new Map()
    entities.forEach(entity => {
      const taskIds = []
      const validations = new Map()
      let timeSpent = 0
      let estimation = 0
      entity.project_name = production.name
      entity.production_id = production.id
      entity.full_name = helpers.getEntityName(entity)
      entity.tasks.forEach(task => {
        helpers.populateTask(task, entity, production)
        timeSpent += task.duration
        estimation += task.estimation

        taskMap.set(task.id, task)
        validations.set(task.task_type_id, task.id)
        taskIds.push(task.id)

        const taskType = taskTypeMap.get(task.task_type_id)
        if (!validationColumns[taskType.name]) {
          validationColumns[taskType.name] = taskType.id
        }
        if (task.assignees.length > 1) {
          task.assignees = task.assignees.sort((a, b) => {
            return personMap.get(a).name.localeCompare(personMap.get(b))
          })
        }
      })
      entity.tasks = taskIds
      entity.validations = validations
      entity.timeSpent = timeSpent
      entity.estimation = estimation

      if (!isTime && entity.timeSpent > 0) isTime = true
      if (!isEstimation && entity.estimation > 0) isEstimation = true
      if (!isDescription && entity.description) isDescription = true

      state.entityMap.set(entity.id, entity)
    })
    entities = sortEntities(entities)
    cache.entities[entityType] = entities
    cache.result = entities
    cache.entityIndex[entityType] = buildEntityIndex(entities)

    const displayedEntities = entities.slice(0, PAGE_SIZE)
    const filledColumns = getFilledColumns(displayedEntities)

    state.entityValidationColumns = helpers.sortValidationColumns(
      Object.values(validationColumns), filledColumns, taskTypeMap
    )

    state.nbValidationColumns = state.entityValidationColumns.length
    state.isEntityTime = isTime
    state.isEntityEstimation = isEstimation
    state.isEntityDescription = isDescription

    state.isEntitiesLoading = false
    state.isEntitiesLoadingError = false

    state.displayedEntities = displayedEntities
    state.entityFilledColumns = filledColumns

    const maxX = state.displayedEntities.length
    const maxY = state.nbValidationColumns
    state.entitySelectionGrid = buildSelectionGrid(maxX, maxY)
    helpers.setListStats(state, entities)

    if (userFilters.entity && userFilters.entity[production.id]) {
      state.entitySearchQueries = userFilters.entity[production.id]
    } else {
      state.entitySearchQueries = []
    }
  },

  [SAVE_ENTITY_SEARCH_END] (state, { searchQuery }) {
    state.entitySearchQueries.push(searchQuery)
    state.entitySearchQueries = sortByName(state.entitySearchQueries)
  },

  [REMOVE_ENTITY_SEARCH_END] (state, { searchQuery }) {
    const queryIndex = state.entitySearchQueries.findIndex(
      (query) => query.name === searchQuery.name
    )
    if (queryIndex >= 0) {
      state.entitySearchQueries.splice(queryIndex, 1)
    }
  },

  [LOAD_ENTITY_END] (state, { entity, taskTypeMap }) {
    entity.tasks.forEach((task) => {
      helpers.populateTask(task, entity)
    })
    entity.tasks = sortTasks(entity.tasks, taskTypeMap)
    state.entityMap.set(entity.id, entity)
  },

  [ENTITY_CSV_FILE_SELECTED] (state, formData) {
    state.entitiesCsvFormData = formData
  },
  [IMPORT_ENTITIES_END] (state) {
    state.entitiesCsvFormData = null
  },

  [LOAD_OPEN_PRODUCTIONS_END] (state, projects) {
    state.openProductions = projects
  },

  [ENTITY_ENTITY_END] (state, newEntity) {
    const entity = state.entityMap.get(newEntity.id)

    if (entity) {
      Object.assign(entity, newEntity)
    } else {
      cache.entities.push(newEntity)
      cache.entities = sortEntities(cache.entities)
      state.entityMap.set(newEntity.id, newEntity)

      const maxX = state.displayedEntities.length
      const maxY = state.nbValidationColumns
      state.entitySelectionGrid = buildSelectionGrid(maxX, maxY)
    }
    state.editEntity = {
      isLoading: false,
      isError: false
    }
    const entityType = newEntity.entityType
    cache.entityIndex[entityType] = buildEntityIndex(cache.entities[entityType])
    state.entityCreated = newEntity.name

    if (state.entitySearchText) {
      helpers.setListStats(state, cache.result)
    } else {
      helpers.setListStats(state, cache.entities)
    }

    if (!newEntity.data) newEntity.data = {}
    if (entity.description && !state.isEntityDescription) {
      state.isEntityDescription = true
    }
  },

  [RESTORE_ENTITY_END] (state, entityToRestore) {
    const entity = state.entityMap.get(entityToRestore.id)
    const entityType = entity.entityType
    entity.canceled = false
    cache.entityIndex[entityType] = buildEntityIndex(cache.entities[entityType])
  },

  [NEW_TASK_COMMENT_END] (state, { comment, taskId }) {},

  [SET_ENTITY_SEARCH] (state, payload) {
    const sorting = state.entitySorting
    payload.sorting = sorting
    helpers.buildResult(state, payload)
  },

  [NEW_ENTITY_END] (state, entity) {
    const entityType = entity.entityType
    entity.production_id = entity.project_id
    entity.preview_file_id = ''

    entity.tasks = []
    entity.validations = new Map()
    entity.data = {}

    cache.entities.push(entity)
    cache.entities = sortEntities(cache.entities)
    state.displayedEntities = cache.entities.slice(0, PAGE_SIZE)
    helpers.setListStats(state, cache.entities)
    state.entityFilledColumns = getFilledColumns(state.displayedEntities)
    state.entityMap.set(entity.id, entity)
    cache.entityIndex[entityType] = buildEntityIndex(cache.entities[entityType])

    const maxX = state.displayedEntities.length
    const maxY = state.nbValidationColumns
    state.entitySelectionGrid = buildSelectionGrid(maxX, maxY)
  },

  [CREATE_TASKS_END] (state, tasks) {
    tasks.forEach((task) => {
      if (task) {
        const entity = state.entityMap.get(task.entity_id)
        if (entity) {
          helpers.populateTask(task, entity)
          entity.validations.set(task.task_type_id, task.id)
          entity.tasks.push(task.id)
        }
      }
    })
  },

  [DISPLAY_MORE_ENTITIES] (state, {
    taskTypeMap,
    taskStatusMap,
    taskMap,
    production
  }) {
    const entities = cache.result
    const newLength = state.displayedEntities.length + PAGE_SIZE
    if (newLength < entities.length + PAGE_SIZE) {
      state.displayedEntities = entities.slice(
        0,
        state.displayedEntities.length + PAGE_SIZE
      )
      state.entityFilledColumns = getFilledColumns(state.displayedEntities)
      const previousX = Object.keys(state.entitySelectionGrid).length
      const maxX = state.displayedEntities.length
      const maxY = state.nbValidationColumns
      if (previousX >= 0) {
        state.entitySelectionGrid = appendSelectionGrid(
          state.entitySelectionGrid, previousX, maxX, maxY
        )
      }
    }
  },

  [SET_CURRENT_PRODUCTION] (state, production) {
    state.entitySearchText = ''
  },

  [SET_PREVIEW] (state, { entityId, taskId, previewId, taskMap }) {
    const entity = state.entityMap.get(entityId)
    if (entity) {
      entity.preview_file_id = previewId
      entity.tasks.forEach((taskId) => {
        const task = taskMap.get(taskId)
        if (task) task.entity.preview_file_id = previewId
      })
    }
  },

  [SET_ENTITY_LIST_SCROLL_POSITION] (state, scrollPosition) {
    state.entityListScrollPosition = scrollPosition
  },

  [REMOVE_SELECTED_TASK] (state, validationInfo) {
    if (state.entitySelectionGrid[0] &&
        state.entitySelectionGrid[validationInfo.x]) {
      state.entitySelectionGrid[validationInfo.x][validationInfo.y] = false
    }
  },

  [ADD_SELECTED_TASK] (state, validationInfo) {
    if (state.entitySelectionGrid[0] &&
        state.entitySelectionGrid[validationInfo.x]) {
      state.entitySelectionGrid[validationInfo.x][validationInfo.y] = true
      state.selectedEntities = new Map() // unselect all previously selected lines
    }
  },

  [CLEAR_SELECTED_TASKS] (state, validationInfo) {
    const tmpGrid = JSON.parse(JSON.stringify(state.entitySelectionGrid))
    state.entitySelectionGrid = clearSelectionGrid(tmpGrid)
  },

  [NEW_TASK_END] (state, task) {
    const entity = state.entityMap.get(task.entity_id)
    if (entity && task) {
      task = helpers.populateTask(task, entity)
      // Add Column if it is missing
      if (!state.entityValidationColumns.includes(task.task_type_id)) {
        state.entityValidationColumns.push(task.task_type_id)
        state.entityFilledColumns[task.task_type_id] = true
      }
      // Push task and readds the whole map to activate the realtime display.
      entity.tasks.push(task)
      if (!entity.validations) entity.validations = new Map()
      entity.validations.set(task.task_type_id, task.id)
      Vue.set(entity, 'validations', new Map(entity.validations))
    }
  },

  [DELETE_TASK_END] (state, task) {
    const entity = state.displayedEntities.find(
      (entity) => entity.id === task.entity_id
    )
    if (entity) {
      const validations = new Map(entity.validations)
      validations.delete(task.task_type_id)
      delete entity.validations
      Vue.set(entity, 'validations', validations)

      const taskIndex = entity.tasks.findIndex(
        (entityTaskId) => entityTaskId === task.id
      )
      entity.tasks.splice(taskIndex, 1)
    }
  },

  [ADD_SELECTED_TASKS] (state, selection) {
    let tmpGrid = JSON.parse(JSON.stringify(state.entitySelectionGrid))
    selection.forEach((validationInfo) => {
      if (!tmpGrid[validationInfo.x]) {
        tmpGrid = appendSelectionGrid(
          tmpGrid,
          Object.keys(tmpGrid).length,
          validationInfo.x + 1,
          state.nbValidationColumns
        )
      }
      if (tmpGrid[validationInfo.x]) {
        tmpGrid[validationInfo.x][validationInfo.y] = true
      }
    })
    state.selectedEntities = new Map() // unselect all previously selected lines
    state.entitySelectionGrid = tmpGrid
  },

  [ADD_ENTITY] (state, {
    taskTypeMap,
    taskMap,
    personMap,
    production,
    entity
  }) {
    const taskIds = []
    const validations = new Map()
    let timeSpent = 0
    let estimation = 0
    entity.project_name = production.name
    entity.production_id = production.id
    entity.tasks.forEach((task) => {
      helpers.populateTask(task, entity, production)
      timeSpent += task.duration
      estimation += task.estimation

      taskMap.set(task.id, task)
      validations.set(task.task_type_id, task.id)
      taskIds.push(task.id)

      if (task.assignees.length > 1) {
        task.assignees = task.assignees.sort((a, b) => {
          return personMap.get(a).name.localeCompare(personMap.get(b))
        })
      }
    })
    entity.tasks = taskIds
    entity.validations = validations
    entity.timeSpent = timeSpent
    entity.estimation = estimation

    cache.entities.push(entity)
    cache.entities = sortEntities(cache.entities)
    state.entityMap.set(entity.id, entity)

    state.displayedEntities.push(entity)
    state.displayedEntities = sortEntities(state.displayedEntities)
    state.displayedEntitiesLength = cache.entities.length
    state.entityFilledColumns = getFilledColumns(state.displayedEntities)

    const maxX = state.displayedEntities.length
    const maxY = state.nbValidationColumns
    state.entitySelectionGrid = buildSelectionGrid(maxX, maxY)
    state.entityMap.set(entity.id, entity)
  },

  [UPDATE_ENTITY] (state, entity) {
    const entityType = entity.entityType
    Object.assign(state.entityMap.get(entity.id), entity)
    cache.entityIndex[entityType] = buildEntityIndex(cache.entities[entityType])
  },

  [REMOVE_ENTITY] (state, entityToDelete) {
    const entityType = entityToDelete.entityType
    state.entityMap.delete(entityToDelete.id)
    cache.entities = removeModelFromList(cache.entities[entityType], entityToDelete)
    cache.result = removeModelFromList(cache.result[entityType], entityToDelete)
    cache.entityIndex[entityType] = buildEntityIndex(cache.entities[entityType])
    state.displayedEntities =
      removeModelFromList(state.displayedEntities, entityToDelete)
    if (entityToDelete.timeSpent) {
      state.displayedEntitiesTimeSpent -= entityToDelete.timeSpent
    }
    if (entityToDelete.estimation) {
      state.displayedEntitiesEstimation -= entityToDelete.estimation
    }
  },

  [CANCEL_ENTITY] (state, entity) {
    entity.canceled = true
  },

  [UPDATE_METADATA_DESCRIPTOR_END] (
    state, { descriptor, previousDescriptorFieldName }
  ) {
    if (descriptor.entity_type === 'Entity' && previousDescriptorFieldName) {
      cache.entities.forEach(entity => {
        entity.data[descriptor.field_name] =
          entity.data[previousDescriptorFieldName]
        delete entity.data[previousDescriptorFieldName]
      })
    }
  },

  [LOCK_ENTITY] (state, entity) {
    entity = state.entityMap.get(entity.id)
    if (entity) entity.lock = true
  },

  [UNLOCK_ENTITY] (state, entity) {
    entity = state.entityMap.get(entity.id)
    if (entity) entity.lock = false
  },

  [RESET_ALL] (state) {
    Object.assign(state, { ...initialState })

    cache.entities = {}
    cache.result = {}
    cache.entityIndex = {}
  },

  [SET_ENTITY_SELECTION] (state, { entity, selected }) {
    if (!selected && state.selectedEntities.has(entity.id)) {
      state.selectedEntities.delete(entity.id)
      state.selectedEntities = new Map(state.selectedEntities) // for reactivity
    }
    if (selected) {
      state.selectedEntities.set(entity.id, entity)
      state.selectedEntities = new Map(state.selectedEntities) // for reactivity
      const maxX = state.displayedEntities.length
      const maxY = state.nbValidationColumns
      // unselect previously selected tasks
      state.entitySelectionGrid = buildSelectionGrid(maxX, maxY)
    }
  },

  [SORT_VALIDATION_COLUMNS] (state, taskTypeMap) {
    const columns = [...state.entityValidationColumns]
    state.entityValidationColumns = []
    state.entityValidationColumns = helpers.sortValidationColumns(
      columns,
      state.entityFilledColumns,
      taskTypeMap
    )
  },

  [CLEAR_SELECTED_ENTITIES] (state) {
    state.selectedEntities = new Map()
  }
}

export default {
  state,
  getters,
  actions,
  mutations,
  cache
}
