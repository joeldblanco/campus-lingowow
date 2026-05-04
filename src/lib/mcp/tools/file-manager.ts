import { z } from 'zod'
import { FileCategory, FileResourceType } from '@prisma/client'
import {
  batchDeleteFiles,
  createFolder,
  getFileDetails,
  getUsageStats,
  listFiles,
  listFolders,
  moveFiles,
  syncCloudinaryResources,
  updateFileMetadata,
} from '@/lib/actions/file-manager'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

const fileCategoryEnum = z.nativeEnum(FileCategory)
const fileResourceTypeEnum = z.nativeEnum(FileResourceType)

export const fileManagerTools: AnyToolModule[] = [
  {
    name: 'lingowow_files_list',
    description:
      'Lista archivos almacenados en Cloudinary con paginación. Filtros: search, resourceType (IMAGE/VIDEO/AUDIO/DOCUMENT), folder.',
    scopes: ['mcp:files:read'],
    inputShape: {
      page: z.number().int().min(1).optional().default(1),
      limit: z.number().int().min(1).max(100).optional().default(20),
      search: z.string().optional(),
      resourceType: fileResourceTypeEnum.optional(),
      folder: z.string().optional(),
    },
    handler: async (args) => {
      const result = await listFiles(args)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_files_get_details',
    description: 'Obtiene los detalles completos de un archivo (incluye uploader, transformaciones y logs de uso).',
    scopes: ['mcp:files:read'],
    inputShape: { publicId: z.string().min(1) },
    handler: async ({ publicId }) => {
      const result = await getFileDetails(publicId)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_files_list_folders',
    description: 'Lista las carpetas de Cloudinary bajo el prefijo del proyecto.',
    scopes: ['mcp:files:read'],
    handler: async () => {
      const result = await listFolders()
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_files_usage_stats',
    description: 'Estadísticas globales de uso de archivos: total, por tipo, por categoría, almacenamiento.',
    scopes: ['mcp:files:read'],
    handler: async () => {
      const result = await getUsageStats()
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_files_update_metadata',
    description:
      'Actualiza metadata de un archivo (fileName, description, tags, category, isPublic). Sincroniza tags con Cloudinary.',
    scopes: ['mcp:files:write'],
    inputShape: {
      publicId: z.string().min(1),
      fileName: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      category: fileCategoryEnum.optional(),
      isPublic: z.boolean().optional(),
    },
    handler: async ({ publicId, ...metadata }) => {
      const result = await updateFileMetadata(publicId, metadata)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_files_batch_delete',
    description:
      'Elimina archivos en lote de Cloudinary y marca como inactivos en DB (soft delete). Operación destructiva.',
    scopes: ['mcp:files:write'],
    inputShape: {
      publicIds: z.array(z.string().min(1)).min(1).max(100),
    },
    handler: async ({ publicIds }) => {
      const result = await batchDeleteFiles(publicIds)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_files_move',
    description: 'Mueve archivos a una carpeta destino en Cloudinary.',
    scopes: ['mcp:files:write'],
    inputShape: {
      publicIds: z.array(z.string().min(1)).min(1).max(100),
      targetFolder: z.string().min(1),
    },
    handler: async ({ publicIds, targetFolder }) => {
      const result = await moveFiles(publicIds, targetFolder)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_files_create_folder',
    description: 'Crea una carpeta nueva en Cloudinary bajo el prefijo del proyecto.',
    scopes: ['mcp:files:write'],
    inputShape: { path: z.string().min(1) },
    handler: async ({ path }) => {
      const result = await createFolder(path)
      return unwrapActionResult(result)
    },
  },

  {
    name: 'lingowow_files_sync_cloudinary',
    description:
      'Sincroniza los recursos de Cloudinary (campus-lingowow/) con la tabla FileAsset de la DB. Idempotente: crea registros faltantes y actualiza los existentes.',
    scopes: ['mcp:files:write'],
    handler: async () => {
      const result = await syncCloudinaryResources()
      return unwrapActionResult(result)
    },
  },
]
