'use server'

import { auth } from '@/auth'
import { db } from '@/lib/db'
import { getCurrentDate } from '@/lib/utils/date'
import { pusherServer } from '@/lib/pusher'
import { MessageType } from '@prisma/client'

export async function getFloatingConversations(userId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const conversations = await db.floatingConversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                image: true,
                teamBadge: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                lastName: true,
                image: true,
                teamBadge: true,
              },
            },
          },
        },
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
    })

    return { success: true, conversations }
  } catch (error) {
    console.error('Error getting conversations:', error)
    return { success: false, error: 'Error al cargar conversaciones' }
  }
}

export async function searchUsers(query: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const users = await db.user.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
        AND: {
          id: {
            not: session.user.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        image: true,
        teamBadge: true,
        roles: true,
      },
      take: 20,
    })

    return { success: true, users }
  } catch (error) {
    console.error('Error searching users:', error)
    return { success: false, error: 'Error al buscar usuarios' }
  }
}

export async function createFloatingConversation(participantIds: string[]) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    // Check if conversation already exists between these users
    if (participantIds.length === 1) {
      const existingConversation = await db.floatingConversation.findFirst({
        where: {
          isGroup: false,
          participants: {
            every: {
              userId: {
                in: [session.user.id, participantIds[0]],
              },
            },
          },
        },
      })

      if (existingConversation) {
        return { success: true, conversationId: existingConversation.id }
      }
    }

    // Create new conversation
    const conversation = await db.floatingConversation.create({
      data: {
        isGroup: participantIds.length > 1,
        participants: {
          create: [{ userId: session.user.id }, ...participantIds.map((id) => ({ userId: id }))],
        },
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
      },
    })

    // Notify participants about new conversation
    for (const participant of conversation.participants) {
      if (participant.userId !== session.user.id) {
        await pusherServer.trigger(`user-${participant.userId}`, 'new-conversation', conversation)
      }
    }

    return { success: true, conversationId: conversation.id, conversation }
  } catch (error) {
    console.error('Error creating conversation:', error)
    return { success: false, error: 'Error al crear conversación' }
  }
}

export async function sendFloatingMessage(
  conversationId: string,
  senderId: string,
  content: string,
  type: MessageType = 'TEXT',
  metadata: any = null
) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.id !== senderId) {
      return { success: false, error: 'No autorizado' }
    }

    // Verify user is participant in conversation
    const conversation = await db.floatingConversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
      },
    })

    const participant = conversation?.participants.find((p) => p.userId === senderId)

    if (!participant) {
      return { success: false, error: 'No tienes acceso a esta conversación' }
    }

    // Create message
    const message = await db.floatingChatMessage.create({
      data: {
        conversationId,
        senderId,
        content,
        type,
        metadata,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
            teamBadge: true,
          },
        },
      },
    })

    // Update conversation's last message
    const updatedConversation = await db.floatingConversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: type === 'FILE' ? 'Archivo adjunto' : content,
        lastMessageAt: getCurrentDate(),
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                image: true,
                teamBadge: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: {
            timestamp: 'desc',
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                lastName: true,
                image: true,
                teamBadge: true,
              },
            },
          },
        },
      },
    })

    // Trigger Pusher events
    // 1. New message in the conversation channel
    await pusherServer.trigger(`conversation-${conversationId}`, 'new-message', message)

    // 2. Update conversation list for all participants
    const participants = updatedConversation.participants
    for (const p of participants) {
      await pusherServer.trigger(`user-${p.userId}`, 'conversation-update', {
        conversationId,
        lastMessage: updatedConversation.lastMessage,
        lastMessageAt: updatedConversation.lastMessageAt,
        unreadCount: p.userId !== senderId ? 1 : 0, // Simplified unread logic for now
      })
    }

    return { success: true, message }
  } catch (error) {
    console.error('Error sending message:', error)
    return { success: false, error: 'Error al enviar mensaje' }
  }
}

export async function getConversationMessages(conversationId: string, userId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.id !== userId) {
      return { success: false, error: 'No autorizado' }
    }

    // Verify user is participant
    const participant = await db.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
    })

    if (!participant) {
      return { success: false, error: 'No tienes acceso a esta conversación' }
    }

    const messages = await db.floatingChatMessage.findMany({
      where: {
        conversationId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
            teamBadge: true,
          },
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    })

    // Mark messages as read
    await db.floatingChatMessage.updateMany({
      where: {
        conversationId,
        senderId: {
          not: userId,
        },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    })

    return { success: true, messages }
  } catch (error) {
    console.error('Error getting messages:', error)
    return { success: false, error: 'Error al cargar mensajes' }
  }
}

export async function markMessagesAsRead(conversationId: string, userId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.id !== userId) {
      return { success: false, error: 'No autorizado' }
    }

    await db.floatingChatMessage.updateMany({
      where: {
        conversationId,
        senderId: {
          not: userId,
        },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    })

    // Update participant's last read time
    await db.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId,
      },
      data: {
        lastReadAt: getCurrentDate(),
      },
    })

    // Trigger Pusher event for the user to update sidebar
    await pusherServer.trigger(`user-${userId}`, 'conversation-read', { conversationId })

    return { success: true }
  } catch (error) {
    console.error('Error marking messages as read:', error)
    return { success: false, error: 'Error al marcar como leídos' }
  }
}

export async function getTotalUnreadCount(userId: string) {
  try {
    const count = await db.floatingChatMessage.count({
      where: {
        conversation: {
          participants: {
            some: { userId },
          },
        },
        senderId: { not: userId },
        isRead: false,
      },
    })
    return { success: true, count }
  } catch (error) {
    console.error('Error getting unread count:', error)
    return { success: false, error: 'Error al obtener conteo' }
  }
}

export async function archiveConversation(conversationId: string, userId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.id !== userId) {
      return { success: false, error: 'No autorizado' }
    }

    await db.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        isArchived: true,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Error archiving conversation:', error)
    return { success: false, error: 'Error al archivar conversación' }
  }
}
