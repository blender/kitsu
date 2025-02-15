<template>
  <div class="episodes page fixed-page">
    <div class="episode-list-header page-header flexrow">
      <search-field
        class="flexrow-item mt1"
        ref="episode-search-field"
        @change="onSearchChange"
        placeholder="ex: e01 s01, anim=wip"
      />
      <combobox
        class="mb0 flexrow-item"
        locale-key-prefix="statistics."
        :label="$t('statistics.data_mode')"
        :options="dataModeOptions"
        v-model="dataMode"
      />
      <combobox
        class="mb0 flexrow-item"
        locale-key-prefix="statistics."
        :label="$t('statistics.display_mode')"
        :options="displayModeOptions"
        v-model="displayMode"
      />
      <combobox
        class="mb0 flexrow-item"
        :label="$t('statistics.count_mode')"
        locale-key-prefix="statistics."
        :options="countModeOptions"
        v-model="countMode"
      />
      <span class="filler"></span>
      <button-simple
        class="flexrow-item"
        icon="refresh"
        :title="$t('main.reload')"
        @click="reset"
      />
      <button-simple
        class="flexrow-item"
        icon="download"
        @click="exportStatisticsToCsv"
      />
    </div>

    <episode-list
      ref="episode-list"
      :entries="displayedEpisodes"
      :is-loading="isLoading"
      :is-error="isLoadingError"
      :validation-columns="episodeValidationColumns"
      :episode-stats="episodeStats"
      :episode-retakes-stats="episodeRetakeStats"
      :data-mode="dataMode"
      :count-mode="countMode"
      :display-mode="displayMode"
      :show-all="episodeSearchText.length === 0"
      @delete-clicked="onDeleteClicked"
      @edit-clicked="onEditClicked"
      @field-changed="onFieldChanged"
      @scroll="saveScrollPosition"
    />

    <edit-episode-modal
      :active="modals.isNewDisplayed"
      :is-loading="loading.edit"
      :is-error="errors.edit"
      :episode-to-edit="episodeToEdit"
      @cancel="modals.isNewDisplayed = false"
      @confirm="confirmEditEpisode"
    />

    <hard-delete-modal
      :active="modals.isDeleteDisplayed"
      :is-loading="loading.del"
      :is-error="errors.del"
      :text="deleteText()"
      :error-text="$t('episodes.delete_error')"
      :lock-text="episodeToDelete ? episodeToDelete.name : ''"
      @cancel="modals.isDeleteDisplayed = false"
      @confirm="confirmDeleteEpisode"
    />
  </div>
</template>

<script>
import moment from 'moment'
import { mapGetters, mapActions } from 'vuex'
import csv from '@/lib/csv'
import stringHelpers from '@/lib/string'

import ButtonSimple from '@/components/widgets/ButtonSimple'
import Combobox from '@/components/widgets/Combobox'
import HardDeleteModal from '@/components/modals/HardDeleteModal'
import EditEpisodeModal from '@/components/modals/EditEpisodeModal'
import EpisodeList from '@/components/lists/EpisodeList.vue'
import SearchField from '@/components/widgets/SearchField'

export default {
  name: 'episodes',

  components: {
    ButtonSimple,
    Combobox,
    EpisodeList,
    EditEpisodeModal,
    HardDeleteModal,
    SearchField
  },

  data () {
    return {
      countMode: 'count',
      dataMode: 'retakes',
      displayMode: 'pie',
      episodeToDelete: null,
      episodeToEdit: null,
      isLoading: true,
      isLoadingError: false,
      countModeOptions: [
        { label: 'shots', value: 'count' },
        { label: 'frames', value: 'frames' }
      ],
      dataModeOptions: [
        { label: 'retakes', value: 'retakes' },
        { label: 'status', value: 'status' }
      ],
      displayModeOptions: [
        { label: 'pie', value: 'pie' },
        { label: 'count', value: 'count' }
      ],
      errors: {
        edit: false,
        del: false
      },
      modals: {
        isNewDisplayed: false,
        isDeleteDisplayed: false
      },
      loading: {
        edit: false,
        del: false
      }
    }
  },

  mounted () {
    this.setDefaultSearchText()
    this.setDefaultListScrollPosition()
    this.isLoading = true
    this.isLoadingError = false
    this.initEpisodes()
      .then(() => {
        this.isLoading = false
      })
      .catch(err => {
        this.isLoading = false
        this.isLoadingError = true
        console.error(err)
      })
  },

  computed: {
    ...mapGetters([
      'currentProduction',
      'displayedEpisodes',
      'episodesPath',
      'isCurrentUserManager',
      'episodes',
      'episodeMap',
      'episodePath',
      'episodeStats',
      'episodeRetakeStats',
      'episodeSearchText',
      'episodeListScrollPosition',
      'episodeValidationColumns',
      'taskStatusMap',
      'taskTypeMap'
    ]),

    isRetakeDataMode () { return this.dataMode === 'retakes' }
  },

  methods: {
    ...mapActions([
      'computeEpisodeStats',
      'deleteEpisode',
      'editEpisode',
      'hideAssignations',
      'initEpisodes',
      'loadEpisodeStats',
      'loadEpisodeRetakeStats',
      'loadShots',
      'setLastProductionScreen',
      'setEpisodeSearch',
      'setEpisodeListScrollPosition',
      'showAssignations'
    ]),

    setDefaultSearchText () {
      if (this.episodeSearchText.length > 0) {
        this.$refs['episode-search-field'].setValue(this.episodeSearchText)
      }
    },

    setDefaultListScrollPosition () {
      this.$refs['episode-list'].setScrollPosition(
        this.episodeListScrollPosition
      )
    },

    navigateToList () {
      this.$router.push(this.episodesPath)
    },

    onEditClicked (episode) {
      this.episodeToEdit = episode
      this.modals.isNewDisplayed = true
    },

    onDeleteClicked (episode) {
      this.episodeToDelete = episode
      this.modals.isDeleteDisplayed = true
    },

    confirmEditEpisode (form) {
      this.loading.edit = true
      this.errors.edit = false

      this.editEpisode(form)
        .then(() => {
          this.loading.edit = false
          this.modals.isNewDisplayed = false
        })
        .catch(() => {
          this.loading.edit = false
          this.errors.edit = true
        })
    },

    confirmDeleteEpisode () {
      this.loading.del = true
      this.errors.edit = false

      this.deleteEpisode(this.episodeToDelete)
        .then(() => {
          this.loading.del = false
          this.modals.isDeleteDisplayed = false
        }).catch(() => {
          this.loading.del = false
          this.errors.delete = true
        })
    },

    resetEditModal () {
      const form = { name: '' }
      if (this.episodes.length > 0) {
        form.episode_id = this.episodes[0].id
      }
      if (this.openProductions.length > 0) {
        form.production_id = this.openProductions[0].id
      }
      this.episodeToEdit = form
    },

    deleteText () {
      const episode = this.episodeToDelete
      if (episode) {
        return this.$t('episodes.delete_text', { name: episode.name })
      } else {
        return ''
      }
    },

    onSearchChange (event) {
      const searchQuery = this.$refs['episode-search-field'].getValue()
      this.setEpisodeSearch(searchQuery)
    },

    saveScrollPosition (scrollPosition) {
      this.setEpisodeListScrollPosition(scrollPosition)
    },

    exportStatisticsToCsv () {
      const nameData = [
        moment().format('YYYYMMDD'),
        this.currentProduction.name,
        'episodes',
        'statistics'
      ]
      if (this.isRetakeDataMode) nameData.splice(3, 0, 'retake')
      const name = stringHelpers.slugify(nameData.join('_'))
      if (this.isRetakeDataMode) {
        csv.generateRetakeStatReports(
          name,
          this.episodeRetakeStats,
          this.taskTypeMap,
          this.taskStatusMap,
          this.episodeMap,
          this.countMode
        )
      } else {
        csv.generateStatReports(
          name,
          this.episodeStats,
          this.taskTypeMap,
          this.taskStatusMap,
          this.episodeMap,
          this.countMode
        )
      }
    },

    onFieldChanged ({ entry, fieldName, value }) {
      const data = { id: entry.id }
      data[fieldName] = value
      this.editEpisode(data)
    },

    reset () {
      this.isLoading = true
      this.isLoadingError = false
      this.loadEpisodeStats(this.currentProduction.id)
        .then(() => {
          return this.loadEpisodeRetakeStats(this.currentProduction.id)
        })
        .then(() => {
          this.isLoading = false
        })
        .catch(err => {
          this.isLoading = false
          this.isLoadingError = true
          console.error(err)
        })
    }
  },

  watch: {
    displayedEpisodes () {
    },

    currentProduction () {
      this.$refs['episode-search-field'].setValue('')
      this.$store.commit('SET_SEQUENCE_LIST_SCROLL_POSITION', 0)
      this.reset()
    }
  },

  metaInfo () {
    return {
      title: `${this.currentProduction.name} ${this.$t('episodes.title')} - Kitsu`
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
