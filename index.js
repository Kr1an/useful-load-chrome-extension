/*
 * Storage that abstracts dev/prod environemnt.
 * It uses chrome.storage on prod side and
 * localstorage on dev side
 */
const storage = {
  async setObj(key, obj) {
    if (chrome.storage) {
      await new Promise(res => chrome.storage.local.set({ [key]: JSON.stringify(obj) }, res))
    } else {
      localStorage.setItem(key, JSON.stringify(obj))
    }
  },
  async getObj(key) {
    let raw
    if (chrome.storage) {
      const raws = await new Promise(res => chrome.storage.local.get([key], res))
      raw = raws[key]
    } else {
      raw = localStorage.getItem(key)
    }
    if (!raw) return undefined
    return JSON.parse(raw)
  }
}

/*
 * It abstracts search filepath for src and other properties.
 * Dev/prod has different prefixes.
 */
const getFilePath = (path) => {
  let output = path
  if (chrome && chrome.runtime && chrome.runtime.getURL) {
    output = chrome.runtime.getURL(path)
  }
  return output
}

/*
 * Fetches topics and info from remote server.
 * Maybe its good idea to abstract base url with
 * some kind of settings.
 */
const fetchBaseUrl = "https://raw.githubusercontent.com/Kr1an/useful-load-info/master/"
async function fetchTopics() {
  const infoFetchUrl = fetchBaseUrl + 'topics.json'
  const data = await fetch(infoFetchUrl).then(res => res.json())
  return data
}
async function fetchInfo(topicPath) {
  if (!topicPath) throw new Error('topicPath expected')
  const infoFetchUrl = fetchBaseUrl + topicPath
  const data = await fetch(infoFetchUrl).then(res => res.json())
  return data
}

/*
 * It abstracts storage operations for application
 * related logic state. It also abstracts cache related
 * logic
 */
const state = {
  async getTopics() {
    await this.syncTopics()
    const topics = await storage.getObj('topics')
    return topics
  },
  async getInfo() {
    await this.syncInfo()
    const info = await storage.getObj('info')
    return info
  },
  async syncInfo(force = false) {
    const currentTopic = await this.getCurrentTopic()
    const lastSyncMs = (await storage.getObj('lastInfoSyncTimeMs') || 0)
    if (!force && Date.now() - lastSyncMs < 3 * 60 * 1000) return
    const topicMap = await this.getTopics()
    const info = await fetchInfo(topicMap[currentTopic])
    await storage.setObj('info', info)
    await storage.setObj('lastInfoSyncTimeMs', Date.now())
  },
  async syncTopics(force = false) {
    const lastSyncMs = (await storage.getObj('lastTopicsSyncTimeMs') || 0)
    if (!force && Date.now() - lastSyncMs < 2 * 60 * 1000) return
    const topicMap = await fetchTopics()
    await storage.setObj('topics', topicMap)
    await storage.setObj('lastTopicsSyncTimeMs', Date.now())
  },
  async getCurrentTopic() {
    const topic = await storage.getObj('currentTopic')
    const topicMap = await this.getTopics()
    if (topic && topicMap[topic]) return topic
    const topics = Object.keys(topicMap)
    if (!topics.length) throw new Error('no topics found')
    return topics[0]
  },
  async setCurrentTopic(topic) {
    const topics = await this.getTopics()
    if (!topics[topic]) throw new Error('topic not exist')
    await storage.setObj('currentTopic', topic)
    await this.syncInfo(true)
  },
  async resetSeen() {
    await storage.setObj('seen', [])
  },
  async getSeen() {
    return await storage.getObj('seen') || []
  },
  async pushSeen(msg) {
    const seen = await this.getSeen()
    if (seen.indexOf(msg) < 0) seen.push(msg)
    await storage.setObj('seen', seen)
  },
}


/*
 * Rerenders root to be setting screen
 */
async function renderSettings() {
  const oldRoot = document.querySelector('#useful-load-root')
  if (oldRoot) oldRoot.remove()
  const newRoot = document.createElement('div')
  document.querySelector('body').appendChild(newRoot)
  newRoot.id = 'useful-load-root'
  newRoot.innerHTML = `
    <div class="float-modal settings" tabindex="0">
      <p>Loading settings...</p>
    </div>
  `
  const topicMap = await state.getTopics()
  const currentTopic = await state.getCurrentTopic()
  newRoot.querySelector('.float-modal').innerHTML = `
    <h3>Select topic</h3>
    <div class="topics"></div>
    <div class="separator-line"></div>
    <p class="extra-info">Have any thoughts about the extension<b>?</b><br/> Please, send me an email <b>7633766@gmail.com</b>
  `
  const topics = Object.keys(topicMap)
  const topicsContainer = newRoot.querySelector('.topics')
  for (let i = 0; i < topics.length; i++) {
    const topicEl = document.createElement('p')
    if (currentTopic === topics[i]) topicEl.className = 'current-topic'
    topicEl.innerText = topics[i]
    topicEl.addEventListener('click', async () => {
      await state.setCurrentTopic(topics[i])
      renderSettings()
    })
    topicsContainer.appendChild(topicEl)
  }
  const modal = newRoot.querySelector('.float-modal')
  modal.focus()
  modal.addEventListener('blur', () => {
    setTimeout(() => newRoot.remove(), 100)
  })
}

/*
 * It renders info related screen
 */
async function renderInfo() {
  const oldRoot = document.querySelector('#useful-load-root')
  if (oldRoot) oldRoot.remove()
  const newRoot = document.createElement('div')
  document.querySelector('html').appendChild(newRoot)
  newRoot.id = 'useful-load-root'
  newRoot.innerHTML = `
    <div class="float-modal">
      <p>Loading...</p>
    </div>
  `
  debugger
  const info = await state.getInfo()
  const seen = await state.getSeen()
  const notYetSeenInfo = info.filter(x => seen.indexOf(x) < 0)
  if (!notYetSeenInfo.length) {
    await state.resetSeen()
    return renderInfo()
  }
  const idxOfTheMsgToShow = Math.floor(Math.floor(Date.now() / 700) % notYetSeenInfo.length)
  const msgToShow = notYetSeenInfo[idxOfTheMsgToShow]
  newRoot.innerHTML = `
    <div class="float-modal">
      <p></p>
      <div class="progress"></div>
      <img class="search" src="${getFilePath("imgs/gicon.svg")}" />
      <div class="settings-link-wrapper">
        <div class="settings-link">...</div>
      </div>
    </div>
  `
  newRoot.querySelector('.float-modal p').innerText = msgToShow
  newRoot.querySelector('.search').addEventListener('click', (e) => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(msgToShow)}`
    window.open(url, '_blank')
    return e.stopImmediatePropagation()
  })
  const handleInfoClose = () => {
    newRoot.remove()
    state.pushSeen(msgToShow)
  }
  const progress = newRoot.querySelector('.progress')
  const waitBeforeCloseMs = 5 * 1000
  progress.style.animationDuration = waitBeforeCloseMs + 'ms'
  const modal = newRoot.querySelector('.float-modal')
  modal.addEventListener('mouseenter', () => {
    progress.style.animationPlayState = 'paused'
  })
  modal.addEventListener('mouseleave', () => {
    progress.style.animationPlayState = 'running'
  })
  modal.addEventListener('click', () => {
    setTimeout(handleInfoClose, 100)
  })
  progress.addEventListener('animationend', handleInfoClose)

  newRoot.querySelector('.settings-link').addEventListener('click', (e) => {
    e.stopImmediatePropagation()
    renderSettings()
  })

  if (newRoot.querySelector('.float-modal:hover'))
    progress.style.animationPlayState = 'paused'
  
}

async function config() {
  await renderInfo()
}
config()
