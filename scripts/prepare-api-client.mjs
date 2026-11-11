import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const REPO = 'RexDavid06/Gym-Hub-Backend-'
const REF = process.env.API_CLIENT_REF || 'main'
const DEST = resolve('.render/api-client')

const FILES = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'schema.yml',
  'src/index.ts',
  'src/client.ts',
  'src/types.ts',
  'src/schema.d.ts',
]

const localCandidates = [process.env.API_CLIENT_SOURCE, '../backend/api-client']
  .filter(Boolean)
  .map((candidate) => resolve(candidate))

rmSync(DEST, { recursive: true, force: true })

const local = localCandidates.find((candidate) => existsSync(candidate))

if (local) {
  console.log(`Staging @gym-hub/api-client from ${local}`)
  cpSync(local, DEST, {
    recursive: true,
    filter: (source) => {
      const path = source.replaceAll('\\', '/')
      return (
        !path.includes('/node_modules') && !path.includes('/dist') && !path.endsWith('/.git')
      )
    },
  })
} else {
  console.log(`Downloading @gym-hub/api-client from ${REPO}@${REF}`)
  for (const file of FILES) {
    const url = `https://raw.githubusercontent.com/${REPO}/${REF}/api-client/${file}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`)
    }
    const target = resolve(DEST, file)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, Buffer.from(await response.arrayBuffer()))
  }
}

console.log(`@gym-hub/api-client staged at ${DEST}`)
