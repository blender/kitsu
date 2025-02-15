import client from '@/store/api/client'

export default {
  getShot (shotId, callback) {
    return client.getModel('shots', shotId)
  },

  getShots (production, episode, callback) {
    let path = '/api/data/shots/with-tasks'
    if (production) path += `?project_id=${production.id}`
    if (episode) path += `&episode_id=${episode.id}`
    client.get(path, callback)
  },

  getSequence (sequenceId) {
    return client.getModel('sequences', sequenceId)
  },

  getSequences (production, episode, callback) {
    let path = `/api/data/projects/${production.id}/sequences`
    if (episode) path = `/api/data/episodes/${episode.id}/sequences`
    client.get(path, callback)
  },

  getEpisode (episodeId) {
    return client.getModel('episodes', episodeId)
  },

  getEpisodes (production) {
    const path = `/api/data/projects/${production.id}/episodes`
    return client.pget(path)
  },

  getShotType (callback) {
    client.get('/api/data/shot-type', callback)
  },

  newShot (shot) {
    const data = {
      name: shot.name,
      description: shot.description,
      sequence_id: shot.sequence_id
    }
    return client.ppost(`/api/data/projects/${shot.project_id}/shots`, data)
  },

  newSequence (sequence) {
    const data = {
      name: sequence.name,
      episode_id: sequence.episode_id
    }
    const path = `/api/data/projects/${sequence.project_id}/sequences`
    return client.ppost(path, data)
  },

  newEpisode (episode) {
    const data = {
      name: episode.name
    }
    const path = `/api/data/projects/${episode.project_id}/episodes`
    return client.ppost(path, data)
  },

  updateShot (shot) {
    const data = {
      name: shot.name,
      parent_id: shot.sequence_id,
      description: shot.description,
      data: shot.data
    }
    if (shot.nb_frames) {
      data.nb_frames = parseInt(shot.nb_frames)
    }
    if (
      shot.frameOut !== undefined ||
      shot.frameIn !== undefined ||
      shot.fps !== undefined ||
      shot.resolution !== undefined ||
      shot.max_retakes !== undefined
    ) {
      Object.assign(data.data, {
        frame_in: shot.frameIn,
        frame_out: shot.frameOut,
        fps: shot.fps,
        resolution: shot.resolution,
        max_retakes: parseInt(shot.max_retakes)
      })
    }
    const path = `/api/data/entities/${shot.id}`
    return client.pput(path, data)
  },

  updateSequence (sequence) {
    const data = {
      name: sequence.name,
      description: sequence.description
    }
    return client.pput(`/api/data/entities/${sequence.id}`, data)
  },

  updateEpisode (episode) {
    const data = {
      name: episode.name,
      description: episode.description
    }
    return client.pput(`/api/data/entities/${episode.id}`, data)
  },

  deleteShot (shot) {
    if (shot.canceled) {
      return client.pdel(`/api/data/shots/${shot.id}?force=true`)
    } else {
      return client.pdel(`/api/data/shots/${shot.id}`)
    }
  },

  deleteSequence (sequence) {
    return client.pdel(`/api/data/sequences/${sequence.id}?force=true`)
  },

  deleteEpisode (episode) {
    return client.pdel(`/api/data/episodes/${episode.id}?force=true`)
  },

  restoreShot (shot, callback) {
    const data = { canceled: false }
    return client.pput(`/api/data/entities/${shot.id}`, data)
  },

  postCsv (production, formData, toUpdate) {
    let path = `/api/import/csv/projects/${production.id}/shots`
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

  loadShotHistory (shotId) {
    return client.pget(`/api/data/shots/${shotId}/versions`)
  },

  getQuotas (productionId, taskTypeId, detailLevel, computeMode) {
    const weighted = computeMode === 'weighted'
    return client.pget(
      `/api/data/projects/${productionId}/quotas/` +
       `${taskTypeId}?detail=${detailLevel}&weighted=${weighted}`
    )
  }
}
