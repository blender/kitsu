<template>
<div class="field" :class="{ 'is-inline': isInline }">
  <label class="label" v-if="label">{{ label }}</label>
  <label class="label empty-label" v-if="emptyLabel">A</label>
  <p class="control" :class="{
    'is-inline': isInline,
    flexrow: !isInline
  }">
    <input
      ref="input"
      :class="errored
        ? 'input flexrow-item errored' + inputClass
        : 'input flexrow-item' + inputClass"
      :placeholder="placeholder"
      :type="type"
      :value="value"
      :disabled="disabled"
      :maxlength="maxlength"
      min="0"
      :max="max || undefined"
      :step="step || undefined"
      @input="updateValue()"
      @keyup.enter="emitEnter()"
    />
    <button
      class="button flexrow-item"
      @click="emitEnter()"
      v-if="buttonLabel"
    >
      {{ buttonLabel }}
    </button>
  </p>
</div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'text-field',
  props: {
    disabled: {
      default: false,
      type: Boolean
    },
    label: {
      default: '',
      type: String
    },
    value: {
      default: '',
      type: [String, Number]
    },
    placeholder: {
      default: '',
      type: String
    },
    type: {
      default: 'text',
      type: String
    },
    inputClass: {
      default: '',
      type: String
    },
    buttonLabel: {
      default: '',
      type: String
    },
    max: {
      type: Number
    },
    maxlength: {
      default: 524288,
      type: Number
    },
    step: {
      type: Number
    },
    isInline: {
      default: false,
      type: Boolean
    },
    errored: {
      default: false,
      type: Boolean
    },
    emptyLabel: {
      default: false,
      type: Boolean
    }
  },

  computed: {
    ...mapGetters([
    ])
  },

  methods: {
    ...mapActions([
    ]),

    emitEnter () {
      this.$emit('enter', this.$refs.input.value)
    },

    updateValue () {
      this.$emit('input', this.$refs.input.value)
    },

    focus () {
      this.$refs.input.focus()
    }
  }
}
</script>
<style lang="scss" scoped>
.input.is-size-2 {
  width: 3rem;
}

.input.is-size-3 {
  width: 3.5rem;
}

.input.is-size-4 {
  width: 5rem;
}

.input.is-small {
  height: 2rem;
  font-size: 1rem;
  padding: 0 0.5rem;
}

input.input {
  font-size: 1.2em;

}
input.input.thin {
  height: 2.4em;
}

.flexrow-item {
  margin: 0;
}

button {
  font-size: 1.2em;
}

.input.errored {
  border-color: $red;
}

input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}
input[type="number"] {
    -moz-appearance: textfield;
}

.empty-label {
  opacity: 0;
}
</style>
