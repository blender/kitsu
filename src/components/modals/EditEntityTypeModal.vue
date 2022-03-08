<template>
<div :class="{
  'modal': true,
  'is-active': active
}">
  <div class="modal-background" @click="$emit('cancel')" ></div>

  <div class="modal-content">

    <div class="box">
      <h1 class="title" v-if="entityTypeToEdit && entityTypeToEdit.id">
        {{ title }} {{ entityTypeToEdit.name }}
      </h1>
      <h1 class="title" v-else>
        {{ title }}
      </h1>

      <form v-on:submit.prevent>
        <text-field
          ref="nameField"
          :label="$t('entity_types.fields.name')"
          :maxlength="30"
          v-model="form.name"
          @enter="runConfirmation"
          v-focus
        />
      </form>

      <modal-footer
        :error-text="$t('entity_types.create_error')"
        :is-error="isError"
        :is-loading="isLoading"
        @confirm="runConfirmation"
        @cancel="$emit('cancel')"
      />
    </div>
  </div>
</div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { modalMixin } from './base_modal'

import ModalFooter from './ModalFooter'
import TextField from '../widgets/TextField'

export default {
  name: 'edit-entity-type-modal',
  mixins: [modalMixin],
  components: {
    ModalFooter,
    TextField
  },

  props: [
    'title',
    'onConfirmClicked',
    'text',
    'active',
    'cancelRoute',
    'isLoading',
    'isError',
    'entityTypeToEdit'
  ],

  data () {
    return {}
  },

  computed: {
    ...mapGetters([
      'entityTypes',
      'entityTypeStatusOptions'
    ]),
    form () {
      return {
        name: ''
      }
    }
  },

  methods: {
    ...mapActions([
    ]),

    runConfirmation () {
      this.$emit('confirm', this.form)
    }
  },

  watch: {
    active () {
      if (this.active) {
        setTimeout(() => {
          this.$refs.nameField.focus()
        }, 100)
      }
    },

    entityTypeToEdit () {
      if (this.entityTypeToEdit) {
        this.form.name = this.entityTypeToEdit.name
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.modal-content .box p.text {
  margin-bottom: 1em;
}

.is-danger {
  color: #ff3860;
  font-style: italic;
}
</style>
