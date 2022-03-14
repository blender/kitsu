<template>
<div class="columns fixed-page">
  <div class="column main-column">
    <div class="entities page">
      <div class="entity-list-header page-header">
        <div class="level header-title">
          <div class="level-left flexcolumn">
            <div class="filters-area flexcolumn-item">
              <div class="flexrow">
                <search-field
                  ref="entity-search-field"
                  :can-save="true"
                  :active="isSearchActive"
                  @change="onSearchChange"
                  @enter="(query) => isLongEntityList
                    ? applySearch(query)
                    : saveEntitySearch(query)"
                  @save="saveSearchQuery"
                  placeholder="ex: e01 ENTITY=wip"
                />
                <button-simple
                  class="flexrow-item"
                  :title="$t('entities.build_filter.title')"
                  icon="funnel"
                  @click="() => modals.isBuildFilterDisplayed = true"
                />
              </div>
            </div>
          </div>

          <div class="level-right">
            <div class="flexrow" v-if="!isCurrentUserClient">
              <show-assignations-button class="flexrow-item" />
              <show-infos-button class="flexrow-item" />
              <big-thumbnails-button class="flexrow-item" />
              <div class="flexrow-item"></div>
            </div>
            <div class="flexrow" v-if="isCurrentUserManager">
              <button-simple
                class="flexrow-item"
                :title="$t('entities.thumbnails.title')"
                icon="image"
                @click="showAddThumbnailsModal"
              />
              <button-simple
                class="flexrow-item"
                :title="$t('main.csv.import_file')"
                icon="upload"
                @click="showImportModal"
              />
              <button-simple
                class="flexrow-item"
                icon="download"
                :title="$t('main.csv.export_file')"
                @click="onExportClick"
              />
              <button-simple
                class="flexrow-item"
                :text="$t('entities.new_entity')"
                icon="plus"
                @click="showNewModal"
              />
            </div>
          </div>
        </div>

        <div class="query-list">
          <search-query-list
            :queries="entitySearchQueries"
            @change-search="changeSearch"
            @remove-search="removeSearchQuery"
            v-if="!isEntitiesLoading && !initialLoading"
          />
        </div>
      </div>

      <sorting-info
        :label="$t('main.sorted_by')"
        :sorting="entitySorting"
        @clear-sorting="onChangeSortClicked(null)"
        v-if="entitySorting && entitySorting.length > 0"
      />
      <entity-list
        ref="entity-list"
        :displayed-entities="displayedEntities"
        :is-loading="isEntitiesLoading || initialLoading"
        :is-error="isEntitiesLoadingError"
        :validation-columns="entityValidationColumns"
        @add-metadata="onAddMetadataClicked"
        @change-sort="onChangeSortClicked"
        @create-tasks="showCreateTasksModal"
        @delete-all-tasks="onDeleteAllTasksClicked"
        @delete-clicked="onDeleteClicked"
        @delete-metadata="onDeleteMetadataClicked"
        @edit-clicked="onEditClicked"
        @edit-metadata="onEditMetadataClicked"
        @field-changed="onFieldChanged"
        @metadata-changed="onMetadataChanged"
        @restore-clicked="onRestoreClicked"
        @scroll="saveScrollPosition"
        @entity-history="showEntityHistoryModal"
      />
    </div>
  </div>

  <div
    class="column side-column"
    v-if="nbSelectedTasks === 1"
  >
    <task-info
      :task="selectedTasks.values().next().value"
    />
  </div>

  <edit-entity-modal
    :active="modals.isNewDisplayed"
    :is-loading="loading.edit"
    :is-error="errors.edit"
    :entity-to-edit="entityToEdit"
    @cancel="modals.isNewDisplayed = false"
    @confirm="confirmEditEntity"
  />

  <delete-modal
    ref="delete-entity-modal"
    :active="modals.isDeleteDisplayed"
    :is-loading="loading.del"
    :is-error="errors.del"
    :text="deleteText()"
    :error-text="$t('entities.delete_error')"
    @cancel="modals.isDeleteDisplayed = false"
    @confirm="confirmDeleteEntity"
  />

  <delete-modal
    ref="restore-entity-modal"
    :active="modals.isRestoreDisplayed"
    :is-loading="loading.restore"
    :is-error="errors.restore"
    :text="restoreText()"
    :error-text="$t('entities.restore_error')"
    @cancel="modals.isRestoreDisplayed = false"
    @confirm="confirmRestoreEntity"
  />

  <delete-modal
    ref="delete-metadata-modal"
    :active="modals.isDeleteMetadataDisplayed"
    :is-loading="loading.deleteMetadata"
    :is-error="errors.deleteMetadata"
    @cancel="modals.isDeleteMetadataDisplayed = false"
    :text="$t('productions.metadata.delete_text')"
    :error-text="$t('productions.metadata.delete_error')"
    @confirm="confirmDeleteMetadata"
  />

  <hard-delete-modal
    ref="delete-all-tasks-modal"
    :active="modals.isDeleteAllTasksDisplayed"
    :is-loading="loading.deleteAllTasks"
    :is-error="errors.deleteAllTasks"
    :text="deleteAllTasksText()"
    :error-text="$t('tasks.delete_all_error')"
    :lock-text="deleteAllTasksLockText"
    :selection-option="true"
    @cancel="modals.isDeleteAllTasksDisplayed = false"
    @confirm="confirmDeleteAllTasks"
  />

  <import-render-modal
    :active="modals.isImportRenderDisplayed"
    :is-loading="loading.importing"
    :is-error="errors.importing"
    :import-error="errors.importingError"
    :parsed-csv="parsedCSV"
    :form-data="entitiesCsvFormData"
    :columns="columns"
    :dataMatchers="dataMatchers"
    @reupload="resetImport"
    @cancel="hideImportRenderModal"
    @confirm="uploadImportFile"
  />

  <import-modal
    ref="import-modal"
    :active="modals.isImportDisplayed"
    :is-loading="loading.importing"
    :is-error="errors.importing"
    :form-data="entitiesCsvFormData"
    :columns="columns"
    @cancel="hideImportModal"
    @confirm="renderImport"
  />

  <create-tasks-modal
    :active="modals.isCreateTasksDisplayed"
    :is-loading="loading.creatingTasks"
    :is-loading-stay="loading.creatingTasksStay"
    :is-error="errors.creatingTasks"
    :title="$t('tasks.create_tasks_entity')"
    :text="$t('tasks.create_tasks_entity_explaination')"
    :error-text="$t('tasks.create_tasks_entity_failed')"
    @cancel="hideCreateTasksModal"
    @confirm="confirmCreateTasks"
    @confirm-and-stay="confirmCreateTasksAndStay"
  />

  <add-metadata-modal
    :active="modals.isAddMetadataDisplayed"
    :is-loading="loading.addMetadata"
    :is-loading-stay="loading.addMetadata"
    :is-error="errors.addMetadata"
    :descriptor-to-edit="descriptorToEdit"
    @cancel="closeMetadataModal"
    @confirm="confirmAddMetadata"
  />

  <add-thumbnails-modal
    ref="add-thumbnails-modal"
    parent="entities"
    :active="modals.isAddThumbnailsDisplayed"
    :is-loading="loading.addThumbnails"
    :is-error="errors.addThumbnails"
    @cancel="hideAddThumbnailsModal"
    @confirm="confirmAddThumbnails"
  />

  <entity-history-modal
    :active="modals.isEntityHistoryDisplayed"
    :entity="historyEntity"
    @cancel="hideEntityHistoryModal"
  />

  <build-filter-modal
    ref="build-filter-modal"
    :active="modals.isBuildFilterDisplayed"
    entity-type="entity"
    @cancel="modals.isBuildFilterDisplayed = false"
    @confirm="confirmBuildFilter"
  />
</div>
</template>

<script>
import moment from 'moment'
import { mapGetters, mapActions } from 'vuex'
import csv from '../../lib/csv'
import func from '../../lib/func'
import { sortByName } from '../../lib/sorting'
import stringHelpers from '../../lib/string'

import { searchMixin } from '../mixins/search'
import { entitiesMixin } from '../mixins/entities'

import AddMetadataModal from '../modals/AddMetadataModal'
import AddThumbnailsModal from '../modals/AddThumbnailsModal'
import BigThumbnailsButton from '../widgets/BigThumbnailsButton'
import BuildFilterModal from '../modals/BuildFilterModal'
import ButtonSimple from '../widgets/ButtonSimple'
import CreateTasksModal from '../modals/CreateTasksModal'
import DeleteModal from '../modals/DeleteModal'
import EditEntityModal from '../modals/EditEntityModal'
import ImportRenderModal from '../modals/ImportRenderModal'
import ImportModal from '../modals/ImportModal'
import HardDeleteModal from '../modals/HardDeleteModal'
import SearchField from '../widgets/SearchField'
import SearchQueryList from '../widgets/SearchQueryList'
import SortingInfo from '../widgets/SortingInfo'
import ShowAssignationsButton from '../widgets/ShowAssignationsButton'
import ShowInfosButton from '../widgets/ShowInfosButton'
import EntityHistoryModal from '../modals/EntityHistoryModal'
import EntityList from '../lists/EntityList.vue'
import TaskInfo from '../sides/TaskInfo.vue'

export default {
  name: 'entities',
  mixins: [searchMixin, entitiesMixin],

  components: {
    AddMetadataModal,
    AddThumbnailsModal,
    BigThumbnailsButton,
    BuildFilterModal,
    ButtonSimple,
    CreateTasksModal,
    DeleteModal,
    EditEntityModal,
    ImportModal,
    HardDeleteModal,
    ImportRenderModal,
    SearchField,
    SearchQueryList,
    SortingInfo,
    EntityHistoryModal,
    ShowAssignationsButton,
    ShowInfosButton,
    EntityList,
    TaskInfo
  },

  data () {
    return {
      entityType: '',
      initialLoading: true,
      deleteAllTasksLockText: null,
      descriptorToEdit: {},
      formData: null,
      isSearchActive: false,
      historyEntity: {},
      parsedCSV: [],
      entityToDelete: null,
      entityToEdit: null,
      taskTypeForTaskDeletion: null,
      modals: {
        isAddMetadataDisplayed: false,
        isAddThumbnailsDisplayed: false,
        isBuildFilterDisplayed: false,
        isCreateTasksDisplayed: false,
        isDeleteDisplayed: false,
        isDeleteMetadataDisplayed: false,
        isDeleteAllTasksDisplayed: false,
        isImportRenderDisplayed: false,
        isImportDisplayed: false,
        isNewDisplayed: false,
        isRestoreDisplayed: false,
        isEntityHistoryDisplayed: false
      },
      loading: {
        addMetadata: false,
        addThumbnails: false,
        creatingTasks: false,
        creatingTasksStay: false,
        deleteAllTasks: false,
        deleteMetadata: false,
        edit: false,
        del: false,
        importing: false,
        restore: false,
        stay: false
      },
      errors: {
        addMetadata: false,
        deleteMetadata: false,
        creatingTasks: false,
        deleteAllTasks: false,
        importing: false,
        importingError: null
      }
    }
  },

  beforeDestroy () {
    this.clearSelectedEntities()
  },

  created () {
    this.setLastProductionScreen('entities')
  },

  mounted () {
    // FIXME(anna): use EntityType.slug, make a helper in store for getting it
    this.entityType = this.$route.params.entity_type[0].toUpperCase() + this.$route.params.entity_type.substring(1)
    let searchQuery = ''
    if (this.entitySearchText.length > 0) {
      this.searchField.setValue(this.entitySearchText)
    }
    if (this.$route.query.search && this.$route.query.search.length > 0) {
      searchQuery = '' + this.$route.query.search
    }
    this.$refs['entity-list'].setScrollPosition(
      this.entityListScrollPosition
    )
    this.onSearchChange()
    this.$refs['entity-list'].setScrollPosition(
      this.entityListScrollPosition
    )
    const finalize = () => {
      if (this.$refs['entity-list']) {
        this.$refs['entity-search-field'].setValue(searchQuery)
        this.onSearchChange()
        this.$refs['entity-list'].setScrollPosition(
          this.entityListScrollPosition
        )
      }
    }

    if (
      this.entityMap.size < 2 ||
      (
        this.entityValidationColumns.length > 0 &&
        !this.entityMap.get(this.entityMap.keys().next().value).validations
      )
    ) {
      setTimeout(() => {
        this.loadEntities(this.entityType)
          .then(() => {
            setTimeout(() => {
              this.initialLoading = false
              finalize()
            }, 500)
          })
      }, 0)
    } else {
      if (!this.isEntitiesLoading) this.initialLoading = false
      finalize()
    }
  },

  computed: {
    ...mapGetters([
      'currentEpisode',
      'currentProduction',
      'displayedEntities',
      'episodeMap',
      'episodes',
      'isCurrentUserClient',
      'isCurrentUserManager',
      'isEntityDescription',
      'isEntityEstimation',
      'isEntityTime',
      'isEntitiesLoading',
      'isEntitiesLoadingError',
      'isShowAssignations',
      'isTVShow',
      'nbSelectedTasks',
      'openProductions',
      'selectedTasks',
      'isLongEntityList',
      'entityMap',
      'entityFilledColumns',
      'entitiesCsvFormData',
      'entitySearchQueries',
      'entitySearchText',
      'entityValidationColumns',
      'entityListScrollPosition',
      'entitySorting',
      'taskTypeMap'
    ]),

    searchField () {
      return this.$refs['entity-search-field']
    },

    addThumbnailsModal () {
      return this.$refs['add-thumbnails-modal']
    },

    columns () {
      const collection = [
        'Name',
        'Description'
      ]
      if (this.isTVShow) {
        collection.unshift('Episode')
      }
      return collection
    },

    dataMatchers () {
      const collection = [
        'Name'
      ]
      if (this.isTVShow) {
        collection.unshift('Episode')
      }
      return collection
    },

    filteredEntities () {
      return this.displayedEntities
    },

    metadataDescriptors () {
      return this.entityMetadataDescriptors
    }
  },

  methods: {
    ...mapActions([
      'addMetadataDescriptor',
      'createTasks',
      'changeEntitySort',
      'clearSelectedEntities',
      'commentTaskWithPreview',
      'deleteAllEntityTasks',
      'deleteEntity',
      'deleteMetadataDescriptor',
      'editEntity',
      'getEntitiesCsvLines',
      'hideAssignations',
      'loadEpisodes',
      'loadEntities',
      'newEntity',
      'removeEntitySearch',
      'restoreEntity',
      'saveEntitySearch',
      'setLastProductionScreen',
      'setPreview',
      'setEntitySearch',
      'showAssignations',
      'uploadEntityFile'
    ]),

    confirmAddMetadata (form) {
      this.loading.addMetadata = true
      form.entity_type = 'Entity'
      this.addMetadataDescriptor(form)
        .then(() => {
          this.loading.addMetadata = false
          this.modals.isAddMetadataDisplayed = false
        })
        .catch((err) => {
          console.error(err)
          this.loading.addMetadata = false
          this.errors.addMetadata = true
        })
    },

    closeMetadataModal () {
      this.modals.isAddMetadataDisplayed = false
    },

    confirmDeleteMetadata () {
      this.errors.deleteMetadata = false
      this.loading.deleteMetadata = true
      this.deleteMetadataDescriptor(this.descriptorIdToDelete)
        .then(() => {
          this.errors.deleteMetadata = false
          this.loading.deleteMetadata = false
          this.modals.isDeleteMetadataDisplayed = false
        }).catch((err) => {
          console.error(err)
          this.errors.deleteMetadata = true
          this.loading.deleteMetadata = false
        })
    },

    onAddMetadataClicked () {
      this.descriptorToEdit = {}
      this.modals.isAddMetadataDisplayed = true
    },

    onDeleteMetadataClicked (descriptorId) {
      this.descriptorIdToDelete = descriptorId
      this.modals.isDeleteMetadataDisplayed = true
    },

    onDeleteClicked (entity) {
      this.entityToDelete = entity
      this.modals.isDeleteDisplayed = true
    },

    showNewModal () {
      this.entityToEdit = {}
      this.modals.isNewDisplayed = true
    },

    onEditClicked (entity) {
      this.entityToEdit = entity
      this.modals.isNewDisplayed = true
    },

    onRestoreClicked (entity) {
      this.entityToRestore = entity
      this.modals.isRestoreDisplayed = true
    },

    onEditMetadataClicked (descriptorId) {
      this.descriptorToEdit = this.currentProduction.descriptors.find(
        d => d.id === descriptorId
      )
      this.modals.isAddMetadataDisplayed = true
    },

    confirmEditEntity (form) {
      let action = 'newEntity'
      this.loading.edit = true
      this.errors.edit = false
      if (this.entityToEdit && this.entityToEdit.id) {
        action = 'editEntity'
        form.id = this.entityToEdit.id
      }
      this[action](form)
        .then((form) => {
          this.loading.edit = false
          this.modals.isNewDisplayed = false
        })
        .catch((err) => {
          console.error(err)
          this.loading.edit = false
          this.errors.edit = true
        })
    },

    confirmDeleteAllTasks (selectionOnly) {
      const taskTypeId = this.taskTypeForTaskDeletion.id
      const projectId = this.currentProduction.id
      this.errors.deleteAllTasks = false
      this.loading.deleteAllTasks = true
      this.deleteAllEntityTasks({ projectId, taskTypeId, selectionOnly })
        .then(() => {
          this.loading.deleteAllTasks = false
          this.modals.isDeleteAllTasksDisplayed = false
        }).catch((err) => {
          console.error(err)
          this.loading.deleteAllTasks = false
          this.errors.deleteAllTasks = true
        })
    },

    confirmDeleteEntity () {
      this.loading.del = true
      this.errors.del = false
      this.deleteEntity(this.entityToDelete)
        .then(() => {
          this.loading.del = false
          this.modals.isDeleteDisplayed = false
        })
        .catch((err) => {
          console.error(err)
          this.loading.del = false
          this.errors.del = true
        })
    },

    confirmRestoreEntity () {
      this.loading.restore = true
      this.errors.restore = false
      this.restoreEntity(this.editToRestore)
        .then(() => {
          this.loading.restore = false
          this.modals.isRestoreDisplayed = false
        })
        .catch((err) => {
          console.error(err)
          this.loading.restore = false
          this.errors.restore = true
        })
    },

    confirmAddThumbnails (forms) {
      const addPreview = (form) => {
        this.addThumbnailsModal.markLoading(form.task.entity_id)
        return this.commentTaskWithPreview({
          taskId: form.task.id,
          commentText: '',
          taskStatusId: form.task.task_status_id,
          form: form
        })
          .then(({ newComment, preview }) => {
            return this.setPreview({
              taskId: form.task.id,
              entityId: form.task.entity_id,
              previewId: preview.id
            })
          })
          .then(() => {
            this.addThumbnailsModal.markUploaded(form.task.entity_id)
            return Promise.resolve()
          })
      }
      this.loading.addThumbnails = true
      func.runPromiseMapAsSeries(forms, addPreview)
        .then(() => {
          this.loading.addThumbnails = false
          this.modals.isAddThumbnailsDisplayed = false
        })
    },

    confirmCreateTasks ({ form, selectionOnly }) {
      this.loading.creatingTasks = true
      this.runTasksCreation(form, selectionOnly)
        .then(() => {
          this.reset()
          this.hideCreateTasksModal()
          this.loading.creatingTasks = false
        })
        .catch(err => {
          this.errors.creatingTasks = true
          console.error(err)
        })
    },

    confirmCreateTasksAndStay ({ form, selectionOnly }) {
      this.loading.creatingTasksStay = true
      this.runTasksCreation(form, selectionOnly)
        .then(() => {
          this.reset()
          this.loading.creatingTasksStay = false
        })
        .catch(err => {
          this.errors.creatingTasks = true
          console.error(err)
        })
    },

    runTasksCreation (form, selectionOnly) {
      this.errors.creatingTasks = false
      return this.createTasks({
        type: 'entities',
        task_type_id: form.task_type_id,
        project_id: this.currentProduction.id,
        selectionOnly
      })
    },

    reset () {
      this.initialLoading = true
      this.loadEntities(this.entityType, (err) => {
        if (err) console.error(err)
        this.initialLoading = false
      })
    },

    resetEditModal () {
      const form = { name: '' }
      if (this.openProductions.length > 0) {
        form.production_id = this.openProductions[0].id
      }
      this.editToEdit = form
    },

    deleteText () {
      const entity = this.editToDelete
      if (
        entity &&
        (entity.canceled || !entity.tasks || entity.tasks.length === 0)
      ) {
        return this.$t('entities.delete_text', { name: entity.name })
      } else if (entity) {
        return this.$t('entities.cancel_text', { name: entity.name })
      } else {
        return ''
      }
    },

    deleteAllTasksText () {
      const taskType = this.taskTypeForTaskDeletion
      if (taskType) {
        return this.$t('tasks.delete_all_text', { name: taskType.name })
      } else {
        return ''
      }
    },

    restoreText () {
      const entity = this.editToRestore
      if (entity) {
        return this.$t('entities.restore_text', { name: entity.name })
      } else {
        return ''
      }
    },

    renderImport (data, mode) {
      this.loading.importing = true
      this.errors.importing = false
      this.formData = data
      if (mode === 'file') {
        data = data.get('file')
      }
      csv.processCSV(data)
        .then((results) => {
          this.parsedCSV = results
          this.hideImportModal()
          this.loading.importing = false
          this.showImportRenderModal()
        })
    },

    uploadImportFile (data, toUpdate) {
      const formData = new FormData()
      const filename = 'import.csv'
      const csvContent = csv.turnEntriesToCsvString(data)
      const file = new File([csvContent], filename, { type: 'text/csv' })

      formData.append('file', file)

      this.loading.importing = true
      this.errors.importing = false
      this.$store.commit('EDIT_CSV_FILE_SELECTED', formData)

      this.uploadEntityFile(toUpdate)
        .then(() => {
          this.loading.importing = false
          this.loadEpisodes()
            .catch(console.error)
          this.hideImportRenderModal()
          this.loadEntities(this.entityType)
        })
        .catch(err => {
          console.error(err)
          this.loading.importing = false
          this.loading.importingError = err
          this.errors.importing = true
        })
    },

    resetImport () {
      this.errors.importing = false
      this.hideImportRenderModal()
      this.$store.commit('EDIT_CSV_FILE_SELECTED', null)
      this.$refs['import-modal'].reset()
      this.showImportModal()
    },

    onDeleteAllTasksClicked (taskTypeId) {
      const taskType = this.taskTypeMap.get(taskTypeId)
      this.taskTypeForTaskDeletion = taskType
      this.deleteAllTasksLockText = taskType.name
      this.modals.isDeleteAllTasksDisplayed = true
    },

    onSearchChange () {
      if (!this.searchField) return
      this.isSearchActive = false
      const searchQuery = this.searchField.getValue()
      console.log('onSearchChange', searchQuery, this.searchField, searchQuery.length === 0)
      if (searchQuery.length === 0 && this.isLongEntityList) {
        console.log(2)
        this.applySearch('')
      } else if (searchQuery.length !== 0 && !this.isLongEntityList) {
        console.log(1)
        this.applySearch(searchQuery)
      }
      // TODO(anna): why was it !== 1 and not !== 0 ?
    },

    saveScrollPosition (scrollPosition) {
      this.$store.commit(
        'SET_EDIT_LIST_SCROLL_POSITION',
        scrollPosition
      )
    },

    applySearch (entitySearch) {
      this.setEntitySearch({ entityType: this.entityType, entitySearch })
      this.setSearchInUrl()
      this.isSearchActive = true
    },

    saveSearchQuery (searchQuery) {
      this.saveEntitySearch(searchQuery)
        .catch(console.error)
    },

    removeSearchQuery (searchQuery) {
      this.removeEntitySearch(searchQuery)
        .catch(console.error)
    },

    getPath (section) {
      const route = {
        name: section,
        params: {
          production_id: this.currentProduction.id
        }
      }
      if (this.isTVShow && this.currentEpisode) {
        route.name = `episode-${section}`
        route.params.episode_id = this.currentEpisode.id
      }
      return route
    },

    showEntityHistoryModal (entity) {
      this.historyEntity = entity
      this.modals.isEntityHistoryDisplayed = true
    },

    hideEntityHistoryModal () {
      this.modals.isEntityHistoryDisplayed = false
    },

    onExportClick () {
      this.getEntitiesCsvLines()
        .then((editLines) => {
          const nameData = [
            moment().format('YYYY-MM-DD'),
            'kitsu',
            this.currentProduction.name,
            this.$t('entities.title')
          ]
          if (this.currentEpisode) {
            nameData.splice(3, 0, this.currentEpisode.name)
          }
          const name = stringHelpers.slugify(nameData.join('_'))
          const headers = [
            this.$t('entities.fields.name'),
            this.$t('entities.fields.description')
          ]
          if (this.currentEpisode) {
            headers.splice(0, 0, 'Episode')
          }
          sortByName([...this.currentProduction.descriptors])
            .filter(d => d.entity_type === 'Entity')
            .forEach((descriptor) => {
              headers.push(descriptor.name)
            })
          if (this.isEntityTime) {
            headers.push(this.$t('entities.fields.time_spent'))
          }
          if (this.isEntityEstimation) {
            headers.push(this.$t('main.estimation_short'))
          }
          this.editValidationColumns
            .forEach((taskTypeId) => {
              headers.push(this.taskTypeMap.get(taskTypeId).name)
              headers.push('Assignations')
            })
          csv.buildCsvFile(name, [headers].concat(editLines))
        })
    },

    onChangeSortClicked (sortInfo) {
      this.changeEntitySort(sortInfo)
    },

    confirmBuildFilter (query) {
      this.modals.isBuildFilterDisplayed = false
      this.$refs['entity-search-field'].setValue(query)
      this.applySearch(query)
    },

    onFieldChanged ({ entry, fieldName, value }) {
      const data = {
        id: entry.id,
        description: entry.description
      }
      data[fieldName] = value
      this.editEntity(data)
    },

    onMetadataChanged ({ entry, descriptor, value }) {
      const metadata = { ...entry.data }
      metadata[descriptor.field_name] = value
      const data = {
        id: entry.id,
        description: entry.description,
        data: metadata
      }
      this.editEntity(data)
    }
  },

  watch: {
    $route () {
      if (!this.$route.query) return
      const search = this.$route.query.search
      const actualSearch = this.$refs['entity-search-field'].getValue()
      if (search !== actualSearch) {
        this.searchField.setValue(search)
        this.applySearch(search)
      }
    },

    currentProduction () {
      this.$refs['entity-search-field'].setValue('')
      this.$store.commit('SET_EDIT_LIST_SCROLL_POSITION', 0)
      this.initialLoading = true
      if (!this.isTVShow) this.reset()
    },

    currentEpisode () {
      this.$refs['entity-search-field'].setValue('')
      this.$store.commit('SET_EDIT_LIST_SCROLL_POSITION', 0)
      if (this.isTVShow && this.currentEpisode) this.reset()
    },

    isEntitiesLoading () {
      if (!this.isEntitiesLoading) {
        let searchQuery = ''
        if (
          this.$route.query.search &&
          this.$route.query.search.length > 0
        ) {
          searchQuery = '' + this.$route.query.search
        }
        this.initialLoading = false
        this.$refs['entity-search-field'].setValue(searchQuery)
        this.$nextTick(() => {
          this.applySearch(searchQuery)
        })
        if (this.$refs['entity-list']) {
          this.$refs['entity-list'].setScrollPosition(
            this.editListScrollPosition
          )
        }
      }
    }
  },

  metaInfo () {
    if (this.isTVShow) {
      return {
        title: `${this.currentProduction ? this.currentProduction.name : ''}` +
               ` - ${this.currentEpisode ? this.currentEpisode.name : ''}` +
               ` | ${this.$t('entities.title')} - Kitsu`
      }
    } else {
      return {
        title: `${this.currentProduction.name} ${this.$t('entities.title')} - Kitsu`
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.data-list {
  margin-top: 0;
}

.page-header {
  margin-bottom: 1em;
}

.level {
  align-items: flex-start;
}

.flexcolumn {
  align-items: flex-start;
}

.entities {
  display: flex;
  flex-direction: column;
}

.columns {
  display: flex;
  flex-direction: row;
  padding: 0;
}

.column {
  overflow-y: auto;
  padding: 0;
}

.main-column {
  border-right: 3px solid $light-grey;
}
</style>
