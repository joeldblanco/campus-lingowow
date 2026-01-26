'use server'

import { CloudinaryService } from '@/lib/cloudinary'

export async function debugCloudinaryContent() {
  try {
    // 1. Obtener todas las carpetas raíz
    const rootFolders = await CloudinaryService.listFolders()
    
    // 2. Obtener subcarpetas de campus-lingowow
    const campusFolders = await CloudinaryService.listFolders('campus-lingowow')
    
    // 3. Buscar todos los recursos en campus-lingowow
    const campusResources = await CloudinaryService.searchResources('folder:campus-lingowow/*')
    
    // 4. Buscar por subcarpetas específicas
    const courseResources = await CloudinaryService.searchResources('folder:campus-lingowow/course*')
    
    const examResources = await CloudinaryService.searchResources('folder:campus-lingowow/exam*')
    
    const resourceResources = await CloudinaryService.searchResources('folder:campus-lingowow/resources*')
    
    return {
      success: true,
      data: {
        rootFolders: rootFolders.map(f => ({ name: f.name, path: f.path, file_count: f.file_count })),
        campusFolders: campusFolders.map(f => ({ name: f.name, path: f.path, file_count: f.file_count })),
        totalFiles: campusResources.total_count,
        campusFiles: campusResources.resources.map(r => ({
          public_id: r.public_id,
          folder: r.folder,
          format: r.format,
          resource_type: r.resource_type,
          bytes: r.bytes,
          created_at: r.created_at
        })),
        courseFiles: courseResources.resources.map(r => ({ public_id: r.public_id, folder: r.folder, format: r.format })),
        examFiles: examResources.resources.map(r => ({ public_id: r.public_id, folder: r.folder, format: r.format })),
        resourceFiles: resourceResources.resources.map(r => ({ public_id: r.public_id, folder: r.folder, format: r.format }))
      }
    }
  } catch (error) {
    console.error('❌ Error en debug:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
