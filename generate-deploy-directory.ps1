npm install -g @microsoft/rush
rush update
rush lint
rush rebuild
rush test
rush set-versions
node -e "const c = require('./ce/package.json'); p = require('./assets/package.json') ; p.version = c.version; require('fs').writeFileSync('./assets/package.json', JSON.stringify(p,undefined,2)); console.log(``set asset version to `${p.version}``);"
rush deploy
