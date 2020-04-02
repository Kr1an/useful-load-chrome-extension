console.log('useful page load: start script')

const storage = {
  async setObj(key, obj) {
    if (chrome.storage) {
      await new Promise(res => chrome.storage.sync.set({ [key]: JSON.stringify(obj) }, res))
    } else {
      localStorage.setItem(key, JSON.stringify(obj))
    }
  },
  async getObj(key) {
    let raw
    if (chrome.storage) {
      const raws = await new Promise(res => chrome.storage.sync.get([key], res))
      raw = raws[key]
    } else {
      raw = localStorage.getItem(key)
    }
    if (!raw) return undefined
    return JSON.parse(raw)
  }
}

async function fetchInfo() {
  const infoFetchUrl = "https://raw.githubusercontent.com/Kr1an/useful-load-info/master/main.json"
  const data = await fetch(infoFetchUrl).then(res => res.json())
  await storage.setObj('info', data)
}

setTimeout(fetchInfo, 1000)
setInterval(fetchInfo, 12 * 1000)

function createInfoElement() {
  const wrapper = document.createElement("div")
  wrapper.className = "uiw"
  const container = document.createElement("div")
  container.className = "uic"
  container.innerText = "Hi. Fetching informaion. Will start showing from the next page update."
  wrapper.appendChild(container)
  const removeContainer = () => wrapper.remove()
  wrapper.onclick = removeContainer
  window.onload = () => {
    console.log('page loaded')
    document.querySelector('.uic').classList.add('closing')
    setTimeout(removeContainer,  5 * 1000)
  }
  return wrapper
}

async function showRandomInfo() {
  const el = createInfoElement()
  const body = document.querySelector('html')
  body.appendChild(el)
  const info = await storage.getObj('info')
  const randInfo = info[Math.floor(Math.random() * info.length)]
  if (!randInfo) return
  document.querySelector('.uic').innerText = randInfo
}
async function config() {
  showRandomInfo()
  const info = await storage.getObj('info')
  if (!info) fetchInfo()
}
config()


