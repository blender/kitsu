<template>
  <div class="entity-types page fixed-page">

    <list-page-header
      :title="$t('custom_entity_types.title')"
      :new-entry-label="$t('custom_entity_types.new_entity_type')"
      @new-clicked="onNewClicked"
    />

    <entity-type-list
      class="mt2"
      :entries="customEntityTypes"
      :canEditEntries="true"
      :is-loading="loading.list"
      :is-error="errors.list"
      @edit-clicked="onEditClicked"
      @delete-clicked="onDeleteClicked"
    />

    <edit-entity-type-modal
      :active="modals.edit"
      :title="$t('custom_entity_types.new_entity_type')"
      :is-loading="loading.edit"
      :is-error="errors.edit"
      :entity-type-to-edit="entityTypeToEdit"
      @cancel="modals.edit = false"
      @confirm="confirmEditEntityType"
    />

    <delete-modal
      :active="modals.del"
      :is-loading="loading.del"
      :is-error="errors.del"
      :text="deleteText"
      :error-text="$t('custom_entity_types.delete_error')"
      @cancel="modals.del = false"
      @confirm="confirmDeleteEntityType"
    />
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import EntityTypeList from '../lists/EntityTypeList'
import DeleteModal from '../modals/DeleteModal'
import EditEntityTypeModal from '../modals/EditEntityTypeModal'
import ListPageHeader from '../widgets/ListPageHeader'

export default {
  name: 'entity-types',

  components: {
    EntityTypeList,
    DeleteModal,
    EditEntityTypeModal,
    ListPageHeader
  },

  data () {
    return {
      entityTypeToDelete: null,
      entityTypeToEdit: {},
      choices: [],
      errors: {
        del: false,
        edit: false,
        list: false
      },
      modals: {
        del: false,
        edit: false
      },
      loading: {
        del: false,
        edit: false,
        list: true
      }
    }
  },

  computed: {
    ...mapGetters([
      'customEntityTypes'
    ]),

    deleteText () {
      const entityType = this.entityTypeToDelete
      if (entityType) {
        return this.$t('custom_entity_types.delete_text', { name: entityType.name })
      } else {
        return ''
      }
    }
  },

  methods: {
    ...mapActions([
      'deleteEntityType',
      'editEntityType',
      'newEntityType',
      'loadEntityTypes'
    ]),

    confirmEditEntityType (form) {
      let action = 'newEntityType'
      if (this.entityTypeToEdit && this.entityTypeToEdit.id) {
        action = 'editEntityType'
        form.id = this.entityTypeToEdit.id
      }

      this.loading.edit = true
      this.errors.edit = false
      this[action](form)
        .then(() => {
          this.loading.edit = false
          this.modals.edit = false
        })
        .catch((err) => {
          console.error(err)
          this.loading.edit = false
          this.errors.edit = true
        })
    },

    confirmDeleteEntityType () {
      this.loading.del = true
      this.errors.del = false
      this.deleteEntityType(this.entityTypeToDelete)
        .then(() => {
          this.loading.del = false
          this.modals.del = false
        })
        .catch((err) => {
          console.error(err)
          this.errors.del = true
          this.loading.del = false
        })
    },

    onNewClicked () {
      this.entityTypeToEdit = {}
      this.errors.edit = false
      this.modals.edit = true
    },

    onEditClicked (entityType) {
      this.entityTypeToEdit = entityType
      this.errors.edit = false
      this.modals.edit = true
    },

    onDeleteClicked (entityType) {
      this.entityTypeToDelete = entityType
      this.errors.del = false
      this.modals.del = true
    }
  },

  watch: {
  },

  beforeMount () {
    this.loadEntityTypes()
      .then(() => {
        this.loading.list = false
      })
      .catch((err) => {
        console.error(err)
      })
  },

  metaInfo () {
    return {
      title: `${this.$t('custom_entity_types.title')} - Kitsu`
    }
  }

}
</script>

<style lang="scss" scoped>
</style>
