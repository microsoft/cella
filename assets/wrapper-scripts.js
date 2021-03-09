const { existsSync: exists, chmod, chmodSync } = require('fs');
const { stat, copyFile, unlink } = require('fs').promises;
const { join } = require('path');

/**
 * This script creates/removes custom wrapper scripts for cella.
 */
async function findScriptFolder() {
  const root = `${__dirname}`;
  let s = root;
  while (true) {
    s = join(s, '..');

    // did we find a folder where the script is in the folder (windows style)
    if (exists(s) && (await stat(s)).isDirectory() && (
      exists(join(s, 'cella_.ps1')) ||
      exists(join(s, 'cella_.cmd')) ||
      exists(join(s, 'cella.ps1')) ||
      exists(join(s, 'cella.cmd')))
    ) {
      return s;
    }

    // find it in a bin folder 
    for (const f of ['.bin', 'bin']) {
      const b1 = join(s, f);
      if (exists(b1) && (await stat(b1)).isDirectory() && (
        exists(join(b1, 'cella_')) ||
        exists(join(b1, 'cella')) ||
        exists(join(b1, 'cella.ps1')) ||
        exists(join(b1, 'cella_.ps1')))
      ) {
        return b1;
      }
    }

    if (s === join(s, '..')) {
      return undefined;
    }
  }
}

async function create() {
  const folder = await findScriptFolder();
  if (!folder) {
    console.error("Unable to find install'd folder. Aborting.")
    return process.exit(1);
  }
  const files = {
    'cella': {
      source: 'cella',
      install: process.platform !== 'win32'
    },
    'cella.ps1': {
      source: 'cella.ps1',
      install: true
    },
    'cella.cmd': {
      source: 'cella.ps1',
      install: process.platform === 'win32'
    }
  }

  for (const file of ['cella_', 'cella_.ps1', 'cella_.cmd']) {
    // remove the normally created scripts 
    const target = join(folder, file);
    if (exists(target)) {
      await unlink(target);
    }
  }

  // we install all of these, because an installation from bash can still work with powershell
  for (const file of Object.keys(files)) {
    console.log(`file: ${file} <== ${files[file].source} if ${files[file].install}`)
    if (files[file].install) {
      const target = join(folder, file);

      // remove the symlink/script file if it exists
      if (exists(target)) {
        await unlink(target);
      }
      // copy the shell script into it's place
      console.log(`copyFile: ${join(__dirname, "scripts", files[file].source)}  ==>  ${target} }`);
      await copyFile(join(__dirname, "scripts", files[file].source), target);

      chmodSync(target, 0o765);
    }
  }
}

async function remove() {
  const folder = await findScriptFolder();
  if (!folder) {
    return process.exit(0);
  }

  for (const file of ['cella', 'cella.ps1', 'cella.cmd']) {
    // remove the custom created scripts 
    const target = join(folder, file);
    if (exists(target)) {
      await unlink(target);
    }
  }
}

if (process.argv[2] !== 'remove') {
  console.error('Installing Scripts');
  create();
} else {
  console.error('After this is uninstalled, you should close this terminal.');
  remove()
}
