console.log('useful page load: start script')

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

const getFilePath = (path) => {
  let output = path
  if (chrome && chrome.runtime) {
    output = chrome.runtime.getURL(path)
  }
  return output
}

async function fetchInfo() {
  const infoFetchUrl = "https://raw.githubusercontent.com/Kr1an/useful-load-info/master/main.json"
  const data = await fetch(infoFetchUrl).then(res => res.json())
  await storage.setObj('info', data)
}

setTimeout(fetchInfo, 1000)
setInterval(fetchInfo, 12 * 1000)

function createInfoElement(text) {
  const liveTimeMs = text.split(' ').length / 2 * 1000
  const wrapper = document.createElement("div")
  wrapper.className = "uiw"
  const container = document.createElement("div")
  container.className = "uic"
  container.innerText = ''
  wrapper.appendChild(container)
  const removeContainer = () => wrapper.remove()
  const handleInfoClose = async () => {
    removeContainer()
    const seen = await storage.getObj('seen') || []
    if (seen.indexOf(text) < 0) seen.push(text)
    await storage.setObj('seen', seen)
  }
  container.appendChild(document.createElement('p'))
  wrapper.onclick = handleInfoClose
  window.onload = () => {
    console.log('page loaded')
    const m = document.querySelector('.uic')
    const progress = document.createElement('div')
    const waitBeforeClose = liveTimeMs || 5000
    console.log('waiting', waitBeforeClose)
    progress.style.animationDuration = waitBeforeClose + 'ms'
    progress.className = "progress"
    m.appendChild(progress)
    container.addEventListener('mouseenter', () => progress.style.animationPlayState = 'paused')
    container.addEventListener('mouseleave', () => progress.style.animationPlayState = 'running')
    progress.addEventListener('animationend', handleInfoClose)

    const rect = document.querySelector('.uic').getBoundingClientRect();
    if (document.querySelector('.uic:hover')) progress.style.animationPlayState = 'paused'
  }
  const search = document.createElement('img')
  search.src = getFilePath("imgs/gicon.svg")
  search.alt="G"
  search.className = 'search'
  search.addEventListener('click', (e) => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(text)}`
    window.open(url,'_blank');
    return e.stopImmediatePropagation()

  })
  container.appendChild(search)
  
  return wrapper
}

async function showRandomInfo() {
  const info = await storage.getObj('info') || []
  await storage.setObj('seen', info)
  const alreadySeen = await storage.getObj('seen') || []
  let notSeenInfo = info.filter(x => alreadySeen.indexOf(x) < 0)

  if (notSeenInfo.length <= 0) {
    await storage.setObj('seen', [])
    notSeenInfo = info
  }

  let infoToShow
  if (notSeenInfo.length > 0) {
    const idxOfInfoToShow = Math.floor(Math.floor(Date.now() / 700) % notSeenInfo.length)
    infoToShow = info[idxOfInfoToShow]
  } else {
    infoToShow = "Hi. Fetching informaion. Will start showing from the next opened page."
  }

  const el = createInfoElement(infoToShow)
  const body = document.querySelector('html')
  body.appendChild(el)
  document.querySelector('.uic p').innerText = infoToShow
}
async function config() {
  showRandomInfo()
  const info = await storage.getObj('info')
  if (!info) fetchInfo()
}
config()


