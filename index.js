const main = async () => {
  console.log('here')
  const reply = await axios.get('https://raw.githubusercontent.com/Kr1an/jsdoc-react-express-sample/master/README.md')
  document.getElementById('for-content').innerText = reply.data
}

setTimeout(main, 1000)
