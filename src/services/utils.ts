import * as fs from 'fs'
import * as path from 'path'

// Recursively get the paths to all the files in a directory.
export function getAllPaths(dir: string): string[] {
  return fs.readdirSync(dir).reduce((result, fileName) => {
    const fullPath = path.resolve(dir, fileName)
    if (fs.lstatSync(fullPath).isDirectory()) {
      return result.concat(getAllPaths(fullPath))
    }
    return result.concat([fullPath])
  }, [])
}
