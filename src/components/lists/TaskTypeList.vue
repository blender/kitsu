<template>
<div class="data-list">
  <div class="datatable-wrapper">
    <table class="datatable">
      <thead class="datatable-head">
        <tr>
          <th scope="col" class="department">
            {{ $t('task_types.fields.department') }}
          </th>
          <th scope="col" class="name">{{ $t('task_types.fields.name') }}</th>
          <th scope="col" class="allow-timelog">
            {{ $t('task_types.fields.allow_timelog') }}
          </th>
          <th scope="col" class="actions"></th>
        </tr>
      </thead>
      <draggable
        class="datatable-body"
        v-model="item.priorityItems"
        draggable=".tasktype-item"
        tag="tbody"
        :sort="true"
        :key="item.entityTypeName"
        v-for="item in taskTypesPerEntityType"
        v-if="item.taskTypes.length > 0"
        @end="updatePriority"
      >
        <tr class="datatable-type-header" slot="header">
          <th scope="rowgroup" colspan="4">
            <span class="datatable-row-header">
              <!-- TODO(anna): figure out how to make readable titles for custom entity types -->
              {{ $t(`${item.entityTypeName.toLowerCase()}s.title`) }}
            </span>
          </th>
        </tr>
        <tr
          class="datatable-row tasktype-item"
          :key="taskType.id"
          v-for="taskType in item.taskTypes"
        >
          <td class="department">
            <department-name
              :department="getDepartments(taskType.department_id)"
              v-if="!isEmpty(taskType.department_id)"
            />
          </td>
          <task-type-cell class="name" :task-type="taskType" />
          <td class="allow-timelog">
            {{ taskType.allow_timelog ? $t('main.yes') : $t('main.no')}}
          </td>
          <row-actions-cell
            :taskType-id="taskType.id"
            @delete-clicked="$emit('delete-clicked', taskType)"
            @edit-clicked="$emit('edit-clicked', taskType)"
          />
        </tr>
      </draggable>
    </table>
  </div>

  <table-info
    :is-loading="isLoading"
    :is-error="isError"
  />

  <p class="has-text-centered nb-task-types">
    {{ entries.length }} {{ $tc('task_types.number', entries.length) }}
  </p>

</div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import draggable from 'vuedraggable'
import RowActionsCell from '../cells/RowActionsCell'
import TableInfo from '../widgets/TableInfo'
import TaskTypeCell from '../cells/TaskTypeName'
import DepartmentName from '../widgets/DepartmentName.vue'

export default {
  name: 'task-type-list',

  props: [
    'entries',
    'isLoading',
    'isError'
  ],

  data () {
    return {
      entityTypeNames: [],
      taskTypesPerEntityType: {}
    }
  },

  components: {
    draggable,
    DepartmentName,
    RowActionsCell,
    TableInfo,
    TaskTypeCell
  },

  mounted () {},

  computed: {
    ...mapGetters([
      'customEntityTypeNames',
      'getDepartments'
    ])
  },

  methods: {
    ...mapActions([
    ]),

    getTaskTypesForEntityType (entityType) {
      return this.entries.filter(taskType => taskType.for_entity === entityType)
    },

    updatePriority (event) {
      const vnode = event.target.__vue__.$vnode
      const items = vnode.data.model.value
      const forms = []
      items.forEach((item, index) => {
        index += 1
        const form = {
          id: item.id,
          name: item.name,
          priority: String(index)
        }
        item.priority = index
        forms.push(form)
      })
      this.$emit('update-priorities', forms)
    },

    isEmpty (value) {
      return value === undefined || value === null || value === ''
    }
  },

  watch: {
    entries: {
      immediate: true,
      handler () {
        setTimeout(() => {
          this.entityTypeNames = ['Asset', 'Shot', 'Edit'].concat(this.customEntityTypeNames)
          this.taskTypesPerEntityType = this.entityTypeNames.map((entityTypeName) => {
            const taskTypes = this.getTaskTypesForEntityType(entityTypeName)
            return {
              entityTypeName,
              taskTypes,
              priorityItems: JSON.parse(JSON.stringify(taskTypes))
            }
          })
        }, 100)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.department {
  width: 200px;
  min-width: 200px;
}

.name {
  width: 300px;
  min-width: 300px;
}

.priority {
  width: 80px;
  min-width: 80px;
}

.dedicated {
  width: 100px;
  min-width: 100px;
}

.allow-timelog {
  width: 100px;
  min-width: 100px;
}

.actions {
  min-width: 100px;
}

.color {
  width: 100px;
}

.tasktype-item[draggable=false] {
  cursor: grab;
}

.tasktype-item[draggable=true] {
  cursor: grabbing;
}

tr {
  cursor: pointer;
}
</style>
