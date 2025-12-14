import type { Folder } from '../types';

/**
 * Flatten a hierarchical folder structure into a flat list with indented names.
 * Useful for displaying folder hierarchy in dropdowns.
 *
 * @param folders - Array of folders (may include children)
 * @param prefix - String prefix for indentation (default: '')
 * @returns Flat array of folders with indented names
 *
 * @example
 * // Input: [{ id: 1, name: 'Work', children: [{ id: 2, name: 'Projects' }] }]
 * // Output: [{ id: 1, name: 'Work' }, { id: 2, name: 'Work / Projects' }]
 */
export function flattenFolders(
  folders: Folder[],
  prefix = '',
): Array<{ id: number; name: string }> {
  const result: Array<{ id: number; name: string }> = [];

  for (const folder of folders) {
    result.push({ id: folder.id, name: prefix + folder.name });

    if (folder.children && folder.children.length > 0) {
      result.push(...flattenFolders(folder.children, `${prefix}${folder.name} / `));
    }
  }

  return result;
}
